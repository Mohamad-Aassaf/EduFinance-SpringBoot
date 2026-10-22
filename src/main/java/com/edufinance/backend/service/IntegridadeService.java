package com.edufinance.backend.service;

import com.edufinance.backend.model.ChaveDigital;
import com.edufinance.backend.model.PortfolioTransaction;
import com.edufinance.backend.model.ProgressoUsuario;
import com.edufinance.backend.model.RegistroAssinado;
import com.edufinance.backend.repository.ChaveDigitalRepository;
import com.edufinance.backend.repository.PortfolioTransactionRepository;
import com.edufinance.backend.repository.ProgressoUsuarioRepository;
import com.edufinance.backend.repository.RegistroAssinadoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.edufinance.backend.service.AssinaturaService.comoDouble;
import static com.edufinance.backend.service.AssinaturaService.comoLong;

/**
 * Confere se os dados não foram adulterados:
 * 1. A corrente inteira: cada registro aponta para o hash do anterior e o próprio hash bate
 *    com o conteúdo. Alterar ou apagar um registro do meio quebra a corrente.
 * 2. As assinaturas dos registros do usuário, com a chave pública que as fez.
 * 3. Se as tabelas do app ainda batem com o que foi registrado: uma compra de 10 ações
 *    alterada para 100 direto no banco aparece como divergente, e uma operação gravada
 *    no banco sem passar pelo app aparece como "sem registro".
 */
@Service
public class IntegridadeService {

    @Autowired
    private RegistroAssinadoRepository registroRepository;

    @Autowired
    private ChaveDigitalRepository chaveRepository;

    @Autowired
    private PortfolioTransactionRepository transacaoRepository;

    @Autowired
    private ProgressoUsuarioRepository progressoRepository;

    @Autowired
    private AssinaturaService assinaturaService;

    public Map<String, Object> verificar(Long usuarioId) {
        List<RegistroAssinado> todos = registroRepository.findAllByOrderByIdAsc();
        Map<Long, ChaveDigital> chaves = chaveRepository.findAll().stream()
                .collect(Collectors.toMap(ChaveDigital::getId, Function.identity()));

        // 1. Corrente inteira
        Long quebraEm = null;
        String anterior = AssinaturaService.HASH_INICIAL;
        for (RegistroAssinado r : todos) {
            boolean ligado = anterior.equals(r.getHashAnterior());
            boolean intacto = assinaturaService.calcularHash(r).equals(r.getHash());
            if (!ligado || !intacto) {
                quebraEm = r.getId();
                break;
            }
            anterior = r.getHash();
        }

        // 2 e 3. Registros do usuário
        List<RegistroAssinado> meus = todos.stream().filter(r -> Objects.equals(r.getUsuarioId(), usuarioId)).toList();
        Map<Long, PortfolioTransaction> transacoes = transacaoRepository.findByUsuarioIdOrderByCreatedAtDesc(usuarioId)
                .stream().collect(Collectors.toMap(PortfolioTransaction::getId, Function.identity()));
        Set<Long> aulasConcluidas = progressoRepository.findByUsuarioId(usuarioId).stream()
                .filter(ProgressoUsuario::isConcluido).map(ProgressoUsuario::getLicaoId).collect(Collectors.toSet());
        Long ultimoReset = meus.stream().filter(r -> "ADMIN_RESET_TRILHA".equals(r.getTipo()))
                .map(RegistroAssinado::getId).max(Long::compare).orElse(null);

        List<Map<String, Object>> itens = new ArrayList<>();
        Set<Long> transacoesRegistradas = new HashSet<>();
        for (RegistroAssinado r : meus) {
            Map<String, Object> dados = lerSemFalhar(r.getPayload());
            String assinatura = statusAssinatura(r, chaves);
            String[] conferencia = conferirDados(r, dados, transacoes, aulasConcluidas, ultimoReset, transacoesRegistradas);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", r.getId());
            item.put("tipo", r.getTipo());
            item.put("criadoEm", r.getCriadoEm());
            item.put("dados", dados);
            item.put("assinatura", assinatura);
            item.put("conferencia", conferencia[0]);
            item.put("detalhe", conferencia[1]);
            item.put("hash", r.getHash());
            item.put("naCorrenteQuebrada", quebraEm != null && r.getId() >= quebraEm);
            itens.add(item);
        }

        // Operações gravadas depois que a corrente começou, mas que não passaram por ela
        LocalDateTime inicio = registroRepository.findTopByOrderByIdAsc().map(RegistroAssinado::getCriadoEm).orElse(null);
        List<Map<String, Object>> semRegistro = new ArrayList<>();
        if (inicio != null) {
            for (PortfolioTransaction t : transacoes.values()) {
                if (t.getCreatedAt() != null && t.getCreatedAt().isAfter(inicio) && !transacoesRegistradas.contains(t.getId())) {
                    semRegistro.add(Map.of(
                            "id", t.getId(),
                            "descricao", ("buy".equals(t.getTransactionType()) ? "Compra" : "Venda") + " de "
                                    + t.getQuantity() + " " + t.getStockCode(),
                            "criadoEm", t.getCreatedAt()));
                }
            }
        }

        long problemas = itens.stream().filter(i -> "INVALIDA".equals(i.get("assinatura"))
                || "DIVERGENTE".equals(i.get("conferencia")) || "AUSENTE".equals(i.get("conferencia"))).count();

        Map<String, Object> resultado = new LinkedHashMap<>();
        resultado.put("correnteIntegra", quebraEm == null);
        resultado.put("quebraEm", quebraEm);
        resultado.put("totalBlocos", todos.size());
        resultado.put("ultimoHash", todos.isEmpty() ? AssinaturaService.HASH_INICIAL : todos.get(todos.size() - 1).getHash());
        resultado.put("tudoCerto", quebraEm == null && problemas == 0 && semRegistro.isEmpty());
        resultado.put("registros", itens);
        resultado.put("operacoesSemRegistro", semRegistro);
        return resultado;
    }

