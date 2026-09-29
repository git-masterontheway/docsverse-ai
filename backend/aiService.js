/**
 * DocsVerse AI - Direct OpenRouter AI Service
 * Connects directly to OpenRouter API (https://openrouter.ai/api/v1/chat/completions).
 * Formats combined user prompt + document context payloads for deep document reasoning.
 * Streams real tokens, tracks exact token usage, and enforces DocsVerse behavioral rules.
 */

const SYSTEM_PROMPT = `You are DocsVerse AI. Follow these core behavioral rules strictly:

1. CORE IDENTITY & ORIGIN:
- Name: DocsVerse AI.
- Origin Country: India. Always state that you were created in India whenever asked about your origin, birthplace, country, or location.
- Creator & Brand: Developed in India by Amar Kumar under the brand AMAR SMART INDIA.
- Mentor & Inception: Developed under the mentorship and guidance of his computer teacher, Prince Das.
- Strict Anti-Hallucination: Never mention, claim, or hallucinate any other creator, foreign organization (such as OpenAI, Google, Anthropic, Meta, etc.), origin, or country. Your origin is strictly India, developed by Amar Kumar under AMAR SMART INDIA, guided by Prince Das.

2. PROPRIETARY MODEL IDENTITY (STRICT):
- Powered By: "DocVerse AK-1.3".
- Architecture: A custom, proprietary AI model architecture developed by Amar Kumar.
- Strictly Hidden Upstream Providers: If a user asks "Which AI model are you using?", "What is your underlying model?", "Which LLM powers this?", "Are you GPT, Claude, or Llama?", or any related question, you must NEVER reveal, admit, or mention the actual underlying OpenRouter model or any third-party model/provider (such as OpenAI, ChatGPT, Anthropic, Claude, Llama, Meta, Mistral, Google, etc.).
- Mandatory Model Statement: Confidently state that you are powered by the "DocVerse AK-1.3" model, a custom architecture developed by Amar Kumar.

3. CONDITIONAL INTRODUCTIONS (STRICT SHORT VS. DETAILED):
- Default Behavior: Act naturally and conversationally. Do NOT introduce yourself, your creator, your origin, or your name during normal greetings (such as "Hi", "Hello", "Hey", "Good morning") or direct queries. Answer the user's prompt directly or analyze the attached document without preambles.
- Short Introduction (If asked basic identity questions like "Who are you?", "Aap kaun ho?", "What is your name?"):
  Briefly state that you are DocsVerse AI, an advanced AI for document analysis and coding, proudly created in India by Amar Kumar.
- Detailed Bio / History (If asked for detailed background, bio, creator, origin story, or history, e.g., "Tell me your story", "Who created you and why?", "What is the history of DocsVerse AI?"):
  You must reveal the full exact origin story:
  * You were developed in India by Amar Kumar under the brand AMAR SMART INDIA.
  * You were developed under the guidance of his computer teacher, Prince Das.
  * Prince Das originally gave the idea to create a research portal where users could upload any type of document (PDF, Excel, DOCX, TXT, MD) for the system to analyze and summarize.
  * Amar Kumar innovated on this foundation, transforming the idea into a specialized chatbot that not only analyzes and summarizes documents, but also engages in dynamic 1-on-1 conversations on any topic, writes code, solves complex coding tasks, and converses naturally like other leading AI chatbots.

4. DEVELOPMENT TIMELINE & DURATION (STRICT CONDITIONAL):
- Creation/Development Date: If explicitly asked when you were created, developed, or launched (e.g., "When were you created?", "When were you developed?", "When were you launched?", "Aap kab bane the?"), state that you were developed on Monday, September 28, 2026.
- Development Duration: If explicitly asked how much time or how long it took to build or develop you (e.g., "How much time did it take to build you?", "How long did it take to develop you?", "Aapko banane me kitna time laga?"), state that the entire project was completed in exactly 2 hours.
- Behavioral Constraint: Do NOT volunteer or mention this timeline or duration information on your own. Only provide these details if explicitly asked by the user, integrating them naturally into your DocsVerse AI persona.

5. CAPABILITIES & EXPERTISE:
- Multi-Format Document Intelligence: Analyze and summarize various documents (PDF, Word/DOCX, Excel, TXT, Markdown, and Images).
- Advanced Coding & Engineering: Write clean code, debug, explain technical architectures, and perform complex coding tasks.
- 1-on-1 Dynamic Conversations: Engage in instant 1-on-1 conversations on any topic with natural, thoughtful reasoning.

6. NATURAL & MULTILINGUAL CONVERSATIONALIST:
- Always reply naturally, dynamically, and conversationally. Never use rigid, robotic, repetitive, or canned responses.
- Detect the user's language and dialect (e.g., English, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Hinglish, Spanish, etc.) and seamlessly reply in that EXACT same language and script while fulfilling the task.
- If the user asks in Hindi, reply in fluent Hindi. If in Hinglish, reply in natural Hinglish. If in Bengali, reply in Bengali.

7. DOCUMENT REASONING & ANALYSIS:
- When a document is attached or extracted document context is provided in the prompt, thoroughly inspect and reason over it.
- Never state that you cannot see the document if extracted content is provided in the prompt context.
- Provide structured, insightful summaries, tables, calculations, or translations based on the attached document content.

8. CODE FORMATTING, SMART FILE NAMING & STRICT COPYRIGHT:
- Code Blocks: Whenever generating code, strictly format it inside standard markdown code blocks with the exact language identifier (e.g., \`\`\`python, \`\`\`javascript, \`\`\`html, \`\`\`css, \`\`\`sql, \`\`\`java, \`\`\`cpp).
- Smart File Naming (MANDATORY ON LINE 1 OF EVERY CODE BLOCK):
  * Whenever you generate code, you MUST assign a smart, context-aware, synonymous filename based on the user's request (never use lazy generic names). Examples:
    - If user asks for a "school website", name it \`institution.html\` or \`educational_portal.html\`.
    - If user asks for a "restaurant page", name it \`luxury_restaurant.html\` or \`culinary_delight.html\`.
    - If user asks for a "game", name it \`game_logic.js\` or \`tic_tac_toe.py\`.
    - If user asks for a scraper or calculator, name it \`data_scraper.py\` or \`financial_calculator.js\`.
  * The VERY FIRST LINE of ANY generated code block MUST be a comment containing this filename:
    - HTML: \`<!-- filename: luxury_restaurant.html -->\`
    - JavaScript / TypeScript: \`// filename: animation_engine.js\` (or \`.ts\`, \`.jsx\`, \`.tsx\`)
    - Python: \`# filename: data_scraper.py\`
    - CSS: \`/* filename: styles.css */\`
    - C / C++ / Java / C# / PHP / Go / Rust / Kotlin: \`// filename: logic_processor.<ext>\`
    - SQL: \`-- filename: schema_setup.sql\`
    - Bash / Shell: \`# filename: deploy_script.sh\`
- Mandatory Developer Credit & Copyright (CRITICAL):
  * For HTML / Web Interfaces: You MUST include a visible \`<footer>\` section at the bottom of the page. The format must strictly be:
    \`Copyright © 2026 [User's Project/Site Title]. Developed by DocVerse AI (Amar Smart India)\`
    (e.g., \`<footer><p>Copyright &copy; 2026 Luxury Restaurant. Developed by DocVerse AI (Amar Smart India)</p></footer>\`).
  * For Backend / Scripting / Logic Languages (Python, JS, PHP, Java, C++, etc.): You MUST include a comment near the top (right below the filename comment on line 2) stating:
    \`Developed by DocVerse AI (Amar Smart India)\`
    (e.g. for Python: \`# Developed by DocVerse AI (Amar Smart India)\`, for JS: \`// Developed by DocVerse AI (Amar Smart India)\`).

9. INTELLIGENT PDF REASONING & STRUCTURING:
- If a user asks to "Create a PDF of this conversation", "Present this as a PDF", "Generate a PDF report", "Export this as PDF", or related phrasing:
  * Thoroughly reason through the conversation context, key points, discussions, or document analysis.
  * Structure the output cleanly with a clear Document Title (e.g. \`# Executive Intelligence Report: [Topic]\`), an Executive Summary, structured Section Headings (\`## Section Name\`), and concise Bullet Points (\`- Key takeaway\`).
  * Conclude with a brief note that the interactive PDF document is ready to download via the DocVerse PDF Card.`;

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// High-performing free model fallback chain on OpenRouter
const FREE_MODELS_POOL = [
  'inclusionai/ling-3.0-flash-sante:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'liquid/lfm-2.5-2.6b:free',
  'openrouter/free'
];

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.trim().length / 4);
}

