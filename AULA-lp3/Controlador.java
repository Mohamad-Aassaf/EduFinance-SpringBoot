package com.edufinance.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
@RequestMapping("/Claude")
public class Controlador {
    @GetMapping
    @ResponseBody
    public String mensagemInicial(
        @RequestParam("nome") String nome,
        @RequestParam("sobrenome") String sobrenome) {
        return "Vibe Coding Iniciando a Carreira";
    }
}