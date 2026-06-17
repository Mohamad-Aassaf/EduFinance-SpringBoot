package com.edufinance.backend;

import com.edufinance.backend.model.Licao;
import com.edufinance.backend.model.Perfil;
import com.edufinance.backend.model.Pergunta;
import com.edufinance.backend.repository.LicaoRepository;
import com.edufinance.backend.repository.PerfilRepository;
import com.edufinance.backend.repository.PerguntaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import java.time.LocalDateTime;

@SpringBootApplication
public class BackendApplication {

    public static void main(String[] eloquenceArgs) {
        SpringApplication.run(BackendApplication.class, eloquenceArgs);
    }

    @Bean
    public CommandLineRunner seedDatabase(
            PerfilRepository perfilRepository,
            LicaoRepository licaoRepository,
            PerguntaRepository perguntaRepository) {
        
        return args -> {
            if (licaoRepository.count() == 0) {
                System.out.println("Initializing database seed data...");

                Licao licao1 = new Licao();
                licao1.setTitulo("O que é Educação Financeira?");
                licao1.setModulo("fundamentos");
                licao1.setOrdemLicao(1);
                licao1.setConteudo("Educação financeira é muito mais do que simplesmente economizar moedas. Trata-se de compreender como o dinheiro funciona no mundo: como as pessoas o ganham, o gerenciam, o investem e o doam. Ela capacita você a tomar decisões conscientes e responsáveis com seus recursos, construindo uma base sólida para a realização de sonhos e estabilidade futura.");
                licao1.setExemplo("Se você ganha R$ 2.000 por mês, mas gasta R$ 2.100 no cartão de crédito, você está acumulando dívidas. A educação financeira ensina você a planejar suas despesas para viver sempre abaixo dos seus ganhos e investir a diferença.");
                licao1.setCriadoEm(LocalDateTime.now());
                licao1 = licaoRepository.save(licao1);

                Pergunta pergunta1 = new Pergunta();
                pergunta1.setLicaoId(licao1.getId());
                pergunta1.setPergunta("Qual é o principal objetivo de estudar Educação Financeira?");
                pergunta1.setOpcaoA("Aprender a acumular riqueza rápida e sem esforço.");
                pergunta1.setOpcaoB("Compreender o fluxo do dinheiro para tomar decisões conscientes e planejar o futuro.");
                pergunta1.setOpcaoC("Parar de gastar dinheiro com qualquer tipo de lazer ou diversão.");
                pergunta1.setOpcaoD("Ganhar mais cartões de crédito para aumentar o limite de gastos.");
                pergunta1.setRespostaCorreta(2);
                pergunta1.setExplicacao("A educação financeira visa dar clareza sobre receitas e despesas para que você tome decisões que tragam segurança, bem-estar e independência financeira.");
                perguntaRepository.save(pergunta1);

                Licao licao2 = new Licao();
                licao2.setTitulo("Juros Simples vs. Juros Compostos");
                licao2.setModulo("fundamentos");
                licao2.setOrdemLicao(2);
                licao2.setConteudo("Os juros simples são calculados apenas sobre o valor principal inicial investido ou emprestado. Já os juros compostos são calculados sobre o valor acumulado de cada período (o principal mais os juros já gerados). Este fenômeno é conhecido como 'juros sobre juros' e atua como um multiplicador exponencial de patrimônio ao longo do tempo.");
                licao2.setExemplo("Investir R$ 1.000 a uma taxa de 10% ao ano em juros simples gera R$ 100 de rendimento todo ano. Em juros compostos, no primeiro ano rende R$ 100, mas no segundo ano rende R$ 110 (10% de R$ 1.100), e assim por diante.");
                licao2.setCriadoEm(LocalDateTime.now());
                licao2 = licaoRepository.save(licao2);

                Pergunta pergunta2 = new Pergunta();
                pergunta2.setLicaoId(licao2.getId());
                pergunta2.setPergunta("Como funcionam os juros compostos em investimentos de longo prazo?");
                pergunta2.setOpcaoA("Os juros incidem apenas sobre o capital inicial depositado.");
                pergunta2.setOpcaoB("Os juros diminuem a rentabilidade do investimento conforme o tempo passa.");
                pergunta2.setOpcaoC("Os juros de cada período acumulam ao saldo principal, servindo de base para novos cálculos de juros.");
                pergunta2.setOpcaoD("Eles são idênticos aos juros simples e rendem o mesmo valor mensal.");
                pergunta2.setRespostaCorreta(3);
                pergunta2.setExplicacao("Os juros compostos geram o efeito 'bola de neve', pois os juros rendem novos juros a cada período consecutivo.");
                perguntaRepository.save(pergunta2);

                Licao licao3 = new Licao();
                licao3.setTitulo("A Regra Orçamentária 50-30-20");
                licao3.setModulo("planejamento");
                licao3.setOrdemLicao(1);
                licao3.setConteudo("Para organizar as finanças de forma simples, podemos aplicar a regra dos 50-30-20. Ela sugere dividir sua renda líquida mensal em três categorias: 50% para Necessidades Essenciais (aluguel, contas de luz/água, alimentação básica), 30% para Desejos Pessoais (lazer, jantares fora, hobbies) e 20% para Poupança, Investimentos ou quitação de dívidas urgentes.");
                licao3.setExemplo("Se você recebe R$ 3.000 líquidos, você destinará R$ 1.500 para pagar suas contas de necessidades essenciais, R$ 900 para passeios e assinaturas digitais, e R$ 600 para investir em sua reserva de emergência.");
                licao3.setCriadoEm(LocalDateTime.now());
                licao3 = licaoRepository.save(licao3);

                Pergunta pergunta3 = new Pergunta();
                pergunta3.setLicaoId(licao3.getId());
                pergunta3.setPergunta("De acordo com a regra 50-30-20, como deve ser distribuído o orçamento mensal?");
                pergunta3.setOpcaoA("50% Desejos, 30% Necessidades, 20% Poupança.");
                pergunta3.setOpcaoB("50% Necessidades, 30% Poupança, 20% Desejos.");
                pergunta3.setOpcaoC("50% Necessidades, 30% Desejos, 20% Poupança/Investimentos.");
                pergunta3.setOpcaoD("50% Poupança, 30% Necessidades, 20% Desejos.");
                pergunta3.setRespostaCorreta(3);
                pergunta3.setExplicacao("A regra sugere destinar a maior metade (50%) para necessidades, 30% para gastos flexíveis e divertidos, e separar 20% para o seu futuro financeiro.");
                perguntaRepository.save(pergunta3);

                Licao licao4 = new Licao();
                licao4.setTitulo("Construindo a Reserva de Emergência");
                licao4.setModulo("planejamento");
                licao4.setOrdemLicao(2);
                licao4.setConteudo("A reserva de emergência é um montante financeiro destinado a cobrir gastos imprevistos, como despesas médicas, reparos urgentes na casa ou perda repentina de renda. Essa reserva deve ser guardada em um investimento seguro, de baixíssimo risco e com alta liquidez (disponibilidade imediata para resgate). Recomenda-se acumular o equivalente a 3 a 6 meses de suas despesas mensais.");
                licao4.setExemplo("Se suas contas e despesas básicas mensais somam R$ 1.500, o tamanho ideal de sua reserva de emergência fica entre R$ 4.500 (3 meses) e R$ 9.000 (6 meses).");
                licao4.setCriadoEm(LocalDateTime.now());
                licao4 = licaoRepository.save(licao4);

                Pergunta pergunta4 = new Pergunta();
                pergunta4.setLicaoId(licao4.getId());
                pergunta4.setPergunta("Qual a principal característica que o investimento da reserva de emergência deve possuir?");
                pergunta4.setOpcaoA("Alta oscilação diária para aproveitar a alta do mercado.");
                pergunta4.setOpcaoB("Baixo risco e alta liquidez (facilidade de resgate rápido).");
                pergunta4.setOpcaoC("Prazo de carência de vários anos para render mais.");
                pergunta4.setOpcaoD("Ser de renda variável como ações de empresas de tecnologia.");
                pergunta4.setRespostaCorreta(2);
                pergunta4.setExplicacao("Uma emergência requer dinheiro na mão rapidamente. Por isso, a reserva precisa de liquidez imediata e segurança total, evitando perdas inesperadas.");
                perguntaRepository.save(pergunta4);

                Licao licao5 = new Licao();
                licao5.setTitulo("Renda Fixa vs. Renda Variável");
                licao5.setModulo("investimentos");
                licao5.setOrdemLicao(1);
                licao5.setConteudo("Os investimentos dividem-se em duas grandes classes. A Renda Fixa funciona como um empréstimo do seu dinheiro a um banco ou ao governo em troca de juros definidos (CDB, Tesouro Selic, LCI/LCA). Possui alta previsibilidade e segurança. Na Renda Variável, você compra partes de empresas ou imóveis (Ações, FIIs). Não há garantia de rendimento e os preços oscilam diariamente na bolsa, trazendo mais risco, porém potencial de lucros bem maiores.");
                licao5.setExemplo("Investir R$ 1.000 em um CDB que rende 100% do CDI é Renda Fixa: você sabe como o saldo crescerá. Comprar R$ 1.000 em ações de uma empresa cotada em bolsa é Renda Variável: em um dia suas ações podem passar a valer R$ 1.050 e, no outro, cair para R$ 950.");
                licao5.setCriadoEm(LocalDateTime.now());
                licao5 = licaoRepository.save(licao5);

                Pergunta pergunta5 = new Pergunta();
                pergunta5.setLicaoId(licao5.getId());
                pergunta5.setPergunta("Qual é a principal diferença entre investimentos de Renda Fixa e Renda Variável?");
                pergunta5.setOpcaoA("Renda Fixa é sempre isenta de impostos, enquanto a Variável cobra taxas absurdas.");
                pergunta5.setOpcaoB("Renda Fixa oferece previsibilidade de regras e segurança, enquanto Renda Variável possui preços oscilantes sem rentabilidade garantida.");
                pergunta5.setOpcaoC("Renda Variável é recomendada para reservas de emergência e Renda Fixa para especulação financeira.");
                pergunta5.setOpcaoD("Renda Fixa nunca rende juros compostos, somente a Renda Variável.");
                pergunta5.setRespostaCorreta(2);
                pergunta5.setExplicacao("A Renda Fixa se destaca pela segurança e regras predefinidas. A Renda Variável envolve risco de mercado, com cotações que mudam com a oferta e demanda na Bolsa de Valores.");
                perguntaRepository.save(pergunta5);

                System.out.println("Database seeds inserted successfully!");
            }

            if (perfilRepository.count() == 0) {
                Perfil estudante1 = new Perfil(null, "Diego Pedro", "diego@edu.com", 240, 3, null, 125000.0, LocalDateTime.now().minusDays(5));
                Perfil estudante2 = new Perfil(null, "Ygor Bitencourt", "ygor@edu.com", 160, 2, null, 108400.0, LocalDateTime.now().minusDays(4));
                Perfil estudante3 = new Perfil(null, "Mohamad Assaf", "mohamad@edu.com", 140, 2, null, 95800.0, LocalDateTime.now().minusDays(3));
                Perfil estudante4 = new Perfil(null, "Ana Silva", "ana@edu.com", 80, 1, null, 100000.0, LocalDateTime.now().minusDays(2));
                
                perfilRepository.save(estudante1);
                perfilRepository.save(estudante2);
                perfilRepository.save(estudante3);
                perfilRepository.save(estudante4);
                
                System.out.println("Database seed data initialization completed.");
            }
        };
    }
}
