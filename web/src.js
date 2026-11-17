const API_BASE = import.meta.env.VITE_API_BASE || '';
const $ = (s) => document.querySelector(s);

let conversations = JSON.parse(localStorage.getItem('zephan-chats') || '[]');
let activeId = conversations[0]?.id || null;
let busy = false;
let webSearch = true;

const icon = (name, size = 18) => {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>',
    external: '<path d="M14 3h7v7M10 14 21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
};

function persist() {
  localStorage.setItem('zephan-chats', JSON.stringify(conversations));
}
function current() {
  return conversations.find(c => c.id === activeId);
}
function newChat() {
  const c = { id: crypto.randomUUID(), title: 'Percakapan baru', messages: [] };
  conversations.unshift(c);
  activeId = c.id;
  persist();
  render();
  $('#prompt').focus();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function formatText(raw) {
  // Lightweight safe markdown: headings, bold, inline code, bullets and newlines.
  let s = escapeHtml(raw);
  s = s.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  s = s.replace(/^- (.*)$/gm, '<li>$1</li>');
  s = s.replace(/(?:<li>.*<\/li>\n?)+/g, x => `<ul>${x}</ul>`);
  return s.replace(/\n/g, '<br>');
}
function render() {
  const chat = current();
  $('#chatList').innerHTML = conversations.map(c => `
    <button class="history-item ${c.id === activeId ? 'active' : ''}" data-id="${c.id}">
      <span>${icon('panel', 15)}</span><span class="history-title">${escapeHtml(c.title)}</span>
      <span class="delete-chat" data-delete="${c.id}" title="Hapus">${icon('trash', 14)}</span>
    </button>`).join('');
  $('#chatList').querySelectorAll('[data-id]').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('[data-delete]')) return;
    activeId = el.dataset.id; render();
  }));
  $('#chatList').querySelectorAll('[data-delete]').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    conversations = conversations.filter(c => c.id !== el.dataset.delete);
    if (activeId === el.dataset.delete) activeId = conversations[0]?.id || null;
    persist(); render();
  }));
  const messages = chat?.messages || [];
  $('#messages').innerHTML = messages.length ? messages.map((m, i) => `
    <article class="message ${m.role}">
      <div class="avatar ${m.role === 'assistant' ? 'ai-avatar' : 'user-avatar'}">${m.role === 'assistant' ? 'Z' : 'K'}</div>
      <div class="message-body">
        <div class="message-label">${m.role === 'assistant' ? 'Zephan AI' : 'Kamu'}</div>
        <div class="message-text">${formatText(m.content)}</div>
        ${m.sources?.length ? `<div class="sources"><div class="sources-title">${icon('globe',14)} Sumber referensi</div>${m.sources.map(src => `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.title)} ${icon('external',12)}</a>`).join('')}</div>` : ''}
        ${m.role === 'assistant' ? `<button class="copy-btn" data-copy="${i}">${icon('copy',14)} Salin</button>` : ''}
      </div>
    </article>`).join('') : welcome();
  $('#messages').querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', () => {
    const m = messages[Number(btn.dataset.copy)];
    navigator.clipboard?.writeText(m.content);
    btn.innerHTML = 'Tersalin';
  }));
  if (busy) $('#messages').insertAdjacentHTML('beforeend', `<article class="message assistant"><div class="avatar ai-avatar">Z</div><div class="message-body"><div class="message-label">Zephan AI</div><div class="typing"><i></i><i></i><i></i></div></div></article>`);
  $('#webToggle').classList.toggle('selected', webSearch);
  $('#webToggle').setAttribute('aria-pressed', String(webSearch));
  $('#sendBtn').disabled = busy;
  $('#messages').scrollTop = $('#messages').scrollHeight;
}
function welcome() {
  return `<section class="welcome">
    <div class="welcome-logo"><span>Z</span><b class="glow-dot"></b></div>
    <div class="eyebrow">YOUR SMART AI ASSISTANT</div>
    <h1>Ada yang bisa<br><em>Zephan bantu?</em></h1>
    <p>Tanyakan apa saja. Dapatkan jawaban yang jelas, dan cari informasi dari web dengan sumber referensi.</p>
    <div class="suggestions">
      <button data-prompt="Jelaskan cara kerja kecerdasan buatan dengan sederhana.">${icon('spark',16)} Jelaskan AI dengan sederhana</button>
      <button data-prompt="Apa berita dan perkembangan teknologi terbaru?">${icon('globe',16)} Cari perkembangan teknologi</button>
      <button data-prompt="Bantu aku belajar matematika langkah demi langkah.">${icon('search',16)} Bantu belajar matematika</button>
    </div>
  </section>`;
}

