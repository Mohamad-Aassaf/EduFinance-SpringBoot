package com.edufinance.backend.service;

import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.repository.PerfilRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Ofensiva: quantos dias seguidos o usuário usou a plataforma.
 *
 * Cada dia conta uma vez, no primeiro acesso (login, abrir o app ou concluir uma aula).
 * Usar no dia seguinte soma um dia; pular um dia recomeça a contagem em 1.
 * O "dia" segue o horário de Brasília, mesmo com o servidor rodando em UTC no Docker.
 */
@Service
public class OfensivaService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private MedalhaRepository medalhaRepository;

    /** Registra o uso de hoje e devolve o perfil atualizado. */
    public Perfil registrarAcesso(Perfil perfil) {
        LocalDate hoje = LocalDate.now(FUSO);
        LocalDate ultimo = perfil.getUltimoDiaAtivo();
        if (hoje.equals(ultimo)) {
            return perfil;
        }

        int ofensiva = hoje.minusDays(1).equals(ultimo) ? perfil.getOfensivaAtual() + 1 : 1;
        perfil.setOfensivaAtual(ofensiva);
        perfil.setMaiorOfensiva(Math.max(perfil.getMaiorOfensiva(), ofensiva));
        perfil.setUltimoDiaAtivo(hoje);

        if (ofensiva >= 7) {
            desbloquearMedalha(perfil.getId(), "Ofensiva 7 dias");
        }
        if (ofensiva >= 30) {
            desbloquearMedalha(perfil.getId(), "Ofensiva 30 dias");
        }
        return perfilRepository.save(perfil);
    }

    private void desbloquearMedalha(Long usuarioId, String tipo) {
        if (medalhaRepository.findByUsuarioIdAndTipoMedalha(usuarioId, tipo).isEmpty()) {
            Medalha medalha = new Medalha();
            medalha.setUsuarioId(usuarioId);
            medalha.setTipoMedalha(tipo);
            medalhaRepository.save(medalha);
        }
    }
}
