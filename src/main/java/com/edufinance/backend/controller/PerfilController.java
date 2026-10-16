package com.edufinance.backend.controller;

import com.edufinance.backend.model.FotoPerfil;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.FotoPerfilRepository;
import com.edufinance.backend.model.Medalha;
import com.edufinance.backend.service.OfensivaService;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.MedalhaRepository;
import com.edufinance.backend.dto.RankingDtos.DadosLocalizacao;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/perfis")
@CrossOrigin(origins = "*")
public class PerfilController {

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private MedalhaRepository medalhaRepository;

    @Autowired
    private OfensivaService ofensivaService;

    @Autowired
    private UsuarioAtualService usuarioAtual;

    @Autowired
    private FotoPerfilRepository fotoPerfilRepository;

    private static final Set<String> TIPOS_FOTO = Set.of("image/jpeg", "image/png", "image/webp");
    private static final int TAMANHO_MAXIMO_FOTO = 512 * 1024; // o frontend já reduz para ~256x256

    /*
     * Troca a foto de perfil do usuário logado.
     * Recebe a imagem como data URL ("data:image/jpeg;base64,...") e guarda os bytes no banco.
     * O avatarUrl ganha um ?v= novo a cada troca, para o navegador não mostrar a foto antiga do cache.
     */
    @PutMapping("/me/foto")
    public ResponseEntity<Perfil> atualizarFoto(@RequestBody Map<String, String> request) {
        Perfil perfil = usuarioAtual.exigir();
        String imagem = request.get("imagem");
        if (imagem == null || !imagem.startsWith("data:") || !imagem.contains(";base64,")) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Envie a foto como imagem JPG, PNG ou WEBP.");
        }