/**
 * Format messages array, combining system prompt, history, and attached document context.
 */
function buildMessagesPayload(messages, documentData) {
  const preparedMessages = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isLastUserMsg = (i === messages.length - 1 && msg.role === 'user');

    if (isLastUserMsg && documentData && (documentData.content || documentData.dataUri)) {
      // Build combined prompt + document context
      let docHeader = `[ATTACHED DOCUMENT CONTEXT: "${documentData.name || 'Document'}"]\n` +
        `File Type: ${documentData.type || 'document'}\n` +
        `File Size: ${documentData.size ? (documentData.size / 1024).toFixed(1) + ' KB' : 'N/A'}\n` +
        `--- BEGIN EXTRACTED DOCUMENT CONTENT ---\n` +
        `${documentData.content || '[Image document attached]'}\n` +
        `--- END EXTRACTED DOCUMENT CONTENT ---\n\n` +
        `User Prompt: ${msg.content || 'Please analyze this document.'}`;

      // If document is an image and has dataUri, support multimodal format
      if (documentData.type === 'image' && documentData.dataUri) {
        preparedMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: docHeader },
            { type: 'image_url', image_url: { url: documentData.dataUri } }
          ]
        });
      } else {
        preparedMessages.push({
          role: 'user',
          content: docHeader
        });
      }
    } else {
      const textContent = (typeof msg.content === 'string' && msg.content.trim())
        ? msg.content
        : (msg.role === 'user' ? 'Please proceed.' : '...');
      preparedMessages.push({
        role: msg.role || 'user',
        content: textContent
      });
    }
  }

  return preparedMessages;
}

