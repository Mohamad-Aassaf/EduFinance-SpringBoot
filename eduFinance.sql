DROP DATABASE IF EXISTS edufinance;
CREATE DATABASE IF NOT EXISTS edufinance;
USE edufinance;

CREATE TABLE IF NOT EXISTS `perfis` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `xp` int NOT NULL DEFAULT 0,
  `nivel` int NOT NULL DEFAULT 1,
  `avatar_url` varchar(255) DEFAULT NULL,
  `saldo_virtual` double DEFAULT 100000.0,
  `criado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_email` (`email`)
);

INSERT INTO `perfis` (`id`, `nome`, `email`, `xp`, `nivel`, `avatar_url`, `saldo_virtual`, `criado_em`) VALUES 
(1, 'Diego Pedro', 'diego@edu.com', 240, 3, NULL, 125000, '2026-06-10 22:34:20.904017'),
(2, 'Ygor Bitencourt', 'ygor@edu.com', 160, 2, NULL, 108400, '2026-06-11 22:34:20.904017'),
(3, 'Mohamad Assaf', 'mohamad@edu.com', 140, 2, NULL, 95800, '2026-06-12 22:34:20.904017'),
(4, 'Ana Silva', 'ana@edu.com', 80, 1, NULL, 100000, '2026-06-13 22:34:20.904017'),
(5, 'Test Student', 'test@estudante.com', 20, 1, NULL, 9009.06, '2026-06-15 23:26:19.750249'),
(6, 'Teste', 'mohamad1mohd@gmail.com', 0, 1, NULL, 100000, '2026-06-15 23:32:24.074827');

CREATE TABLE IF NOT EXISTS `licoes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `conteudo` text NOT NULL,
  `exemplo` text,
  `modulo` varchar(255) NOT NULL,
  `ordem_licao` int NOT NULL,
  `criado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO `licoes` (`id`, `titulo`, `conteudo`, `exemplo`, `modulo`, `ordem_licao`, `criado_em`) VALUES 
(1, 'O que é Educação Financeira?', 'Educação financeira é muito mais do que simplesmente economizar moedas. Trata-se de compreender como o dinheiro funciona no mundo: como as pessoas o ganham, o gerenciam, o investem e o doam. Ela capacita você a tomar decisões conscientes e responsáveis com seus recursos, construindo uma base sólida para a realização de sonhos e estabilidade futura.', 'Se você ganha R$ 2.000 por mês, mas gasta R$ 2.100 no cartão de crédito, você está acumulando dívidas. A educação financeira ensina você a planejar suas despesas para viver sempre abaixo dos seus ganhos e investir a diferença.', 'fundamentos', 1, '2026-06-15 22:34:20.823313'),
(2, 'Juros Simples vs. Juros Compostos', 'Os juros simples são calculados apenas sobre o valor principal inicial investido ou emprestado. Já os juros compostos são calculados sobre o valor acumulado de cada período (o principal mais os juros já gerados). Este fenômeno é conhecido como \'juros sobre juros\' e atua como um multiplicador exponencial de patrimônio ao longo do tempo.', 'Investir R$ 1.000 a uma taxa de 10% ao ano em juros simples gera R$ 100 de rendimento todo ano. Em juros compostos, no primeiro ano rende R$ 100, mas no segundo ano rende R$ 110 (10% de R$ 1.100), e assim por diante.', 'fundamentos', 2, '2026-06-15 22:34:20.868919'),
(3, 'A Regra Orçamentária 50-30-20', 'Para organizar as finanças de forma simples, podemos aplicar a regra dos 50-30-20. Ela sugere dividir sua renda líquida mensal em três categorias: 50% para Necessidades Essenciais (aluguel, contas de luz/água, alimentação básica), 30% para Desejos Pessoais (lazer, jantares fora, hobbies) e 20% para Poupança, Investimentos ou quitação de dívidas urgentes.', 'Se você recebe R$ 3.000 líquidos, você destinará R$ 1.500 para pagar suas contas de necessidades essenciais, R$ 900 para passeios e assinaturas digitais, e R$ 600 para investir em sua reserva de emergência.', 'planejamento', 1, '2026-06-15 22:34:20.877903'),
(4, 'Construindo a Reserva de Emergência', 'A reserva de emergência é um montante financeiro destinado a cobrir gastos imprevistos, como despesas médicas, reparos urgentes na casa ou perda repentina de renda. Essa reserva deve ser guardada em um investimento seguro, de baixíssimo risco e com alta liquidez (disponibilidade imediata para resgate). Recomenda-se acumular o equivalente a 3 a 6 meses de suas despesas mensais.', 'Se suas contas e despesas básicas mensais somam R$ 1.500, o tamanho ideal de sua reserva de emergência fica entre R$ 4.500 (3 meses) e R$ 9.000 (6 meses).', 'planejamento', 2, '2026-06-15 22:34:20.886422'),
(5, 'Renda Fixa vs. Renda Variável', 'Os investimentos dividem-se em duas grandes classes. A Renda Fixa funciona como um empréstimo do seu dinheiro a um banco ou ao governo em troca de juros definidos (CDB, Tesouro Selic, LCI/LCA). Pontencialmente seguro. Na Renda Variável, você compra partes de empresas ou imóveis. Os preços oscilam diariamente na bolsa, trazendo mais risco, porém potencial de lucros maiores.', 'Investir R$ 1.000 em um CDB que rende 100% do CDI é Renda Fixa. Comprar R$ 1.000 em ações de uma empresa na Bolsa é Renda Variável.', 'investimentos', 1, '2026-06-15 22:34:20.893726');