async function sendMessage(text) {
  const content = text.trim();
  if (!content || busy) return;
  if (!activeId || !current()) {
    const c = { id: crypto.randomUUID(), title: content.slice(0, 34), messages: [] };
    conversations.unshift(c); activeId = c.id;
  }
  const chat = current();
  if (!chat.messages.length) chat.title = content.slice(0, 34) + (content.length > 34 ? '…' : '');
  chat.messages.push({ role: 'user', content });
  $('#prompt').value = '';
  busy = true; persist(); render();
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chat.messages.map(m => ({ role: m.role, content: m.content })), useWebSearch: webSearch })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Permintaan gagal.');
    chat.messages.push({ role: 'assistant', content: data.answer, sources: data.sources || [] });
  } catch (err) {
    chat.messages.push({ role: 'assistant', content: `Maaf, ada kendala: ${err.message}\n\nPastikan server Zephan AI aktif dan API key sudah dipasang.` });
  } finally {
    busy = false; persist(); render();
  }
}

document.querySelector('#app').innerHTML = `
<div class="app-shell">
  <aside class="sidebar" id="sidebar">
    <div class="brand"><div class="brand-mark">Z</div><div><strong>zephan<span>ai</span></strong><small>YOUR AI ASSISTANT</small></div><button class="close-sidebar" id="closeSidebar">×</button></div>
    <button class="new-chat" id="newChat">${icon('plus',17)} <span>New chat</span><kbd>⌘ K</kbd></button>
    <div class="side-label">RECENT</div><div id="chatList" class="chat-list"></div>
    <div class="sidebar-bottom"><div class="status"><span></span><div><b>Zephan AI online</b><small>Powered by OpenAI</small></div></div><div class="sidebar-foot">Made to help you think better.</div></div>
  </aside>
  <main class="main">
    <header class="topbar"><button class="mobile-menu" id="mobileMenu">${icon('menu')}</button><div class="top-title">Workspace <span>/</span> <b>Chat</b></div><div class="top-right"><div class="secure-pill"><span></span> AI Assistant</div><div class="profile">Z</div></div></header>
    <section class="chat-area"><div id="messages" class="messages"></div></section>
    <footer class="composer-wrap">
      <div class="composer">
        <textarea id="prompt" rows="1" placeholder="Tulis pertanyaan untuk Zephan AI..." aria-label="Pesan untuk Zephan AI"></textarea>
        <div class="composer-tools"><div class="tool-left"><button id="webToggle" class="web-toggle selected" aria-pressed="true">${icon('globe',15)} <span>Web search</span><span class="toggle-dot"></span></button><span class="tool-note">Sumber web akan dicantumkan jika tersedia</span></div><button id="sendBtn" class="send-btn" aria-label="Kirim">${icon('send',17)}</button></div>
      </div><div class="disclaimer">Zephan AI dapat membuat kesalahan. Periksa kembali informasi penting dari sumber aslinya.</div>
    </footer>
  </main>
</div>`;

$('#newChat').addEventListener('click', newChat);
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#closeSidebar').addEventListener('click', () => $('#sidebar').classList.remove('open'));
$('#webToggle').addEventListener('click', () => { webSearch = !webSearch; render(); });
$('#sendBtn').addEventListener('click', () => sendMessage($('#prompt').value));
$('#prompt').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage($('#prompt').value); }
});
$('#prompt').addEventListener('input', e => {
  e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
});
$('#messages').addEventListener('click', e => {
  const btn = e.target.closest('[data-prompt]');
  if (btn) sendMessage(btn.dataset.prompt);
});
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); newChat(); }
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
render();
