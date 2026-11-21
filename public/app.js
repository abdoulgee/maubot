const chatArea = document.querySelector('#chatArea');
const chatForm = document.querySelector('#chatForm');
const messageInput = document.querySelector('#messageInput');
const messagesEl = document.querySelector('#messages');
const onboardingEl = document.querySelector('#onboarding');
const nameForm = document.querySelector('#nameForm');
const nameInput = document.querySelector('#nameInput');
const nameError = document.querySelector('#nameError');
const composerWrap = document.querySelector('#composerWrap');
const sendBtn = document.querySelector('#sendBtn');
const newChatBtn = document.querySelector('#newChatBtn');
const clearBtn = document.querySelector('#clearBtn');
const historyList = document.querySelector('#historyList');
const toastEl = document.querySelector('#toast');
const sidebar = document.querySelector('#sidebar');
const menuBtn = document.querySelector('#menuBtn');
const mobileOverlay = document.querySelector('#mobileOverlay');
const profileName = document.querySelector('#profileName');
const userAvatar = document.querySelector('#userAvatar');
const aboutDialog = document.querySelector('#aboutDialog');
const aboutClose = document.querySelector('#aboutClose');
const aboutButtons = document.querySelectorAll('[data-about]');

const STORAGE_KEY = 'maubot_conversations_v1';
const NAME_KEY = 'maubot_student_name_v1';

let conversations = loadConversations();
let studentName = loadName();
let activeId = conversations[0]?.id || null;
let waiting = false;
let toastTimer;

function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function loadName() {
  try { return cleanName(localStorage.getItem(NAME_KEY) || ''); }
  catch { return ''; }
}

function saveName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* Name still works for this session. */ }
}

function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages)) : [];
  } catch { return []; }
}

function saveConversations() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 30))); }
  catch { showToast('Could not save chat history in this browser.'); }
}

function createConversation() {
  const conversation = { id: crypto.randomUUID(), title: 'New conversation', messages: [], updatedAt: Date.now() };
  conversations.unshift(conversation);
  saveConversations();
  return conversation.id;
}

function currentConversation() {
  return conversations.find(c => c.id === activeId);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function closeMobileMenu() {
  sidebar.classList.remove('open');
  mobileOverlay.classList.remove('show');
}

function applyNameToUI() {
  const display = studentName || 'Student';
  profileName.textContent = display;
  userAvatar.textContent = display.charAt(0).toUpperCase();
}

function ensureGreeting(conversation) {
  if (!conversation || !studentName || conversation.messages.length > 0) return;
  conversation.messages.push({
    role: 'assistant',
    content: `Hi, ${studentName}. What would you like to work on?`
  });
  conversation.updatedAt = Date.now();
  saveConversations();
}

function startOnboarding() {
  document.body.classList.add('is-onboarding');
  onboardingEl.hidden = false;
  messagesEl.hidden = true;
  composerWrap.hidden = true;
  clearBtn.hidden = true;
  nameInput.value = studentName || '';
  nameError.hidden = true;
  applyNameToUI();
  chatArea.scrollTop = 0;
  nameInput.focus();
}

function enterChat({ focus = false } = {}) {
  if (!activeId) activeId = createConversation();
  ensureGreeting(currentConversation());
  document.body.classList.remove('is-onboarding');
  onboardingEl.hidden = true;
  composerWrap.hidden = false;
  clearBtn.hidden = false;
  applyNameToUI();
  renderConversation();
  if (focus) messageInput.focus();
}

function renderHistory() {
  historyList.replaceChildren();
  conversations.forEach(conversation => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `history-item${conversation.id === activeId ? ' active' : ''}`;
    button.textContent = conversation.title || 'New conversation';
    button.title = button.textContent;
    button.addEventListener('click', () => openConversation(conversation.id));
    historyList.append(button);
  });
}

function openConversation(id) {
  activeId = id;
  renderConversation();
  closeMobileMenu();
}

function renderConversation() {
  const conversation = currentConversation();
  messagesEl.replaceChildren();
  ensureGreeting(conversation);
  const hasMessages = Boolean(conversation?.messages.length);
  messagesEl.hidden = !hasMessages;
  if (conversation) conversation.messages.forEach(message => addMessageToDOM(message.role, message.content));
  renderHistory();
  if (hasMessages) scrollToBottom();
  else chatArea.scrollTop = 0;
}

