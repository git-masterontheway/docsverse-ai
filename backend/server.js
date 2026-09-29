/**
 * DocsVerse AI - Express Backend Server
 * Serves the frontend UI, parses multi-format documents, and directly connects to OpenRouter.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { parseDocument } = require('./documentParser');
const { streamChatCompletion, getActiveProviderInfo } = require('./aiService');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;

// Trust reverse proxies (Render, Cloudflare, ALB, Nginx)
app.set('trust proxy', 1);

// Resolve Python executable dynamically for Windows (localhost) & Linux (Render / Docker)
function resolvePythonExecutable() {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  // Windows local virtual environment
  const venvWin = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(venvWin)) return venvWin;

  // Linux / macOS virtual environments (Render / Docker)
  const venvLinux = path.join(__dirname, '.venv', 'bin', 'python');
  if (fs.existsSync(venvLinux)) return venvLinux;

  const venvLinux3 = path.join(__dirname, '.venv', 'bin', 'python3');
  if (fs.existsSync(venvLinux3)) return venvLinux3;

  // System fallback
  return process.platform === 'win32' ? 'python' : 'python3';
}

const PYTHON_EXECUTABLE = resolvePythonExecutable();
const PDF_GENERATOR_SCRIPT = path.join(__dirname, 'pdf_generator.py');

// Strictly temporary in-memory store for generated PDFs (auto-deleted after download or 5 min TTL)
const temporaryPdfStore = new Map();

// Periodic cleanup of expired temporary PDF tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, item] of temporaryPdfStore.entries()) {
    if (now - item.createdAt > 5 * 60 * 1000) {
      temporaryPdfStore.delete(token);
    }
  }
}, 30000);

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory cache for parsed document sessions
const parsedDocumentsCache = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static files
const FRONTEND_DIR = path.join(__dirname, '../frontend');
app.use(express.static(FRONTEND_DIR));
app.use('/assets', express.static(path.join(FRONTEND_DIR, 'assets')));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitized);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv',
    '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.webp',
    '.gif', '.txt', '.md', '.json', '.js', '.py', '.html'
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('text/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Supported types: PDF, Word, Excel, PowerPoint, Images, Text.`));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

// 1. Health Endpoint
app.get('/api/health', (req, res) => {
  const info = getActiveProviderInfo();
  res.json({
    status: 'healthy',
    name: 'DocsVerse AI Backend',
    provider: info.provider,
    activeModel: info.model,
    configured: info.configured,
    timestamp: new Date().toISOString()
  });
});

// 2. Models Endpoint
app.get('/api/models', (req, res) => {
  const info = getActiveProviderInfo();
  res.json({
    success: true,
    provider: info.provider,
    activeModel: info.model,
    configured: info.configured,
    type: info.type
  });
});

// 3. File Upload & Parse Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { path: filePath, originalname, mimetype, size } = req.file;

    // Parse the document using our multi-format parser
    const parsedData = await parseDocument(filePath, originalname, mimetype);

    const fileId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    // Cache the parsed result for fallback reference
    parsedDocumentsCache.set(fileId, {
      fileId,
      originalName: originalname,
      mimeType: mimetype,
      size,
      parsedData,
      createdAt: Date.now()
    });

    // Generate preview
    const preview = (parsedData.text && parsedData.text.length > 300)
      ? parsedData.text.substring(0, 300) + '...'
      : (parsedData.text || '');

    // Return full extracted text and dataUri to frontend for sessionStorage storage
    res.json({
      success: true,
      fileId,
      fileName: originalname,
      fileSize: size,
      fileType: parsedData.type,
      metadata: parsedData.metadata,
      textLength: parsedData.text?.length || 0,
      extractedText: parsedData.text || '',
      dataUri: parsedData.dataUri || null,
      preview: preview
    });
  } catch (error) {
    console.error('[Upload Error]:', error);
    res.status(500).json({ success: false, error: error.message || 'File processing failed' });
  }
});

// 4. Chat Completion & Streaming Route
app.post('/api/chat', async (req, res) => {
  const { messages = [], documentData, fileId, model } = req.body;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  // Retrieve document context: check direct frontend payload first, then fallback to cache
  let docPayload = documentData;
  if (!docPayload && fileId && parsedDocumentsCache.has(fileId)) {
    const cached = parsedDocumentsCache.get(fileId);
    docPayload = {
      name: cached.originalName,
      type: cached.parsedData?.type,
      size: cached.size,
      content: cached.parsedData?.text,
      dataUri: cached.parsedData?.dataUri
    };
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    await streamChatCompletion({
      messages,
      documentData: docPayload,
      model,
      onMetadata: (meta) => {
        res.write(`data: ${JSON.stringify({ type: 'metadata', ...meta })}\n\n`);
      },
      onChunk: (delta) => {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
      },
      onDone: (summary) => {
        res.write(`data: ${JSON.stringify({ type: 'usage', ...summary })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      },
      onError: (err, provider) => {
        console.error(`[AI Provider Error (${provider.name})]:`, err.message);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `⚠️ **AI Provider Error (${provider.name})**: ${err.message}` } }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'usage', model: provider.model, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    });
  } catch (fatalError) {
    console.error('[Fatal Chat Handler Error]:', fatalError);
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: `⚠️ **Server Error**: ${fatalError.message}` } }] })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Helper to parse markdown text into structured PDF payload
function parseMarkdownToSections(rawText, fallbackTitle) {
  if (!rawText) {
    return {
      title: fallbackTitle || 'DocVerse Intelligence Report',
      subtitle: 'Executive Summary & Key Takeaways',
      sections: [{ heading: 'Analysis', paragraphs: ['No summary content provided.'], bullets: [] }]
    };
  }

  const lines = rawText.split('\n');
  let detectedTitle = '';
  let subtitle = 'Executive Summary & AI Reasoning Analysis';
  const sections = [];
  let currentSection = { heading: 'Executive Summary', paragraphs: [], bullets: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for title (# Title)
    if (line.startsWith('# ') && !detectedTitle) {
      detectedTitle = line.replace(/^#\s+/, '').replace(/\*\*/g, '').trim();
      continue;
    }

    // Check for subtitle if second line starts with italic, quote, or parenthetical
    if (detectedTitle && !currentSection.paragraphs.length && (line.startsWith('*') || line.startsWith('_') || line.startsWith('>'))) {
      subtitle = line.replace(/^[*_>\s]+/, '').replace(/[*_]+$/, '').trim();
      continue;
    }

    // Section header (## or ###)
    if (line.startsWith('## ') || line.startsWith('### ')) {
      if (currentSection.paragraphs.length > 0 || currentSection.bullets.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: line.replace(/^#+\s+/, '').replace(/\*\*/g, '').trim(),
        paragraphs: [],
        bullets: []
      };
      continue;
    }

    // Bullets (- or * or numbered list)
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ') || /^\d+[.)]\s+/.test(line)) {
      const bulletText = line.replace(/^([-*•]|\d+[.)])\s+/, '').trim();
      if (bulletText) {
        currentSection.bullets.push(bulletText);
      }
      continue;
    }

    // Normal paragraph text
    currentSection.paragraphs.push(line);
  }

  if (currentSection.paragraphs.length > 0 || currentSection.bullets.length > 0) {
    sections.push(currentSection);
  }

  return {
    title: detectedTitle || fallbackTitle || 'DocVerse Intelligence Report',
    subtitle,
    sections: sections.length > 0 ? sections : [{ heading: 'Summary & Key Points', paragraphs: [rawText], bullets: [] }]
  };
}

