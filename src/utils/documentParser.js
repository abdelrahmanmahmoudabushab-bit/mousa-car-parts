/**
 * Client-side document parsing utility for Excel (.xlsx, .xls, .csv) and PDF files.
 * Enhanced for high accuracy on Chinese automotive supplier invoices and packing slips.
 */

// Helper to normalize column header names
function normalizeHeader(header) {
  if (!header) return '';
  const s = String(header).trim().toLowerCase();
  if (/oem|sku|part\s*no|code|编号|零件号|件号|图号|料号/.test(s)) return 'oem';
  if (/name|title|desc|item|名称|品名|零件名称|规格/.test(s)) return 'name';
  if (/cn|chinese|中文/.test(s)) return 'cnName';
  if (/ar|arabic|عربي|اسم/.test(s)) return 'arName';
  if (/cost|buy|import|进价|成本|单价|采购价/.test(s)) return 'costPrice';
  if (/unit|sell|price|售价|单价|价格|金额/.test(s)) return 'unitPrice';
  if (/qty|quantity|count|amount|数量|件数|台数|个数/.test(s)) return 'quantity';
  if (/category|cat|分类|类别/.test(s)) return 'category';
  if (/model|vehicle|车型|适用车型/.test(s)) return 'vehicleModel';
  if (/location|bin|shelf|位置|货位|库位/.test(s)) return 'location';
  return s;
}

// Arabic Text Normalizer for ultra-accurate Arabic search
export function normalizeArabic(text) {
  if (!text) return '';
  return String(text)
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, '') // Remove tashkeel diacritics
    .trim()
    .toLowerCase();
}

// Search Term Normalizer (strips hyphens, spaces, slashes)
export function normalizeSearchCode(code) {
  if (!code) return '';
  return String(code).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').toLowerCase();
}

/**
 * Smart Serial & OEM Part Number Extractor
 * Automatically extracts clean OEM codes, serial numbers, or VIN patterns from raw camera QR/barcode text
 */
export function parseSmartSerialNumber(rawText) {
  if (!rawText) return '';
  let text = String(rawText).trim();

  // 1. Strip GS1 Data Matrix / Barcode envelope wrappers & control chars
  // e.g. [)>]06 or [)>]12 or similar prefix tags
  text = text.replace(/^\[\)>\]\d*\s*/, '');
  text = text.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' '); // Replace control characters with spaces
  text = text.trim();

  // 2. Extract first token that looks like a serial/OEM
  const tokens = text.split(/\s+/).filter(t => t.length >= 4);
  if (tokens.length > 0) {
    const candidate = tokens.find(t => /[A-Za-z]/.test(t) && /\d/.test(t)) || tokens[0];
    text = candidate;
  }

  // 3. Strip common barcode prefixes (1P, P, S, 3S, etc. followed by OEM/Serial)
  if (/^1P[A-Z]{2,8}[-\/]/i.test(text)) {
    text = text.substring(2);
  } else if (/^P[A-Z]{2,8}[-\/]/i.test(text)) {
    text = text.substring(1);
  } else if (/^1P[A-Z0-9]{8,22}$/i.test(text)) {
    text = text.substring(2);
  } else if (/^S[A-Z]{2,8}[-\/]/i.test(text)) {
    text = text.substring(1);
  } else if (/^S[A-Z0-9]{8,22}$/i.test(text)) {
    text = text.substring(1);
  }

  // Clean parentheses wrappers e.g. (P)EQEA-5402841 -> EQEA-5402841
  text = text.replace(/^\((?:P|1P|S|Q)\)/i, '');

  // Strip non-alphanumeric noise from both ends (like brackets, trailing hyphens)
  text = text.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

  return text.toUpperCase();
}

/**
 * High-Accuracy Smart Multi-Token Search Helper
 */