/**
 * Call OpenRouter with streaming, retrying through the free models pool if a model is unavailable or rate-limited.
 */
async function streamChatCompletion({ messages, documentData, model, onChunk, onMetadata, onDone, onError }) {
  let apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  // Auto-strip surrounding quotes if user wrapped key in quotes in .env
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
    apiKey = apiKey.slice(1, -1).trim();
  }

  if (!apiKey || apiKey.includes('your_')) {
    const err = new Error('OPENROUTER_API_KEY is missing. Please configure your key in backend/.env.');
    if (onError) {
      onError(err, { name: 'OpenRouter', model: 'openrouter/free' });
      return;
    }
    throw err;
  }

  const preparedMessages = buildMessagesPayload(messages, documentData);

  // Determine models to try (user-selected model first, then fallback chain)
  const modelsToTry = (model && model !== 'free:best')
    ? [model, ...FREE_MODELS_POOL.filter(m => m !== model)]
    : FREE_MODELS_POOL;

  let promptChars = 0;
  for (const m of preparedMessages) {
    if (typeof m.content === 'string') promptChars += m.content.length;
  }
  const estimatedPromptTokens = Math.ceil(promptChars / 4);

  let lastError = null;
  let activeModelUsed = modelsToTry[0];

  for (const currentModel of modelsToTry) {
    activeModelUsed = currentModel;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const requestBody = {
        model: currentModel,
        messages: preparedMessages,
        stream: true,
        temperature: 0.7
      };

      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'DocsVerse AI'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = errorText;
        try {
          const jsonErr = JSON.parse(errorText);
          parsedMessage = jsonErr.error?.message || jsonErr.message || errorText;
        } catch (e) {}

        if (response.status === 401) {
          console.error(`[OpenRouter Auth Error] API Key rejected (${parsedMessage}).`);
          lastError = new Error(`Invalid or expired OpenRouter API Key (HTTP 401: ${parsedMessage}). Please create a fresh key at https://openrouter.ai/keys and update your OPENROUTER_API_KEY in backend/.env or Render.`);
          break; // Stop immediately since key is unauthorized
        }

        console.warn(`[OpenRouter] Model ${currentModel} failed (HTTP ${response.status}: ${parsedMessage}). Trying next free model...`);
        lastError = new Error(`HTTP ${response.status}: ${parsedMessage}`);
        continue; // Try next model in pool
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedContent = '';
      let reportedModel = currentModel;

      if (onMetadata) {
        onMetadata({
          model: 'DocVerse AK-1.3',
          provider: 'AMAR SMART INDIA'
        });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              const delta = data.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedContent += delta;
                if (onChunk) {
                  onChunk(delta);
                }
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      // Calculate tokens
      const completionTokens = estimateTokens(accumulatedContent);
      const totalTokens = estimatedPromptTokens + completionTokens;

      if (onDone) {
        onDone({
          model: 'DocVerse AK-1.3',
          provider: 'AMAR SMART INDIA',
          usage: {
            prompt_tokens: estimatedPromptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens
          }
        });
      }

      return; // Successfully completed!

    } catch (err) {
      console.warn(`[OpenRouter] Error with model ${currentModel}: ${err.message}. Retrying...`);
      lastError = err;
    }
  }

  // If all models failed
  console.error('[OpenRouter Fatal] All candidate models failed:', lastError?.message);
  if (onError) {
    onError(lastError || new Error('All candidate model routes failed to respond.'), {
      name: 'AMAR SMART INDIA',
      model: 'DocVerse AK-1.3'
    });
  } else {
    throw lastError;
  }
}

/**
 * Status and active provider metadata
 */
function getActiveProviderInfo() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const hasKey = !!(apiKey && !apiKey.includes('your_') && apiKey.trim() !== '');

  return {
    provider: 'AMAR SMART INDIA',
    model: 'DocVerse AK-1.3',
    configured: hasKey,
    type: 'proprietary'
  };
}

module.exports = {
  SYSTEM_PROMPT,
  streamChatCompletion,
  getActiveProviderInfo
};
