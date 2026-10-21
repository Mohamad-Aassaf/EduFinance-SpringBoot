package com.edufinance.blockchain.service;

import com.edufinance.blockchain.blockchain.Blockchain;
import com.edufinance.blockchain.model.Block;
import com.edufinance.blockchain.model.Transaction;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class BlockchainService {

    // essa classe é responsável
    // por gerenciar as regras de negócio da blockchain,
    // controlar as transações pendentes e fazer a ponte
    // entre o controlador e a estrutura da blockchain

    private final Blockchain blockchain;
    private final List<Transaction> pendingTransactions;

    public BlockchainService() {
        this.blockchain = new Blockchain();
        this.pendingTransactions = new ArrayList<>();
    }

    public List<Block> getBlocks() {
        return blockchain.getChain();
    }

    public List<Transaction> getPendingTransactions() {
        return pendingTransactions;
    }

    public boolean isValid() {
        return blockchain.isValid();
    }

    public void addTransaction(String walletAddress, String type, BigDecimal amount) {
        pendingTransactions.add(new Transaction(walletAddress, type, amount));
    }

    public void minePendingTransactions() {
        blockchain.addBlock(new ArrayList<>(pendingTransactions));
        pendingTransactions.clear();
    }

    public void tamperBlock(int index, String newWallet) {
        List<Block> chain = blockchain.getChain();
        if (index >= 0 && index < chain.size()) {
            Block block = chain.get(index);
            List<Transaction> transactions = block.getTransactions();
            if (transactions != null && !transactions.isEmpty()) {
                transactions.get(0).setWalletAddress(newWallet);
            } else {
                List<Transaction> fakeTxs = new ArrayList<>();
                fakeTxs.add(new Transaction(newWallet, "INVESTIMENTO", BigDecimal.TEN));
                block.setTransactions(fakeTxs);
            }
        }
    }
}