        String tipo = imagem.substring(5, imagem.indexOf(';'));
        if (!TIPOS_FOTO.contains(tipo)) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Formato de imagem não aceito. Use JPG, PNG ou WEBP.");
        }
        byte[] dados;
        try {
            dados = Base64.getDecoder().decode(imagem.substring(imagem.indexOf(',') + 1));
        } catch (IllegalArgumentException e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Não foi possível ler a imagem enviada.");
        }
        if (dados.length == 0 || dados.length > TAMANHO_MAXIMO_FOTO) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "A foto deve ter no máximo 512 KB.");
        }

        fotoPerfilRepository.save(new FotoPerfil(perfil.getId(), tipo, dados));
        perfil.setAvatarUrl("/api/perfis/" + perfil.getId() + "/foto?v=" + System.currentTimeMillis());
        return ResponseEntity.ok(perfilRepository.save(perfil));
    }

    // Remove a foto; o avatar volta a mostrar a inicial do nome
    @DeleteMapping("/me/foto")
    public ResponseEntity<Perfil> removerFoto() {
        Perfil perfil = usuarioAtual.exigir();
        fotoPerfilRepository.deleteById(perfil.getId());
        perfil.setAvatarUrl(null);
        return ResponseEntity.ok(perfilRepository.save(perfil));
    }

    // Imagem da foto de perfil (pública, como no ranking)
    @GetMapping("/{id}/foto")
    public ResponseEntity<byte[]> getFoto(@PathVariable Long id) {
        return fotoPerfilRepository.findById(id)
                .map(foto -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(foto.getTipo()))
                        // Cada troca muda o ?v= da URL, então a mesma URL pode ficar em cache por bastante tempo
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                        .body(foto.getDados()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Retorna as medalhas conquistadas por um usuário
    @GetMapping("/{id}/medalhas")
    public List<Medalha> getMedalhas(@PathVariable Long id) {
        return medalhaRepository.findByUsuarioId(id);
    }

    // Retorna o perfil do usuário logado (baseado no token JWT)
    @GetMapping("/me")
    public ResponseEntity<Perfil> getMyProfile() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email;
        if (principal instanceof UserDetails) {
            email = ((UserDetails) principal).getUsername();
        } else {
            email = principal.toString();
        }
        
        // Abrir o app conta como uso do dia para a ofensiva
        Optional<Perfil> perfilOpt = perfilRepository.findByEmail(email).map(ofensivaService::registrarAcesso);
        return perfilOpt.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Retorna detalhes de um perfil por ID
    @GetMapping("/{id}")
    public ResponseEntity<Perfil> getPerfil(@PathVariable Long id) {
        Optional<Perfil> perfilOpt = perfilRepository.findById(id);
        if (perfilOpt.isPresent()) {
            return ResponseEntity.ok(perfilOpt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Retorna a lista de perfis ordenada pelo XP decrescente (Ranking)
    @GetMapping("/ranking")
    public List<Perfil> getRanking() {
        return perfilRepository.findAllByOrderByXpDesc();
    }

    // Atualiza nome ou imagem de avatar do perfil
    @PutMapping("/{id}")
    public ResponseEntity<Perfil> updateProfile(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        Optional<Perfil> perfilOpt = perfilRepository.findById(id);
        if (perfilOpt.isPresent()) {
            Perfil perfil = perfilOpt.get();
            if (request.containsKey("nome")) {
                perfil.setNome(request.get("nome"));
            }
            if (request.containsKey("name")) {
                perfil.setNome(request.get("name"));
            }
            if (request.containsKey("avatarUrl")) {
                perfil.setAvatarUrl(request.get("avatarUrl"));
            }
            if (request.containsKey("avatar_url")) {
                perfil.setAvatarUrl(request.get("avatar_url"));
            }
            Perfil atualizado = perfilRepository.save(perfil);
            return ResponseEntity.ok(atualizado);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /*
     * Atualiza a localização do usuário logado, usada nos rankings regionais.
     * O perfil vem do token, então ninguém altera a localização de outra pessoa.
     * Campos em branco apagam a informação; cidade exige estado e estado exige país.
     */
    @PutMapping("/me/localizacao")
    public ResponseEntity<Perfil> updateLocalizacao(@RequestBody DadosLocalizacao dados) {
        Perfil perfil = usuarioAtual.exigir();

        String pais = limpar(dados.pais());
        String estado = limpar(dados.estado());
        String cidade = limpar(dados.cidade());

        if (pais != null) {
            pais = pais.toUpperCase(java.util.Locale.ROOT);
            if (!pais.matches("[A-Z]{2}")) {
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "País inválido: use o código de duas letras (ex.: BR).");
            }
        }
        if (estado != null && pais == null) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe o país antes do estado.");
        }
        if (cidade != null && estado == null) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe o estado antes da cidade.");
        }
        if (estado != null && estado.length() > 60) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O estado deve ter no máximo 60 caracteres.");
        }
        if (cidade != null && cidade.length() > 80) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "A cidade deve ter no máximo 80 caracteres.");
        }

        perfil.setPais(pais);
        perfil.setEstado(estado);
        perfil.setCidade(cidade);
        return ResponseEntity.ok(perfilRepository.save(perfil));
    }

    // Tira espaços das pontas e colapsa os internos; texto vazio vira null
    private static String limpar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpo = texto.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        return limpo.isEmpty() ? null : limpo;
    }

    /*
     * Define o saldo virtual do próprio usuário, para testes.
     * Só vale para quem está autenticado: ninguém altera o saldo de outra pessoa.
     */
    @PutMapping("/me/saldo")
    public ResponseEntity<Perfil> definirMeuSaldo(@RequestBody Map<String, Object> payload) {
        Perfil perfil = usuarioAtual.exigir();
        double valor;
        try {
            valor = Double.parseDouble(payload.get("valor").toString());
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe um valor numérico para o saldo.");
        }
        if (!(valor >= 0) || valor > 1_000_000_000) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "O saldo deve ficar entre R$ 0 e R$ 1 bilhão.");
        }
        perfil.setSaldoVirtual(Math.round(valor * 100.0) / 100.0);
        return ResponseEntity.ok(perfilRepository.save(perfil));
    }
}
