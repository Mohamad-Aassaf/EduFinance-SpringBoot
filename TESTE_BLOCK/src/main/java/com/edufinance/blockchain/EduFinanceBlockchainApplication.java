package com.edufinance.blockchain;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EduFinanceBlockchainApplication {
    // essa classe inicializa o spring
    public static void main(String[] args) {
        SpringApplication.run(
                EduFinanceBlockchainApplication.class,
                args
        );
    }
}

// usuario > interface > controller
// > Service > Blockchain > Bloc

// Genesis Block = Bloco Inicial sempre 
// sera o bloco zero 0

// Cria transação que recebe os valores
// a transação fica pendente
// ela existe mas ainda não esta na blockchain

// Minerar = Juntar as transações
// validar as transações
// criar o bloco
// colocar o hash no bloco
// colocar o hash anterior no bloco

