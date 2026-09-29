# DocsVerse AI — Intelligent Document Intelligence, Coding & PDF Studio

[![Render Deployment](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Engine: Node 18+](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org)

**DocsVerse AI** is a production-grade full-stack AI platform featuring multi-format document analysis (PDF, Word, Excel, PowerPoint, Images), client-side & server-side publication-quality PDF generation via ReportLab, continuous hands-free voice typing, dynamic theme switching, code block formatting with smart contextual download naming, and seamless deployment on **Render** and **localhost**.

---

## 🏗️ Repository Structure

```
DocVerse_AI/
├── backend/                    # Express.js Production Backend (Port 5000)
│   ├── server.js               # Express server, SSE streaming, temporary memory PDF pipeline
│   ├── aiService.js            # Direct OpenRouter API integration with system prompt branding
│   ├── documentParser.js       # Multi-format document parser (PDF, Word, Excel, PPT, Images)
│   ├── pdf_generator.py        # Python ReportLab executive PDF generator engine
│   ├── requirements.txt        # Python dependencies (reportlab, pillow)
│   ├── package.json            # Backend scripts and Node dependencies
│   └── uploads/                # Ephemeral upload storage
├── frontend/                   # Modern Glassmorphic SPA Frontend
│   ├── index.html              # HTML5 responsive layout with theme switcher & hero banner
│   ├── style.css               # Multi-theme stylesheet (Dark, Light, Oceanic, Sunset, Cyberpunk)
│   ├── app.js                  # Chat state, continuous speech dictation, SSE stream reader
│   ├── html2pdf.bundle.min.js  # Client-side fallback PDF generator
│   └── assets/                 # Brand assets
│       ├── favicon.png         # Circular orbital planet logo mark (32x32, 16x16, avatar)
│       └── logo.png            # Full DocsVerse AI robot illustration banner
├── package.json                # Root package.json for Render one-click cloud deployment
├── render.yaml                 # Render Blueprint specification
├── run_local.bat               # Windows one-click local runner
├── run_local.ps1               # PowerShell local runner
└── README.md                   # Project documentation
```

---

## 🚀 Quick Start (Localhost)

### 1. Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: 3.10+ (for ReportLab PDF engine)

### 2. Configure Environment Variables
Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemini-2.0-flash-001
REPORTLAB_PDF_ENGINE=true
```

### 3. Install & Run
```bash
# Install backend dependencies
cd backend
npm install
pip install -r requirements.txt

# Start backend server
node server.js
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## ☁️ Deploying to Render (Production)

### Option A: Using `render.yaml` Blueprint (Recommended)
1. Push this repository to your GitHub account.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Connect your repository. Render automatically reads `render.yaml`, configures the Node web service, installs Python requirements, and sets up health checks at `/api/health`.
4. Add your `OPENROUTER_API_KEY` under Environment Variables.

### Option B: Manual Web Service
- **Build Command**: `cd backend && npm install && (pip install -r requirements.txt || pip3 install -r requirements.txt || true)`
- **Start Command**: `node backend/server.js`
- **Health Check Path**: `/api/health`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `OPENROUTER_API_KEY`: `<your-key>`

---

## ✨ Key Features

1. **Multi-Format Document Parsing** (`backend/documentParser.js`):
   - PDF files with text and page extraction.
   - Word documents (`.docx`, `.doc`) via Mammoth.
   - Excel spreadsheets (`.xlsx`, `.xls`, `.csv`) converted into analytical markdown tables.
   - PowerPoint slides (`.pptx`, `.ppt`) via OfficeParser.
   - Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`) with base64 vision encoding.

2. **Executive Python PDF Generation** (`backend/pdf_generator.py`):
   - Clean, professional styling with ReportLab flowables, running headers, two-pass numbered canvas footers, and table auto-wrapping.
   - Strictly temporary server-memory buffering with single-use auto-destruction tokens.

3. **Continuous Voice Typing**:
   - Web Speech API integration that remains listening through natural speech pauses without truncating sentences or duplicating words.

4. **Modern UI & Multi-Theme Switcher**:
   - Sleek themes: **Midnight Dark**, **Clean Light**, **Oceanic Teal**, **Sunset Glow**, and **Cyberpunk Neon**.
   - Integrated brand assets: high-res Favicon icon badge and Hero illustration.

5. **Code Block UI & Smart Contextual Downloads**:
   - Dark code blocks with language tags, copy-to-clipboard, and contextual file naming based on prompt content.

---

## 🔒 Security & Privacy
- Zero persistent server storage for generated PDFs — destroyed from memory immediately upon download.
- Ephemeral upload processing with sanitized filenames.
- Reverse proxy trust enabled for Render, Cloudflare, and custom load balancers.

---

**Proudly engineered under AMAR SMART INDIA.**
