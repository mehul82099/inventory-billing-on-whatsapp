import { Product } from '@/types';

export interface ParsedBillItem {
  rawText: string;
  matchedProduct?: Product;
  quantity: number;
  extractedPrice?: number;
  catalogPrice: number;
  lineTotal: number;
  stockAvailable: number;
  isAmbiguous: boolean;
  ambiguityCandidates?: Product[];
}

export interface ParsedAiBill {
  customerName?: string;
  customerPhone?: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  discountAmount: number;
  items: ParsedBillItem[];
  subtotal: number;
  grandTotal: number;
  notes?: string;
  confidenceScore: number;
  parsingMethod: 'gemini' | 'rule-based';
}

// Convert English number words to numbers
const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  single: 1,
  pair: 2,
  half: 1,
};

// Match product against catalog
function findMatchingProducts(query: string, catalog: Product[]): { best: Product | undefined; candidates: Product[] } {
  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 2);

  const scored = catalog
    .filter((p) => p.is_active)
    .map((prod) => {
      let score = 0;
      const targetStr = `${prod.name} ${prod.brand} ${prod.compatible_models || ''} ${prod.category_name || ''}`.toLowerCase();

      for (const token of queryTokens) {
        if (targetStr.includes(token)) {
          score += 3;
        }
      }

      // Keyword matching
      if (cleanQuery.includes('tempered') && targetStr.includes('tempered')) score += 5;
      if (cleanQuery.includes('glass') && targetStr.includes('glass')) score += 4;
      if ((cleanQuery.includes('cable') || cleanQuery.includes('type c') || cleanQuery.includes('type-c')) && targetStr.includes('cable')) score += 5;
      if ((cleanQuery.includes('cover') || cleanQuery.includes('case')) && targetStr.includes('cover')) score += 5;
      if ((cleanQuery.includes('charger') || cleanQuery.includes('adapter')) && targetStr.includes('charger')) score += 5;
      if ((cleanQuery.includes('earbud') || cleanQuery.includes('tws') || cleanQuery.includes('airdope')) && targetStr.includes('earbud')) score += 5;
      if (cleanQuery.includes('neckband') && targetStr.includes('neckband')) score += 5;

      // Phone model matches
      if (cleanQuery.includes('iphone 15') && targetStr.includes('iphone 15')) score += 8;
      if (cleanQuery.includes('iphone 14') && targetStr.includes('iphone 14')) score += 8;
      if (cleanQuery.includes('s24') && targetStr.includes('s24')) score += 8;
      if (cleanQuery.includes('redmi') && targetStr.includes('redmi')) score += 8;
      if (cleanQuery.includes('oneplus') && targetStr.includes('oneplus')) score += 8;

      return { product: prod, score };
    });

  scored.sort((a, b) => b.score - a.score);

  const topCandidates = scored.filter((s) => s.score >= 4);
  const best = topCandidates.length > 0 ? topCandidates[0].product : undefined;
  const candidates = topCandidates.slice(0, 3).map((c) => c.product);

  return { best, candidates };
}

export async function parseBillWithAi(prompt: string, catalog: Product[]): Promise<ParsedAiBill> {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      return await parseWithGemini(prompt, catalog, geminiApiKey);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to rule-based parser:', err);
    }
  }

  return parseWithRules(prompt, catalog);
}