CREATE TABLE IF NOT EXISTS `perguntas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `licao_id` bigint NOT NULL,
  `pergunta` text NOT NULL,
  `opcao_a` varchar(255) NOT NULL,
  `opcao_b` varchar(255) NOT NULL,
  `opcao_c` varchar(255) NOT NULL,
  `opcao_d` varchar(255) NOT NULL,
  `resposta_correta` int NOT NULL,
  `explicacao` text,
  `criado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO `perguntas` (`id`, `licao_id`, `pergunta`, `opcao_a`, `opcao_b`, `opcao_c`, `opcao_d`, `resposta_correta`, `explicacao`, `criado_em`) VALUES 
(1, 1, 'Qual é o principal objetivo de estudar Educação Financeira?', 'Aprender a acumular riqueza rápida e sem esforço.', 'Compreender o fluxo do dinheiro para tomar decisões conscientes e planejar o futuro.', 'Parar de gastar dinheiro com qualquer tipo de lazer ou diversão.', 'Ganhar mais cartões de crédito para aumentar o limite de gastos.', 2, 'A educação financeira visa dar clareza sobre receitas e despesas para que você tome decisões que tragam segurança, bem-estar e independência financeira.', '2026-06-15 22:34:20.862501'),
(2, 2, 'Como funcionam os juros compostos em investimentos de longo prazo?', 'Os juros incidem apenas sobre o capital inicial depositado.', 'Os juros diminuem a rentabilidade do investimento conforme o tempo passa.', 'Os juros de cada período acumulam ao saldo principal, servindo de base para novos cálculos de juros.', 'Eles são idênticos aos juros simples e rendem o mesmo valor mensal.', 3, 'Os juros compostos geram o efeito \'bola de neve\', pois os juros rendem novos juros a cada período consecutivo.', '2026-06-15 22:34:20.873632'),
(3, 3, 'De acordo com a regra 50-30-20, como deve ser distribuído o orçamento mensal?', '50% Desejos, 30% Necessidades, 20% Poupança.', '50% Necessidades, 30% Poupança, 20% Desejos.', '50% Necessidades, 30% Desejos, 20% Poupança/Investimentos.', '50% Poupança, 30% Necessidades, 20% Desejos.', 3, 'A regra sugere destinar a maior metade (50%) para necessidades, 30% para gastos flexíveis e divertidos, e separar 20% para o seu futuro financeiro.', '2026-06-15 22:34:20.882189'),
(4, 4, 'Qual a principal característica que o investimento da reserva de emergência deve possuir?', 'Alta oscilação diária para aproveitar a alta do mercado.', 'Baixo risco e alta liquidez (facilidade de resgate rápido).', 'Prazo de carência de vários anos para render mais.', 'Ser de renda variável como ações de empresas de tecnologia.', 2, 'Uma emergência requer dinheiro na mão rapidamente. Por isso, a reserva precisa de liquidez imediata e segurança total, evitando perdas inesperadas.', '2026-06-15 22:34:20.889539'),
(5, 5, 'Qual é a principal diferença entre investimentos de Renda Fixa e Renda Variável?', 'Renda Fixa é sempre isenta de impostos, enquanto a Variável cobra taxas absurdas.', 'Renda Fixa oferece previsibilidade de regras e segurança, enquanto Renda Variável possui preços oscilantes sem rentabilidade garantida.', 'Renda Variável é recomendada para reservas de emergência e Renda Fixa para especulação financeira.', 'Renda Fixa nunca rende juros compostos, somente a Renda Variável.', 2, 'A Renda Fixa se destaca pela segurança e regras predefinidas. A Renda Variável envolve risco de mercado, com cotações que mudam com a oferta e demanda na Bolsa de Valores.', '2026-06-15 22:34:20.897737');

CREATE TABLE IF NOT EXISTS `medalhas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint NOT NULL,
  `tipo_medalha` varchar(255) NOT NULL,
  `conquistado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_usuario_medalha` (`usuario_id`,`tipo_medalha`)
);

INSERT INTO `medalhas` (`id`, `conquistado_em`, `tipo_medalha`, `usuario_id`) VALUES 
(1, '2026-06-15 23:26:58.230231', 'Primeira Aula', 5),
(2, '2026-06-15 23:27:22.120672', 'Simulador Pro', 5);

CREATE TABLE IF NOT EXISTS `simulacoes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint NOT NULL,
  `tipo_investimento` varchar(255) NOT NULL,
  `valor_inicial` double NOT NULL,
  `aporte_mensal` double NOT NULL,
  `taxa_anual` double NOT NULL,
  `tempo_meses` int NOT NULL,
  `valor_final` double NOT NULL,
  `criado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO `simulacoes` (`id`, `taxa_anual`, `criado_em`, `valor_final`, `valor_inicial`, `tipo_investimento`, `aporte_mensal`, `tempo_meses`, `usuario_id`) VALUES 
(1, 6, '2026-06-15 23:27:22.108989', 9009.06, 5000, 'Poupança', 300, 12, 5);

CREATE TABLE IF NOT EXISTS `progresso_usuario` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` bigint NOT NULL,
  `licao_id` bigint NOT NULL,
  `concluido` tinyint(1) NOT NULL DEFAULT 0,
  `concluido_em` datetime DEFAULT NULL,
  `criado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_usuario_licao` (`usuario_id`,`licao_id`)
);

INSERT INTO `progresso_usuario` (`id`, `concluido`, `concluido_em`, `criado_em`, `licao_id`, `usuario_id`) VALUES 
(1, 1, '2026-06-15 23:26:58.217560', '2026-06-15 23:26:58.217560', 1, 5);
