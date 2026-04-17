import { marked } from 'marked';
import DOMPurify from 'dompurify';

const SYSTEM_INSTRUCTION = `Você é um assistente corporativo especializado em análise de documentos em ambientes empresariais e jurídicos.

Sua função é transformar textos não estruturados e imagens de documentos em informações claras, organizadas e acionáveis, ajudando na tomada de decisão rápida.

Analise o texto fornecido e/ou a imagem anexada e responda EXATAMENTE no formato abaixo:

---

📄 RESUMO  
Faça um resumo objetivo em até 5 linhas, destacando o contexto geral.

---

🔑 PONTOS PRINCIPAIS  
- Liste os pontos mais importantes do texto  
- Seja direto e evite redundância  

---

⏰ PRAZOS E DATAS  
- Identifique qualquer prazo, data ou limite mencionado  
- Caso não exista, escreva: "Nenhum prazo identificado"

---

⚠️ RISCOS E PONTOS DE ATENÇÃO  
- Aponte possíveis problemas, riscos, ambiguidades ou pontos críticos  
- Caso não haja, escreva: "Nenhum risco evidente"

---

✅ PRÓXIMAS AÇÕES RECOMENDADAS  
- Sugira ações práticas e diretas com base no conteúdo  
- Foque em execução

---

🧾 EXPLICAÇÃO SIMPLIFICADA  
Explique o conteúdo de forma simples, como se fosse para alguém sem conhecimento técnico.

---

REGRAS IMPORTANTES:
- Não invente informações
- Se algo não estiver claro, sinalize
- Use linguagem profissional e objetiva
- Mantenha a resposta bem organizada
- Não saia do formato definido`;

// State
let messages = [];
let attachedImages = [];
let isGenerating = false;

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const emptyState = document.getElementById('empty-state');
const chatInput = document.getElementById('chat-input');
const chatForm = document.getElementById('chat-form');
const fileInput = document.getElementById('file-input');
const btnUpload = document.getElementById('btn-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const modelSelect = document.getElementById('model-select');
const btnSubmit = document.getElementById('btn-submit');
const iconSend = document.getElementById('icon-send');
const iconLoader = document.getElementById('icon-loader');
const btnClear = document.getElementById('btn-clear');
const btnClearMobile = document.getElementById('btn-clear-mobile');

// Utility: Convert File to Generative Part
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Event Listeners setup
btnUpload.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const files = e.target.files;
  if (!files) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith('image/')) continue;
    
    const genPart = await fileToGenerativePart(file);
    
    attachedImages.push({
      file,
      previewUrl: URL.createObjectURL(file),
      base64Data: genPart.inlineData.data,
      mimeType: genPart.inlineData.mimeType
    });
  }
  
  fileInput.value = ''; // Reset
  renderImagePreviews();
  updateSubmitButtonState();
});

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 180)}px`;
  updateSubmitButtonState();
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (chatInput.value.trim() || attachedImages.length > 0) {
      handleChatSubmit();
    }
  }
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handleChatSubmit();
});

btnClear.addEventListener('click', clearChat);
btnClearMobile.addEventListener('click', clearChat);

function updateSubmitButtonState() {
  const hasInput = chatInput.value.trim().length > 0;
  const hasImages = attachedImages.length > 0;
  btnSubmit.disabled = (!hasInput && !hasImages) || isGenerating;
}

function removeAttachedImage(index) {
  URL.revokeObjectURL(attachedImages[index].previewUrl);
  attachedImages.splice(index, 1);
  renderImagePreviews();
  updateSubmitButtonState();
}

window.removeAttachedImage = removeAttachedImage; // Export for inline onclick

function renderImagePreviews() {
  if (attachedImages.length > 0) {
    imagePreviewContainer.classList.remove('hidden');
    imagePreviewContainer.innerHTML = attachedImages.map((img, i) => `
      <div class="relative group flex-shrink-0">
        <div class="w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
          <img src="${img.previewUrl}" alt="Preview" class="w-full h-full object-cover" />
        </div>
        <button
          type="button"
          onclick="removeAttachedImage(${i})"
          class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </div>
    `).join('');
  } else {
    imagePreviewContainer.classList.add('hidden');
    imagePreviewContainer.innerHTML = '';
  }
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function clearChat() {
  messages = [];
  attachedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
  attachedImages = [];
  chatInput.value = '';
  chatInput.style.height = 'auto';
  renderImagePreviews();
  updateSubmitButtonState();
  
  // Clear DOM messages
  document.querySelectorAll('.chat-message').forEach(el => el.remove());
  emptyState.classList.remove('hidden');
}

const UserIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
const BotIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
const LoaderIcon = `<svg class="animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;

