const API_URL = "http://localhost:8080/api";
let userLogged = null;
let lessons = [];
let activeLesson = null;
let activeQuiz = null;
let selectedOption = null;

async function realizarLogin(e) {
    e.preventDefault();
    const name = document.getElementById("username").value;
    const email = document.getElementById("email").value;

    try {
        const res = await fetch(`${API_URL}/perfis/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: name, email: email })
        });

        if (res.ok) {
            userLogged = await res.json();
            document.getElementById("login-container").style.display = "none";
            document.getElementById("main-layout").style.display = "flex";
            atualizarPerfilUI();
            carregarDashboard();
        } else {
            alert("Erro ao realizar login. Tente novamente.");
        }
    } catch (err) {
        console.error(err);
        alert("Erro ao conectar ao servidor Spring Boot na porta 8080. Verifique se ele está rodando.");
    }
}

function fazerLogout() {
    userLogged = null;
    document.getElementById("username").value = "";
    document.getElementById("email").value = "";
    document.getElementById("login-container").style.display = "flex";
    document.getElementById("main-layout").style.display = "none";
}

function mostrarSecao(secaoId, menuEl) {
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));

    document.getElementById(`sec-${secaoId}`).classList.add("active");
    menuEl.classList.add("active");

    voltarParaLista();

    if (secaoId === "dashboard") {
        carregarDashboard();
    } else if (secaoId === "aulas") {
        carregarModulo('fundamentos');
    } else if (secaoId === "simulador") {
        carregarHistoricoSimulacoes();
    } else if (secaoId === "ranking") {
        carregarRanking();
    } else if (secaoId === 'blog') {
        carregarBlog();
    }
}

function atualizarPerfilUI() {
    if (!userLogged) return;
    document.getElementById("user-display-name").innerText = userLogged.nome;
    document.getElementById("user-display-level").innerText = `Nível ${userLogged.nivel}`;
    document.getElementById("banner-username").innerText = userLogged.nome;
    document.getElementById("dashboard-balance").innerText = formatarDinheiro(userLogged.saldoVirtual);
}

async function carregarBlog() {
    if (!userLogged) return;

    // 1. Fetch user progress reward (XP)
    try {
        const resB = await fetch(`${API_URL}/blog/${userLogged.id}`);
        if (resB.ok) {
            const perfilAtualizado = await resB.json();
            // Check if level increased to display feedback
            if (perfilAtualizado.nivel > userLogged.nivel) {
                alert(`Parabéns! Você subiu para o Nível ${perfilAtualizado.nivel}!`);
            }
            userLogged = perfilAtualizado;
            atualizarPerfilUI();
        }
    } catch (err) {
        console.error("Erro ao atualizar XP do blog:", err);
    }

    // 2. Fetch news articles
    const container = document.getElementById("blog-articles-container");
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #6c757d; padding: 2rem;">Carregando notícias...</div>`;

    try {
        const resN = await fetch(`${API_URL}/blog/news`);
        if (resN.ok) {
            const data = await resN.json();
            container.innerHTML = "";

            if (!data.articles || data.articles.length === 0) {
                container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #6c757d; padding: 2rem;">Nenhum artigo encontrado no momento.</div>`;
                return;
            }

            data.articles.forEach(article => {
                const imgUrl = article.urlToImage || "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=640&auto=format&fit=crop"; // default finance placeholder
                const date = new Date(article.publishedAt).toLocaleDateString('pt-BR');
                const source = article.source ? article.source.name : "Notícia";

                const card = document.createElement("div");
                card.className = "blog-card";
                card.innerHTML = `
                    <img src="${imgUrl}" alt="Imagem do artigo" onerror="this.src='https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=640&auto=format&fit=crop'">
                    <div class="blog-card-content">
                        <div class="blog-card-meta">${source} • ${date}</div>
                        <h3 class="blog-card-title">${article.title}</h3>
                        <p class="blog-card-description">${article.description || "Clique no link abaixo para ler os detalhes da matéria."}</p>
                        <a href="${article.url}" target="_blank" class="blog-card-link">Ler notícia completa →</a>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #dc3545; padding: 2rem;">Erro ao carregar os artigos. Verifique a chave de API.</div>`;
        }
    } catch (err) {
        console.error("Erro ao buscar notícias:", err);
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #dc3545; padding: 2rem;">Erro de conexão com o servidor.</div>`;
    }
}

async function carregarDashboard() {
    if (!userLogged) return;

    try {
        const resU = await fetch(`${API_URL}/perfis/${userLogged.id}`);
        if (resU.ok) {
            userLogged = await resU.json();
            atualizarPerfilUI();
        }

        const resP = await fetch(`${API_URL}/licoes/usuario/${userLogged.id}/progresso`);
        let totalCompleted = 0;
        if (resP.ok) {
            const progressList = await resP.json();
            totalCompleted = progressList.filter(p => p.concluido).length;
        }

        document.getElementById("dashboard-xp").innerText = `${userLogged.xp} XP`;
        document.getElementById("dashboard-level").innerText = `Nível ${userLogged.nivel}`;
        document.getElementById("dashboard-lessons-count").innerText = `${totalCompleted} / 5`;

        atualizarBadges(totalCompleted);

    } catch (err) {
        console.error(err);
    }
}

function atualizarBadges(completedCount) {
    document.querySelectorAll(".badge-card").forEach(c => c.classList.remove("unlocked"));

    if (completedCount >= 1) {
        document.getElementById("b-primeira-aula").classList.add("unlocked");
    }
    if (completedCount >= 5) {
        document.getElementById("b-mestre-financas").classList.add("unlocked");
    }
    if (userLogged.xp >= 100) {
        document.getElementById("b-investidor-bronze").classList.add("unlocked");
    }

    fetch(`${API_URL}/simulacoes/usuario/${userLogged.id}`)
        .then(r => r.json())
        .then(sims => {
            if (sims && sims.length > 0) {
                document.getElementById("b-simulador-pro").classList.add("unlocked");
            }
        }).catch(e => console.error(e));
}

let currentModule = "fundamentos";
async function carregarModulo(moduloName, btnEl = null) {
    currentModule = moduloName;

    if (btnEl) {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btnEl.classList.add("active");
    }

    try {
        const resL = await fetch(`${API_URL}/licoes/modulo/${moduloName}`);
        const resP = await fetch(`${API_URL}/licoes/usuario/${userLogged.id}/progresso`);

        if (resL.ok && resP.ok) {
            lessons = await resL.json();
            const progress = await resP.json();

            const container = document.getElementById("lessons-container");
            container.innerHTML = "";

            lessons.forEach((lesson, index) => {
                const isDone = progress.some(p => p.licaoId === lesson.id && p.concluido);
                const statusText = isDone ? "✅ Concluída" : "⏳ Pendente";

                const div = document.createElement("div");
                div.className = "lesson-item";
                div.onclick = () => verAula(lesson, isDone);
                div.innerHTML = `
                    <div>
                        <strong>Aula ${index + 1}: ${lesson.titulo}</strong>
                        <p style="font-size:12px; color:#6c757d; margin-top:2px;">Módulo: ${capitalize(lesson.modulo)}</p>
                    </div>
                    <span style="font-size: 14px; font-weight: 600;">${statusText}</span>
                `;
                container.appendChild(div);
            });
        }
    } catch (e) { console.error(e); }
}

function verAula(lesson, isDone) {
    activeLesson = lesson;
    selectedOption = null;

    document.getElementById("lessons-list-view").style.display = "none";
    document.getElementById("lesson-viewer").style.display = "block";

    document.getElementById("viewer-title").innerText = `${lesson.ordemLicao}. ${lesson.titulo}`;
    document.getElementById("viewer-content").innerText = lesson.conteudo;
    document.getElementById("viewer-example").innerText = lesson.exemplo;

    const feedback = document.getElementById("quiz-feedback");
    feedback.style.display = "none";

    fetch(`${API_URL}/perguntas/licao/${lesson.id}`)
        .then(r => r.json())
        .then(quizzes => {
            if (quizzes.length > 0) {
                activeQuiz = quizzes[0];
                document.getElementById("viewer-question").innerText = `Questão Prática: ${activeQuiz.pergunta}`;

                const optContainer = document.getElementById("options-container");
                optContainer.innerHTML = "";

                const options = [activeQuiz.opcaoA, activeQuiz.opcaoB, activeQuiz.opcaoC, activeQuiz.opcaoD];
                options.forEach((opt, idx) => {
                    const btn = document.createElement("button");
                    btn.className = "option-btn";
                    btn.innerText = `${idx + 1}. ${opt}`;
                    btn.onclick = () => {
                        selectedOption = idx + 1;
                        document.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
                        btn.classList.add("selected");
                    };
                    optContainer.appendChild(btn);
                });

                if (isDone) {
                    destacarOpcaoCorreta(activeQuiz.respostaCorreta);
                    exibirFeedbackQuiz(true, activeQuiz.explicacao, "Lição já concluída anteriormente!");
                }
            } else {
                document.getElementById("viewer-question").innerText = "Esta aula não possui quiz cadastrado.";
                document.getElementById("options-container").innerHTML = "";
            }
        }).catch(e => console.error(e));
}

function destacarOpcaoCorreta(correctIdx) {
    const btns = document.querySelectorAll(".option-btn");
    btns.forEach((btn, idx) => {
        if ((idx + 1) === correctIdx) {
            btn.style.borderColor = "#198754";
            btn.style.backgroundColor = "rgba(25, 135, 84, 0.05)";
        } else {
            btn.style.opacity = 0.5;
        }
    });
}

function exibirFeedbackQuiz(isCorrect, explanation, customTitle = "") {
    const f = document.getElementById("quiz-feedback");
    const status = document.getElementById("feedback-status");
    const text = document.getElementById("feedback-text");

    f.style.display = "block";
    text.innerText = explanation;

    if (isCorrect) {
        f.className = "feedback success";
        status.innerText = customTitle || "✔️ RESPOSTA CORRETA!";
    } else {
        f.className = "feedback error";
        status.innerText = "❌ RESPOSTA INCORRETA";
    }
}

async function enviarRespostaQuiz() {
    if (selectedOption === null || !activeQuiz) {
        alert("Por favor, selecione uma opção!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/perguntas/${activeQuiz.id}/enviar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: userLogged.id,
                opcaoSelecionada: selectedOption
            })
        });

        if (res.ok) {
            const result = await res.json();
            destacarOpcaoCorreta(activeQuiz.respostaCorreta);

            if (result.correto) {
                exibirFeedbackQuiz(true, result.explicacao);
                alert(`Parabéns! Você ganhou +${result.xpGanho} XP!`);
                if (result.subiuNivel) {
                    alert(`Subiu de Nível! Você agora é Nível ${result.nivelAtual}!`);
                }
                userLogged.xp = result.xpAtual;
                userLogged.nivel = result.nivelAtual;
                atualizarPerfilUI();
            } else {
                exibirFeedbackQuiz(false, "Sua resposta está errada. Tente ler o conteúdo novamente e faça uma nova tentativa.");
            }
        }
    } catch (e) { console.error(e); }
}

function voltarParaLista() {
    document.getElementById("lessons-list-view").style.display = "block";
    document.getElementById("lesson-viewer").style.display = "none";
    activeLesson = null;
    activeQuiz = null;
}

function obterTaxaReferencia(tipo) {
    if (tipo === "Poupança") return 6.17;
    if (tipo === "CDB 100% CDI") return 12.0;
    if (tipo === "Tesouro Selic") return 10.5;
    if (tipo === "Renda Variável") return 15.0;
    return 6.0;
}

async function calcularJurosCompostos() {
    const type = document.getElementById("sim-type").value;
    const initial = parseFloat(document.getElementById("sim-initial").value);
    const monthly = parseFloat(document.getElementById("sim-monthly").value);
    const months = parseInt(document.getElementById("sim-months").value);
    const rate = obterTaxaReferencia(type);

    if (isNaN(initial) || isNaN(monthly) || isNaN(months)) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/simulacoes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: userLogged.id,
                tipoInvestimento: type,
                valorInicial: initial,
                aporteMensal: monthly,
                taxaAnual: rate,
                tempoMeses: months
            })
        });

        if (res.ok) {
            const result = await res.json();

            document.getElementById("sim-result-final").innerText = formatarDinheiro(result.simulacao.valorFinal);

            const totalInvestido = initial + (monthly * months);
            const jurosAcumulados = result.simulacao.valorFinal - totalInvestido;

            document.getElementById("sim-result-desc").innerHTML = `
                Total de recursos investidos: <strong>${formatarDinheiro(totalInvestido)}</strong>.<br>
                Rentabilidade gerada por juros compostos: <strong class="text-success">${formatarDinheiro(jurosAcumulados)}</strong>.<br>
                Saldo virtual da sua conta atualizado!
            `;

            userLogged.saldoVirtual = result.saldoAtualizado;
            atualizarPerfilUI();
            carregarHistoricoSimulacoes();
        }
    } catch (e) { console.error(e); }
}

