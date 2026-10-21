package com.edufinance.blockchain.controller;

import com.edufinance.blockchain.model.Block;
import com.edufinance.blockchain.service.BlockchainService;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@Controller
public class BlockchainController {

    // essa classe aqui é responsável
    // por gerenciar as requisições
    // e mostrar tudo na tela através do arquivo html

    private final BlockchainService blockchainService;

    public BlockchainController(
            BlockchainService blockchainService) {
        this.blockchainService = blockchainService;
    }

    @GetMapping("/")
    public String home(Model model) {

        model.addAttribute(
                "blocks",
                blockchainService.getBlocks());

        model.addAttribute(
                "pending",
                blockchainService
                        .getPendingTransactions());

        model.addAttribute(
                "valid",
                blockchainService.isValid());

        return "index";
    }

    @PostMapping("/transaction")
    public String addTransaction(

            @RequestParam String wallet,

            @RequestParam String type,

            @RequestParam BigDecimal amount

    ) {

        blockchainService.addTransaction(
                wallet,
                type,
                amount);

        return "redirect:/";
    }

    @PostMapping("/mine")
    public String mine() {

        blockchainService
                .minePendingTransactions();

        return "redirect:/";
    }

    @PostMapping("/tamper")
    public String tamper(
            @RequestParam int index) {

        blockchainService.tamperBlock(
                index,
                "HACKED-WALLET");

        return "redirect:/";
    }
}