package com.edufinance.blockchain.blockchain;

import com.edufinance.blockchain.model.Block;
import com.edufinance.blockchain.model.Transaction;

import java.util.ArrayList;
import java.util.List;

public class Blockchain {

    // Essa classe é a nossa carteira
    // que vai armazenar todas as transações
    // e os blocos

    private final List<Block> chain;

    private final int difficulty = 3;

    public Blockchain() {

        chain = new ArrayList<>();

        createGenesisBlock();
    }

    private void createGenesisBlock() {

        Block genesis = new Block(
                0,
                System.currentTimeMillis(),
                "0",
                new ArrayList<>());

        genesis.mineBlock(difficulty);

        chain.add(genesis);
    }

    public Block getLatestBlock() {

        return chain.get(chain.size() - 1);
    }

    public void addBlock(
            List<Transaction> transactions) {

        Block previousBlock = getLatestBlock();

        Block newBlock = new Block(
                chain.size(),
                System.currentTimeMillis(),
                previousBlock.getHash(),
                transactions);

        newBlock.mineBlock(difficulty);

        chain.add(newBlock);
    }

    public boolean isValid() {

        for (int i = 1; i < chain.size(); i++) {

            Block current = chain.get(i);

            Block previous = chain.get(i - 1);

            if (!current.getHash()
                    .equals(current.calculateHash())) {

                return false;
            }

            if (!current.getPreviousHash()
                    .equals(previous.getHash())) {

                return false;
            }
        }

        return true;
    }

    public List<Block> getChain() {
        return chain;
    }

    public int getDifficulty() {
        return difficulty;
    }
}