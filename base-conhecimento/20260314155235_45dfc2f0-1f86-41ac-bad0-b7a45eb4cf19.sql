
-- MÓDULO AÇÕES - Conteúdos enriquecidos

UPDATE lessons SET content = 'A Bolsa de Valores é um mercado organizado onde são negociados títulos e valores mobiliários, principalmente ações de empresas. No Brasil, a B3 (Brasil, Bolsa, Balcão), sediada em São Paulo, é a única bolsa de valores do país.

Como explicou o economista Eugene Fama, Nobel de Economia e criador da Hipótese dos Mercados Eficientes: "Os preços das ações refletem toda a informação disponível." Na prática, isso significa que é muito difícil "ganhar do mercado" consistentemente.

Quando você compra uma ação, torna-se sócio daquela empresa. Existem dois tipos principais: ações ordinárias (ON, com direito a voto) e ações preferenciais (PN, com prioridade na distribuição de dividendos).

A B3 tem uma história rica. Nasceu em 1890 como Bolsa Livre e passou por diversas fusões. Em 2017, a fusão da BM&FBovespa com a Cetip criou a B3 atual — uma das maiores bolsas do mundo em valor de mercado.

O Ibovespa é o principal índice da bolsa brasileira, composto pelas ações mais negociadas. Criado em 1968, é referência para medir o desempenho do mercado acionário nacional.

Benjamin Graham ensinou: "No curto prazo, o mercado é uma máquina de votação. No longo prazo, é uma máquina de pesagem." Ou seja, no curto prazo os preços refletem emoções; no longo prazo, refletem o valor real das empresas.',
example = 'Em 2008, durante a crise do subprime, o Ibovespa caiu de 73.000 para 29.000 pontos (queda de 60%). Quem vendeu no pânico realizou perdas enormes. Quem manteve ou comprou mais aproveitou a recuperação — em 2010, o índice já havia voltado aos 70.000 pontos. Warren Buffett comprou ações durante a crise e disse: "Tenha medo quando os outros são gananciosos e seja ganancioso quando os outros têm medo."'
WHERE id = 'd4000000-0000-0000-0000-000000000001';

UPDATE lessons SET content = 'A análise fundamentalista é um método de avaliação de investimentos que examina os fundamentos econômicos e financeiros de uma empresa para determinar seu valor intrínseco.

Benjamin Graham, pai da análise fundamentalista, ensinou em "Security Analysis" (1934): "O preço é o que você paga; valor é o que você recebe." Se o preço de mercado está abaixo do valor intrínseco, a ação está barata (margem de segurança).

Principais indicadores fundamentalistas: (1) P/L (Preço/Lucro) — quantos anos de lucro o preço atual representa. P/L médio da bolsa brasileira fica entre 10-15; (2) P/VPA (Preço/Valor Patrimonial) — relação entre preço de mercado e valor contábil. Abaixo de 1 pode indicar ação barata; (3) ROE (Retorno sobre Patrimônio) — mede a rentabilidade. Acima de 15% é considerado bom; (4) Dividend Yield — percentual de dividendos em relação ao preço. Acima de 6% é atrativo; (5) Dívida Líquida/EBITDA — mede endividamento. Acima de 3x pode ser preocupante.

Aswath Damodaran, professor da NYU e considerado o "Papa da Valuação", ensina: "Toda avaliação é viesada. A questão é qual a direção e magnitude do viés."

Philip Fisher, autor de "Ações Comuns, Lucros Extraordinários", complementa a análise quantitativa com critérios qualitativos: qualidade da gestão, vantagens competitivas, capacidade de inovação e potencial de crescimento.',
example = 'Analisando a WEG (WEGE3): P/L de 35 (acima da média, mas empresa de crescimento), ROE de 30% (excelente), Dívida/EBITDA de 0,5x (baixo endividamento), Dividend Yield de 1,5% (baixo, reinveste nos negócios). Parece cara pelo P/L, mas o ROE excepcional e baixo endividamento justificam o prêmio. Peter Lynch chamaria isso de "PEG Ratio" — comparar P/L com crescimento dos lucros.'
WHERE id = 'd4000000-0000-0000-0000-000000000002';

UPDATE lessons SET content = 'A análise técnica estuda padrões de preços e volumes passados para prever movimentos futuros. Baseia-se na premissa de que "a história se repete" e que os preços se movem em tendências.

Charles Dow, fundador do Wall Street Journal e criador da Teoria de Dow (base da análise técnica moderna), estabeleceu princípios fundamentais: os preços descontam tudo, o mercado tem três tendências (primária, secundária e terciária), e as tendências persistem até que sinais definitivos provem reversão.

Ferramentas básicas: (1) Médias Móveis — suavizam oscilações e indicam tendência. A média de 200 dias é referência para tendência de longo prazo; (2) Suporte e Resistência — níveis de preço onde historicamente há maior pressão compradora ou vendedora; (3) Volume — confirma movimentos de preço; (4) RSI (Índice de Força Relativa) — indica sobrecompra (acima de 70) ou sobrevenda (abaixo de 30); (5) MACD — identifica mudanças de momentum.

