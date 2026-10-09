# EduFinance

Plataforma gamificada de educação financeira. O usuário aprende por uma trilha de aulas com quiz, ganha XP e medalhas, simula investimentos, negocia ações com saldo virtual e conversa com um assistente de IA (FinBot).

O projeto tem um backend em Java/Spring Boot e um frontend em React, em pastas separadas do mesmo repositório.

## Funcionalidades

- **Autenticação** com e-mail e senha (JWT), cadastro e recuperação de senha simulada.
- **Trilha de aprendizado**: aulas organizadas por módulo, com perguntas de múltipla escolha. Concluir aulas dá XP; a cada 100 XP o usuário sobe de nível.
- **Medalhas** por marcos como a primeira aula e a primeira simulação.
- **Simulador de investimentos** com juros compostos e aportes mensais.
- **Mercado e carteira**: compra e venda de ações com saldo virtual (R$ 100.000 iniciais) e histórico de transações.
- **Rankings**: classificação global, por país, por estado e por cidade, ordenada por XP ou por saldo virtual, com busca por nome e paginação.
- **Grupos de ranking**: qualquer usuário cria um grupo para competir com conhecidos, convida pessoas por código ou link e administra os membros.
- **FinBot**: chat com um modelo de linguagem servido pelo Ollama, com histórico de conversas e um modo "inspetor" que explica elementos da tela.
- **Notícias** de finanças via NewsAPI (endpoint `/api/blog/news` no backend; ainda não exibido no frontend).
- **Personalização**: 7 paletas de cores e modo escuro, salvos no navegador.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Backend | Java 21, Spring Boot 3.3 (Web, Data JPA, Security, WebFlux/WebClient), JJWT, springdoc-openapi |
| Banco de dados | PostgreSQL |
| Frontend | React 19, Vite 8, Tailwind CSS 4, ApexCharts, lucide-react |
| IA | Ollama (servidor externo ao projeto) |
| Infraestrutura | Docker e Docker Compose (opcional) |

## Estrutura do repositório

```
├── src/main/java/com/edufinance/backend   Backend (config, controller, model, repository, service)
├── src/main/resources/application.properties
├── frontend/                              Aplicação React
├── eduFinance.sql                         Esquema e dados iniciais do banco
├── docker/db/                             Scripts extras de inicialização do banco no Docker
├── Dockerfile, docker-compose.yml         Containerização
└── system_overview.md                     Visão geral da arquitetura
```

A pasta `TESTE_IA/` é um projeto Spring Boot separado, usado para testar a integração com o Ollama. Ela não faz parte da aplicação.

## Como executar com Docker

É a forma mais simples: sobe o banco, o backend e o frontend de uma vez.

Pré-requisito: Docker Desktop em execução.

```bash
docker compose up --build
```

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8080 |
| Swagger | http://localhost:8080/swagger-ui.html |
| PostgreSQL | `localhost:5433`, banco `edufinance`, usuário `postgres`, senha `root` |

Na primeira subida, o `eduFinance.sql` é carregado automaticamente. Para recriar o banco do zero:

```bash
docker compose down -v
docker compose up --build
```

## Como executar sem Docker

### Pré-requisitos

- JDK 21
- Maven 3.9 ou superior
- Node.js 20 ou superior
- PostgreSQL

### 1. Banco de dados

Crie o banco e, se quiser os dados de exemplo, carregue o script:

```bash
createdb -U postgres edufinance
psql -U postgres -d edufinance -f eduFinance.sql
```

O script é opcional. O Hibernate cria e atualiza as tabelas sozinho (`ddl-auto=update`), e o backend cadastra as aulas e perguntas iniciais quando a tabela de aulas está vazia.

### 2. Backend

```bash
mvn spring-boot:run
```

O backend sobe em http://localhost:8080.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend sobe em http://localhost:5173.

## Configuração

### Backend

Os valores padrão estão em `src/main/resources/application.properties`. Qualquer propriedade pode ser sobrescrita por variável de ambiente.

| Propriedade | Variável de ambiente | Padrão |
|---|---|---|
| `spring.datasource.url` | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/edufinance` |
| `spring.datasource.username` | `SPRING_DATASOURCE_USERNAME` | `postgres` |
| `spring.datasource.password` | `SPRING_DATASOURCE_PASSWORD` | `root` |
| `ollama.api.url` | `OLLAMA_API_URL` | endereço de reserva do servidor Ollama (o endereço ativo é escolhido na aplicação, veja abaixo) |
| `ollama.default.model` | `OLLAMA_DEFAULT_MODEL` | `llama3.2:1b` |
| `news.api.key` | `NEWS_API_KEY` | chave padrão definida no código |

A chave que assina os tokens JWT é gerada a cada inicialização do backend. Por isso, reiniciar o backend invalida as sessões abertas, e os usuários precisam entrar de novo.

### Frontend

| Variável | Descrição | Padrão |
|---|---|---|
| `VITE_API_URL` | URL do backend acessada pelo navegador | `http://localhost:8080` |

Em desenvolvimento, o valor vem de `frontend/.env.development`. No Docker, ele é passado como argumento de build no `docker-compose.yml`.

### FinBot (Ollama)

O FinBot depende de um servidor Ollama, que não é iniciado por este projeto. O endereço do servidor pode ser trocado em tempo de execução pelo botão "IA" no cabeçalho da aplicação. Sem um servidor Ollama acessível, o restante da plataforma funciona normalmente; apenas o chat fica indisponível.

Se o backend estiver rodando no Docker e o Ollama na própria máquina, use `http://host.docker.internal:11434` em vez de `http://localhost:11434`.

## Rankings e grupos

### Rankings públicos