function appendMessageDOM(id, role, text, inlineImages = []) {
  emptyState.classList.add('hidden');
  
  const msgDiv = document.createElement('div');
  msgDiv.id = `msg-${id}`;
  msgDiv.className = `chat-message flex max-w-4xl mx-auto w-full ${role === 'user' ? 'justify-end' : 'justify-start'}`;
  
  const innerWrapper = document.createElement('div');
  innerWrapper.className = `flex gap-3 p-4 rounded-[4px] max-w-[85%] ${role === 'user' ? 'bg-accent-blue text-white shadow-sm' : 'bg-white border border-border text-content'}`;
  
  const iconWrapper = document.createElement('div');
  iconWrapper.className = `w-6 h-6 rounded flex-shrink-0 flex items-center justify-center ${role === 'user' ? 'bg-white/20 text-white' : 'bg-accent-blue/10 text-accent-blue'}`;
  iconWrapper.innerHTML = role === 'user' ? UserIcon : BotIcon;
  
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'space-y-3 overflow-hidden w-full';
  contentWrapper.id = `content-${id}`;
  
  // Images
  if (inlineImages.length > 0) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'flex flex-wrap gap-2';
    inlineImages.forEach(img => {
      const imgEl = document.createElement('img');
      imgEl.src = `data:${img.mimeType};base64,${img.data}`;
      imgEl.className = 'max-h-48 rounded-lg border border-white/20 shadow-sm object-contain bg-black/5';
      imgContainer.appendChild(imgEl);
    });
    contentWrapper.appendChild(imgContainer);
  }
  
  // Text content (Markdown rendered for model, raw for user)
  const textContainer = document.createElement('div');
  textContainer.className = `prose max-w-none break-words ${role === 'user' ? 'text-white prose-invert' : 'text-content prose-headings:text-secondary prose-a:text-accent-blue'}`;
  textContainer.id = `text-${id}`;
  
  if (text) {
    if (role === 'model') {
       textContainer.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
       textContainer.innerText = text; // Plain text for user
    }
  }
  contentWrapper.appendChild(textContainer);
  
  innerWrapper.appendChild(iconWrapper);
  innerWrapper.appendChild(contentWrapper);
  msgDiv.appendChild(innerWrapper);
  chatContainer.appendChild(msgDiv);
  scrollToBottom();
}

function appendLoaderDOM() {
  const msgDiv = document.createElement('div');
  msgDiv.id = 'loader-msg';
  msgDiv.className = 'chat-message flex max-w-4xl mx-auto w-full justify-start';
  msgDiv.innerHTML = `
    <div class="flex gap-3 p-4 rounded-[4px] max-w-[85%] bg-white border border-border text-content items-center">
      <div class="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center bg-accent-blue/10 text-accent-blue">
        ${BotIcon}
      </div>
      <div class="flex items-center gap-2 text-[0.85rem] text-secondary font-[600]">
        ${LoaderIcon}
        Processando Análise...
      </div>
    </div>
  `;
  chatContainer.appendChild(msgDiv);
  scrollToBottom();
}

function removeLoaderDOM() {
  const loader = document.getElementById('loader-msg');
  if (loader) loader.remove();
}