John Murphy, autor de "Technical Analysis of the Financial Markets", é uma das maiores autoridades: "A análise técnica é o estudo da ação do mercado, principalmente através de gráficos, com o propósito de prever tendências futuras de preços."

Alexander Elder, trader e psiquiatra, em "Trading for a Living", alerta: "O sucesso no trading depende dos 3 Ms: Mind (psicologia), Method (estratégia) e Money (gestão de risco)."',
example = 'PETR4 está em tendência de alta (acima da média móvel de 200 dias). O preço toca o suporte em R$ 28 três vezes sem romper (suporte forte). RSI em 35 (próximo de sobrevenda). Analistas técnicos veriam isso como oportunidade de compra. Se romper o suporte, o próximo nível seria R$ 25. Como diria Jesse Livermore, lendário especulador: "O mercado é guiado por duas emoções: medo e ganância."'
WHERE id = 'd4000000-0000-0000-0000-000000000003';

UPDATE lessons SET content = 'Dividendos são a parcela do lucro líquido de uma empresa distribuída aos acionistas. No Brasil, empresas listadas são obrigadas a distribuir no mínimo 25% do lucro líquido (conforme estatuto social).

Luiz Barsi, o maior investidor individual da bolsa brasileira (patrimônio estimado em R$ 4 bilhões), construiu sua fortuna com a estratégia de dividendos: "Compre ações boas, reinvista os dividendos e tenha paciência. O tempo faz o trabalho pesado." Ele compra ações desde a década de 1960.

Tipos de proventos: (1) Dividendos — parte do lucro, isentos de IR para pessoa física; (2) Juros sobre Capital Próprio (JCP) — dedutível para a empresa, tributado em 15% para o investidor; (3) Bonificação — distribuição de novas ações; (4) Desdobramento — divisão de ações (não altera o valor total).

O conceito de "Dividend Yield" mede o retorno em dividendos: DY = Dividendos por ação ÷ Preço da ação × 100. Um DY acima de 6% é considerado atrativo no mercado brasileiro.

John D. Rockefeller disse: "Sabe o que me dá mais prazer? Ver meus dividendos entrando."

A estratégia de dividendos é especialmente poderosa com reinvestimento. Reinvestir dividendos ao longo de décadas cria um efeito "bola de neve" exponencial — é a materialização prática dos juros compostos no mercado de ações.',
example = 'Se você tem 1.000 ações da TAEE11 a R$ 12 cada (R$ 12.000 investidos) e ela paga R$ 1,20/ação em dividendos ao ano (DY de 10%), você recebe R$ 1.200/ano — ou R$ 100/mês de renda passiva. Reinvestindo os dividendos, em 10 anos você teria aproximadamente 2.590 ações (sem considerar valorização), gerando R$ 3.108/ano. Barsi chama isso de "aposentadoria através de dividendos".'
WHERE id = 'd4000000-0000-0000-0000-000000000004';

UPDATE lessons SET content = 'Fundos Imobiliários (FIIs) são fundos que investem em imóveis ou títulos ligados ao mercado imobiliário. As cotas são negociadas na B3 como ações e os rendimentos mensais são isentos de IR para pessoa física.

Existem três tipos principais: (1) Fundos de Tijolo — investem diretamente em imóveis físicos (shopping centers, lajes corporativas, galpões logísticos, hospitais); (2) Fundos de Papel — investem em títulos imobiliários como CRI, LCI e LH; (3) Fundos de Fundos (FOFs) — investem em cotas de outros FIIs.

O professor Baroni (Suno Research), referência em FIIs no Brasil, explica: "FIIs democratizaram o investimento imobiliário. Com R$ 100 você pode ser sócio de um shopping center que vale bilhões."

Vantagens dos FIIs: rendimentos mensais isentos de IR, diversificação imobiliária com pouco capital, liquidez (compra e venda na bolsa), gestão profissional. Riscos: vacância dos imóveis, inadimplência dos locatários, oscilação das cotas, risco de crédito (fundos de papel).

O indicador P/VP (Preço/Valor Patrimonial) é fundamental: abaixo de 1 significa que o fundo está sendo negociado abaixo do valor dos seus ativos — potencial oportunidade. O Dividend Yield mensal médio dos FIIs brasileiros gira em torno de 0,7-0,9%.

Robert Kiyosaki afirma: "Imóveis são a base da riqueza." FIIs permitem acessar essa classe de ativos sem as dificuldades de comprar e administrar imóveis diretamente.',
example = 'Com R$ 10.000, em vez de comprar um imóvel (que custaria R$ 300.000+), você diversifica em 5 FIIs: HGLG11 (logística), XPML11 (shoppings), KNRI11 (lajes), MXRF11 (papéis) e VISC11 (shoppings). Se o DY médio é 0,8% ao mês, você recebe R$ 80/mês isento de IR. É o equivalente a ter R$ 80 de "aluguel" sem burocracia, inquilinos ou manutenção.'
WHERE id = 'd4000000-0000-0000-0000-000000000005';