// Fallback Rule-Based Parser
function parseWithRules(prompt: string, catalog: Product[]): ParsedAiBill {
  const lower = prompt.toLowerCase();

  // 1. Extract Customer Name
  let customerName = '';
  const customerNameMatch = prompt.match(/(?:for|to|customer|cust)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (customerNameMatch) {
    customerName = customerNameMatch[1].trim();
  }

  // 2. Extract Phone Number (10 digits)
  let customerPhone = '';
  const phoneMatch = prompt.match(/\b([6-9]\d{9})\b/);
  if (phoneMatch) {
    customerPhone = phoneMatch[1];
  }

  // 3. Extract Payment Method
  let paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' = 'CASH';
  if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm')) {
    paymentMethod = 'UPI';
  } else if (lower.includes('card') || lower.includes('debit') || lower.includes('credit card')) {
    paymentMethod = 'CARD';
  } else if (lower.includes('credit') || lower.includes('udhar') || lower.includes('pending') || lower.includes('khata')) {
    paymentMethod = 'CREDIT';
  }

  // 4. Extract Discount (supports "₹50 discount", "discount of ₹50", "50 off", etc.)
  let discountAmount = 0;
  const discountMatch =
    prompt.match(/(?:apply|give|with)?\s*(?:a\s*)?(?:₹|rs\.?|inr)?\s*(\d+)\s*(?:₹|rs\.?|inr)?\s*(?:discount|disc|off|less)/i) ||
    prompt.match(/(?:discount|disc|off|less)(?:\s*(?:of|is|:))?\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);

  if (discountMatch) {
    discountAmount = parseInt(discountMatch[1], 10);
  }

  // 5. Segment Line Items by commas, "and", "plus", or semicolons
  // Remove customer prefix, payment, and discount parts
  let cleanedForItems = prompt
    .replace(/(?:create a? bill|new bill|bill)\s*(?:for|to)?\s*[A-Za-z0-9\s]+:/i, '')
    .replace(/(?:apply|give|with)?\s*(?:a\s*)?(?:₹|rs\.?|inr)?\s*\d+\s*(?:discount|off|less)/i, '')
    .replace(/payment\s*(?:by|via|in|with)?\s*(?:upi|cash|card|credit)/i, '')
    .replace(/\b(?:upi|cash|card|credit)\s*payment\b/i, '')
    .trim();

  // Split into raw parts
  const rawParts = cleanedForItems
    .split(/[,;\n]|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const items: ParsedBillItem[] = [];

  for (const part of rawParts) {
    // Quantity extraction: e.g. "2 Type-C cables", "two covers", "1 tempered glass"
    let qty = 1;
    const qtyNumMatch = part.match(/^\s*(\d+)\s+/);
    if (qtyNumMatch) {
      qty = parseInt(qtyNumMatch[1], 10);
    } else {
      const firstWord = part.split(/\s+/)[0]?.toLowerCase();
      if (firstWord && NUMBER_WORDS[firstWord]) {
        qty = NUMBER_WORDS[firstWord];
      }
    }

    // Explicit price override: e.g. "at ₹120 each", "@ 150", "for 200"
    let extractedPrice: number | undefined;
    const priceMatch = part.match(/(?:at|@|for|rs\.?|₹)\s*(\d+)(?:\s*each|\s*per\s*piece|\s*piece)?/i);
    if (priceMatch) {
      extractedPrice = parseInt(priceMatch[1], 10);
    }

    // Clean product search phrase
    const searchPhrase = part
      .replace(/^\s*\d+\s+/, '')
      .replace(/^(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+/i, '')
      .replace(/(?:at|@|for|rs\.?|₹)\s*\d+.*$/i, '')
      .trim();

    if (!searchPhrase) continue;

    const { best, candidates } = findMatchingProducts(searchPhrase, catalog);

    const catalogPrice = best ? best.selling_price : extractedPrice || 0;
    const finalPrice = extractedPrice !== undefined ? extractedPrice : catalogPrice;
    const stockAvailable = best ? best.current_quantity : 0;
    const isAmbiguous = candidates.length > 1;

    items.push({
      rawText: part,
      matchedProduct: best,
      quantity: qty,
      extractedPrice,
      catalogPrice,
      lineTotal: qty * finalPrice,
      stockAvailable,
      isAmbiguous,
      ambiguityCandidates: candidates,
    });
  }

  // Calculate deterministic totals
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const grandTotal = Math.max(0, subtotal - discountAmount);

  return {
    customerName: customerName || undefined,
    customerPhone: customerPhone || undefined,
    paymentMethod,
    discountAmount,
    items,
    subtotal,
    grandTotal,
    confidenceScore: items.length > 0 ? 0.9 : 0.4,
    parsingMethod: 'rule-based',
  };
}

// Gemini LLM Provider (Optional)
async function parseWithGemini(prompt: string, catalog: Product[], apiKey: string): Promise<ParsedAiBill> {
  const catalogSummary = catalog.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    model: p.compatible_models,
    price: p.selling_price,
    stock: p.current_quantity,
  }));

  const systemInstruction = `You are an AI assistant for a mobile accessories retail store billing system in India.
Your task is to parse a natural-language billing prompt into structured JSON.
Catalog:
${JSON.stringify(catalogSummary)}

Extract:
- customerName (string or null)
- customerPhone (10-digit Indian phone or null)
- paymentMethod ('CASH', 'UPI', 'CARD', 'CREDIT')
- discountAmount (number, default 0)
- items: list of {
    rawText: string,
    productId: string (from catalog, or null if unknown),
    quantity: number,
    extractedPrice: number or null,
    isAmbiguous: boolean
  }

Return ONLY valid JSON matching this structure without markdown formatting or code blocks.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nPrompt: "${prompt}"` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(text);

  const items: ParsedBillItem[] = (parsed.items || []).map((it: any) => {
    const prod = catalog.find((p) => p.id === it.productId);
    const catalogPrice = prod ? prod.selling_price : it.extractedPrice || 0;
    const finalPrice = it.extractedPrice !== undefined && it.extractedPrice !== null ? it.extractedPrice : catalogPrice;
    return {
      rawText: it.rawText || '',
      matchedProduct: prod,
      quantity: it.quantity || 1,
      extractedPrice: it.extractedPrice,
      catalogPrice,
      lineTotal: (it.quantity || 1) * finalPrice,
      stockAvailable: prod ? prod.current_quantity : 0,
      isAmbiguous: Boolean(it.isAmbiguous),
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = Number(parsed.discountAmount) || 0;

  return {
    customerName: parsed.customerName || undefined,
    customerPhone: parsed.customerPhone || undefined,
    paymentMethod: parsed.paymentMethod || 'CASH',
    discountAmount,
    items,
    subtotal,
    grandTotal: Math.max(0, subtotal - discountAmount),
    confidenceScore: 0.98,
    parsingMethod: 'gemini',
  };
}