    private String statusAssinatura(RegistroAssinado r, Map<Long, ChaveDigital> chaves) {
        if (r.getAssinatura() == null) {
            return "SEM_ASSINATURA";
        }
        ChaveDigital chave = chaves.get(r.getChaveId());
        boolean confere = chave != null && assinaturaService.assinaturaConfere(chave.getChavePublica(), r.getPayload(), r.getAssinatura());
        return confere ? "VALIDA" : "INVALIDA";
    }

    /** Devolve [status, detalhe]. Status: CONFERE, DIVERGENTE, AUSENTE ou NAO_SE_APLICA. */
    private String[] conferirDados(RegistroAssinado r, Map<String, Object> dados, Map<Long, PortfolioTransaction> transacoes,
                                   Set<Long> aulasConcluidas, Long ultimoReset, Set<Long> transacoesRegistradas) {
        String referencia = Objects.toString(r.getReferencia(), "");
        switch (r.getTipo()) {
            case "COMPRA", "VENDA" -> {
                Long id = idDaReferencia(referencia, "transacao:");
                PortfolioTransaction t = id == null ? null : transacoes.get(id);
                if (t == null) {
                    return new String[]{"AUSENTE", "A operação registrada não existe mais no banco."};
                }
                transacoesRegistradas.add(t.getId());
                String tipoEsperado = "COMPRA".equals(r.getTipo()) ? "buy" : "sell";
                Long quantidade = comoLong(dados.get("quantity"));
                Double preco = comoDouble(dados.get("price"));
                boolean confere = tipoEsperado.equals(t.getTransactionType())
                        && String.valueOf(dados.get("stockCode")).equals(t.getStockCode())
                        && quantidade != null && quantidade == t.getQuantity()
                        && preco != null && Math.abs(preco - t.getPricePerUnit()) < 0.005;
                return confere
                        ? new String[]{"CONFERE", null}
                        : new String[]{"DIVERGENTE", "No banco: " + t.getTransactionType() + " de " + t.getQuantity() + " "
                        + t.getStockCode() + " a R$ " + t.getPricePerUnit() + "."};
            }
            case "AULA_CONCLUIDA" -> {
                if (ultimoReset != null && r.getId() < ultimoReset) {
                    return new String[]{"NAO_SE_APLICA", "A trilha foi resetada depois desta aula."};
                }
                Long licaoId = comoLong(dados.get("licaoId"));
                return aulasConcluidas.contains(licaoId)
                        ? new String[]{"CONFERE", null}
                        : new String[]{"AUSENTE", "A aula não aparece mais como concluída no banco."};
            }
            default -> {
                return new String[]{"NAO_SE_APLICA", null};
            }
        }
    }

    private Map<String, Object> lerSemFalhar(String payload) {
        try {
            return assinaturaService.lerPayload(payload);
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static Long idDaReferencia(String referencia, String prefixo) {
        return referencia.startsWith(prefixo) ? comoLong(referencia.substring(prefixo.length())) : null;
    }
}
