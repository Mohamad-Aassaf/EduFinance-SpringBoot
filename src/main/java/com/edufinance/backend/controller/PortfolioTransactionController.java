package com.edufinance.backend.controller;

import com.edufinance.backend.model.PortfolioTransaction;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PortfolioTransactionRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.service.RegraNegocioException;
import com.edufinance.backend.service.UsuarioAtualService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portfolio/transacoes")
@CrossOrigin(origins = "*")
public class PortfolioTransactionController {

    @Autowired
    private PortfolioTransactionRepository transactionRepository;

    @Autowired
    private PerfilRepository perfilRepository;

    @Autowired
    private UsuarioAtualService usuarioAtual;

    // Retorna todas as transacoes de um usuario (inclusive as ocultas, que ainda contam para a carteira)
    @GetMapping("/usuario/{usuarioId}")
    public List<PortfolioTransaction> getTransactionsByUsuario(@PathVariable Long usuarioId) {
        return transactionRepository.findByUsuarioIdOrderByCreatedAtDesc(usuarioId);
    }

    // Cria uma nova transacao de compra ou venda e atualiza o saldo virtual do usuario autenticado
    @PostMapping
    @Transactional
    public ResponseEntity<?> createTransaction(@RequestBody Map<String, Object> payload) {
        Perfil perfil = usuarioAtual.exigir();

        String stockCode;
        String stockName;
        String transactionType; // "buy" ou "sell"
        int quantity;
        double price;
        try {
            stockCode = payload.get("stockCode").toString().trim();
            stockName = payload.get("stockName").toString().trim();
            transactionType = payload.get("transactionType").toString().toLowerCase();
            quantity = Integer.parseInt(payload.get("quantity").toString());
            price = Double.parseDouble(payload.get("price").toString());
        } catch (Exception e) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Dados da operação inválidos.");
        }

        if (stockCode.isEmpty() || quantity <= 0 || !Double.isFinite(price) || price <= 0) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Informe uma quantidade e um preço maiores que zero.");
        }

        double totalValue = arredondar(quantity * price);

        if ("buy".equals(transactionType)) {
            if (perfil.getSaldoVirtual() < totalValue) {
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Saldo virtual insuficiente para a compra.");
            }
            perfil.setSaldoVirtual(arredondar(perfil.getSaldoVirtual() - totalValue));
        } else if ("sell".equals(transactionType)) {
            // Só é possível vender o que está na carteira
            if (quantity > quantidadeEmCarteira(perfil.getId(), stockCode)) {
                throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Quantidade insuficiente de ações para vender.");
            }
            perfil.setSaldoVirtual(arredondar(perfil.getSaldoVirtual() + totalValue));
        } else {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Tipo de transação inválido. Use 'buy' ou 'sell'.");
        }

        // Salva a transacao
        PortfolioTransaction tx = new PortfolioTransaction();
        tx.setUsuarioId(perfil.getId());
        tx.setStockCode(stockCode);
        tx.setStockName(stockName);
        tx.setTransactionType(transactionType);
        tx.setQuantity(quantity);
        tx.setPricePerUnit(price);
        tx.setTotalValue(totalValue);
        tx.setCreatedAt(LocalDateTime.now());

        transactionRepository.save(tx);
        perfilRepository.save(perfil);

        return ResponseEntity.ok(Map.of(
            "transacao", tx,
            "saldoAtualizado", perfil.getSaldoVirtual(),
            "perfil", perfil
        ));
    }

    /*
     * Remove uma operação do histórico. O registro é apenas ocultado: a carteira é
     * calculada a partir das transações, então apagar de verdade mudaria as ações e
     * deixaria o saldo virtual sem explicação.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> hideTransaction(@PathVariable Long id) {
        Perfil perfil = usuarioAtual.exigir();
        PortfolioTransaction tx = transactionRepository.findById(id)
                .filter(t -> t.getUsuarioId().equals(perfil.getId()))
                .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Operação não encontrada."));
        tx.setHidden(true);
        transactionRepository.save(tx);
        return ResponseEntity.noContent().build();
    }

    private int quantidadeEmCarteira(Long usuarioId, String stockCode) {
        int quantidade = 0;
        for (PortfolioTransaction tx : transactionRepository.findByUsuarioIdOrderByCreatedAtDesc(usuarioId)) {
            if (tx.getStockCode().equals(stockCode)) {
                quantidade += "buy".equals(tx.getTransactionType()) ? tx.getQuantity() : -tx.getQuantity();
            }
        }
        return quantidade;
    }

    private static double arredondar(double valor) {
        return Math.round(valor * 100.0) / 100.0;
    }
}
