package com.edufinance.backend.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Códigos de recuperação de senha.
 *
 * Antes o código era sempre "1234" e voltava na própria resposta, então qualquer pessoa que
 * soubesse o e-mail trocava a senha. Agora cada pedido gera um código aleatório de 6 dígitos,
 * válido por 15 minutos e com 5 tentativas.
 *
 * O EduFinance ainda não envia e-mail: o código aparece no log do servidor e na aba "Chaves"
 * do painel do administrador, que o repassa à pessoa (simulando o e-mail).
 */
@Service
public class RecuperacaoSenhaService {

    private static final long VALIDADE_SEGUNDOS = 15 * 60;
    private static final int MAX_TENTATIVAS = 5;
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private static final class Pedido {
        final String codigo;
        final Instant expiraEm;
        int tentativas = 0;

        Pedido(String codigo, Instant expiraEm) {
            this.codigo = codigo;
            this.expiraEm = expiraEm;
        }
    }

    private final Map<String, Pedido> pedidos = new ConcurrentHashMap<>();

    public void criarPedido(String email) {
        limparVencidos();
        String codigo = String.format("%06d", ALEATORIO.nextInt(1_000_000));
        Instant expiraEm = Instant.now().plusSeconds(VALIDADE_SEGUNDOS);
        pedidos.put(normalizar(email), new Pedido(codigo, expiraEm));
        System.out.println("[Recuperação de senha] código para " + email + ": " + codigo + " (válido até " + expiraEm + ")");
    }

    /** Confere o código; se estiver certo, ele é consumido. Lança erro com a mensagem para o usuário. */
    public void consumirCodigo(String email, String codigo) {
        String chave = normalizar(email);
        Pedido pedido = pedidos.get(chave);
        if (pedido == null || pedido.expiraEm.isBefore(Instant.now())) {
            pedidos.remove(chave);
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Código inválido ou expirado. Peça um novo.");
        }
        if (!pedido.codigo.equals(Objects.toString(codigo, "").trim())) {
            pedido.tentativas++;
            if (pedido.tentativas >= MAX_TENTATIVAS) {
                pedidos.remove(chave);
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Código incorreto. Tentativas esgotadas: peça um novo código.");
            }
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST,
                    "Código incorreto. Restam " + (MAX_TENTATIVAS - pedido.tentativas) + " tentativa(s).");
        }
        pedidos.remove(chave);
    }

    /** Para o painel do administrador. */
    public List<Map<String, Object>> pedidosEmAberto() {
        limparVencidos();
        List<Map<String, Object>> lista = new ArrayList<>();
        pedidos.forEach((email, p) -> lista.add(Map.of("email", email, "codigo", p.codigo, "expiraEm", p.expiraEm.toString())));
        lista.sort(Comparator.comparing(m -> m.get("expiraEm").toString()));
        return lista;
    }

    private void limparVencidos() {
        pedidos.values().removeIf(p -> p.expiraEm.isBefore(Instant.now()));
    }

    private static String normalizar(String email) {
        return Objects.toString(email, "").trim().toLowerCase(Locale.ROOT);
    }
}
