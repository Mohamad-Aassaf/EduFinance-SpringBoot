package com.edufinance.blockchain.model;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

public class Block {

    // Aqui é o SHA-256 que transforma
    // qualquer dado em uma string única de 64 caracteres
    // cada bloco terá uma identificação única (hash)
    // Alterando qualquer coisa no bloco o hash muda

    private int index;

    private long timestamp;

    private String previousHash;

    private String hash;

    private int nonce;

    private List<Transaction> transactions;

    public Block() {
    }

    public Block(
            int index,
            long timestamp,
            String previousHash,
            List<Transaction> transactions) {
        this.index = index;
        this.timestamp = timestamp;
        this.previousHash = previousHash;
        this.transactions = transactions;
        this.nonce = 0;
        this.hash = calculateHash();
    }

    public String calculateHash() {

        StringBuilder data = new StringBuilder();

        data.append(index);
        data.append(timestamp);
        data.append(previousHash);
        data.append(nonce);

        for (Transaction transaction : transactions) {

            data.append(transaction.getWalletAddress());
            data.append(transaction.getType());
            data.append(transaction.getAmount());
        }

        try {

            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hashBytes = digest.digest(
                    data.toString()
                            .getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();

            for (byte b : hashBytes) {

                String hex = Integer.toHexString(0xff & b);

                if (hex.length() == 1) {
                    hexString.append('0');
                }

                hexString.append(hex);
            }

            return hexString.toString();

        } catch (Exception e) {

            throw new RuntimeException(e);
        }
    }

    public void mineBlock(int difficulty) {

        String target = "0".repeat(difficulty);

        while (!hash.startsWith(target)) {

            nonce++;

            hash = calculateHash();
        }
    }

    public int getIndex() {
        return index;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public String getPreviousHash() {
        return previousHash;
    }

    public String getHash() {
        return hash;
    }

    public int getNonce() {
        return nonce;
    }

    public List<Transaction> getTransactions() {
        return transactions;
    }

    public void setTransactions(
            List<Transaction> transactions) {
        this.transactions = transactions;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }
}