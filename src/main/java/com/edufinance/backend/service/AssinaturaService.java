package com.edufinance.backend.service;

import com.edufinance.backend.model.ChaveDigital;
import com.edufinance.backend.model.RegistroAssinado;
import com.edufinance.backend.repository.ChaveDigitalRepository;
import com.edufinance.backend.repository.RegistroAssinadoRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Assinaturas digitais (Ed25519) e a corrente de registros.
 *
 * Fluxo de uma ação assinada:
 * 1. O navegador monta um JSON com a ação (tipo, usuarioId, sequencia, data e os dados),
 *    assina com a chave privada e envia { payload, assinatura }.
 * 2. Aqui conferimos a assinatura com a chave pública ativa, o tipo, o dono, a sequência
 *    (tem que ser maior que a última da chave, senão é reenvio) e a data (até 5 minutos).
 * 3. O controller executa a ação usando os dados do payload assinado e chama registrar(),
 *    que grava o registro na corrente, ligado ao anterior pelo hash.
 *
 * Quem ainda não tem chave ativa continua usando o app sem assinar: a ação é registrada
 * na corrente do mesmo jeito, só que sem assinatura.
 */
@Service
public class AssinaturaService {

    public static final String HASH_INICIAL = "0".repeat(64);
    private static final Duration TOLERANCIA_RELOGIO = Duration.ofMinutes(5);
    // Cabeçalho DER de uma chave pública Ed25519 (X.509); os 32 bytes da chave vêm depois
    private static final byte[] PREFIXO_X509_ED25519 = HexFormat.of().parseHex("302a300506032b6570032100");

    @Autowired
    private ChaveDigitalRepository chaveRepository;

    @Autowired
    private RegistroAssinadoRepository registroRepository;

    @Autowired
    private ObjectMapper objectMapper;

    /** Ação assinada já conferida, pronta para ser registrada depois que a operação der certo. */
    public record AcaoAssinada(ChaveDigital chave, String payload, String assinatura, long sequencia,
                               Map<String, Object> dados) {
    }

    // ── Chaves ──────────────────────────────────────────────────────────────

    public Optional<ChaveDigital> chaveAtivaDoUsuario(Long usuarioId) {
        return chaveRepository.findFirstByUsuarioIdAndTipoAndStatus(usuarioId, ChaveDigital.TIPO_USUARIO, ChaveDigital.ATIVA);
    }

    public Optional<ChaveDigital> chaveAtivaDoAdmin() {
        return chaveRepository.findFirstByTipoAndStatus(ChaveDigital.TIPO_ADMIN, ChaveDigital.ATIVA);
    }

    /** A conta já teve alguma chave (ativa, pendente ou revogada)? Então ela só opera assinando. */
    public boolean contaUsaChave(Long usuarioId) {
        return chaveRepository.existsByUsuarioId(usuarioId);
    }

        public long ultimaSequencia(ChaveDigital chave) {
        Long ultima = registroRepository.ultimaSequencia(chave.getId());
        return ultima == null ? 0 : ultima;
    }

    /** Confere se o texto é uma chave pública Ed25519 válida (32 bytes em Base64). */
    public void validarChavePublica(String chavePublica) {
        try {
            byte[] bytes = Base64.getDecoder().decode(chavePublica);
            if (bytes.length != 32) {
                throw new IllegalArgumentException();
            }
            paraChavePublica(bytes);
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Chave pública inválida.");
        }
    }

    // ── Verificação ─────────────────────────────────────────────────────────

