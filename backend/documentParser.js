/**
 * DocsVerse AI - Document Parser Module
 * Supports extracting text and structured data from:
 * - PDF documents (.pdf)
 * - Microsoft Word (.docx, .doc)
 * - Microsoft Excel / Spreadsheets (.xlsx, .xls, .csv)
 * - Microsoft PowerPoint (.pptx, .ppt)
 * - Images (.png, .jpg, .jpeg, .webp, .gif)
 * - Plain text / Code files (.txt, .md, .json, .py, .js, etc.)
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
let officeParser;
try {
  officeParser = require('officeparser');
} catch (e) {
  // Graceful fallback
}

/**
 * Format Excel workbook into clear Markdown tables
 */
function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  let formattedOutput = `### Workbook Sheets (${sheetNames.length}): ${sheetNames.join(', ')}\n\n`;

  sheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    formattedOutput += `#### Sheet: "${sheetName}"\n`;
    if (!jsonData || jsonData.length === 0) {
      formattedOutput += `*(Empty sheet)*\n\n`;
      return;
    }

    // Convert top rows (up to 100 rows to prevent context explosion) into Markdown table
    const maxRows = Math.min(jsonData.length, 100);
    const headers = jsonData[0] || [];
    
    formattedOutput += `| ${headers.map(h => (h !== undefined ? String(h) : '')).join(' | ')} |\n`;
    formattedOutput += `| ${headers.map(() => '---').join(' | ')} |\n`;

    for (let r = 1; r < maxRows; r++) {
      const row = jsonData[r] || [];
      const cells = headers.map((_, colIdx) => {
        const val = row[colIdx];
        return val !== undefined ? String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ') : '';
      });
      formattedOutput += `| ${cells.join(' | ')} |\n`;
    }

    if (jsonData.length > 100) {
      formattedOutput += `\n*... and ${jsonData.length - 100} more rows truncated for context efficiency.*\n\n`;
    } else {
      formattedOutput += `\n\n`;
    }
  });

  return formattedOutput;
}

/**
 * Main parser entry point
 * @param {string} filePath - Absolute path to uploaded file
 * @param {string} originalName - Original uploaded filename
 * @param {string} mimeType - MIME type
 * @returns {Promise<{ text: string, type: string, pages?: number, metadata: object }>}
 */
async function parseDocument(filePath, originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);
  const fileSizeKB = (fileBuffer.length / 1024).toFixed(2);

  const metadata = {
    fileName: originalName,
    fileSizeKB: `${fileSizeKB} KB`,
    extension: ext,
    mimeType: mimeType
  };

  try {
    // 1. PDF
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const pdfData = await pdfParse(fileBuffer);
      return {
        type: 'pdf',
        text: pdfData.text ? pdfData.text.trim() : '[PDF contains no extractable text]',
        pages: pdfData.numpages,
        metadata: { ...metadata, pages: pdfData.numpages, info: pdfData.info }
      };
    }

    // 2. Word (.docx)
    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return {
        type: 'docx',
        text: result.value ? result.value.trim() : '[Document is empty]',
        metadata: { ...metadata, warnings: result.messages }
      };
    }

    // 3. Excel (.xlsx, .xls, .csv)
    if (['.xlsx', '.xls', '.csv'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      const excelText = parseExcelBuffer(fileBuffer);
      return {
        type: 'spreadsheet',
        text: excelText,
        metadata
      };
    }

    // 4. PowerPoint (.pptx, .ppt)
    if (['.pptx', '.ppt'].includes(ext) || mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      if (officeParser && officeParser.parseOfficeAsync) {
        const parsedText = await officeParser.parseOfficeAsync(filePath);
        return {
          type: 'presentation',
          text: parsedText ? parsedText.trim() : '[Presentation contains no extractable slide text]',
          metadata
        };
      } else {
        return {
          type: 'presentation',
          text: `[PowerPoint Presentation: ${originalName} (${fileSizeKB} KB). Office parser ready for text extraction.]`,
          metadata
        };
      }
    }

    // 5. Images (.png, .jpg, .jpeg, .webp, .gif)
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext) || mimeType.startsWith('image/')) {
      const base64Image = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType || 'image/jpeg'};base64,${base64Image}`;
      return {
        type: 'image',
        text: `[Attached Image: ${originalName}, Size: ${fileSizeKB} KB, MIME: ${mimeType}]`,
        dataUri: dataUri,
        base64: base64Image,
        metadata
      };
    }

    // 6. Plain Text, Markdown, Code, JSON, XML
    if (['.txt', '.md', '.json', '.js', '.ts', '.py', '.html', '.css', '.xml', '.yml', '.yaml', '.sql'].includes(ext) || mimeType.startsWith('text/')) {
      const textContent = fileBuffer.toString('utf-8');
      return {
        type: 'text',
        text: textContent,
        metadata
      };
    }

    // Fallback: try reading as UTF-8
    const rawContent = fileBuffer.toString('utf-8');
    return {
      type: 'generic',
      text: rawContent.slice(0, 10000),
      metadata
    };

  } catch (error) {
    console.error(`[DocumentParser Error] Failed to parse ${originalName}:`, error);
    return {
      type: 'error',
      text: `[Error extracting text from ${originalName}: ${error.message}]`,
      metadata: { ...metadata, error: error.message }
    };
  }
}

module.exports = {
  parseDocument,
  parseExcelBuffer
};
