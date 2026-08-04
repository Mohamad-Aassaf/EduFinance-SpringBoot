// ===== Estado da aplicação =====
let isLoading = false;
let totalTokens = 0;

// ===== Inicialização =====
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    document.getElementById('messageInput').focus();
});

// ===== Health Check =====
async function checkHealth() {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');

    try {
        const res = await fetch('/api/health');
        if (res.ok) {
            indicator.classList.add('online');
            statusText.textContent = 'Online';
        } else {
            throw new Error('Not OK');
        }
    } catch {
        indicator.classList.add('error');
        statusText.textContent = 'Offline';
    }
}

// ===== Enviar mensagem rápida (chip) =====
function sendQuickMessage(text) {
    document.getElementById('messageInput').value = text;
    sendMessage();
}

// ===== Auto-resize do textarea =====
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    updateCharCounter(textarea.value.length);
}

function updateCharCounter(len) {
    const counter = document.getElementById('charCounter');
    counter.textContent = `${len}/4000`;
    counter.style.color = len > 3500 ? '#f87171' : 'var(--text-muted)';
}

// ===== Teclas =====
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// ===== Enviar mensagem =====
async function sendMessage() {
    if (isLoading) return;

    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) return;

    // Limpa o input
    input.value = '';
    input.style.height = 'auto';
    updateCharCounter(0);

    // Adiciona mensagem do usuário
    appendMessage('user', message);

    // Mostra loading
    const loadingId = appendLoading();
    setLoading(true);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await res.json();
        removeLoading(loadingId);

        if (!res.ok) {
            appendMessage('error', `❌ Erro: ${data.error || 'Falha na requisição.'}`);
        } else {
            appendMessage('assistant', data.response, data.model);
            updateTokens(data.tokens);
            // Atualiza badge do modelo
            if (data.model) {
                document.getElementById('modelBadge').textContent = data.model;
            }
        }
    } catch (err) {
        removeLoading(loadingId);
        appendMessage('error', `❌ Erro de conexão: ${err.message}`);
    } finally {
        setLoading(false);
        input.focus();
    }
}

// ===== Adicionar mensagem ao chat =====
function appendMessage(role, text, model = null) {
    const chatWindow = document.getElementById('chatWindow');

    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const message = document.createElement('div');
    message.className = `message message-${role === 'error' ? 'assistant message-error' : role}`;

    let avatarContent = '';
    let metaContent = '';

    if (role === 'user') {
        avatarContent = 'EU';
        metaContent = `Você • ${now}`;
    } else {
        avatarContent = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="14" r="2" fill="currentColor"/>
        </svg>`;
        metaContent = `Gemini AI${model ? ' • ' + model : ''} • ${now}`;
    }

    message.innerHTML = `
        <div class="message-avatar">${avatarContent}</div>
        <div class="message-content">
            <div class="message-bubble">${formatText(text)}</div>
            <div class="message-meta">${metaContent}</div>
        </div>
    `;

    chatWindow.appendChild(message);
    scrollToBottom();
    return message;
}

// ===== Formatar texto (markdown básico) =====
function formatText(text) {
    // Escapa HTML
    let safe = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Blocos de código
    safe = safe.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`
    );

    // Código inline
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Negrito
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Itálico
    safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Quebras de linha -> parágrafos
    const paragraphs = safe.split(/\n\n+/);
    if (paragraphs.length > 1) {
        safe = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
    } else {
        safe = safe.replace(/\n/g, '<br/>');
    }

    return safe;
}

// ===== Loading indicator =====
function appendLoading() {
    const chatWindow = document.getElementById('chatWindow');
    const id = 'loading-' + Date.now();

    const loadingMsg = document.createElement('div');
    loadingMsg.id = id;
    loadingMsg.className = 'message message-assistant';
    loadingMsg.innerHTML = `
        <div class="message-avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="14" r="2" fill="currentColor"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

    chatWindow.appendChild(loadingMsg);
    scrollToBottom();
    return id;
}

function removeLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ===== Controles =====
function setLoading(loading) {
    isLoading = loading;
    const btn = document.getElementById('sendBtn');
    btn.disabled = loading;
}

function scrollToBottom() {
    const chatWindow = document.getElementById('chatWindow');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function updateTokens(tokens) {
    if (!tokens) return;
    totalTokens += tokens;
    const tokenInfo = document.getElementById('tokenInfo');
    const tokenCount = document.getElementById('tokenCount');
    tokenInfo.style.display = 'flex';
    tokenCount.textContent = `${totalTokens.toLocaleString('pt-BR')} tokens usados nesta sessão`;
}

// ===== Limpar conversa =====
function clearChat() {
    const chatWindow = document.getElementById('chatWindow');
    const welcome = document.getElementById('welcomeMsg');
    // Remove todas as mensagens exceto o welcome
    Array.from(chatWindow.children).forEach(child => {
        if (child.id !== 'welcomeMsg') child.remove();
    });
    totalTokens = 0;
    document.getElementById('tokenInfo').style.display = 'none';
}
