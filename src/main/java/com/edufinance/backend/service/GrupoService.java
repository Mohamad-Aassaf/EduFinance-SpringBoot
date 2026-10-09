package com.edufinance.backend.service;

import com.edufinance.backend.dto.RankingDtos.DadosGrupo;
import com.edufinance.backend.dto.RankingDtos.GrupoResumo;
import com.edufinance.backend.dto.RankingDtos.MembroGrupo;
import com.edufinance.backend.dto.RankingDtos.PaginaGrupos;
import com.edufinance.backend.dto.RankingDtos.PaginaRanking;
import com.edufinance.backend.model.AcessoGrupo;
import com.edufinance.backend.model.GrupoMembro;
import com.edufinance.backend.model.GrupoRanking;
import com.edufinance.backend.model.MetricaRanking;
import com.edufinance.backend.model.PapelGrupo;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.GrupoMembroRepository;
import com.edufinance.backend.repository.GrupoRankingRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Regras dos grupos de ranking: criação, entrada, saída e administração.
 *
 * Todas as permissões são conferidas aqui, no servidor. A interface esconde
 * botões de quem não pode usá-los, mas isso é só conveniência.
 */
@Service
public class GrupoService {

    public static final Set<String> ICONES = Set.of(
            "trophy", "rocket", "star", "flame", "crown", "target", "piggy", "chart");

    static final int NOME_MIN = 3;
    static final int NOME_MAX = 60;
    static final int DESCRICAO_MAX = 280;
    static final int SENHA_MIN = 4;
    static final int SENHA_MAX = 72; // limite do BCrypt
    static final int TAMANHO_CONVITE = 8;

    // Sem 0/O, 1/I/L: evita confusão ao ditar ou digitar o código
    private static final String ALFABETO_CONVITE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    private final GrupoRankingRepository grupoRepository;
    private final GrupoMembroRepository membroRepository;
    private final RankingService rankingService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public GrupoService(GrupoRankingRepository grupoRepository,
                        GrupoMembroRepository membroRepository,
                        RankingService rankingService,
                        PasswordEncoder passwordEncoder) {
        this.grupoRepository = grupoRepository;
        this.membroRepository = membroRepository;
        this.rankingService = rankingService;
        this.passwordEncoder = passwordEncoder;
    }

    // ── Criação e edição ────────────────────────────────────────────

    @Transactional
    public GrupoResumo criar(Perfil eu, DadosGrupo dados) {
        GrupoRanking grupo = new GrupoRanking();
        grupo.setCriadorId(eu.getId());
        grupo.setCodigoConvite(novoCodigoConvite());
        aplicarDados(grupo, dados);
        grupo = grupoRepository.save(grupo);

        // Quem cria o grupo já entra como administrador
        GrupoMembro membro = new GrupoMembro(grupo, eu, PapelGrupo.ADMIN);
        membroRepository.save(membro);
        return resumo(grupo, eu, Optional.of(membro));
    }

    @Transactional
    public GrupoResumo atualizar(Perfil eu, Long grupoId, DadosGrupo dados) {
        GrupoRanking grupo = buscar(grupoId);
        exigirAdmin(grupo, eu);
        aplicarDados(grupo, dados);
        return resumo(grupoRepository.save(grupo), eu);
    }

    @Transactional
    public GrupoResumo regenerarConvite(Perfil eu, Long grupoId) {
        GrupoRanking grupo = buscar(grupoId);
        exigirAdmin(grupo, eu);
        grupo.setCodigoConvite(novoCodigoConvite());
        return resumo(grupoRepository.save(grupo), eu);
    }

    @Transactional
    public void excluir(Perfil eu, Long grupoId) {
        GrupoRanking grupo = buscar(grupoId);
        exigirAdmin(grupo, eu);
        // As participações são apagadas pelo banco (ON DELETE CASCADE)
        grupoRepository.delete(grupo);
    }