async function carregarHistoricoSimulacoes() {
    try {
        const res = await fetch(`${API_URL}/simulacoes/usuario/${userLogged.id}`);
        if (res.ok) {
            const sims = await res.json();
            const tbody = document.getElementById("sim-history-tbody");
            tbody.innerHTML = "";

            if (sims.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#6c757d;">Nenhuma simulação no histórico.</td></tr>`;
                return;
            }

            sims.forEach(s => {
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${s.tipoInvestimento}</strong></td>
                        <td>${formatarDinheiro(s.valorInicial)}</td>
                        <td>${formatarDinheiro(s.aporteMensal)}/mês</td>
                        <td>${s.tempoMeses} meses</td>
                        <td class="text-success" style="font-weight:700;">${formatarDinheiro(s.valorFinal)}</td>
                    </tr>
                `;
            });
        }
    } catch (e) { console.error(e); }
}

async function carregarRanking() {
    try {
        const res = await fetch(`${API_URL}/perfis/ranking`);
        if (res.ok) {
            const rankings = await res.json();
            const tbody = document.getElementById("ranking-tbody");
            tbody.innerHTML = "";

            rankings.forEach((profile, index) => {
                const isMe = userLogged && userLogged.id === profile.id;
                const meStyle = isMe ? "background-color: #e8f1ff; font-weight: bold; border-left: 4px solid #0d6efd;" : "";

                tbody.innerHTML += `
                    <tr style="${meStyle}">
                        <td>#${index + 1}</td>
                        <td>${profile.nome} ${isMe ? "(Você)" : ""}</td>
                        <td>Nível ${profile.nivel}</td>
                        <td>${formatarDinheiro(profile.saldoVirtual)}</td>
                        <td class="text-primary">${profile.xp} XP</td>
                    </tr>
                `;
            });
        }
    } catch (e) { console.error(e); }
}

function formatarDinheiro(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}