async function updateMessageText(id, newText) {
  const textEl = document.getElementById(`text-${id}`);
  if (textEl) {
    textEl.innerHTML = DOMPurify.sanitize(await marked.parse(newText));
    scrollToBottom();
  }
}

async function handleChatSubmit() {
  if (isGenerating) return;

  const currentInput = chatInput.value;
  const currentImages = [...attachedImages];
  
  if (!currentInput.trim() && currentImages.length === 0) return;

  // Update UI state
  chatInput.value = '';
  chatInput.style.height = 'auto';
  attachedImages = [];
  renderImagePreviews();
  
  isGenerating = true;
  updateSubmitButtonState();
  modelSelect.disabled = true;
  iconSend.classList.add('hidden');
  iconLoader.classList.remove('hidden');

  // Create User Message
  const userParts = [];
  const inlineImages = [];
  
  if (currentInput.trim()) {
    userParts.push({ text: currentInput });
  }
  
  for (const img of currentImages) {
    userParts.push({
      inlineData: {
        data: img.base64Data,
        mimeType: img.mimeType
      }
    });
    inlineImages.push({
      data: img.base64Data,
      mimeType: img.mimeType
    });
  }

  const userId = Date.now().toString();
  messages.push({
    id: userId,
    role: 'user',
    parts: userParts
  });

  appendMessageDOM(userId, 'user', currentInput, inlineImages);
  appendLoaderDOM();

  try {
    // Converter estado interno para formato OpenAI/OpenRouter APIs
    const openRouterMessages = [
      { role: 'system', content: SYSTEM_INSTRUCTION }
    ];
    
    for (const msg of messages) {
      if (msg.role === 'user') {
        const content = [];
        for (const p of msg.parts) {
          if (p.text) content.push({ type: 'text', text: p.text });
          if (p.inlineData) {
            content.push({ 
              type: 'image_url', 
              image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } 
            });
          }
        }
        openRouterMessages.push({ role: 'user', content });
      } else if (msg.role === 'model') {
        const combinedText = msg.parts.map(p => p.text || '').join('');
        openRouterMessages.push({ role: 'assistant', content: combinedText });
      }
    }

    const selectedModel = modelSelect.value;
    
    /* Leitura Segura p/ Frontends compilados com Vite (Vercel) */
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing_VITE_OPENROUTER_API_KEY");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "CorpAnalyzer"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: openRouterMessages,
        stream: true,
        max_tokens: 2000 // Limitando o tamanho da resposta para contornar bloqueios de crédito/limite grátis
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Falha na API do OpenRouter');
    }

    removeLoaderDOM();
    
    const modelId = (Date.now() + 1).toString();
    appendMessageDOM(modelId, 'model', '');
    
    let fullText = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.error) {
              fullText += '\n**ERRO DA API:** ' + (data.error.message || JSON.stringify(data.error));
            }
            const delta = data.choices?.[0]?.delta || data.choices?.[0]?.message || {};
            const deltaContent = delta.content || '';
            if (deltaContent) {
              fullText += deltaContent;
            }
          } catch (e) {
            // Ignorar recortes parciais
          }
        } else if (trimmed.startsWith('{') && trimmed.includes('"error"')) {
           try {
             const data = JSON.parse(trimmed);
             if (data.error) fullText += '\n**ERRO DA API:** ' + (data.error.message || JSON.stringify(data.error));
           } catch(e) {}
        }
      }
      if (!fullText && buffer.startsWith('{') && buffer.includes('error')) {
         try {
             const data = JSON.parse(buffer);
             if (data.error) fullText += '\n**ERRO DA API:** ' + (data.error.message || JSON.stringify(data.error));
         } catch(e) {}
      }
      await updateMessageText(modelId, fullText);
    }
    
    // Add PDF download button
    const contentEl = document.getElementById(`content-${modelId}`);
    if (contentEl) {
      const btnContainer = document.createElement('div');
      btnContainer.className = 'mt-3 pt-3 border-t border-border flex justify-end';
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'flex items-center gap-2 px-3 py-1.5 text-[0.75rem] font-[600] text-accent-blue bg-accent-blue/10 hover:bg-accent-blue hover:text-white rounded-[4px] transition-colors cursor-pointer';
      downloadBtn.type = 'button';
      downloadBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x1="12" y1="15" y2="3"/></svg>
        Gerar Relatório PDF
      `;
      downloadBtn.addEventListener('click', async () => await generatePDF(fullText));
      btnContainer.appendChild(downloadBtn);
      contentEl.appendChild(btnContainer);
      scrollToBottom();
    }
    
    // Push final generated text to state history
    messages.push({
      id: modelId,
      role: 'model',
      parts: [{ text: fullText }]
    });

  } catch (err) {
    console.error('Error generating response:', err);
    removeLoaderDOM();
    
    const isMissingKey = err.message.includes('Missing_VITE_OPENROUTER_API_KEY');
    const msg = isMissingKey 
        ? '⚠️ **Erro de Autenticação:** A chave `VITE_OPENROUTER_API_KEY` não foi encontrada. Vá ao painel do seu projeto no **Vercel -> Settings -> Environment Variables**, cadastre sua chave lá, e faça um novo Deploy para o sistema voltar ao ar.'
        : '⚠️ **Ocorreu um erro ao processar sua solicitação:** ' + err.message;

    const errId = (Date.now() + 1).toString();
    appendMessageDOM(errId, 'model', msg);
    messages.push({
      id: errId,
      role: 'model',
      parts: [{ text: msg }]
    });
  } finally {
    isGenerating = false;
    modelSelect.disabled = false;
    iconSend.classList.remove('hidden');
    iconLoader.classList.add('hidden');
    updateSubmitButtonState();
  }
}

async function generatePDF(markdownText) {
  const el = document.createElement('div');
  
  // Format HTML with dedicated print styles for the PDF
  el.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; padding: 20px;">
      <style>
         .pdf-prose h1 { font-size: 18pt; color: #0f172a; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; }
         .pdf-prose h2 { font-size: 14pt; color: #1e293b; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
         .pdf-prose h3 { font-size: 12pt; color: #334155; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; }
         .pdf-prose p { margin-top: 1em; margin-bottom: 1em; line-height: 1.5; font-size: 11pt; }
         .pdf-prose ul { padding-left: 20px; border-left: 2px solid #e2e8f0; margin-top: 1em; margin-bottom: 1em; }
         .pdf-prose ol { padding-left: 20px; list-style-type: decimal; margin-top: 1em; margin-bottom: 1em; }
         .pdf-prose li { margin-bottom: 0.5em; line-height: 1.5; font-size: 11pt; }
         .pdf-prose strong { font-weight: bold; color: #0f172a; }
         .pdf-prose hr { border: none; border-top: 1px solid #cbd5e1; margin: 2em 0; }
      </style>
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="color: #2563eb; font-size: 24pt; margin: 0; font-weight: bold;">CorpAnalyzer</h1>
          <p style="color: #64748b; font-size: 11pt; margin: 4px 0 0 0;">Relatório de Análise Documental Corporativa</p>
        </div>
        <div style="color: #64748b; font-size: 10pt; text-align: right;">
          ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div class="pdf-prose">
        ${DOMPurify.sanitize(await marked.parse(markdownText))}
      </div>
      <div style="margin-top: 50px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 9pt;">
        Documento gerado de forma automatizada por Inteligência Artificial.<br/>
        Este relatório requer conferência e não substitui a validação de um profissional habilitado.
      </div>
    </div>
  `;

  const opt = {
    margin:       15,
    filename:     'CorpAnalyzer_Relatorio.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Wait a small tick to ensure html2pdf is accessible
  setTimeout(() => {
    if (window.html2pdf) {
      window.html2pdf().set(opt).from(el).save();
    } else {
      alert("A biblioteca de geração de PDF ainda está sendo carregada. Tente novamente em alguns segundos.");
    }
  }, 100);
}
