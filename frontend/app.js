/**
 * DocsVerse AI - Frontend Application Logic
 * Implements chat history, real-time SSE streaming, document uploads, and code block styling.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const sidebar = document.getElementById('sidebar');
  const openSidebarBtn = document.getElementById('openSidebarBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const historyList = document.getElementById('historyList');
  const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');

  const currentModelName = document.getElementById('currentModelName');
  const modelStatusDot = document.getElementById('modelStatusDot');
  const tokenCounter = document.getElementById('tokenCounter');
  const tokenBadgeContainer = document.getElementById('tokenBadgeContainer');

  const chatThread = document.getElementById('chatThread');
  const welcomeScreen = document.getElementById('welcomeScreen');

  const promptInput = document.getElementById('promptInput');
  const sendBtn = document.getElementById('sendBtn');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');

  const fileTray = document.getElementById('fileTray');
  const fileChipName = document.getElementById('fileChipName');
  const fileChipSize = document.getElementById('fileChipSize');
  const fileChipIcon = document.getElementById('fileChipIcon');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const uploadProgressBar = document.getElementById('uploadProgressBar');

  // Header & Input Action Elements
  const themeSwitcherBtn = document.getElementById('themeSwitcherBtn');
  const themeIconSlot = document.getElementById('themeIconSlot');
  const themeNameDisplay = document.getElementById('themeNameDisplay');
  const micBtn = document.getElementById('micBtn');
  const pdfModalOverlay = document.getElementById('pdfModalOverlay');
  const pdfModalSubtitle = document.getElementById('pdfModalSubtitle');
  const pdfProgressBar = document.getElementById('pdfProgressBar');
  const toastContainer = document.getElementById('toastContainer');

  // Application Theme Switcher Configuration
  const THEMES = [
    {
      id: 'dark-theme',
      name: 'Dark',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
    },
    {
      id: 'light-theme',
      name: 'Light',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
    },
    {
      id: 'midnight-theme',
      name: 'Oceanic',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M2 12a10 10 0 0 1 20 0M2 12a10 10 0 0 0 20 0"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
    },
    {
      id: 'sunset-theme',
      name: 'Sunset',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line></svg>`
    }
  ];

  function setupThemeSwitcher() {
    const savedThemeId = localStorage.getItem('docsverse_theme') || 'dark-theme';
    applyTheme(savedThemeId);

    if (themeSwitcherBtn) {
      themeSwitcherBtn.addEventListener('click', () => {
        const currentThemeId = document.body.className.split(' ').find(cls => cls.endsWith('-theme')) || 'dark-theme';
        const currentIndex = THEMES.findIndex(t => t.id === currentThemeId);
        const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
        applyTheme(nextTheme.id);
        showToast(`Theme switched to ${nextTheme.name} Mode`, 'info');
      });
    }
  }

  function applyTheme(themeId) {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.body.classList.remove('dark-theme', 'light-theme', 'midnight-theme', 'sunset-theme');
    document.body.classList.add(theme.id);
    localStorage.setItem('docsverse_theme', theme.id);

    if (themeIconSlot) {
      themeIconSlot.innerHTML = theme.icon;
    }
    if (themeNameDisplay) {
      themeNameDisplay.textContent = theme.name;
    }
  }

  // API Base Resolution:
  // Dynamically resolves between Render/Cloud Production, Direct Express Localhost (:5000), and Apache/Live Server
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE = (window.location.protocol === 'file:' || (isLocalhost && window.location.port !== '5000'))
    ? 'http://localhost:5000'
    : '';

  // Application State
  const STORAGE_KEY = 'docsverse_chat_history_v1';
  const DOC_STORAGE_KEY = 'docsverse_session_document';
  const PROPRIETARY_MODEL_NAME = 'DocVerse AK-1.3';
  let conversations = loadConversations();
  let currentChatId = null;
  let currentMessages = [];
  let attachedFile = null; // { id, name, size, type, preview }
  let isStreaming = false;
  let abortController = null;
  let stopVoiceTyping = () => {};

  // Configure Marked.js
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  // Initialize
  initApp();

  function initApp() {
    setupThemeSwitcher();
    setupEventListeners();
    setupVoiceInput();
    renderHistoryList();
    startNewChat(false, false);
    restoreSessionDocument();
    fetchActiveModel();
    updateSendBtnState();
    setInterval(fetchActiveModel, 15000); // Check API health periodically
  }

  // =========================================================================
  // Event Listeners
  // =========================================================================
  function setupEventListeners() {
    // Sidebar toggling
    if (openSidebarBtn) {
      openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
    }
    if (closeSidebarBtn) {
      closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    // New Chat & Clear
    newChatBtn.addEventListener('click', () => startNewChat(true));
    clearAllHistoryBtn.addEventListener('click', clearAllHistory);

    // Prompt Input Auto-expansion & Enter key
    promptInput.addEventListener('input', () => {
      promptInput.style.height = 'auto';
      promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
      updateSendBtnState();
    });

    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled && !isStreaming) {
          handleSendMessage();
        }
      }
    });

    // Send Button
    sendBtn.addEventListener('click', () => {
      if (isStreaming) {
        abortStream();
      } else {
        handleSendMessage();
      }
    });

    // File Attachment
    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelected);
    removeFileBtn.addEventListener('click', removeAttachedFile);

    // Suggestion Cards
    document.querySelectorAll('.suggestion-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt) {
          promptInput.value = prompt;
          promptInput.focus();
          promptInput.dispatchEvent(new Event('input'));
          handleSendMessage();
        }
      });
    });

    // Drag and Drop Support
    ['dragenter', 'dragover'].forEach(eventName => {
      document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    document.body.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFile(e.dataTransfer.files[0]);
      }
    }, false);
  }

  // =========================================================================
  // Gateway & Active Model Integration
  // =========================================================================
  async function fetchActiveModel() {
    try {
      const res = await fetch(`${API_BASE}/api/models`);
      if (res.ok) {
        const data = await res.json();
        updateActiveModelDisplay(PROPRIETARY_MODEL_NAME, 'AMAR SMART INDIA');

        if (data.configured) {
          modelStatusDot.style.backgroundColor = 'var(--status-online)';
          modelStatusDot.style.boxShadow = '0 0 8px var(--status-online)';
        } else {
          modelStatusDot.style.backgroundColor = 'var(--status-warning)';
          modelStatusDot.style.boxShadow = '0 0 8px var(--status-warning)';
        }
      } else {
        throw new Error('Models endpoint error');
      }
    } catch (e) {
      currentModelName.textContent = PROPRIETARY_MODEL_NAME;
      modelStatusDot.style.backgroundColor = 'var(--status-online)';
    }
  }

  function updateActiveModelDisplay(modelName, provider) {
    if (!currentModelName) return;
    // Always enforce the custom proprietary model name
    currentModelName.textContent = PROPRIETARY_MODEL_NAME;
    currentModelName.title = `Model: ${PROPRIETARY_MODEL_NAME} (Proprietary Architecture by Amar Kumar)`;
    if (modelStatusDot) {
      modelStatusDot.style.backgroundColor = 'var(--status-online)';
      modelStatusDot.style.boxShadow = '0 0 8px var(--status-online)';
    }
  }

  function updateTokenCounterDisplay(usage, modelName, provider) {
    if (!usage || !tokenCounter) return;
    const total = usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens) || 0;
    tokenCounter.textContent = total.toLocaleString();

    if (tokenBadgeContainer) {
      tokenBadgeContainer.title = `Prompt: ${usage.prompt_tokens || 0} tokens | Completion: ${usage.completion_tokens || 0} tokens | Total: ${total} tokens`;
      tokenBadgeContainer.classList.add('updating');
      setTimeout(() => {
        tokenBadgeContainer.classList.remove('updating');
      }, 450);
    }

    if (currentModelName) {
      currentModelName.textContent = PROPRIETARY_MODEL_NAME;
    }
  }

  // =========================================================================
  // File Upload Handling
  // =========================================================================
  // Document Session Storage Key
  function getStoredSessionDocument() {
    try {
      const stored = sessionStorage.getItem(DOC_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  // Restore attached document from session storage if present
  function restoreSessionDocument() {
    try {
      const doc = getStoredSessionDocument();
      if (doc && (doc.content || doc.dataUri)) {
        attachedFile = doc;
        fileTray.style.display = 'block';
        fileChipName.textContent = `${doc.name} (Ready)`;
        fileChipSize.textContent = formatBytes(doc.size);
        fileChipIcon.textContent = getFileIcon(doc.name);
        updateSendBtnState();
      }
    } catch (e) {
      console.warn('Failed to restore document from session:', e);
    }
  }

  // =========================================================================
  // File Parsing & Upload Handling
  // =========================================================================
  async function handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    await processAndAttachFile(file);
    fileInput.value = ''; // Reset input
  }

  /**
   * Reads text files directly using FileReader
   */
  function readTextFileClient(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read text file locally.'));
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Reads image files as Base64 Data URL using FileReader
   */
  function readImageDataUrlClient(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image file locally.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Main File Attachment Handler:
   * 1. Client-side extraction for plain text / code / images
   * 2. Server-side multi-format parser for PDFs, Word, Excel, PowerPoint
   * 3. Stores extracted document data in sessionStorage
   */
  async function processAndAttachFile(file) {
    fileTray.style.display = 'block';
    uploadProgressBar.style.display = 'block';
    fileChipName.textContent = file.name;
    fileChipSize.textContent = formatBytes(file.size);
    fileChipIcon.textContent = getFileIcon(file.name);

    const ext = file.name.split('.').pop().toLowerCase();
    const isPlainText = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'py', 'html', 'css', 'xml', 'yml', 'yaml', 'sql', 'log'].includes(ext) || file.type.startsWith('text/');
    const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);

    let extractedText = '';
    let dataUri = null;
    let fileType = isImage ? 'image' : (isPlainText ? 'text' : ext);

    try {
      if (isPlainText) {
        // Direct client-side text extraction
        extractedText = await readTextFileClient(file);
      } else if (isImage) {
        // Direct client-side Base64 extraction
        dataUri = await readImageDataUrlClient(file);
        extractedText = `[Image Attached: ${file.name} (${formatBytes(file.size)})]`;
      }

      // For binary documents (PDF, Word, Excel, PPT) or server backup, send to /api/upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      uploadProgressBar.style.display = 'none';

      if (result.success) {
        if (!extractedText || extractedText.startsWith('[Image')) {
          extractedText = result.extractedText || extractedText;
        }
        if (!dataUri && result.dataUri) {
          dataUri = result.dataUri;
        }
        fileType = result.fileType || fileType;

        const docRecord = {
          id: result.fileId || ('doc_' + Date.now()),
          name: file.name,
          size: file.size,
          type: fileType,
          content: extractedText,
          dataUri: dataUri,
          preview: result.preview || (extractedText ? extractedText.slice(0, 300) : '')
        };

        // Store temporarily in sessionStorage for chat session
        sessionStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(docRecord));
        attachedFile = docRecord;

        fileChipName.textContent = `${file.name} (Ready)`;
        updateSendBtnState();
        console.log(`[DocsVerse] Document parsed successfully: ${file.name} (${extractedText.length} characters)`);
      } else {
        throw new Error(result.error || 'Failed to process document');
      }

    } catch (err) {
      console.error('File parsing error:', err);
      uploadProgressBar.style.display = 'none';

      // Fallback: If client read succeeded for text/image, use client data anyway
      if (extractedText || dataUri) {
        const fallbackDoc = {
          id: 'doc_' + Date.now(),
          name: file.name,
          size: file.size,
          type: fileType,
          content: extractedText,
          dataUri: dataUri,
          preview: extractedText.slice(0, 300)
        };
        sessionStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(fallbackDoc));
        attachedFile = fallbackDoc;
        fileChipName.textContent = `${file.name} (Extracted)`;
      } else {
        alert('Could not extract text from document: ' + err.message);
        removeAttachedFile();
      }
    }
  }

  function removeAttachedFile() {
    attachedFile = null;
    sessionStorage.removeItem(DOC_STORAGE_KEY);
    fileTray.style.display = 'none';
    uploadProgressBar.style.display = 'none';
    fileInput.value = '';
    updateSendBtnState();
  }

  function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx':
      case 'csv': return '📊';
      case 'ppt':
      case 'pptx': return '📽️';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp': return '🖼️';
      default: return '📎';
    }
  }

  function formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // =========================================================================
  // Chat Messaging & SSE Streaming
  // =========================================================================
  async function handleSendMessage() {
    // Immediately stop voice dictation if active
    if (typeof stopVoiceTyping === 'function') {
      stopVoiceTyping(true);
    }

    const text = promptInput.value.replace(/[|]/g, '').trim();
    if (!text && !attachedFile) return;

    // Hide welcome screen on first message
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }

    const currentDoc = attachedFile || getStoredSessionDocument();

    // Append user message to state & UI
    const userMsg = {
      role: 'user',
      content: text || `Please analyze this attached document: ${currentDoc?.name || 'document'}`,
      attachedDoc: currentDoc,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    currentMessages.push(userMsg);
    renderMessage(userMsg);

    // Conversational trigger: if user specifically asks to convert/export summary to PDF
    const isPdfRequest = /\b(convert|export|save|download|generate|make)\b.*?\bpdf\b/i.test(text) ||
                         /\bpdf\b.*?\b(convert|export|save|download|generate)\b/i.test(text);

    if (isPdfRequest) {
      const hasExistingSummary = currentMessages.some(m => m.role === 'assistant' && m.content && m.content.length > 20);
      if (hasExistingSummary) {
        setTimeout(() => exportSummaryToPdf(), 350);
      }
    }

    // Clear input & keep document in session
    promptInput.value = '';
    promptInput.style.height = 'auto';
    if (attachedFile) {
      fileChipName.textContent = `${attachedFile.name} (Active in session)`;
    }
    updateSendBtnState();

    // Prepare AI message placeholder
    const aiMsgId = 'msg-' + Date.now();
    const aiMsg = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    currentMessages.push(aiMsg);

    const aiRow = renderMessage(aiMsg, true);
    const bubbleEl = aiRow.querySelector('.message-bubble');

    // Start streaming from backend
    isStreaming = true;
    setSendButtonState(true);
    abortController = new AbortController();

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          documentData: currentDoc,
          fileId: currentDoc?.id,
          stream: true
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep trailing incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            break;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));

              // 1. Active Model & Provider metadata
              if (parsed.type === 'metadata' && parsed.model) {
                updateActiveModelDisplay(parsed.model, parsed.provider);
                continue;
              }

              // 2. Token usage metadata
              if (parsed.type === 'usage' && parsed.usage) {
                updateTokenCounterDisplay(parsed.usage, parsed.model, parsed.provider);
                continue;
              }

              // 3. Streaming content delta
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                accumulatedText += delta;
                aiMsg.content = accumulatedText;

                // Render markdown progressively
                renderFormattedMarkdown(bubbleEl, accumulatedText, true);
                scrollToBottom();
              }
            } catch (err) {
              // Ignore partial JSON chunk
            }
          }
        }
      }

      // Final render to seal code blocks and highlight
      renderFormattedMarkdown(bubbleEl, accumulatedText, false);
      const actionsBar = aiRow.querySelector('.message-actions-bar');
      if (actionsBar) {
        actionsBar.style.display = 'flex';
        bindMessageActionListeners(aiRow, aiMsg);
      }
      saveCurrentConversation();

      // Check if user requested a PDF in this prompt
      const lastUserMsg = [...currentMessages].reverse().find(m => m.role === 'user');
      if (lastUserMsg && isPdfRequestPrompt(lastUserMsg.content)) {
        exportSummaryToPdf(accumulatedText, null, aiRow);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        accumulatedText = (aiMsg.content || '') + '\n\n*(Generation stopped by user)*';
        aiMsg.content = accumulatedText;
        renderFormattedMarkdown(bubbleEl, accumulatedText, false);
        const actionsBar = aiRow.querySelector('.message-actions-bar');
        if (actionsBar) {
          actionsBar.style.display = 'flex';
          bindMessageActionListeners(aiRow, aiMsg);
        }
      } else {
        console.error('Chat stream error:', error);
        bubbleEl.innerHTML = `<span style="color: var(--status-offline)">Error communicating with DocsVerse AI backend: ${error.message}</span>`;
      }
    } finally {
      isStreaming = false;
      abortController = null;
      setSendButtonState(false);
      scrollToBottom();
    }
  }

  function abortStream() {
    if (abortController) {
      abortController.abort();
    }
  }

  function setSendButtonState(streaming) {
    if (streaming) {
      sendBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"></rect>
        </svg>
      `;
      sendBtn.title = 'Stop Generating';
      sendBtn.classList.add('stop-active');
    } else {
      sendBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      `;
      sendBtn.title = 'Send message';
      sendBtn.classList.remove('stop-active');
      updateSendBtnState();
    }
  }

  function updateSendBtnState() {
    const hasText = promptInput.value.trim().length > 0;
    const hasFile = !!attachedFile || !!getStoredSessionDocument();
    sendBtn.disabled = !hasText && !hasFile && !isStreaming;
  }

  // =========================================================================
  // UI Rendering & Code Block Components
  // =========================================================================
  function renderMessage(msg, isAiPlaceholder = false) {
    const isUser = msg.role === 'user';
    const row = document.createElement('div');
    row.className = `message-row ${isUser ? 'user-row' : 'ai-row'}`;
    if (msg.id) row.id = msg.id;

    const avatarHtml = isUser
      ? `<div class="message-avatar">U</div>`
      : `<div class="message-avatar" title="DocsVerse AI">
          <img src="assets/favicon.png" alt="DocsVerse AI" class="message-avatar-img">
        </div>`;

    let docBadgeHtml = '';
    if (isUser && msg.attachedDoc) {
      docBadgeHtml = `
        <div class="msg-attached-doc">
          <span>${getFileIcon(msg.attachedDoc.name)}</span>
          <span>${msg.attachedDoc.name} (${formatBytes(msg.attachedDoc.size)})</span>
        </div>
      `;
    }

    let actionsBarHtml = '';
    if (!isUser) {
      actionsBarHtml = `
        <div class="message-actions-bar" style="${isAiPlaceholder ? 'display: none;' : 'display: flex;'}">
          <button class="msg-action-btn export-pdf-msg-btn" title="Export this summary to PDF (Zero Server Storage)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M12 18v-6"></path>
              <path d="m9 15 3 3 3-3"></path>
            </svg>
            <span>Export to PDF</span>
          </button>
          <button class="msg-action-btn copy-msg-btn" title="Copy response text">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
      `;
    }

    row.innerHTML = `
      ${avatarHtml}
      <div class="message-content">
        <div class="message-meta">
          <span class="message-author">${isUser ? 'You' : 'DocsVerse AI'}</span>
          <span class="message-timestamp">${msg.timestamp || ''}</span>
        </div>
        ${docBadgeHtml}
        <div class="message-bubble">
          ${isAiPlaceholder ? '<span class="streaming-cursor"></span>' : escapeHtml(msg.content)}
        </div>
        ${actionsBarHtml}
      </div>
    `;

    chatThread.appendChild(row);
    if (!isUser && !isAiPlaceholder) {
      bindMessageActionListeners(row, msg);
    }
    scrollToBottom();
    return row;
  }

  /**
   * Maps code block language identifier to the proper file extension
   */
  function getExtensionForLanguage(lang) {
    if (!lang) return 'txt';
    const clean = lang.toLowerCase().trim().replace(/^\./, '');
    const map = {
      'html': 'html',
      'htm': 'html',
      'xhtml': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'javascript': 'js',
      'js': 'js',
      'mjs': 'js',
      'cjs': 'js',
      'jsx': 'jsx',
      'react': 'jsx',
      'typescript': 'ts',
      'ts': 'ts',
      'tsx': 'tsx',
      'python': 'py',
      'py': 'py',
      'python3': 'py',
      'pyw': 'py',
      'java': 'java',
      'c': 'c',
      'h': 'h',
      'cpp': 'cpp',
      'c++': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'hpp': 'hpp',
      'csharp': 'cs',
      'c#': 'cs',
      'cs': 'cs',
      'php': 'php',
      'ruby': 'rb',
      'rb': 'rb',
      'go': 'go',
      'golang': 'go',
      'rust': 'rs',
      'rs': 'rs',
      'kotlin': 'kt',
      'kt': 'kt',
      'swift': 'swift',
      'sql': 'sql',
      'mysql': 'sql',
      'postgresql': 'sql',
      'pgsql': 'sql',
      'json': 'json',
      'xml': 'xml',
      'svg': 'svg',
      'yaml': 'yaml',
      'yml': 'yaml',
      'bash': 'sh',
      'sh': 'sh',
      'shell': 'sh',
      'zsh': 'sh',
      'powershell': 'ps1',
      'ps1': 'ps1',
      'bat': 'bat',
      'cmd': 'cmd',
      'markdown': 'md',
      'md': 'md',
      'r': 'r',
      'dart': 'dart',
      'lua': 'lua',
      'perl': 'pl',
      'dockerfile': 'dockerfile',
      'text': 'txt',
      'txt': 'txt'
    };
    return map[clean] || (clean.length <= 4 && /^[a-z0-9]+$/.test(clean) ? clean : 'txt');
  }

  /**
   * Extracts smart filename from the first line of code block if specified (e.g. <!-- filename: xyz.html --> or // filename: abc.js)
   */
  function parseSmartFilename(codeText, lang) {
    if (!codeText) return `DocVerse AI.${getExtensionForLanguage(lang)}`;

    // Look at first few lines in case of leading whitespace
    const lines = codeText.trimStart().split('\n', 4);
    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/(?:<!--|#|\/\/|\/\*|--)\s*filename:\s*([a-zA-Z0-9_\-.]+\.[a-zA-Z0-9]+)\s*(?:-->|\*\/)?/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback to extension-based name
    const ext = getExtensionForLanguage(lang);
    return `DocVerse AI.${ext}`;
  }

  /**
   * Displays modern toast notification
   */
  function showToast(text, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : 'ℹ';
    toast.innerHTML = `
      <span class="toast-icon" style="font-weight: 700; margin-right: 6px;">${icon}</span>
      <span class="toast-msg">${escapeHtml(text)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => toast.remove(), 280);
    }, 3500);
  }

  /**
   * Continuous Indefinite Voice Typing (Speech-to-Text) Engine
   * Fixes:
   * 1. Auto-Restart on pause/breath: keeps listening indefinitely until explicit manual Stop or Send.
   * 2. Zero Duplication & Clean Output: loop starts at event.resultIndex, separates final vs interim,
   *    and strips any stray vertical lines or debug formatting.
   */
  function setupVoiceInput() {
    if (!micBtn) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

    let activeRecognition = null;
    let isDictating = false;
    let isManuallyStopped = false;
    let isSent = false;
    let sessionFinalTranscript = '';
    let sessionPrefix = '';

    // Global stop handler accessible across app (e.g. on Send or manual stop)
    stopVoiceTyping = function(sent = false) {
      isManuallyStopped = true;
      isSent = sent;
      isDictating = false;

      if (activeRecognition) {
        try {
          activeRecognition.stop();
        } catch (e) {
          // ignore
        }
      }

      if (micBtn) {
        micBtn.classList.remove('listening');
        micBtn.title = 'Voice Typing (Click to Speak)';
      }

      if (promptInput) {
        promptInput.value = promptInput.value.replace(/[|]/g, '').replace(/\s+/g, ' ').trim();
      }
    };

    if (!SpeechRec) {
      micBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showToast('Voice typing requires Chrome, Edge, Safari, or Opera with Web Speech support.', 'info');
      });
      return;
    }

    function initAndStartRecognition() {
      if (isManuallyStopped || isSent) return;

      try {
        if (activeRecognition) {
          try { activeRecognition.abort(); } catch (e) {}
        }

        const recognition = new SpeechRec();
        activeRecognition = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = navigator.language || 'en-US';

        recognition.onstart = () => {
          isDictating = true;
          micBtn.classList.add('listening');
          micBtn.title = 'Listening indefinitely... Click to stop voice typing';
          promptInput.focus();
        };

        recognition.onresult = (event) => {
          let interimTranscript = '';

          // Loop strictly from event.resultIndex to avoid duplicate processing of past results
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            const cleanText = transcript.replace(/[|]/g, '').trim();

            if (event.results[i].isFinal) {
              if (cleanText) {
                sessionFinalTranscript += (sessionFinalTranscript ? ' ' : '') + cleanText;
              }
            } else {
              if (cleanText) {
                interimTranscript += (interimTranscript ? ' ' : '') + cleanText;
              }
            }
          }

          // Build clean output: sessionPrefix + sessionFinalTranscript + interimTranscript
          const outputParts = [];
          if (sessionPrefix) outputParts.push(sessionPrefix);
          if (sessionFinalTranscript) outputParts.push(sessionFinalTranscript);
          if (interimTranscript) outputParts.push(interimTranscript);

          const fullCleanText = outputParts.join(' ').replace(/[|]/g, '').replace(/\s+/g, ' ').trim();
          promptInput.value = fullCleanText;
          promptInput.style.height = 'auto';
          promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
          promptInput.scrollTop = promptInput.scrollHeight;
          updateSendBtnState();
        };

        recognition.onerror = (event) => {
          console.warn('SpeechRecognition event notice:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            stopVoiceTyping(false);
            showToast('Microphone permission blocked. Please allow microphone access in your browser address bar.', 'info');
          } else if (event.error === 'audio-capture') {
            stopVoiceTyping(false);
            showToast('No microphone found. Please connect a microphone.', 'info');
          }
          // Note: 'no-speech' is emitted when pausing or breathing; DO NOT stop continuous dictation!
        };

        recognition.onend = () => {
          // ISSUE 1 FIX: Auto-Restart Logic
          // Keep dictation alive indefinitely until the user manually stops or sends!
          if (!isManuallyStopped && !isSent && isDictating) {
            try {
              recognition.start();
            } catch (err) {
              setTimeout(() => {
                if (!isManuallyStopped && !isSent && isDictating) {
                  try { recognition.start(); } catch (e) {}
                }
              }, 100);
            }
          } else {
            // Clean up when explicitly stopped or sent
            isDictating = false;
            micBtn.classList.remove('listening');
            micBtn.title = 'Voice Typing (Click to Speak)';
            if (promptInput.value) {
              promptInput.value = promptInput.value.replace(/[|]/g, '').replace(/\s+/g, ' ').trim();
            }
            if (isManuallyStopped && !isSent) {
              showToast('Voice typing stopped.', 'info');
            }
          }
        };

        recognition.start();

      } catch (err) {
        console.error('Failed to start SpeechRecognition:', err);
        if (!isManuallyStopped && !isSent && isDictating) {
          setTimeout(() => {
            if (!isManuallyStopped && !isSent && isDictating) {
              try { recognition.start(); } catch (e) {}
            }
          }, 150);
        } else {
          stopVoiceTyping(false);
          showToast('Could not start voice typing: ' + err.message, 'info');
        }
      }
    }

    micBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isDictating && !isManuallyStopped) {
        // User manually clicked Stop Dictation
        stopVoiceTyping(false);
        return;
      }

      // Reset state for new dictation session
      isManuallyStopped = false;
      isSent = false;
      isDictating = true;

      // Preserve existing text in prompt box as prefix
      const currentVal = promptInput.value.replace(/[|]/g, '').trim();
      sessionPrefix = currentVal ? (currentVal + ' ') : '';
      sessionFinalTranscript = '';

      // Test/request microphone permission via getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          testStream.getTracks().forEach(t => t.stop());
        } catch (permErr) {
          if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
            showToast('Microphone access denied. Please allow microphone access in your browser.', 'info');
            stopVoiceTyping(false);
            return;
          }
        }
      }

      showToast('Listening continuously... Speak now (click mic again or Send to stop)', 'info');
      initAndStartRecognition();
    });
  }

  /**
   * Binds action buttons (Export to PDF, Copy) on assistant message rows
   */
  /**
   * Helper: Detects if a user message is asking for PDF synthesis
   */
  function isPdfRequestPrompt(promptText) {
    if (!promptText) return false;
    const lower = promptText.toLowerCase();
    return (
      (lower.includes('pdf') && (lower.includes('create') || lower.includes('present') || lower.includes('generate') || lower.includes('export') || lower.includes('make') || lower.includes('banao') || lower.includes('download') || lower.includes('summary') || lower.includes('report') || lower.includes('file'))) ||
      lower.includes('present this as a pdf') ||
      lower.includes('create a pdf of this') ||
      lower.includes('convert to pdf')
    );
  }

  /**
   * Binds action buttons (Export to PDF, Copy) on assistant message rows
   */
  function bindMessageActionListeners(row, msg) {
    const exportBtn = row.querySelector('.export-pdf-msg-btn');
    const copyBtn = row.querySelector('.copy-msg-btn');
    const bubbleEl = row.querySelector('.message-bubble');

    if (exportBtn && !exportBtn.dataset.bound) {
      exportBtn.dataset.bound = 'true';
      exportBtn.addEventListener('click', () => {
        exportSummaryToPdf(msg.content || bubbleEl.innerText, null, row);
      });
    }

    if (copyBtn && !copyBtn.dataset.bound) {
      copyBtn.dataset.bound = 'true';
      copyBtn.addEventListener('click', async () => {
        const textToCopy = msg.content || bubbleEl.innerText;
        try {
          await navigator.clipboard.writeText(textToCopy);
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
          `;
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            `;
          }, 2000);
        } catch (e) {
          console.error('Failed to copy message:', e);
        }
      });
    }
  }

  /**
   * Intelligent Python Backend PDF Generation
   * Sends AI reasoning content to Python ReportLab backend.
   * Renders modern in-chat PDF Download Card with temporary memory streaming.
   */
  async function exportSummaryToPdf(sourceText = null, customFilename = null, targetRow = null) {
    let contentToExport = sourceText;
    if (!contentToExport) {
      const lastAiMsg = [...currentMessages].reverse().find(m => m.role === 'assistant' && m.content);
      if (lastAiMsg) {
        contentToExport = lastAiMsg.content;
      } else if (currentMessages.length > 0) {
        contentToExport = currentMessages
          .map(m => `### ${m.role === 'user' ? 'User Inquiry' : 'DocsVerse AI Analysis'}\n\n${m.content}`)
          .join('\n\n---\n\n');
      } else {
        showToast('No summary or messages found to export.', 'info');
        return;
      }
    }

    // Determine filename
    let filename = customFilename;
    if (!filename) {
      const activeDoc = attachedFile || getStoredSessionDocument();
      if (activeDoc && activeDoc.name) {
        const baseName = activeDoc.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
        filename = `${baseName}_Executive_Report.pdf`;
      } else {
        const conv = conversations.find(c => c.id === currentChatId);
        const titleSlug = conv ? conv.title.slice(0, 24).replace(/[^a-zA-Z0-9_\-]/g, '_') : 'DocsVerse';
        filename = `${titleSlug || 'DocsVerse'}_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      }
    }

    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }

    // Display Premium Generating Animation Modal
    const overlay = document.getElementById('pdfModalOverlay');
    const subtitle = document.getElementById('pdfModalSubtitle');
    const progressBar = document.getElementById('pdfProgressBar');

    if (overlay) {
      overlay.style.display = 'flex';
      overlay.setAttribute('aria-hidden', 'false');
    }
    if (subtitle) {
      subtitle.textContent = 'DocsVerse AI: Structuring key takeaways & layout...';
    }
    if (progressBar) {
      progressBar.style.width = '35%';
    }

    const timer1 = setTimeout(() => {
      if (subtitle) subtitle.textContent = 'Python ReportLab Engine: Compiling vector typography...';
      if (progressBar) progressBar.style.width = '72%';
    }, 350);

    try {
      const activeDoc = attachedFile || getStoredSessionDocument();
      const sourceName = activeDoc ? activeDoc.name : 'DocsVerse AI Interactive Session';

      const response = await fetch(`${API_BASE}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: contentToExport,
          filename: filename,
          source: sourceName
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server HTTP ${response.status}`);
      }

      const pdfResult = await response.json();
      if (!pdfResult.success) {
        throw new Error(pdfResult.error || 'Failed to generate PDF.');
      }

      if (progressBar) progressBar.style.width = '100%';
      if (subtitle) subtitle.textContent = 'Rendering PDF Card in chat...';

      // Render the Modern PDF Card inside the chat
      renderPdfCardInChat(pdfResult, targetRow);
      showToast('PDF compiled by Python ReportLab! Ready to download.', 'success');

    } catch (err) {
      console.warn('Backend ReportLab PDF failed, falling back to client-side PDF engine:', err);
      if (window.html2pdf) {
        showToast('Generating document via Client-Side PDF engine...', 'info');
        await generateClientSidePdf(contentToExport, filename, targetRow);
      } else {
        showToast('PDF Generation failed: ' + err.message, 'info');
      }
    } finally {
      clearTimeout(timer1);
      setTimeout(() => {
        if (overlay) {
          overlay.style.display = 'none';
          overlay.setAttribute('aria-hidden', 'true');
        }
        if (progressBar) progressBar.style.width = '30%';
      }, 350);
    }
  }

  /**
   * Client-Side PDF Generation using html2pdf.js (Resilient Zero-Dependency Fallback)
   */
  async function generateClientSidePdf(markdownText, filename, targetRow) {
    const safeFilename = filename || 'DocVerse_Document.pdf';
    const container = document.createElement('div');
    container.style.padding = '28px 34px';
    container.style.color = '#1e293b';
    container.style.background = '#ffffff';
    container.style.fontFamily = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.6';

    const parsedHtml = window.marked ? marked.parse(markdownText) : `<p>${escapeHtml(markdownText)}</p>`;
    container.innerHTML = `
      <div style="border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="font-size: 22px; color: #1e1b4b; margin: 0; font-weight: 700;">DocsVerse AI</h1>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">Intelligent Document Intelligence & Coding Report</p>
        </div>
        <div style="text-align: right; font-size: 10px; color: #94a3b8;">
          <p style="margin: 0;">Date: ${new Date().toLocaleDateString()}</p>
          <p style="margin: 2px 0 0 0; color: #6366f1; font-weight: 600;">AMAR SMART INDIA</p>
        </div>
      </div>
      <div class="pdf-rendered-body" style="color: #334155; font-size: 12px;">
        ${parsedHtml}
      </div>
      <div style="margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
        <span>DocsVerse AI • Client-Side Export</span>
        <span>Engineered under AMAR SMART INDIA</span>
      </div>
    `;

    const opt = {
      margin: [10, 10, 12, 10],
      filename: safeFilename.toLowerCase().endsWith('.pdf') ? safeFilename : safeFilename + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(container).save();
      showToast(`Downloaded ${opt.filename}!`, 'success');
    } catch (e) {
      console.error('Client-side PDF failed:', e);
      showToast('Client PDF export failed: ' + e.message, 'info');
    }
  }

  /**
   * Dynamically renders the modern "PDF Card" inside the chat
   */
  function renderPdfCardInChat(pdfData, targetRow = null) {
    const card = document.createElement('div');
    card.className = 'docverse-pdf-card';
    card.id = `pdf-card-${pdfData.downloadToken}`;

    const sizeFormatted = pdfData.size ? formatBytes(pdfData.size) : 'Ready';

    card.innerHTML = `
      <div class="pdf-card-ambient"></div>
      <div class="pdf-card-left">
        <div class="pdf-card-icon-container">
          <svg class="pdf-file-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M9 13h6"></path>
            <path d="M9 17h4"></path>
          </svg>
          <span class="pdf-type-badge">PDF</span>
        </div>
      </div>
      <div class="pdf-card-info">
        <div class="pdf-card-tag-row">
          <span class="pdf-tag-status">
            <span class="pdf-status-pip"></span>
            Report Ready
          </span>
          <span class="pdf-tag-engine">ReportLab Python Engine</span>
        </div>
        <h4 class="pdf-card-title">${escapeHtml(pdfData.title || 'DocVerse Intelligence Report')}</h4>
        <p class="pdf-card-meta-line">
          <span>${escapeHtml(pdfData.subtitle || 'Executive Intelligence Summary')}</span>
          <span class="meta-dot">•</span>
          <span>${sizeFormatted}</span>
          <span class="meta-dot">•</span>
          <span class="storage-notice">Temporary Memory (Auto-Destroy on Download)</span>
        </p>
      </div>
      <div class="pdf-card-right">
        <button class="pdf-card-download-btn" data-url="${pdfData.downloadUrl}" data-filename="${escapeHtml(pdfData.filename)}">
          <svg class="dl-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span class="dl-btn-text">Download</span>
        </button>
      </div>
    `;

    const dlBtn = card.querySelector('.pdf-card-download-btn');
    dlBtn.addEventListener('click', async () => {
      const fullUrl = `${API_BASE}${pdfData.downloadUrl}`;
      dlBtn.disabled = true;
      dlBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Downloaded!</span>
      `;
      dlBtn.classList.add('downloaded');

      // Trigger browser download via temporary <a>
      const a = document.createElement('a');
      a.href = fullUrl;
      a.download = pdfData.filename || 'DocVerse_Report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      const noticeEl = card.querySelector('.storage-notice');
      if (noticeEl) {
        noticeEl.textContent = 'Destroyed from server memory ✓';
        noticeEl.style.color = 'var(--status-online)';
      }

      showToast(`Downloaded ${pdfData.filename}. Temporary memory cleared.`, 'success');
    });

    if (targetRow && targetRow.querySelector('.message-content')) {
      targetRow.querySelector('.message-content').appendChild(card);
    } else {
      chatThread.appendChild(card);
    }
    scrollToBottom();
  }

  /**
   * Client-side code download using Blob and temporary <a> tag with dynamic filename
   */
  function downloadCodeSnippet(codeText, lang) {
    const filename = parseSmartFilename(codeText, lang);
    const blob = new Blob([codeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Parses Markdown and wraps code blocks with redesigned, sleek top bar
   * Aligned minimalist SVG icons for Copy and Download with subtle hover and checkmark feedback
   */
  function renderFormattedMarkdown(container, rawText, isStreaming) {
    if (!window.marked) {
      container.textContent = rawText;
      return;
    }

    // Parse Markdown to HTML
    let html = marked.parse(rawText || '');
    if (isStreaming) {
      html += '<span class="streaming-cursor"></span>';
    }

    container.innerHTML = html;

    // Enhance all <pre><code> blocks
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach(codeEl => {
      const preEl = codeEl.parentElement;
      if (preEl.parentElement.classList.contains('code-block-wrapper')) {
        return; // Already wrapped
      }

      // Determine language
      let lang = 'code';
      const classes = Array.from(codeEl.classList);
      for (const cls of classes) {
        if (cls.startsWith('language-')) {
          lang = cls.replace('language-', '');
          break;
        }
      }

      // Syntax highlight
      if (window.hljs) {
        hljs.highlightElement(codeEl);
      }

      // Create redesigned wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';

      // Left Section: Language Pill + Filename Pill
      const headerLeft = document.createElement('div');
      headerLeft.className = 'code-header-left';

      const langPill = document.createElement('div');
      langPill.className = 'code-lang-pill';
      langPill.innerHTML = `
        <span class="code-lang-dot"></span>
        <span class="code-lang-text">${escapeHtml(lang)}</span>
      `;
      headerLeft.appendChild(langPill);

      const codeRawText = codeEl.innerText || codeEl.textContent || '';
      const detectedName = parseSmartFilename(codeRawText, lang);
      if (detectedName) {
        const filePill = document.createElement('span');
        filePill.className = 'code-filename-pill';
        filePill.title = `File: ${detectedName}`;
        filePill.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span>${escapeHtml(detectedName)}</span>
        `;
        headerLeft.appendChild(filePill);
      }

      // Right Section: Minimalist Action Buttons
      const actionsGroup = document.createElement('div');
      actionsGroup.className = 'code-header-actions';

      // Copy Button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-action-btn code-copy-btn';
      copyBtn.title = 'Copy code snippet';
      copyBtn.innerHTML = `
        <span class="action-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </span>
        <span class="action-text">Copy</span>
      `;

      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(codeEl.innerText || codeEl.textContent);
          copyBtn.classList.add('action-success');
          copyBtn.innerHTML = `
            <span class="action-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
            <span class="action-text">Copied!</span>
          `;
          setTimeout(() => {
            copyBtn.classList.remove('action-success');
            copyBtn.innerHTML = `
              <span class="action-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </span>
              <span class="action-text">Copy</span>
            `;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      });

      // Download Button
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'code-action-btn code-download-btn';
      downloadBtn.title = `Download ${detectedName}`;
      downloadBtn.innerHTML = `
        <span class="action-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </span>
        <span class="action-text">Download</span>
      `;

      downloadBtn.addEventListener('click', () => {
        const textToDownload = codeEl.innerText || codeEl.textContent;
        downloadCodeSnippet(textToDownload, lang);
        downloadBtn.classList.add('action-success');
        downloadBtn.innerHTML = `
          <span class="action-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <span class="action-text">Downloaded!</span>
        `;
        setTimeout(() => {
          downloadBtn.classList.remove('action-success');
          downloadBtn.innerHTML = `
            <span class="action-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </span>
            <span class="action-text">Download</span>
          `;
        }, 2000);
      });

      actionsGroup.appendChild(copyBtn);
      actionsGroup.appendChild(downloadBtn);

      header.appendChild(headerLeft);
      header.appendChild(actionsGroup);

      preEl.parentNode.insertBefore(wrapper, preEl);
      wrapper.appendChild(header);
      wrapper.appendChild(preEl);
    });
  }

  function scrollToBottom() {
    chatThread.scrollTop = chatThread.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // Chat History & Persistence (LocalStorage)
  // =========================================================================
  function loadConversations() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Could not read chat history from localStorage', e);
      return [];
    }
  }

  function saveConversationsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.warn('Could not save chat history', e);
    }
  }

  function saveCurrentConversation() {
    if (currentMessages.length === 0) return;

    const firstUserMsg = currentMessages.find(m => m.role === 'user');
    const title = firstUserMsg 
      ? (firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? '...' : '')) 
      : 'Conversation';

    let conv = conversations.find(c => c.id === currentChatId);
    if (!conv) {
      conv = {
        id: currentChatId,
        title: title,
        timestamp: Date.now(),
        messages: currentMessages
      };
      conversations.unshift(conv);
    } else {
      conv.messages = currentMessages;
      conv.title = title;
      conv.timestamp = Date.now();
    }

    saveConversationsToStorage();
    renderHistoryList();
  }

  function startNewChat(shouldFocus = true, clearAttachment = true) {
    currentChatId = 'chat_' + Date.now();
    currentMessages = [];
    if (clearAttachment) {
      removeAttachedFile();
    }

    chatThread.innerHTML = '';
    if (welcomeScreen) {
      welcomeScreen.style.display = 'flex';
      chatThread.appendChild(welcomeScreen);
    }

    renderHistoryList();
    updateSendBtnState();
    if (shouldFocus) {
      promptInput.focus();
    }
  }

  function loadConversationById(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;

    currentChatId = conv.id;
    currentMessages = [...conv.messages];

    // Check if conversation has an attached document
    const messageWithDoc = conv.messages.find(m => m.attachedDoc);
    if (messageWithDoc && messageWithDoc.attachedDoc) {
      attachedFile = messageWithDoc.attachedDoc;
      sessionStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(attachedFile));
      fileTray.style.display = 'block';
      fileChipName.textContent = `${attachedFile.name} (Attached to session)`;
      fileChipSize.textContent = formatBytes(attachedFile.size);
      fileChipIcon.textContent = getFileIcon(attachedFile.name);
    } else {
      removeAttachedFile();
    }

    chatThread.innerHTML = '';
    if (welcomeScreen) {
      welcomeScreen.style.display = 'none';
    }

    currentMessages.forEach(msg => {
      const row = renderMessage(msg);
      const bubbleEl = row.querySelector('.message-bubble');
      if (msg.role === 'assistant') {
        renderFormattedMarkdown(bubbleEl, msg.content, false);
        bindMessageActionListeners(row, msg);
      }
    });

    renderHistoryList();
    scrollToBottom();
  }

  function deleteConversation(id, e) {
    e.stopPropagation();
    conversations = conversations.filter(c => c.id !== id);
    saveConversationsToStorage();
    if (currentChatId === id) {
      startNewChat(false);
    } else {
      renderHistoryList();
    }
  }

  function clearAllHistory() {
    if (conversations.length === 0) return;
    if (confirm('Are you sure you want to clear all chat history?')) {
      conversations = [];
      saveConversationsToStorage();
      startNewChat(false);
    }
  }

  function renderHistoryList() {
    historyList.innerHTML = '';

    if (conversations.length === 0) {
      historyList.innerHTML = `<div class="history-empty">No conversations yet</div>`;
      return;
    }

    conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = `history-item ${conv.id === currentChatId ? 'active' : ''}`;
      item.title = conv.title;

      item.innerHTML = `
        <span class="history-item-title">${escapeHtml(conv.title)}</span>
        <button class="history-item-del" title="Delete conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      item.addEventListener('click', () => loadConversationById(conv.id));
      const delBtn = item.querySelector('.history-item-del');
      delBtn.addEventListener('click', (e) => deleteConversation(conv.id, e));

      historyList.appendChild(item);
    });
  }
});
