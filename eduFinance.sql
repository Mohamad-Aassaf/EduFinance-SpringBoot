CREATE TABLE IF NOT EXISTS perfis (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    xp INTEGER NOT NULL DEFAULT 0,
    nivel INTEGER NOT NULL DEFAULT 1,
    avatar_url VARCHAR(255),
    saldo_virtual DOUBLE PRECISION DEFAULT 100000.0,
    criado_em TIMESTAMP
);

INSERT INTO perfis
(id, nome, email, xp, nivel, avatar_url, saldo_virtual, criado_em)
OVERRIDING SYSTEM VALUE
VALUES
(1,'Diego Pedro','diego@edu.com',240,3,NULL,125000,'2026-06-10 22:34:20.904017'),
(2,'Ygor Bitencourt','ygor@edu.com',160,2,NULL,108400,'2026-06-11 22:34:20.904017'),
(3,'Mohamad Assaf','mohamad@edu.com',140,2,NULL,95800,'2026-06-12 22:34:20.904017'),
(4,'Ana Silva','ana@edu.com',80,1,NULL,100000,'2026-06-13 22:34:20.904017'),
(5,'Test Student','test@estudante.com',20,1,NULL,9009.06,'2026-06-15 23:26:19.750249'),
(6,'Teste','mohamad1mohd@gmail.com',0,1,NULL,100000,'2026-06-15 23:32:24.074827');


CREATE TABLE IF NOT EXISTS licoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    exemplo TEXT,
    modulo VARCHAR(255) NOT NULL,
    ordem_licao INTEGER NOT NULL,
    criado_em TIMESTAMP
);

INSERT INTO licoes
(id,titulo,conteudo,exemplo,modulo,ordem_licao,criado_em)
OVERRIDING SYSTEM VALUE
VALUES
(1,'O que é Educação Financeira?','Educação financeira é muito mais do que simplesmente economizar moedas. Trata-se de compreender como o dinheiro funciona no mundo: como as pessoas o ganham, o gerenciam, o investem e o doam. Ela capacita você a tomar decisões conscientes e responsáveis com seus recursos, construindo uma base sólida para a realização de sonhos e estabilidade futura.','Se você ganha R$ 2.000 por mês, mas gasta R$ 2.100 no cartão de crédito, você está acumulando dívidas. A educação financeira ensina você a planejar suas despesas para viver sempre abaixo dos seus ganhos e investir a diferença.','fundamentos',1,'2026-06-15 22:34:20.823313'),
(2,'Juros Simples vs. Juros Compostos','Os juros simples são calculados apenas sobre o valor principal inicial investido ou emprestado. Já os juros compostos são calculados sobre o valor acumulado de cada período (o principal mais os juros já gerados). Este fenômeno é conhecido como ''juros sobre juros'' e atua como um multiplicador exponencial de patrimônio ao longo do tempo.','Investir R$ 1.000 a uma taxa de 10% ao ano em juros simples gera R$ 100 de rendimento todo ano. Em juros compostos, no primeiro ano rende R$ 100, mas no segundo ano rende R$ 110 (10% de R$ 1.100), e assim por diante.','fundamentos',2,'2026-06-15 22:34:20.868919'),
(3,'A Regra Orçamentária 50-30-20','Para organizar as finanças de forma simples, podemos aplicar a regra dos 50-30-20. Ela sugere dividir sua renda líquida mensal em três categorias: 50% para Necessidades Essenciais, 30% para Desejos Pessoais e 20% para Poupança, Investimentos ou quitação de dívidas.','Se você recebe R$ 3.000 líquidos, você destinará R$ 1.500 para necessidades, R$ 900 para desejos e R$ 600 para investimentos.','planejamento',1,'2026-06-15 22:34:20.877903'),
(4,'Construindo a Reserva de Emergência','A reserva de emergência é um montante financeiro destinado a cobrir gastos imprevistos. Deve ser aplicada em investimentos seguros e com alta liquidez. Recomenda-se acumular entre 3 e 6 meses de despesas.','Se suas despesas são de R$ 1.500, sua reserva ideal fica entre R$ 4.500 e R$ 9.000.','planejamento',2,'2026-06-15 22:34:20.886422'),
(5,'Renda Fixa vs. Renda Variável','Os investimentos dividem-se em duas grandes classes. A renda fixa oferece previsibilidade e segurança. Já a renda variável possui oscilações e maior potencial de retorno.','Investir em CDB é renda fixa. Comprar ações é renda variável.','investimentos',1,'2026-06-15 22:34:20.893726');


