package com.edufinance.backend.service;

import com.edufinance.backend.model.EscopoRanking;
import com.edufinance.backend.model.MetricaRanking;
import com.edufinance.backend.model.Perfil;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Regras de ranking que não dependem do banco: escopos, métricas e busca
class RankingRegrasTest {

    @Test
    void cadaEscopoExigeOsCamposDeLocalizacaoCertos() {
        Perfil semLocal = new Perfil();
        assertEquals(List.of(), EscopoRanking.GLOBAL.camposFaltando(semLocal));
        assertEquals(List.of("pais"), EscopoRanking.PAIS.camposFaltando(semLocal));
        assertEquals(List.of("pais", "estado"), EscopoRanking.ESTADO.camposFaltando(semLocal));
        assertEquals(List.of("pais", "estado", "cidade"), EscopoRanking.CIDADE.camposFaltando(semLocal));

        Perfil soPais = new Perfil();
        soPais.setPais("BR");
        soPais.setEstado("  ");
        assertEquals(List.of(), EscopoRanking.PAIS.camposFaltando(soPais));
        assertEquals(List.of("estado", "cidade"), EscopoRanking.CIDADE.camposFaltando(soPais));
    }

    @Test
    void filtroDeCidadeComparaPaisEstadoECidade() {
        Perfil perfil = new Perfil();
        perfil.setPais("BR");
        perfil.setEstado("SP");
        perfil.setCidade(" Campinas ");

        RankingService.Filtro filtro = RankingService.Filtro.escopo(EscopoRanking.CIDADE, perfil);

        assertEquals("LOWER(p.pais) = LOWER(:pais) AND LOWER(p.estado) = LOWER(:estado) AND LOWER(p.cidade) = LOWER(:cidade)",
                filtro.condicao());
        assertEquals(Map.of("pais", "BR", "estado", "SP", "cidade", "Campinas"), filtro.parametros());
    }

    @Test
    void filtroGlobalNaoRestringeNinguem() {
        RankingService.Filtro filtro = RankingService.Filtro.escopo(EscopoRanking.GLOBAL, new Perfil());
        assertEquals("1 = 1", filtro.condicao());
        assertTrue(filtro.parametros().isEmpty());
    }

    @Test
    void escopoEMetricaDesconhecidosSaoRecusados() {
        assertEquals(EscopoRanking.GLOBAL, EscopoRanking.de(null));
        assertEquals(EscopoRanking.CIDADE, EscopoRanking.de(" cidade "));
        assertEquals(MetricaRanking.XP, MetricaRanking.de(""));
        assertEquals(MetricaRanking.SALDO, MetricaRanking.de("saldo"));

        RegraNegocioException escopo = assertThrows(RegraNegocioException.class, () -> EscopoRanking.de("bairro"));
        assertEquals(HttpStatus.BAD_REQUEST, escopo.getStatus());
        RegraNegocioException metrica = assertThrows(RegraNegocioException.class,
                () -> MetricaRanking.de("xp; DROP TABLE perfis"));
        assertEquals(HttpStatus.BAD_REQUEST, metrica.getStatus());
    }

    @Test
    void buscaEscapaOsCuringasDoLike() {
        assertNull(RankingService.padraoDeBusca(null));
        assertNull(RankingService.padraoDeBusca("   "));
        assertEquals("%ana%", RankingService.padraoDeBusca(" ana "));
        assertEquals("%100!% !_ok!!%", RankingService.padraoDeBusca("100% _ok!"));
    }
}
