
-- MÓDULO INVESTIMENTOS - Conteúdos enriquecidos

UPDATE lessons SET content = 'Investir é o ato de aplicar dinheiro com a expectativa de obter um retorno financeiro no futuro. Diferente de poupar (guardar dinheiro), investir significa colocar seu capital para trabalhar, gerando rendimentos.

Benjamin Graham, autor de "O Investidor Inteligente" e mentor de Warren Buffett, definiu: "Uma operação de investimento é aquela que, após análise minuciosa, promete segurança do principal e um retorno adequado. Operações que não atendem a esses requisitos são especulativas."

Os investimentos se dividem em duas grandes categorias: Renda Fixa — onde você sabe (ou tem previsibilidade) do retorno (Tesouro Direto, CDB, LCI); e Renda Variável — onde o retorno é incerto e depende do mercado (ações, FIIs, criptomoedas).

Ray Dalio, fundador da Bridgewater Associates (maior hedge fund do mundo), aconselha: "A maior erro dos investidores é acreditar que o que aconteceu recentemente vai continuar acontecendo. Os mercados são cíclicos."

No Brasil, a B3 (Brasil, Bolsa, Balcão) é a bolsa de valores onde são negociadas ações, FIIs, ETFs e outros ativos. Em 2023, o número de investidores pessoa física na B3 ultrapassou 5 milhões — mas isso representa apenas 3% da população, contra 55% nos EUA.

Antes de investir, é fundamental: (1) Ter uma reserva de emergência; (2) Conhecer seu perfil de investidor; (3) Definir seus objetivos e prazos; (4) Entender os custos (taxas de administração, corretagem, impostos).',
example = 'Maria tem R$ 5.000 e quer começar a investir. Seguindo o conselho de Warren Buffett — "Nunca invista em algo que você não entende" — ela estuda as opções e divide: R$ 2.000 no Tesouro Selic (liquidez e segurança), R$ 2.000 em CDB a 120% do CDI (rendimento maior) e R$ 1.000 em um ETF do Ibovespa (exposição à bolsa). Essa diversificação equilibra segurança e potencial de retorno.'
WHERE id = 'b2000000-0000-0000-0000-000000000001';

UPDATE lessons SET content = 'O Tesouro Direto é um programa do Governo Federal que permite que pessoas físicas comprem títulos públicos pela internet. Criado em 2002, democratizou o acesso a investimentos que antes eram restritos a grandes investidores.

É considerado o investimento mais seguro do Brasil, pois é garantido pelo Tesouro Nacional. Como explica o economista Ricardo Amorim: "O Tesouro Direto é o investimento ideal para quem está começando — seguro, acessível e com boa rentabilidade."

Tipos de títulos: (1) Tesouro Selic — acompanha a taxa Selic, ideal para reserva de emergência (liquidez diária); (2) Tesouro Prefixado — taxa fixa definida na compra, ideal quando se espera queda de juros; (3) Tesouro IPCA+ — rende inflação + taxa fixa, protege o poder de compra no longo prazo.

O investimento mínimo é de aproximadamente R$ 30, e a custódia é de 0,20% ao ano sobre o valor investido (isenta para Tesouro Selic até R$ 10.000). O Imposto de Renda segue tabela regressiva: 22,5% (até 180 dias) a 15% (acima de 720 dias).

O economista André Bona destaca: "O Tesouro IPCA+ é um dos melhores investimentos de longo prazo disponíveis no Brasil, pois garante rentabilidade real acima da inflação."',
example = 'Pedro investe R$ 500/mês no Tesouro IPCA+ 2035 com taxa de IPCA + 6% ao ano. Se a inflação média for 4% ao ano, seu rendimento nominal será de aproximadamente 10% ao ano. Em 10 anos, com aportes mensais de R$ 500, ele acumulará cerca de R$ 102.000 (investiu R$ 60.000 e ganhou R$ 42.000 de juros). E o melhor: seu poder de compra está protegido contra a inflação.'
WHERE id = 'b2000000-0000-0000-0000-000000000002';

UPDATE lessons SET content = 'CDB (Certificado de Depósito Bancário), LCI (Letra de Crédito Imobiliário) e LCA (Letra de Crédito do Agronegócio) são títulos de renda fixa emitidos por bancos para captar recursos.

O CDB é o mais comum: ao comprar um CDB, você empresta dinheiro ao banco e recebe juros. A rentabilidade pode ser prefixada, pós-fixada (% do CDI) ou atrelada à inflação. CDBs de bancos menores costumam oferecer taxas melhores (120-130% do CDI) para compensar o maior risco.

LCI e LCA funcionam de forma semelhante, mas com uma vantagem importante: são isentos de Imposto de Renda para pessoa física. O economista Samy Dana explica: "A isenção fiscal da LCI e LCA faz com que uma LCI a 90% do CDI renda mais que um CDB a 100% do CDI, após descontar o IR."