export function matchProductSearch(product, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) return true;

  const rawQ = searchQuery.trim().toLowerCase();
  const cleanCodeQ = normalizeSearchCode(searchQuery);
  const arQ = normalizeArabic(searchQuery);

  const oemClean = normalizeSearchCode(product.oem);
  const skuClean = normalizeSearchCode(product.sku);
  const vinClean = normalizeSearchCode(product.vinPattern);
  const modelClean = normalizeSearchCode(product.vehicleModel);

  // Fast direct OEM / Code match (ignoring hyphens, spaces, slashes)
  if (cleanCodeQ && cleanCodeQ.length >= 2) {
    if (oemClean.includes(cleanCodeQ) || skuClean.includes(cleanCodeQ) || vinClean.includes(cleanCodeQ)) {
      return true;
    }
  }

  // Build a searchable composite string containing all fields of the product
  const compositeText = [
    product.oem || '',
    product.sku || '',
    product.name || '',
    product.arName || '',
    product.cnName || '',
    product.vehicleModel || '',
    (product.compatibleModels || []).join(' '),
    product.location || '',
    product.brand || '',
    product.yearRange || '',
    product.vinPattern || ''
  ].join(' ');

  const normalizedComposite = normalizeArabic(compositeText) + ' ' + compositeText.toLowerCase();

  // Split query into individual words (multi-token search)
  const tokens = rawQ.split(/\s+/).filter(Boolean);

  // EVERY word in the user's query must match at least something in the product
  return tokens.every(token => {
    const cleanTok = normalizeSearchCode(token);
    const arTok = normalizeArabic(token);

    if (cleanTok && cleanTok.length >= 2 && (oemClean.includes(cleanTok) || skuClean.includes(cleanTok) || modelClean.includes(cleanTok))) {
      return true;
    }

    if (arTok && normalizedComposite.includes(arTok)) {
      return true;
    }

    return normalizedComposite.includes(token);
  });
}

/**
 * Parse Excel file (xlsx, xls, csv) into array of structured product draft items.
 */
export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        if (!window.XLSX) {
          throw new Error('Excel parser library (XLSX) is not loaded.');
        }

        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawRows || rawRows.length === 0) {
          return resolve([]);
        }

        // Find header row index (first row with multiple non-empty columns)
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          if (rawRows[i] && rawRows[i].filter(cell => cell !== undefined && cell !== '').length >= 2) {
            headerRowIdx = i;
            break;
          }
        }

        const rawHeaders = rawRows[headerRowIdx] || [];
        const normalizedHeaders = rawHeaders.map(h => normalizeHeader(h));

        const extractedItems = [];

        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
          if (!hasData) continue;

          let item = {
            rawRowIndex: i + 1,
            oem: '',
            name: '',
            cnName: '',
            arName: '',
            costPrice: 0,
            unitPrice: 0,
            quantity: 1,
            vehicleModel: 'BYD Seagull',
            category: 'cat-body',
            location: 'Main Warehouse',
            confidence: 100 // Default high confidence
          };

          row.forEach((cellVal, colIdx) => {
            if (cellVal === undefined || cellVal === null) return;
            const strVal = String(cellVal).trim();
            const fieldKey = normalizedHeaders[colIdx];

            if (fieldKey === 'oem') {
              item.oem = strVal;
            } else if (fieldKey === 'name' || fieldKey === 'cnName') {
              if (!item.name) item.name = strVal;
              if (/[\u4e00-\u9fa5]/.test(strVal)) {
                item.cnName = strVal;
              }
            } else if (fieldKey === 'arName') {
              item.arName = strVal;
            } else if (fieldKey === 'costPrice') {
              const num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
              if (!isNaN(num)) item.costPrice = num;
            } else if (fieldKey === 'unitPrice') {
              const num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
              if (!isNaN(num)) item.unitPrice = num;
            } else if (fieldKey === 'quantity') {
              const num = parseInt(strVal.replace(/[^0-9]/g, ''), 10);
              if (!isNaN(num)) item.quantity = num;
            } else if (fieldKey === 'vehicleModel') {
              item.vehicleModel = strVal;
            } else if (fieldKey === 'location') {
              item.location = strVal;
            }
          });

          // Unmapped positional heuristic fallback if headers weren't found cleanly
          if (!item.oem && row[0]) {
            item.oem = String(row[0]).trim();
          }
          if (!item.name && row[1]) {
            item.name = String(row[1]).trim();
            if (/[\u4e00-\u9fa5]/.test(item.name)) item.cnName = item.name;
          }
          if (item.costPrice === 0 && row[2]) {
            const parsed = parseFloat(String(row[2]).replace(/[^0-9.]/g, ''));
            if (!isNaN(parsed)) item.costPrice = parsed;
          }
          if (item.unitPrice === 0 && item.costPrice > 0) {
            item.unitPrice = Math.round(item.costPrice * 1.5);
          }
          if (item.quantity === 1 && row[3]) {
            const parsedQty = parseInt(String(row[3]).replace(/[^0-9]/g, ''), 10);
            if (!isNaN(parsedQty)) item.quantity = parsedQty;
          }

          // Calculate Confidence Score
          let score = 50;
          if (item.oem && item.oem.length >= 4) score += 20;
          if (item.cnName || item.name) score += 15;
          if (item.costPrice > 0) score += 15;
          item.confidence = Math.min(100, score);

          if (item.oem || item.name || item.cnName) {
            extractedItems.push(item);
          }
        }

        resolve(extractedItems);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * High-Accuracy PDF Parser for Chinese Automotive Invoices
 */