function addMessageToDOM(role, content) {
  const wrapper = document.createElement('article');
  wrapper.className = `message ${role}`;
  const body = document.createElement('div');
  body.className = 'message-content';
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'assistant' ? 'MAUBot' : 'You';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  // textContent prevents model output from being interpreted as executable HTML.
  bubble.textContent = content;
  body.append(label, bubble);
  wrapper.append(body);
  messagesEl.append(wrapper);
  return bubble;
}

function addTypingIndicator() {
  const wrapper = document.createElement('article');
  wrapper.className = 'message assistant';
  wrapper.id = 'typingIndicator';
  const body = document.createElement('div');
  body.className = 'message-content';
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = 'MAUBot is writing';
  const dots = document.createElement('div');
  dots.className = 'typing';
  dots.setAttribute('aria-hidden', 'true');
  dots.innerHTML = '<span></span><span></span><span></span>';
  body.append(label, dots);
  wrapper.append(body);
  messagesEl.append(wrapper);
}

function scrollToBottom() {
  requestAnimationFrame(() => { chatArea.scrollTop = chatArea.scrollHeight; });
}

function updateTitle(conversation) {
  if (conversation.title !== 'New conversation') return;
  const firstUserMessage = conversation.messages.find(m => m.role === 'user')?.content || '';
  conversation.title = firstUserMessage.length > 34 ? `${firstUserMessage.slice(0, 34)}…` : (firstUserMessage || 'New conversation');
}

function setWaiting(value) {
  waiting = value;
  sendBtn.disabled = value;
  messageInput.disabled = value;
}

async function sendMessage(rawText) {
  const text = rawText.trim();
  if (!text || waiting) return;
  if (!studentName) {
    startOnboarding();
    return;
  }

  let conversation = currentConversation();
  if (!conversation) {
    activeId = createConversation();
    conversation = currentConversation();
  }
  ensureGreeting(conversation);

  conversation.messages.push({ role: 'user', content: text });
  conversation.updatedAt = Date.now();
  updateTitle(conversation);
  addMessageToDOM('user', text);
  messageInput.value = '';
  autoResizeInput();
  renderHistory();
  saveConversations();
  addTypingIndicator();
  setWaiting(true);
  scrollToBottom();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversation.messages.slice(-20), studentName })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    if (activeId !== conversation.id) return;
    const reply = String(data.reply || '').trim();
    if (!reply) throw new Error('MAUBot returned an empty response. Please try again.');
    conversation.messages.push({ role: 'assistant', content: reply });
    conversation.updatedAt = Date.now();
    addMessageToDOM('assistant', reply);
    saveConversations();
  } catch (error) {
    if (activeId === conversation.id) {
      const errorMessage = `Sorry, I couldn't complete that request. ${error.message}`;
      addMessageToDOM('assistant', errorMessage);
      showToast(error.message);
    }
  } finally {
    document.querySelector('#typingIndicator')?.remove();
    setWaiting(false);
    messageInput.disabled = false;
    messageInput.focus();
    scrollToBottom();
  }
}

function autoResizeInput() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 160)}px`;
}

chatForm.addEventListener('submit', event => {
  event.preventDefault();
  sendMessage(messageInput.value);
});

messageInput.addEventListener('input', autoResizeInput);
messageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

nameForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = cleanName(nameInput.value);
  if (!name) {
    nameError.hidden = false;
    nameInput.focus();
    return;
  }
  nameError.hidden = true;
  studentName = name;
  saveName(name);
  enterChat({ focus: true });
});

nameInput.addEventListener('input', () => { nameError.hidden = true; });

aboutButtons.forEach(button => {
  button.addEventListener('click', () => aboutDialog.showModal());
});
aboutClose.addEventListener('click', () => aboutDialog.close());
aboutDialog.addEventListener('click', event => {
  if (event.target === aboutDialog) aboutDialog.close();
});

newChatBtn.addEventListener('click', () => {
  if (waiting) {
    showToast('Please wait for the current response to finish.');
    return;
  }
  const id = createConversation();
  openConversation(id);
  messageInput.focus();
});

clearBtn.addEventListener('click', () => {
  if (waiting) return showToast('Please wait for the current response to finish.');
  const conversation = currentConversation();
  if (!conversation) return;
  conversation.messages = [];
  conversation.title = 'New conversation';
  conversation.updatedAt = Date.now();
  saveConversations();
  renderConversation();
  showToast('Conversation cleared.');
});

menuBtn.addEventListener('click', () => {
  sidebar.classList.add('open');
  mobileOverlay.classList.add('show');
});
mobileOverlay.addEventListener('click', closeMobileMenu);

applyNameToUI();
if (studentName) {
  if (!activeId) activeId = createConversation();
  enterChat();
} else {
  startOnboarding();
}
