# EduFinance

Plataforma gamificada de educação financeira. O usuário aprende por uma trilha de aulas com quiz, ganha XP e medalhas, simula investimentos, negocia ações com saldo virtual e conversa com um assistente de IA (FinBot).

O projeto tem um backend em Java/Spring Boot e um frontend em React, em pastas separadas do mesmo repositório.

## Funcionalidades

- **Autenticação** com e-mail e senha (JWT), cadastro e recuperação de senha simulada.
- **Trilha de aprendizado**: aulas organizadas por módulo, com perguntas de múltipla escolha. Concluir aulas dá XP; a cada 100 XP o usuário sobe de nível.
- **Medalhas** por marcos como a primeira aula e a primeira simulação.
- **Simulador de investimentos** com juros compostos e aportes mensais.
- **Mercado e carteira**: compra e venda de ações com saldo virtual (R$ 100.000 iniciais) e histórico de transações.
- **Ranking** de usuários por XP.
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

## Usuários de exemplo

O `eduFinance.sql` cria alguns usuários de teste (por exemplo `diego@edu.com`). Você também pode criar uma conta nova na tela de login.

## Testes e verificações

O projeto ainda não tem testes automatizados. Os comandos disponíveis são:

```bash
# Backend: compila e executa os testes (nenhum por enquanto)
mvn test

# Frontend: lint e build de produção
cd frontend
npm run lint
npm run build
```

## Desenvolvimento

- A documentação da API (Swagger) fica em `/swagger-ui.html` com o backend em execução.
- O frontend não usa roteador: a navegação entre telas é controlada pelo estado `activeTab` em `frontend/src/App.jsx`.
- As cores da interface são variáveis CSS definidas em `frontend/src/index.css` e trocadas pelas paletas de `App.jsx`. Componentes novos devem usar `var(--color-primary)`, `var(--color-primary-dark)` e `var(--color-accent)` em vez de cores fixas.
- Alterações nas entidades JPA são aplicadas ao banco na inicialização do backend (`ddl-auto=update`).