// 5. Intelligent Python PDF Generation Endpoint
app.post('/api/generate-pdf', async (req, res) => {
  let tempJsonPath = null;
  let tempPdfPath = null;

  try {
    const { title, subtitle, sections, rawText, source, filename } = req.body;

    // Structure sections from raw markdown if sections array not supplied
    let pdfData = {
      title: title || 'DocVerse Intelligence Report',
      subtitle: subtitle || 'Executive Summary & AI Reasoning Analysis',
      source: source || 'DocVerse AI Workspace',
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      sections: sections || []
    };

    if ((!sections || sections.length === 0) && rawText) {
      const parsed = parseMarkdownToSections(rawText, title);
      pdfData.title = title || parsed.title;
      pdfData.subtitle = subtitle || parsed.subtitle;
      pdfData.sections = parsed.sections;
    }

    // Create temporary paths in system temp directory
    const uniqueId = 'docverse_pdf_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    tempJsonPath = path.join(os.tmpdir(), `${uniqueId}.json`);
    tempPdfPath = path.join(os.tmpdir(), `${uniqueId}.pdf`);

    // Write input JSON to temporary file
    fs.writeFileSync(tempJsonPath, JSON.stringify(pdfData, null, 2), 'utf-8');

    // Run Python ReportLab generator
    await new Promise((resolve, reject) => {
      execFile(PYTHON_EXECUTABLE, [PDF_GENERATOR_SCRIPT, tempJsonPath, tempPdfPath], (error, stdout, stderr) => {
        if (error) {
          console.error('[PDF Generator Exec Error]:', error, stderr);
          return reject(new Error(`PDF Generation failed: ${stderr || error.message}`));
        }
        resolve(stdout);
      });
    });

    if (!fs.existsSync(tempPdfPath)) {
      throw new Error('PDF output file was not created by generator.');
    }

    // Read generated PDF into in-memory buffer
    const pdfBuffer = fs.readFileSync(tempPdfPath);

    // Strictly Temporary Storage: Immediately unlink temporary files from disk
    try {
      if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
      tempJsonPath = null;
      tempPdfPath = null;
    } catch (cleanupErr) {
      console.warn('[PDF Temp Cleanup Warning]:', cleanupErr.message);
    }

    // Prepare filename
    let downloadFilename = filename;
    if (!downloadFilename) {
      const safeTitle = (pdfData.title || 'DocVerse_Report')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .substring(0, 36);
      downloadFilename = `${safeTitle}.pdf`;
    }
    if (!downloadFilename.toLowerCase().endsWith('.pdf')) {
      downloadFilename += '.pdf';
    }

    // Store in-memory buffer with unique one-time token (5 minute TTL)
    const downloadToken = crypto.randomBytes(18).toString('hex');
    temporaryPdfStore.set(downloadToken, {
      buffer: pdfBuffer,
      filename: downloadFilename,
      title: pdfData.title,
      size: pdfBuffer.length,
      createdAt: Date.now()
    });

    res.json({
      success: true,
      downloadToken,
      downloadUrl: `/api/download-temp-pdf/${downloadToken}`,
      title: pdfData.title,
      subtitle: pdfData.subtitle,
      filename: downloadFilename,
      size: pdfBuffer.length
    });

  } catch (err) {
    console.error('[Generate PDF Error]:', err);
    // Cleanup temporary files in error case
    if (tempJsonPath && fs.existsSync(tempJsonPath)) {
      try { fs.unlinkSync(tempJsonPath); } catch (e) {}
    }
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try { fs.unlinkSync(tempPdfPath); } catch (e) {}
    }
    res.status(500).json({ success: false, error: err.message || 'PDF generation failed' });
  }
});