    // ── Consulta ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GrupoResumo> meusGrupos(Perfil eu) {
        return membroRepository.listarDoPerfil(eu.getId()).stream()
                .map(m -> resumo(m.getGrupo(), eu, Optional.of(m)))
                .toList();
    }

    @Transactional(readOnly = true)
    public PaginaGrupos descobrir(Perfil eu, String busca, int pagina, int tamanho) {
        int paginaSegura = Math.max(pagina, 0);
        int tamanhoSeguro = Math.min(Math.max(tamanho, 1), RankingService.TAMANHO_MAXIMO);
        String padrao = RankingService.padraoDeBusca(busca);

        Page<GrupoRanking> grupos = grupoRepository.buscarVisiveis(
                padrao == null ? "%" : padrao, PageRequest.of(paginaSegura, tamanhoSeguro));
        List<GrupoResumo> itens = grupos.getContent().stream().map(g -> resumo(g, eu)).toList();
        return new PaginaGrupos(itens, paginaSegura, tamanhoSeguro, grupos.getTotalElements(), grupos.getTotalPages());
    }

    @Transactional(readOnly = true)
    public GrupoResumo detalhe(Perfil eu, Long grupoId) {
        GrupoRanking grupo = buscar(grupoId);
        Optional<GrupoMembro> membro = membroRepository.findByGrupoIdAndPerfilId(grupoId, eu.getId());
        // Grupo só por convite não revela nem que existe para quem está de fora
        if (membro.isEmpty() && grupo.getAcesso() == AcessoGrupo.CONVITE) {
            throw naoEncontrado();
        }
        return resumo(grupo, eu, membro);
    }

    /** Prévia mostrada antes de aceitar um convite. */
    @Transactional(readOnly = true)
    public GrupoResumo previaDoConvite(Perfil eu, String codigo) {
        return resumo(buscarPorConvite(codigo), eu);
    }

    @Transactional(readOnly = true)
    public PaginaRanking ranking(Perfil eu, Long grupoId, String busca, int pagina, int tamanho) {
        GrupoRanking grupo = buscar(grupoId);
        boolean souMembro = membroRepository.findByGrupoIdAndPerfilId(grupoId, eu.getId()).isPresent();
        if (!souMembro) {
            if (grupo.getAcesso() == AcessoGrupo.CONVITE) {
                throw naoEncontrado();
            }
            if (grupo.getAcesso() == AcessoGrupo.SENHA) {
                throw new RegraNegocioException(HttpStatus.FORBIDDEN, "Entre no grupo para ver a classificação.");
            }
        }
        return rankingService.classificar(RankingService.Filtro.grupo(grupoId), grupo.getMetrica(),
                eu.getId(), busca, pagina, tamanho);
    }

    @Transactional(readOnly = true)
    public List<MembroGrupo> membros(Perfil eu, Long grupoId) {
        GrupoRanking grupo = buscar(grupoId);
        exigirMembro(grupo, eu);
        return membroRepository.listarDoGrupo(grupoId).stream()
                .map(m -> new MembroGrupo(m.getPerfil().getId(), m.getPerfil().getNome(),
                        m.getPerfil().getAvatarUrl(), m.getPapel().name(), m.getEntrouEm()))
                .toList();
    }

    // ── Entrada e saída ─────────────────────────────────────────────

    @Transactional
    public GrupoResumo entrar(Perfil eu, Long grupoId, String senha) {
        GrupoRanking grupo = buscar(grupoId);
        exigirNaoMembro(grupo, eu);
        switch (grupo.getAcesso()) {
            case ABERTO -> { }
            case SENHA -> {
                if (senha == null || senha.isEmpty() || grupo.getSenhaHash() == null
                        || !passwordEncoder.matches(senha, grupo.getSenhaHash())) {
                    throw new RegraNegocioException(HttpStatus.FORBIDDEN, "Senha do grupo incorreta.");
                }
            }
            // Mesma resposta de grupo inexistente: não confirma que o grupo existe
            case CONVITE -> throw naoEncontrado();
        }
        return adicionarMembro(grupo, eu);
    }

    @Transactional
    public GrupoResumo entrarPorConvite(Perfil eu, String codigo) {
        return adicionarMembro(buscarPorConvite(codigo), eu);
    }

    @Transactional
    public void sair(Perfil eu, Long grupoId) {
        GrupoRanking grupo = buscar(grupoId);
        GrupoMembro membro = exigirMembro(grupo, eu);
        membroRepository.delete(membro);
        membroRepository.flush();

        List<GrupoMembro> restantes = membroRepository.listarDoGrupo(grupoId);
        if (restantes.isEmpty()) {
            // Grupo sem ninguém não tem como ser administrado: é removido
            grupoRepository.delete(grupo);
            return;
        }
        boolean semAdmin = restantes.stream().noneMatch(m -> m.getPapel() == PapelGrupo.ADMIN);
        if (semAdmin) {
            // O membro mais antigo assume a administração
            GrupoMembro sucessor = restantes.get(0);
            sucessor.setPapel(PapelGrupo.ADMIN);
            membroRepository.save(sucessor);
        }
    }

    // ── Administração de membros ────────────────────────────────────

    @Transactional
    public void removerMembro(Perfil eu, Long grupoId, Long perfilId) {
        GrupoRanking grupo = buscar(grupoId);
        exigirAdmin(grupo, eu);
        if (eu.getId().equals(perfilId)) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Para deixar o grupo, use a opção de sair.");
        }
        GrupoMembro alvo = membroRepository.findByGrupoIdAndPerfilId(grupoId, perfilId)
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Esta pessoa não está no grupo."));
        membroRepository.delete(alvo);
    }

    @Transactional
    public void alterarPapel(Perfil eu, Long grupoId, Long perfilId, PapelGrupo papel) {
        GrupoRanking grupo = buscar(grupoId);
        exigirAdmin(grupo, eu);
        GrupoMembro alvo = membroRepository.findByGrupoIdAndPerfilId(grupoId, perfilId)
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Esta pessoa não está no grupo."));
        boolean rebaixandoUltimoAdmin = alvo.getPapel() == PapelGrupo.ADMIN && papel == PapelGrupo.MEMBRO
                && membroRepository.countByGrupoIdAndPapel(grupoId, PapelGrupo.ADMIN.name()) <= 1;
        if (rebaixandoUltimoAdmin) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "O grupo precisa de pelo menos um administrador.");
        }
        alvo.setPapel(papel);
        membroRepository.save(alvo);
    }

    // ── Apoio ───────────────────────────────────────────────────────

    private void exigirNaoMembro(GrupoRanking grupo, Perfil eu) {
        if (membroRepository.findByGrupoIdAndPerfilId(grupo.getId(), eu.getId()).isPresent()) {
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Você já faz parte deste grupo.");
        }
    }

    private GrupoResumo adicionarMembro(GrupoRanking grupo, Perfil eu) {
        exigirNaoMembro(grupo, eu);
        GrupoMembro membro = new GrupoMembro(grupo, eu, PapelGrupo.MEMBRO);
        try {
            membroRepository.saveAndFlush(membro);
        } catch (DataIntegrityViolationException e) {
            // Duas entradas ao mesmo tempo: a restrição única do banco barra a segunda
            throw new RegraNegocioException(HttpStatus.CONFLICT, "Você já faz parte deste grupo.");
        }
        return resumo(grupo, eu, Optional.of(membro));
    }

    private void aplicarDados(GrupoRanking grupo, DadosGrupo dados) {
        if (dados == null) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Dados do grupo ausentes.");
        }
        String nome = limpar(dados.nome());
        if (nome == null || nome.length() < NOME_MIN || nome.length() > NOME_MAX) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST,
                    "O nome do grupo deve ter entre " + NOME_MIN + " e " + NOME_MAX + " caracteres.");
        }
        String descricao = limpar(dados.descricao());
        if (descricao != null && descricao.length() > DESCRICAO_MAX) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST,
                    "A descrição deve ter no máximo " + DESCRICAO_MAX + " caracteres.");
        }
        String icone = dados.icone() == null || dados.icone().isBlank()
                ? "trophy" : dados.icone().trim().toLowerCase(Locale.ROOT);
        if (!ICONES.contains(icone)) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Ícone inválido.");
        }
        AcessoGrupo acesso = AcessoGrupo.de(dados.acesso());
        MetricaRanking metrica = MetricaRanking.de(dados.metrica());

        if (acesso == AcessoGrupo.SENHA) {
            String senha = dados.senha();
            boolean informouSenha = senha != null && !senha.isEmpty();
            if (informouSenha) {
                if (senha.length() < SENHA_MIN || senha.length() > SENHA_MAX) {
                    throw new RegraNegocioException(HttpStatus.BAD_REQUEST,
                            "A senha do grupo deve ter entre " + SENHA_MIN + " e " + SENHA_MAX + " caracteres.");
                }
                grupo.setSenhaHash(passwordEncoder.encode(senha));
            } else if (grupo.getSenhaHash() == null) {
                // Ao editar, senha em branco mantém a atual; ao criar, ela é obrigatória
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Defina uma senha para o grupo.");
            }
        } else {
            grupo.setSenhaHash(null);
        }

        grupo.setNome(nome);
        grupo.setDescricao(descricao);
        grupo.setIcone(icone);
        grupo.setAcesso(acesso);
        grupo.setMetrica(metrica);
    }

    private GrupoResumo resumo(GrupoRanking grupo, Perfil eu) {
        return resumo(grupo, eu, membroRepository.findByGrupoIdAndPerfilId(grupo.getId(), eu.getId()));
    }

    private GrupoResumo resumo(GrupoRanking grupo, Perfil eu, Optional<GrupoMembro> membro) {
        boolean souMembro = membro.isPresent();
        Long minhaPosicao = souMembro
                ? rankingService.posicaoDe(RankingService.Filtro.grupo(grupo.getId()), grupo.getMetrica(), eu.getId())
                : null;
        return new GrupoResumo(
                grupo.getId(),
                grupo.getNome(),
                grupo.getDescricao(),
                grupo.getIcone(),
                grupo.getAcesso().name(),
                grupo.getMetrica().name(),
                membroRepository.countByGrupoId(grupo.getId()),
                souMembro,
                membro.map(m -> m.getPapel().name()).orElse(null),
                minhaPosicao,
                souMembro ? grupo.getCodigoConvite() : null, // quem está de fora não vê o convite
                grupo.getCriadoEm());
    }

    private GrupoRanking buscar(Long grupoId) {
        return grupoRepository.findById(grupoId).orElseThrow(GrupoService::naoEncontrado);
    }

    private GrupoRanking buscarPorConvite(String codigo) {
        String normalizado = codigo == null ? "" : codigo.trim().toUpperCase(Locale.ROOT);
        if (normalizado.isEmpty() || normalizado.length() > 12) {
            throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Convite inválido ou expirado.");
        }
        return grupoRepository.findByCodigoConvite(normalizado)
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Convite inválido ou expirado."));
    }

    private GrupoMembro exigirMembro(GrupoRanking grupo, Perfil eu) {
        Optional<GrupoMembro> membro = membroRepository.findByGrupoIdAndPerfilId(grupo.getId(), eu.getId());
        if (membro.isEmpty()) {
            if (grupo.getAcesso() == AcessoGrupo.CONVITE) {
                throw naoEncontrado();
            }
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "Você não faz parte deste grupo.");
        }
        return membro.get();
    }

    private void exigirAdmin(GrupoRanking grupo, Perfil eu) {
        if (exigirMembro(grupo, eu).getPapel() != PapelGrupo.ADMIN) {
            throw new RegraNegocioException(HttpStatus.FORBIDDEN, "Apenas administradores do grupo podem fazer isso.");
        }
    }

    private String novoCodigoConvite() {
        String codigo;
        do {
            StringBuilder sb = new StringBuilder(TAMANHO_CONVITE);
            for (int i = 0; i < TAMANHO_CONVITE; i++) {
                sb.append(ALFABETO_CONVITE.charAt(random.nextInt(ALFABETO_CONVITE.length())));
            }
            codigo = sb.toString();
        } while (grupoRepository.existsByCodigoConvite(codigo));
        return codigo;
    }

    private static RegraNegocioException naoEncontrado() {
        return new RegraNegocioException(HttpStatus.NOT_FOUND, "Grupo não encontrado.");
    }

    // Tira espaços das pontas e colapsa os internos; texto vazio vira null
    static String limpar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpo = texto.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        return limpo.isEmpty() ? null : limpo;
    }
}