export async function parsePdfFile(file) {
  try {
    if (!window.pdfjsLib) {
      throw new Error('PDF parsing library (PDF.js) is not loaded.');
    }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullLines = [];

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        // Sort items by Y descending (top to bottom), then X ascending (left to right)
        const items = textContent.items.map(item => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5]
        }));

        // Group into lines by Y coordinate closeness
        const linesMap = new Map();
        items.forEach(item => {
          if (!item.text || item.text.trim() === '') return;
          const roundedY = Math.round(item.y / 4) * 4;
          if (!linesMap.has(roundedY)) {
            linesMap.set(roundedY, []);
          }
          linesMap.get(roundedY).push(item);
        });

        // Sort Y descending (top of page first)
        const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

        sortedY.forEach(yKey => {
          const lineItems = linesMap.get(yKey);
          lineItems.sort((a, b) => a.x - b.x);
          const lineText = lineItems.map(i => i.text).join(' ').replace(/\s+/g, ' ').trim();
          if (lineText) fullLines.push(lineText);
        });
      }

      const extractedItems = [];

      fullLines.forEach((line, idx) => {
        // Skip header/footer noise lines
        if (/invoice|packing list|total amount|subtotal|page \d+|date:|address|supplier|phone/i.test(line)) {
          return;
        }

        // Multi-pattern Regex OEM match
        const oemMatch = 
          line.match(/([A-Z0-9]{2,8}[-\/][A-Z0-9]{4,12}(?:\/\d+)?)/i) || 
          line.match(/([A-Z]{2,5}\d{5,9})/i) ||
          line.match(/([A-Z0-9]{3,5}-\d{5,8})/i);

        const chineseMatch = line.match(/([\u4e00-\u9fa5]{2,35})/);
        const numbers = line.match(/(\d+(?:\.\d+)?)/g);

        if (oemMatch || chineseMatch) {
          let oem = oemMatch ? oemMatch[1] : `OEM-${idx + 100}`;
          let cnName = chineseMatch ? chineseMatch[1] : '';
          let name = cnName || line;

          let costPrice = 0;
          let unitPrice = 0;
          let quantity = 1;

          if (numbers && numbers.length >= 1) {
            const parsedNums = numbers.map(n => parseFloat(n)).filter(n => !isNaN(n));
            const qtyCandidate = parsedNums.find(n => Number.isInteger(n) && n > 0 && n < 1000);
            if (qtyCandidate !== undefined) quantity = qtyCandidate;

            const priceCandidates = parsedNums.filter(n => n !== qtyCandidate && n > 0);
            if (priceCandidates.length >= 1) {
              costPrice = priceCandidates[0];
              unitPrice = priceCandidates[1] || Math.round(costPrice * 1.5);
            }
          }

          let score = 60;
          if (oemMatch) score += 25;
          if (chineseMatch) score += 15;

          extractedItems.push({
            rawRowIndex: idx + 1,
            oem: oem.trim(),
            name: name.trim(),
            cnName: cnName.trim(),
            arName: '',
            costPrice: costPrice || 25,
            unitPrice: unitPrice || 45,
            quantity: quantity || 10,
            vehicleModel: 'BYD Seagull',
            category: 'cat-body',
            location: 'Aisle 1',
            confidence: Math.min(100, score)
          });
        }
      });

    return extractedItems;
  } catch (err) {
    throw err;
  }
}