// 6. Temporary PDF Download Stream (Destroyed immediately after download)
app.get('/api/download-temp-pdf/:token', (req, res) => {
  const { token } = req.params;

  if (!token || !temporaryPdfStore.has(token)) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>DocVerse AI - Link Expired</title><style>body{font-family:sans-serif;background:#0b0f19;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.box{text-align:center;padding:32px;background:#1e293b;border-radius:12px;border:1px solid #334155;}</style></head>
      <body><div class="box"><h2>Document Link Expired or Already Downloaded</h2><p>For your security, generated PDFs are stored in temporary server memory and destroyed immediately upon download.</p><p><a href="/" style="color:#818cf8;">Return to DocsVerse AI</a></p></div></body>
      </html>
    `);
  }

  const pdfItem = temporaryPdfStore.get(token);

  // Send binary PDF stream
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfItem.filename)}"`);
  res.setHeader('Content-Length', pdfItem.buffer.length);
  res.send(pdfItem.buffer);

  // STRICT REQUIREMENT: Instantly destroy from temporary server memory after download
  temporaryPdfStore.delete(token);
  console.log(`[Temporary PDF]: Token ${token} successfully downloaded and destroyed from server memory.`);
});

// Root route: fallback to frontend index.html (SPA routing, avoiding API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: `API route ${req.method} ${req.path} not found` });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Start Express Server
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
const HOST = '0.0.0.0'; // Bind to all interfaces for Render & local network access

function startServer(port) {
  const server = app.listen(port, HOST, () => {
    console.log('='.repeat(60));
    console.log(`  DocsVerse AI - Production-Ready Backend Server`);
    console.log('='.repeat(60));
    console.log(`[+] Web Interface & API: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${port}`);
    console.log(`[+] Environment:         ${isProduction ? 'Production (Render/Cloud)' : 'Development (Localhost)'}`);
    console.log(`[+] Direct AI Provider:  OpenRouter (Direct Connection)`);
    console.log(`[+] Python Executable:   ${PYTHON_EXECUTABLE}`);
    console.log(`[+] Uploads Directory:   ${UPLOADS_DIR}`);
    console.log(`[+] Frontend Served From:${FRONTEND_DIR}`);
    console.log('-'.repeat(60));
  });

  // Graceful shutdown handling for Render / cloud containers
  const handleShutdown = (signal) => {
    console.log(`\n[DocsVerse AI] ${signal} signal received: closing HTTP server gracefully...`);
    server.close(() => {
      console.log('[DocsVerse AI] HTTP server closed cleanly.');
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
  process.once('SIGINT', () => handleShutdown('SIGINT'));

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (isProduction) {
        console.error(`[!] Port ${port} is already in use on production environment. Exiting.`);
        process.exit(1);
      } else {
        console.warn(`[!] Port ${port} is currently in use. Automatically trying port ${port + 1}...`);
        startServer(port + 1);
      }
    } else {
      console.error('[!] Server listen error:', err);
    }
  });
}

startServer(PORT);
