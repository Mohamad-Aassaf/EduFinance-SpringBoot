package com.edufinance.blockchain.model;

import java.math.BigDecimal;

public class Transaction {

    // essa classe representa uma transação individual
    // contendo o endereço da carteira, tipo da transação (investimento/resgate)
    // e o valor correspondente

    private String walletAddress;

    private String type;

    private BigDecimal amount;

    public Transaction() {
    }

    public Transaction(
            String walletAddress,
            String type,
            BigDecimal amount) {
        this.walletAddress = walletAddress;
        this.type = type;
        this.amount = amount;
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}