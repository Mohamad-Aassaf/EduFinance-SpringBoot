package com.edufinance.backend.service;

import com.edufinance.backend.dto.RankingDtos.DadosGrupo;
import com.edufinance.backend.dto.RankingDtos.GrupoResumo;
import com.edufinance.backend.dto.RankingDtos.PaginaRanking;
import com.edufinance.backend.model.AcessoGrupo;
import com.edufinance.backend.model.GrupoMembro;
import com.edufinance.backend.model.GrupoRanking;
import com.edufinance.backend.model.MetricaRanking;
import com.edufinance.backend.model.PapelGrupo;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.GrupoMembroRepository;
import com.edufinance.backend.repository.GrupoRankingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GrupoServiceTest {

    @Mock
    private GrupoRankingRepository grupoRepository;

    @Mock
    private GrupoMembroRepository membroRepository;

    // Substituto simples do RankingService: só conta as consultas de classificação
    private static class RankingFalso extends RankingService {
        int classificacoes = 0;

        @Override
        public PaginaRanking classificar(Filtro filtro, MetricaRanking metrica, Long perfilAtualId,
                                         String busca, int pagina, int tamanho) {
            classificacoes++;
            return null;
        }

        @Override
        public Long posicaoDe(Filtro filtro, MetricaRanking metrica, Long perfilId) {
            return 1L;
        }
    }

    private final RankingFalso rankingService = new RankingFalso();

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    private GrupoService service;
    private Perfil ana;
    private Perfil bruno;
    private Perfil carla;

    @BeforeEach
    void preparar() {
        service = new GrupoService(grupoRepository, membroRepository, rankingService, passwordEncoder);
        ana = perfil(1L, "Ana");
        bruno = perfil(2L, "Bruno");
        carla = perfil(3L, "Carla");

        when(grupoRepository.save(any(GrupoRanking.class))).thenAnswer(inv -> {
            GrupoRanking g = inv.getArgument(0);
            if (g.getId() == null) {
                g.setId(10L);
            }
            return g;
        });
    }

    // ── Criação ─────────────────────────────────────────────────────

    @Test
    void criarGrupoAbertoTornaOCriadorAdministrador() {
        GrupoResumo resumo = service.criar(ana, dados("Amigos da Bolsa", "ABERTO", null));

        ArgumentCaptor<GrupoMembro> membro = ArgumentCaptor.forClass(GrupoMembro.class);
        verify(membroRepository).save(membro.capture());
        assertEquals(PapelGrupo.ADMIN, membro.getValue().getPapel());
        assertSame(ana, membro.getValue().getPerfil());
        assertEquals("Amigos da Bolsa", resumo.nome());
        assertEquals("ABERTO", resumo.acesso());
    }

    @Test
    void criarGrupoComSenhaGuardaApenasOHash() {
        service.criar(ana, dados("Turma Fechada", "SENHA", "segredo"));

        ArgumentCaptor<GrupoRanking> grupo = ArgumentCaptor.forClass(GrupoRanking.class);
        verify(grupoRepository).save(grupo.capture());
        String hash = grupo.getValue().getSenhaHash();
        assertNotNull(hash);
        assertNotEquals("segredo", hash);
        assertTrue(passwordEncoder.matches("segredo", hash));
    }

    @Test
    void criarGrupoComSenhaExigeSenha() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.criar(ana, dados("Turma Fechada", "SENHA", null)));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.criar(ana, dados("Turma Fechada", "SENHA", "123")));
    }

    @Test
    void criarGrupoValidaNomeIconeAcessoEMetrica() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.criar(ana, dados("ab", "ABERTO", null)));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.criar(ana, dados("   ", "ABERTO", null)));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.criar(ana, dados("x".repeat(61), "ABERTO", null)));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.criar(ana, dados("Grupo", "SECRETO", null)));
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.criar(ana, new DadosGrupo("Grupo", null, "caveira", "ABERTO", "XP", null)));
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.criar(ana, new DadosGrupo("Grupo", null, "trophy", "ABERTO", "DINHEIRO", null)));
        verify(grupoRepository, never()).save(any());
    }

    @Test
    void trocarParaAcessoAbertoApagaASenha() {
        GrupoRanking grupo = grupo(AcessoGrupo.SENHA, "segredo");
        membro(grupo, ana, PapelGrupo.ADMIN);

        service.atualizar(ana, grupo.getId(), dados("Agora Aberto", "ABERTO", null));

        assertNull(grupo.getSenhaHash());
        assertEquals(AcessoGrupo.ABERTO, grupo.getAcesso());
    }

    @Test
    void editarSemInformarSenhaMantemASenhaAtual() {
        GrupoRanking grupo = grupo(AcessoGrupo.SENHA, "segredo");
        membro(grupo, ana, PapelGrupo.ADMIN);

        service.atualizar(ana, grupo.getId(), dados("Novo Nome", "SENHA", ""));

        assertTrue(passwordEncoder.matches("segredo", grupo.getSenhaHash()));
        assertEquals("Novo Nome", grupo.getNome());
    }

    // ── Entrada ─────────────────────────────────────────────────────

    @Test
    void qualquerUmEntraEmGrupoAberto() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);

        service.entrar(bruno, grupo.getId(), null);

        ArgumentCaptor<GrupoMembro> membro = ArgumentCaptor.forClass(GrupoMembro.class);
        verify(membroRepository).saveAndFlush(membro.capture());
        assertEquals(PapelGrupo.MEMBRO, membro.getValue().getPapel());
    }

    @Test
    void grupoComSenhaRecusaSenhaErradaOuAusente() {
        GrupoRanking grupo = grupo(AcessoGrupo.SENHA, "segredo");

        assertStatus(HttpStatus.FORBIDDEN, () -> service.entrar(bruno, grupo.getId(), "errada"));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.entrar(bruno, grupo.getId(), ""));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.entrar(bruno, grupo.getId(), null));
        verify(membroRepository, never()).saveAndFlush(any());
    }

    @Test
    void grupoComSenhaAceitaSenhaCorreta() {
        GrupoRanking grupo = grupo(AcessoGrupo.SENHA, "segredo");

        service.entrar(bruno, grupo.getId(), "segredo");

        verify(membroRepository).saveAndFlush(any(GrupoMembro.class));
    }

    @Test
    void grupoSoPorConviteNaoAceitaEntradaDiretaNemRevelaQueExiste() {
        GrupoRanking grupo = grupo(AcessoGrupo.CONVITE, null);

        assertStatus(HttpStatus.NOT_FOUND, () -> service.entrar(bruno, grupo.getId(), null));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.detalhe(bruno, grupo.getId()));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.ranking(bruno, grupo.getId(), null, 0, 20));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.membros(bruno, grupo.getId()));
        verify(membroRepository, never()).saveAndFlush(any());
    }

    @Test
    void conviteValidoEntraEmQualquerTipoDeGrupo() {
        GrupoRanking grupo = grupo(AcessoGrupo.CONVITE, null);
        when(grupoRepository.findByCodigoConvite("ABCD2345")).thenReturn(Optional.of(grupo));

        // O código é aceito com espaços e em minúsculas
        service.entrarPorConvite(bruno, "  abcd2345 ");

        verify(membroRepository).saveAndFlush(any(GrupoMembro.class));
    }

    @Test
    void conviteInvalidoERecusado() {
        when(grupoRepository.findByCodigoConvite(any())).thenReturn(Optional.empty());

        assertStatus(HttpStatus.NOT_FOUND, () -> service.entrarPorConvite(bruno, "NAOEXISTE"));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.entrarPorConvite(bruno, ""));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.entrarPorConvite(bruno, null));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.previaDoConvite(bruno, "NAOEXISTE"));
    }

    @Test
    void naoEntraDuasVezesNoMesmoGrupo() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        membro(grupo, bruno, PapelGrupo.MEMBRO);

        assertStatus(HttpStatus.CONFLICT, () -> service.entrar(bruno, grupo.getId(), null));
        verify(membroRepository, never()).saveAndFlush(any());
    }

    // ── Saída ───────────────────────────────────────────────────────

    @Test
    void quandoOUltimoMembroSaiOGrupoEApagado() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        GrupoMembro membroAna = membro(grupo, ana, PapelGrupo.ADMIN);
        when(membroRepository.listarDoGrupo(grupo.getId())).thenReturn(List.of());

        service.sair(ana, grupo.getId());

        verify(membroRepository).delete(membroAna);
        verify(grupoRepository).delete(grupo);
    }

    @Test
    void quandoOUnicoAdminSaiOMembroMaisAntigoAssume() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        membro(grupo, ana, PapelGrupo.ADMIN);
        GrupoMembro membroBruno = membro(grupo, bruno, PapelGrupo.MEMBRO);
        GrupoMembro membroCarla = membro(grupo, carla, PapelGrupo.MEMBRO);
        when(membroRepository.listarDoGrupo(grupo.getId())).thenReturn(List.of(membroBruno, membroCarla));

        service.sair(ana, grupo.getId());

        assertEquals(PapelGrupo.ADMIN, membroBruno.getPapel());
        assertEquals(PapelGrupo.MEMBRO, membroCarla.getPapel());
        verify(grupoRepository, never()).delete(any());
    }

    @Test
    void quemNaoEMembroNaoConsegueSair() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);

        assertStatus(HttpStatus.FORBIDDEN, () -> service.sair(bruno, grupo.getId()));
    }

    // ── Permissões de administração ─────────────────────────────────

    @Test
    void membroComumNaoAdministraOGrupo() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        membro(grupo, ana, PapelGrupo.ADMIN);
        membro(grupo, bruno, PapelGrupo.MEMBRO);

        assertStatus(HttpStatus.FORBIDDEN, () -> service.removerMembro(bruno, grupo.getId(), ana.getId()));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.alterarPapel(bruno, grupo.getId(), bruno.getId(), PapelGrupo.ADMIN));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.atualizar(bruno, grupo.getId(), dados("Invadido", "ABERTO", null)));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.regenerarConvite(bruno, grupo.getId()));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.excluir(bruno, grupo.getId()));
        verify(membroRepository, never()).delete(any());
        verify(grupoRepository, never()).delete(any());
    }

    @Test
    void quemEstaDeForaNaoAdministraOGrupo() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        membro(grupo, ana, PapelGrupo.ADMIN);

        assertStatus(HttpStatus.FORBIDDEN, () -> service.removerMembro(carla, grupo.getId(), ana.getId()));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.excluir(carla, grupo.getId()));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.membros(carla, grupo.getId()));
    }

    @Test
    void adminRemoveMembroMasNaoASiMesmo() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        membro(grupo, ana, PapelGrupo.ADMIN);
        GrupoMembro membroBruno = membro(grupo, bruno, PapelGrupo.MEMBRO);

        service.removerMembro(ana, grupo.getId(), bruno.getId());
        verify(membroRepository).delete(membroBruno);

        assertStatus(HttpStatus.BAD_REQUEST, () -> service.removerMembro(ana, grupo.getId(), ana.getId()));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.removerMembro(ana, grupo.getId(), carla.getId()));
    }

    @Test
    void oUltimoAdminNaoPodeSerRebaixado() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        GrupoMembro membroAna = membro(grupo, ana, PapelGrupo.ADMIN);
        when(membroRepository.countByGrupoIdAndPapel(grupo.getId(), "ADMIN")).thenReturn(1L);

        assertStatus(HttpStatus.CONFLICT, () -> service.alterarPapel(ana, grupo.getId(), ana.getId(), PapelGrupo.MEMBRO));
        assertEquals(PapelGrupo.ADMIN, membroAna.getPapel());
    }

    @Test
    void adminPromoveOutroMembro() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        membro(grupo, ana, PapelGrupo.ADMIN);
        GrupoMembro membroBruno = membro(grupo, bruno, PapelGrupo.MEMBRO);

        service.alterarPapel(ana, grupo.getId(), bruno.getId(), PapelGrupo.ADMIN);

        assertEquals(PapelGrupo.ADMIN, membroBruno.getPapel());
    }

    // ── Visibilidade ────────────────────────────────────────────────

    @Test
    void conviteSoApareceParaMembros() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);
        membro(grupo, ana, PapelGrupo.ADMIN);

        assertEquals("ABCD2345", service.detalhe(ana, grupo.getId()).codigoConvite());

        GrupoResumo deFora = service.detalhe(bruno, grupo.getId());
        assertNull(deFora.codigoConvite());
        assertFalse(deFora.souMembro());
        assertNull(deFora.meuPapel());
    }

    @Test
    void rankingDeGrupoComSenhaSoParaMembros() {
        GrupoRanking grupo = grupo(AcessoGrupo.SENHA, "segredo");
        membro(grupo, ana, PapelGrupo.ADMIN);

        assertStatus(HttpStatus.FORBIDDEN, () -> service.ranking(bruno, grupo.getId(), null, 0, 20));
        assertEquals(0, rankingService.classificacoes);

        service.ranking(ana, grupo.getId(), null, 0, 20);
        assertEquals(1, rankingService.classificacoes);
    }

    @Test
    void rankingDeGrupoAbertoEVisivelParaTodos() {
        GrupoRanking grupo = grupo(AcessoGrupo.ABERTO, null);

        service.ranking(bruno, grupo.getId(), null, 0, 20);

        assertEquals(1, rankingService.classificacoes);
    }

    // ── Apoio ───────────────────────────────────────────────────────

    private static Perfil perfil(Long id, String nome) {
        Perfil p = new Perfil();
        p.setId(id);
        p.setNome(nome);
        p.setEmail(nome.toLowerCase() + "@teste.com");
        return p;
    }

    private static DadosGrupo dados(String nome, String acesso, String senha) {
        return new DadosGrupo(nome, "Descrição", "trophy", acesso, "XP", senha);
    }

    private GrupoRanking grupo(AcessoGrupo acesso, String senha) {
        GrupoRanking g = new GrupoRanking();
        g.setId(10L);
        g.setNome("Grupo de Teste");
        g.setAcesso(acesso);
        g.setMetrica(MetricaRanking.XP);
        g.setCodigoConvite("ABCD2345");
        g.setCriadorId(ana.getId());
        if (senha != null) {
            g.setSenhaHash(passwordEncoder.encode(senha));
        }
        when(grupoRepository.findById(10L)).thenReturn(Optional.of(g));
        return g;
    }

    private GrupoMembro membro(GrupoRanking grupo, Perfil perfil, PapelGrupo papel) {
        GrupoMembro m = new GrupoMembro(grupo, perfil, papel);
        when(membroRepository.findByGrupoIdAndPerfilId(grupo.getId(), perfil.getId())).thenReturn(Optional.of(m));
        return m;
    }

    private static void assertStatus(HttpStatus esperado, Runnable acao) {
        RegraNegocioException e = assertThrows(RegraNegocioException.class, acao::run);
        assertEquals(esperado, e.getStatus());
    }
}