Todos são protegidos pelo FGC (Fundo Garantidor de Créditos) até R$ 250.000 por CPF por instituição. O FGC é uma entidade privada que funciona como um seguro para os depositantes, criado após crises bancárias dos anos 1990.

Na hora de escolher, compare a rentabilidade líquida (após IR e taxas). Use a fórmula: para igualar uma LCI, o CDB precisaria render: Taxa LCI ÷ (1 - alíquota IR). Ex: LCI a 90% do CDI equivale a CDB de 106% do CDI (para IR de 15%).',
example = 'Ana encontra duas opções: CDB a 110% do CDI e LCI a 95% do CDI, ambos para 2 anos. CDB: 110% × CDI - 15% IR = 93,5% do CDI líquido. LCI: 95% do CDI (isenta de IR). A LCI é melhor! Como ensina o economista Thiago Nigro (O Primo Rico): "Não olhe apenas a taxa bruta, sempre compare o rendimento líquido após impostos."'
WHERE id = 'b2000000-0000-0000-0000-000000000003';

UPDATE lessons SET content = 'Fundos de investimento são veículos que reúnem recursos de vários investidores para aplicar em conjunto no mercado financeiro, sob gestão de um profissional (gestor do fundo).

Peter Lynch, lendário gestor do Fidelity Magellan Fund que obteve retorno médio de 29% ao ano por 13 anos, aconselha: "Invista no que você conhece." Ele defende que investidores individuais podem ter vantagens sobre profissionais ao investir em setores que conhecem bem.

Tipos de fundos no Brasil: (1) Fundos DI/Renda Fixa — investem em títulos de renda fixa, menor risco; (2) Fundos Multimercado — podem investir em diversos ativos, risco moderado; (3) Fundos de Ações — mínimo 67% em ações, maior risco/retorno; (4) Fundos Imobiliários (FIIs) — investem em imóveis, distribuem rendimentos mensais; (5) ETFs — fundos que replicam índices (ex: BOVA11 replica o Ibovespa).

Atenção aos custos: taxa de administração (cobrada anualmente sobre o patrimônio), taxa de performance (cobrada sobre o que exceder o benchmark) e come-cotas (antecipação semestral do IR em maio e novembro).

John Bogle, fundador da Vanguard e criador dos fundos de índice, alertou: "No investimento, você recebe o que não paga. Os custos importam." Fundos com taxas altas precisam render muito mais para compensar.',
example = 'Carlos quer diversificar com R$ 10.000. Escolhe: R$ 5.000 em fundo DI (taxa admin 0,3% ao ano), R$ 3.000 em ETF BOVA11 (taxa 0,10%) e R$ 2.000 em FII HGLG11 (taxa 0,60%). Os FIIs distribuem rendimentos mensais isentos de IR para pessoa física — um atrativo adicional. Como disse Bogle: "Não procure a agulha no palheiro. Compre o palheiro inteiro" — referindo-se a investir em fundos de índice.'
WHERE id = 'b2000000-0000-0000-0000-000000000004';

UPDATE lessons SET content = 'Diversificação é a estratégia de distribuir investimentos entre diferentes tipos de ativos para reduzir o risco total da carteira. É um dos princípios mais importantes da gestão de investimentos.

Harry Markowitz, Nobel de Economia, provou matematicamente que uma carteira diversificada pode oferecer melhor retorno para o mesmo nível de risco. Ele disse: "A diversificação é o único almoço grátis em finanças."

A diversificação funciona porque diferentes ativos reagem de formas distintas às mesmas condições de mercado. Quando ações caem, títulos de renda fixa podem subir. Quando o real desvaloriza, investimentos em dólar se valorizam.

Ray Dalio, em seu livro "Princípios", recomenda o "All Weather Portfolio" — uma carteira para todos os climas econômicos: 30% ações, 40% títulos longos, 15% títulos médios, 7,5% ouro e 7,5% commodities.

No contexto brasileiro, uma diversificação básica inclui: Renda fixa (Tesouro, CDB) para segurança; Renda variável (ações, FIIs) para crescimento; Ativos internacionais (BDRs, ETFs globais) para proteção cambial; Reserva de emergência em Tesouro Selic.

Warren Buffett, por outro lado, alerta: "A diversificação ampla só é necessária quando investidores não entendem o que estão fazendo." Para iniciantes, porém, diversificar é fundamental.',
example = 'Em 2020 (pandemia), quem tinha 100% em ações do Ibovespa perdeu 36% em março. Quem tinha carteira diversificada com 40% renda fixa, 30% ações, 20% FIIs e 10% dólar perdeu apenas 12%. A recuperação também foi mais suave. O economista Aswath Damodaran ensina: "Não coloque todos os ovos na mesma cesta, mas também não tenha tantas cestas que não consiga monitorá-las."'
WHERE id = 'b2000000-0000-0000-0000-000000000005';
