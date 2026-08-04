package com.edufinance.backend.controller;

import com.edufinance.backend.model.PortfolioTransaction;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.repository.PortfolioTransactionRepository;
import com.edufinance.backend.repository.PerfilRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/portfolio/transacoes")
@CrossOrigin(origins = "*")
public class PortfolioTransactionController {

    @Autowired
    private PortfolioTransactionRepository transactionRepository;

    @Autowired
    private PerfilRepository perfilRepository;

    // Retorna todas as transacoes de um usuario
    @GetMapping("/usuario/{usuarioId}")
    public List<PortfolioTransaction> getTransactionsByUsuario(@PathVariable Long usuarioId) {
        return transactionRepository.findByUsuarioIdOrderByCreatedAtDesc(usuarioId);
    }

    // Cria uma nova transacao de compra ou venda e atualiza o saldo virtual do usuario
    @PostMapping
    public ResponseEntity<?> createTransaction(@RequestBody Map<String, Object> payload) {
        try {
            Long usuarioId = Long.valueOf(payload.get("usuarioId").toString());
            String stockCode = payload.get("stockCode").toString();
            String stockName = payload.get("stockName").toString();
            String transactionType = payload.get("transactionType").toString(); // "buy" ou "sell"
            int quantity = Integer.parseInt(payload.get("quantity").toString());
            double price = Double.parseDouble(payload.get("price").toString());

            Optional<Perfil> perfilOpt = perfilRepository.findById(usuarioId);
            if (perfilOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Usuario nao encontrado.");
            }

            Perfil perfil = perfilOpt.get();
            double totalValue = quantity * price;

            if ("buy".equalsIgnoreCase(transactionType)) {
                if (perfil.getSaldoVirtual() < totalValue) {
                    return ResponseEntity.badRequest().body("Saldo virtual insuficiente para a compra.");
                }
                perfil.setSaldoVirtual(perfil.getSaldoVirtual() - totalValue);
            } else if ("sell".equalsIgnoreCase(transactionType)) {
                perfil.setSaldoVirtual(perfil.getSaldoVirtual() + totalValue);
            } else {
                return ResponseEntity.badRequest().body("Tipo de transacao invalido. Use 'buy' ou 'sell'.");
            }

            // Salva a transacao
            PortfolioTransaction tx = new PortfolioTransaction();
            tx.setUsuarioId(usuarioId);
            tx.setStockCode(stockCode);
            tx.setStockName(stockName);
            tx.setTransactionType(transactionType.toLowerCase());
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
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erro ao processar transacao: " + e.getMessage());
        }
    }
}