    /** Confere uma assinatura Ed25519 de um texto. Nunca lança exceção: devolve false se algo não bater. */
    public boolean assinaturaConfere(String chavePublica, String texto, String assinatura) {
        if (chavePublica == null || texto == null || assinatura == null) {
            return false;
        }
        try {
            PublicKey chave = paraChavePublica(Base64.getDecoder().decode(chavePublica));
            Signature verificador = Signature.getInstance("Ed25519");
            verificador.initVerify(chave);
            verificador.update(texto.getBytes(StandardCharsets.UTF_8));
            return verificador.verify(Base64.getDecoder().decode(assinatura));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Ação do próprio usuário. Se ele tem chave ativa, a assinatura é obrigatória e é conferida.
     * Quem nunca teve chave segue sem assinatura (devolve null). Quem já teve uma e está sem
     * chave ativa fica bloqueado até o administrador aprovar a nova: senão, bastaria revogar a
     * chave para voltar a operar sem assinatura.
     */
    public AcaoAssinada verificarDoUsuario(Long usuarioId, Set<String> tiposAceitos, Object corpoAssinatura) {
        Optional<ChaveDigital> chave = chaveAtivaDoUsuario(usuarioId);
        if (chave.isEmpty()) {
            if (contaUsaChave(usuarioId)) {
                throw new RegraNegocioException(HttpStatus.LOCKED,
                        "Sua conta usa chave digital, mas está sem chave ativa. Crie uma nova chave no Perfil e peça ao administrador para aprová-la.");
            }
            return null;
        }
        if (corpoAssinatura == null) {
            throw new RegraNegocioException(HttpStatus.PRECONDITION_REQUIRED,
                    "Sua conta usa chave digital. Carregue sua chave para assinar esta operação.");
        }
        return verificar(chave.get(), usuarioId, tiposAceitos, corpoAssinatura);
    }

    /**
     * Ação do administrador sobre um usuário (alvo pode ser null em ações gerais).
     * Se existe chave de administrador ativa, a assinatura dela é obrigatória.
     */
    public AcaoAssinada verificarDoAdmin(Long alvoUsuarioId, String tipo, Object corpoAssinatura) {
        Optional<ChaveDigital> chave = chaveAtivaDoAdmin();
        if (chave.isEmpty()) {
            return null;
        }
        if (corpoAssinatura == null) {
            throw new RegraNegocioException(HttpStatus.PRECONDITION_REQUIRED,
                    "Existe uma chave de administrador. Carregue-a no painel para assinar esta ação.");
        }
        return verificar(chave.get(), alvoUsuarioId, Set.of(tipo), corpoAssinatura);
    }

    private AcaoAssinada verificar(ChaveDigital chave, Long usuarioEsperado, Set<String> tiposAceitos, Object corpoAssinatura) {
        String payload;
        String assinatura;
        try {
            Map<?, ?> corpo = (Map<?, ?>) corpoAssinatura;
            payload = corpo.get("payload").toString();
            assinatura = corpo.get("assinatura").toString();
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Assinatura enviada em formato inválido.");
        }

        if (!assinaturaConfere(chave.getChavePublica(), payload, assinatura)) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN,
                    "Assinatura inválida: ela não foi feita com a chave ativa desta conta.");
        }

        Map<String, Object> dados = lerPayload(payload);
        if (!tiposAceitos.contains(String.valueOf(dados.get("tipo")))) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "A assinatura é de outro tipo de operação.");
        }
        if (usuarioEsperado != null && !Objects.equals(comoLong(dados.get("usuarioId")), usuarioEsperado)) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "A assinatura é de outro usuário.");
        }

        Long sequencia = comoLong(dados.get("sequencia"));
        if (sequencia == null || sequencia <= ultimaSequencia(chave)) {
            throw new RegraNegocioException(HttpStatus.CONFLICT,
                    "Essa assinatura já foi usada. Tente a operação de novo.");
        }

        try {
            Instant data = Instant.parse(String.valueOf(dados.get("data")));
            if (Duration.between(data, Instant.now()).abs().compareTo(TOLERANCIA_RELOGIO) > 0) {
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST,
                        "A assinatura expirou ou o relógio deste computador está errado. Tente de novo.");
            }
        } catch (RegraNegocioException e) {
            throw e;
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Data da assinatura inválida.");
        }

        return new AcaoAssinada(chave, payload, assinatura, sequencia, dados);
    }

    // ── Corrente de registros ───────────────────────────────────────────────

    /** Registra uma ação assinada. */
    public RegistroAssinado registrar(Long usuarioId, AcaoAssinada acao, String referencia) {
        String tipo = String.valueOf(acao.dados().get("tipo"));
        return encadear(new RegistroAssinado(usuarioId, acao.chave().getId(), tipo, acao.payload(),
                acao.assinatura(), acao.sequencia(), referencia));
    }

    /** Registra uma ação feita sem assinatura; o payload é montado aqui com os mesmos campos. */
    public RegistroAssinado registrarSemAssinatura(Long usuarioId, String tipo, Map<String, Object> campos, String referencia) {
        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("tipo", tipo);
        dados.put("usuarioId", usuarioId);
        dados.put("data", Instant.now().toString());
        dados.putAll(campos);
        return encadear(new RegistroAssinado(usuarioId, null, tipo, escreverJson(dados), null, null, referencia));
    }

    /** Registra uma ação assinada se houver assinatura; senão, sem assinatura. */
    public RegistroAssinado registrarAcao(Long usuarioId, AcaoAssinada acao, String tipo, Map<String, Object> campos,
                                          String referencia) {
        return acao != null ? registrar(usuarioId, acao, referencia) : registrarSemAssinatura(usuarioId, tipo, campos, referencia);
    }

    /** Registro assinado com uma chave que ainda não está ativa (cadastro da própria chave). */
    public RegistroAssinado registrarCadastroDeChave(Long usuarioId, ChaveDigital chave, String payload, String assinatura) {
        Map<String, Object> dados = lerPayload(payload);
        return encadear(new RegistroAssinado(usuarioId, chave.getId(), String.valueOf(dados.get("tipo")), payload,
                assinatura, 0L, "chave:" + chave.getId()));
    }

    private synchronized RegistroAssinado encadear(RegistroAssinado registro) {
        String anterior = registroRepository.findTopByOrderByIdDesc().map(RegistroAssinado::getHash).orElse(HASH_INICIAL);
        registro.setHashAnterior(anterior);
        registro.setHash(calcularHash(registro));
        return registroRepository.save(registro);
    }

    /** Hash do registro: SHA-256 do hash anterior com todo o conteúdo do registro. */
    public String calcularHash(RegistroAssinado r) {
        String conteudo = String.join("\n",
                r.getHashAnterior(),
                r.getTipo(),
                String.valueOf(r.getUsuarioId()),
                String.valueOf(r.getChaveId()),
                String.valueOf(r.getSequencia()),
                r.getPayload(),
                Objects.toString(r.getAssinatura(), ""),
                Objects.toString(r.getReferencia(), ""));
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(conteudo.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }

    // ── Utilidades ──────────────────────────────────────────────────────────

    public Map<String, Object> lerPayload(String payload) {
        try {
            return objectMapper.readValue(payload, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Conteúdo assinado inválido.");
        }
    }

    private String escreverJson(Map<String, Object> dados) {
        try {
            return objectMapper.writeValueAsString(dados);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static Long comoLong(Object valor) {
        if (valor instanceof Number n) {
            return n.longValue();
        }
        try {
            return valor == null ? null : Long.parseLong(valor.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static Double comoDouble(Object valor) {
        if (valor instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return valor == null ? null : Double.parseDouble(valor.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static PublicKey paraChavePublica(byte[] bytes) throws Exception {
        byte[] der = new byte[PREFIXO_X509_ED25519.length + bytes.length];
        System.arraycopy(PREFIXO_X509_ED25519, 0, der, 0, PREFIXO_X509_ED25519.length);
        System.arraycopy(bytes, 0, der, PREFIXO_X509_ED25519.length, bytes.length);
        return KeyFactory.getInstance("Ed25519").generatePublic(new X509EncodedKeySpec(der));
    }
}