A aba **Ranking** tem quatro escopos: Global, País, Estado e Cidade. Os três últimos comparam com a localização que o usuário informou no próprio perfil (em **Perfil > Localização** ou na própria tela de ranking). Nada é deduzido por IP ou GPS: quem não informa a localização só aparece no ranking global.

Para o Brasil, o estado é escolhido em uma lista de UFs e o campo de cidade recebe sugestões da API de localidades do IBGE, consultada direto pelo navegador. Se essa consulta falhar, o campo continua aceitando texto livre.

A classificação é calculada no banco a cada consulta, a partir dos dados salvos nos perfis. Em caso de empate, a conta mais antiga (menor id) fica na frente, então a posição de cada pessoa é sempre a mesma entre duas consultas.

### Grupos

Cada grupo tem nome, descrição, ícone, uma regra de pontuação (XP ou saldo virtual) e um tipo de acesso:

| Acesso | Aparece na busca | Como entrar |
|---|---|---|
| Aberto | Sim | Qualquer pessoa entra |
| Com senha | Sim | Com a senha do grupo ou com o código de convite |
| Só por convite | Não | Apenas com o código de convite |

Todo grupo tem um código de convite de 8 caracteres, que também pode ser enviado como link (`http://localhost:5173/?convite=CODIGO`). Quem abre o link vê uma prévia do grupo e confirma a entrada.

Quem cria o grupo é o administrador. Administradores podem editar o grupo, trocar a senha, gerar um novo código de convite, promover ou rebaixar membros, remover membros e excluir o grupo. Qualquer membro pode sair; se o último administrador sair, o membro mais antigo assume, e se o último membro sair, o grupo é apagado.

Regras de segurança aplicadas no backend:

- Todas as permissões são verificadas no servidor, a partir do token JWT.
- A senha do grupo é guardada apenas como hash BCrypt e nunca é devolvida pela API.
- O código de convite só é mostrado a quem já é membro.
- Grupos só por convite respondem "não encontrado" para quem está de fora.
- As respostas de ranking não incluem e-mail.

Limitação conhecida: não há limite de tentativas para a senha de um grupo.

### Endpoints

| Método e caminho | Descrição |
|---|---|
| `GET /api/rankings?escopo=&metrica=&busca=&pagina=&tamanho=` | Ranking público. `escopo`: `global`, `pais`, `estado` ou `cidade`. `metrica`: `xp` ou `saldo` |
| `GET /api/rankings/perfis/{id}` | Perfil público de um participante |
| `PUT /api/perfis/me/localizacao` | Salva país, estado e cidade do usuário logado |
| `POST /api/grupos` | Cria um grupo |
| `GET /api/grupos/meus` | Grupos do usuário logado |
| `GET /api/grupos/descobrir?busca=&pagina=&tamanho=` | Grupos abertos e com senha |
| `GET /api/grupos/{id}` · `PUT` · `DELETE` | Detalhe, edição e exclusão |
| `GET /api/grupos/{id}/ranking` | Classificação do grupo |
| `GET /api/grupos/{id}/membros` | Membros do grupo |
| `POST /api/grupos/{id}/entrar` · `POST /api/grupos/{id}/sair` | Entrada (com `senha`, se houver) e saída |
| `GET /api/grupos/convite/{codigo}` · `POST /api/grupos/convite/{codigo}/entrar` | Prévia e entrada por convite |
| `POST /api/grupos/{id}/convite` | Gera um novo código de convite |
| `DELETE /api/grupos/{id}/membros/{perfilId}` | Remove um membro |
| `PUT /api/grupos/{id}/membros/{perfilId}/papel` | Define o papel: `ADMIN` ou `MEMBRO` |

Para acrescentar um escopo geográfico, adicione uma constante em `EscopoRanking`; para uma nova métrica, em `MetricaRanking`.

### Banco de dados

O Hibernate cria as tabelas `grupos_ranking` e `grupo_membros` e acrescenta as colunas `pais`, `estado` e `cidade` à tabela `perfis` na primeira inicialização depois da atualização. As colunas novas aceitam nulo, então os perfis existentes continuam válidos.

## Usuários de exemplo

O `eduFinance.sql` cria alguns perfis de exemplo (por exemplo `diego@edu.com`), que aparecem nos rankings. O hash de senha gravado no script não corresponde à senha indicada no comentário, então não é possível entrar com esses perfis. Para usar a aplicação, crie uma conta na tela de login.

## Testes e verificações

```bash
# Backend: testes unitários (JUnit 5 e Mockito)
mvn test

# Frontend: lint e build de produção
cd frontend
npm run lint
npm run build
```

Os testes do backend ficam em `src/test/java` e cobrem as regras dos grupos (criação, senha, convite, entrada, saída, sucessão de administrador e permissões) e as regras de escopo, métrica e busca dos rankings. Eles não precisam de banco de dados.

O frontend não tem testes automatizados.

## Desenvolvimento

- A documentação da API (Swagger) fica em `/swagger-ui.html` com o backend em execução.
- O frontend não usa roteador: a navegação entre telas é controlada pelo estado `activeTab` em `frontend/src/App.jsx`.
- O título de cada tela fica no cabeçalho compartilhado (`PAGE_META` em `App.jsx`). Cartões, botões e modais reutilizáveis estão em `frontend/src/components/ui.jsx`.
- As cores da interface são variáveis CSS definidas em `frontend/src/index.css` e trocadas pelas paletas de `App.jsx`. Componentes novos devem usar `var(--color-primary)`, `var(--color-primary-dark)` e `var(--color-accent)` em vez de cores fixas.
- Alterações nas entidades JPA são aplicadas ao banco na inicialização do backend (`ddl-auto=update`).