CREATE TABLE IF NOT EXISTS perguntas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    licao_id BIGINT NOT NULL,
    pergunta TEXT NOT NULL,
    opcao_a VARCHAR(255) NOT NULL,
    opcao_b VARCHAR(255) NOT NULL,
    opcao_c VARCHAR(255) NOT NULL,
    opcao_d VARCHAR(255) NOT NULL,
    resposta_correta INTEGER NOT NULL,
    explicacao TEXT,
    criado_em TIMESTAMP,

    CONSTRAINT fk_pergunta_licao
        FOREIGN KEY (licao_id)
        REFERENCES licoes(id)
);

INSERT INTO perguntas
(id,licao_id,pergunta,opcao_a,opcao_b,opcao_c,opcao_d,resposta_correta,explicacao,criado_em)
OVERRIDING SYSTEM VALUE
VALUES
(1,1,'Qual é o principal objetivo de estudar Educação Financeira?','Aprender a acumular riqueza rápida e sem esforço.','Compreender o fluxo do dinheiro para tomar decisões conscientes e planejar o futuro.','Parar de gastar dinheiro com qualquer tipo de lazer ou diversão.','Ganhar mais cartões de crédito para aumentar o limite de gastos.',2,'A educação financeira visa dar clareza sobre receitas e despesas.','2026-06-15 22:34:20.862501'),
(2,2,'Como funcionam os juros compostos em investimentos de longo prazo?','Os juros incidem apenas sobre o capital inicial depositado.','Os juros diminuem a rentabilidade do investimento conforme o tempo passa.','Os juros acumulam ao saldo principal, gerando novos juros.','Eles são idênticos aos juros simples.',3,'O efeito é conhecido como bola de neve.','2026-06-15 22:34:20.873632'),
(3,3,'De acordo com a regra 50-30-20, como deve ser distribuído o orçamento mensal?','50% Desejos, 30% Necessidades, 20% Poupança.','50% Necessidades, 30% Poupança, 20% Desejos.','50% Necessidades, 30% Desejos, 20% Poupança/Investimentos.','50% Poupança, 30% Necessidades, 20% Desejos.',3,'A distribuição correta é 50-30-20.','2026-06-15 22:34:20.882189'),
(4,4,'Qual a principal característica da reserva de emergência?','Alta oscilação diária.','Baixo risco e alta liquidez.','Prazo longo de carência.','Ser composta apenas por ações.',2,'A reserva deve estar disponível rapidamente.','2026-06-15 22:34:20.889539'),
(5,5,'Qual é a principal diferença entre Renda Fixa e Renda Variável?','Renda Fixa é sempre isenta de impostos.','Renda Fixa oferece previsibilidade enquanto a Variável oscila conforme o mercado.','Renda Variável é recomendada para reserva de emergência.','Renda Fixa nunca rende juros compostos.',2,'A principal diferença é o risco e previsibilidade.','2026-06-15 22:34:20.897737');


CREATE TABLE IF NOT EXISTS medalhas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    tipo_medalha VARCHAR(255) NOT NULL,
    conquistado_em TIMESTAMP,

    UNIQUE(usuario_id, tipo_medalha),

    FOREIGN KEY (usuario_id)
        REFERENCES perfis(id)
);

INSERT INTO medalhas
(id,conquistado_em,tipo_medalha,usuario_id)
OVERRIDING SYSTEM VALUE
VALUES
(1,'2026-06-15 23:26:58.230231','Primeira Aula',5),
(2,'2026-06-15 23:27:22.120672','Simulador Pro',5);


CREATE TABLE IF NOT EXISTS simulacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    tipo_investimento VARCHAR(255) NOT NULL,
    valor_inicial DOUBLE PRECISION NOT NULL,
    aporte_mensal DOUBLE PRECISION NOT NULL,
    taxa_anual DOUBLE PRECISION NOT NULL,
    tempo_meses INTEGER NOT NULL,
    valor_final DOUBLE PRECISION NOT NULL,
    criado_em TIMESTAMP,

    FOREIGN KEY (usuario_id)
        REFERENCES perfis(id)
);

INSERT INTO simulacoes
(id,taxa_anual,criado_em,valor_final,valor_inicial,tipo_investimento,aporte_mensal,tempo_meses,usuario_id)
OVERRIDING SYSTEM VALUE
VALUES
(1,6,'2026-06-15 23:27:22.108989',9009.06,5000,'Poupança',300,12,5);


CREATE TABLE IF NOT EXISTS progresso_usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    licao_id BIGINT NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    concluido_em TIMESTAMP,
    criado_em TIMESTAMP,

    UNIQUE(usuario_id, licao_id),

    FOREIGN KEY (usuario_id)
        REFERENCES perfis(id),

    FOREIGN KEY (licao_id)
        REFERENCES licoes(id)
);

INSERT INTO progresso_usuario
(id,concluido,concluido_em,criado_em,licao_id,usuario_id)
OVERRIDING SYSTEM VALUE
VALUES
(1,TRUE,'2026-06-15 23:26:58.217560','2026-06-15 23:26:58.217560',1,5);