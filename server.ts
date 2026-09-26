import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { 
  getTursoConfig, 
  initTursoClient, 
  testTursoConnection, 
  initTursoSchema, 
  getTursoStats, 
  syncPushToTurso, 
  syncPullFromTurso, 
  getTursoUsers,
  loginTursoUser,
  seedTursoSystemUsers,
  getTursoBranches,
  saveTursoUser,
  deleteTursoUser,
  saveTursoBranch,
  deleteTursoBranch,
  saveTursoExchangeRates,
  deleteTursoExchangeRate,
  clearTursoTable,
  searchTursoCustomers,
  getTursoMtoLimits,
  saveTursoMtoLimit,
  deleteTursoMtoLimit,
  TURSO_SCHEMA_SQL 
} from './server/turso.js';

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

const app = express();
const PORT = 3000;

// Body parser with 25MB limit for high-resolution NRC images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Turso Database endpoints
app.get('/api/turso/status', async (req, res) => {
  try {
    const stats = await getTursoStats();
    res.json({ success: true, ...stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to get Turso status' });
  }
});

app.post('/api/turso/test', async (req, res) => {
  try {
    const { url, token } = req.body || {};
    const result = await testTursoConnection(url, token);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Turso test failed' });
  }
});

app.post('/api/turso/init', async (req, res) => {
  try {
    const result = await initTursoSchema();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to initialize schema' });
  }
});

app.post(['/api/turso/sync-push', '/api/turso/sync-beacon'], async (req, res) => {
  try {
    let payload = req.body || {};
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (err) {
        console.warn('Failed to parse text body in sync-push/beacon:', err);
      }
    }
    const result = await syncPushToTurso(payload);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Turso sync push/beacon failed' });
  }
});

app.post('/api/turso/sync-pull', async (req, res) => {
  try {
    const result = await syncPullFromTurso();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Turso sync pull failed' });
  }
});

app.get('/api/turso/schema', (req, res) => {
  res.json({ success: true, schemaSql: TURSO_SCHEMA_SQL });
});

// Search customers in customer_profiles table
app.get('/api/turso/customers/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const customers = await searchTursoCustomers(q);
    res.json({ success: true, customers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to search customers' });
  }
});

// Turso Authentication & User endpoints
app.post('/api/turso/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body || {};
    const result = await loginTursoUser(usernameOrEmail, password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Turso login failed' });
  }
});

app.get('/api/turso/users', async (req, res) => {
  try {
    const result = await getTursoUsers();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch Turso users' });
  }
});

app.post('/api/turso/users', async (req, res) => {
  try {
    const result = await saveTursoUser(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to save Turso user' });
  }
});

app.delete('/api/turso/users', async (req, res) => {
  try {
    const id = String(req.query.id || req.body?.id || '');
    const result = await deleteTursoUser(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete Turso user' });
  }
});

app.get('/api/turso/branches', async (req, res) => {
  try {
    const result = await getTursoBranches();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch Turso branches' });
  }
});

app.post('/api/turso/branches', async (req, res) => {
  try {
    const result = await saveTursoBranch(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to save Turso branch' });
  }
});

app.delete('/api/turso/branches', async (req, res) => {
  try {
    const id = String(req.query.id || req.body?.id || '');
    const result = await deleteTursoBranch(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete Turso branch' });
  }
});

// Exchange Rates dedicated endpoints
app.post('/api/turso/exchange-rates', async (req, res) => {
  try {
    const payload = req.body;
    const rates = Array.isArray(payload) ? payload : (payload.rates || [payload]);
    const result = await saveTursoExchangeRates(rates);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to save exchange rates' });
  }
});

app.delete('/api/turso/exchange-rates', async (req, res) => {
  try {
    const id = String(req.query.id || req.body?.id || '');
    const result = await deleteTursoExchangeRate(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete exchange rate' });
  }
});

// MTO & Myanmar Domestic Inward Remittance Limits endpoints
app.get('/api/turso/mto-limits', async (req, res) => {
  try {
    const limits = await getTursoMtoLimits();
    res.json({ success: true, limits });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to get MTO limits' });
  }
});

app.post('/api/turso/mto-limits', async (req, res) => {
  try {
    const limit = req.body;
    const result = await saveTursoMtoLimit(limit);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to save MTO limit' });
  }
});

app.delete('/api/turso/mto-limits', async (req, res) => {
  try {
    const id = String(req.query.id || req.body?.id || '');
    const result = await deleteTursoMtoLimit(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete MTO limit' });
  }
});

app.post('/api/turso/clear-table', async (req, res) => {
  try {
    const { table } = req.body || {};
    const allowed = ['remittance_transactions', 'audit_logs', 'customer_profiles'];
    if (!allowed.includes(table)) {
      return res.status(400).json({ success: false, error: 'Table not allowed to clear' });
    }
    const result = await clearTursoTable(table);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to clear table' });
  }
});

app.post('/api/turso/seed-users', async (req, res) => {
  try {
    const result = await seedTursoSystemUsers();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to seed Turso users' });
  }
});

// NRC AI OCR Extraction endpoint (Universal Dynamic OCR)
app.post('/api/ocr-nrc', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png', fileName = '' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const cleanBase64 = imageBase64.includes('base64,') 
      ? imageBase64.split('base64,')[1] 
      : imageBase64;

    let detectedMime = mimeType;
    if (imageBase64.startsWith('data:image/png')) detectedMime = 'image/png';
    else if (imageBase64.startsWith('data:image/jpeg') || imageBase64.startsWith('data:image/jpg')) detectedMime = 'image/jpeg';
    else if (imageBase64.startsWith('data:image/webp')) detectedMime = 'image/webp';

    // Universal Prompt for Any Myanmar NRC Card without hardcoded values
    const prompt = `You are an expert Document Intelligence AI specializing in Myanmar National Registration Cards (NRC / နိုင်ငံသားစိစစ်ရေးကတ်ပြား).
Analyze the provided NRC image with extreme precision. The image can be the FRONT side, the BACK side, or BOTH sides.

CRITICAL READING RULES:
1. OVERLAPPING STAMPS & SEALS (တံဆိပ်တုံးများနှင့် မှင်ပြန့်မှုများ):
   - Official round or date ink stamps (purple, blue, red) are frequently stamped OVER "အမည်" (Name), "အဘအမည်" (Father Name), and "အမှတ်" (NRC Number).
   - NEVER skip a field because a stamp is overlapping it. Look beneath the stamp layer to reconstruct the handwritten Burmese characters.
   - Never return empty strings for "nameMm" or "nameEn" if handwriting exists. Provide the best accurate transcription.

2. NRC NUMBER SYNTAX RULES:
   - Standard syntax: [State]/[TownshipCode]([Type])[6-digit-number]
   - State code: Must be 1 to 14 (e.g., ၁၂ -> 12, ၁ -> 1, ၇ -> 7, ၁၃ -> 13).
   - Township code: Convert Myanmar letters to standard English abbreviation (e.g., သဃက -> THAGAKA, သလန -> THALANA, ဗဟန -> BAHANA, ရကန -> YAKANA, တခလ -> TAKHALA, ပမန -> PAMANA, မရက -> MAYAKA).
   - Type: Usually (နိုင်) -> (N), (ဧည့်) -> (A), (ပြု) -> (P).
   - Number: Always 6 digits. Convert Burmese numerals to English digits (၀-၉ -> 0-9).
   - Output both "nrcNumber" (English) and "nrcNumberMm" (Burmese).

3. NAME & FATHER NAME TRANSLITERATION:
   - "nameMm" & "fatherNameMm": Accurate Burmese text. Pay close attention to vowels, tone marks (နသတ်, ငသတ်, အောက်မြစ်, ဝစ္စပေါက်) and medials (ယပင့်, ရရစ်, ဝဆွဲ, ဟထိုး).
   - "nameEn" & "fatherNameEn": Standard Romanized uppercase English name (e.g., မကြည်ပြာဆွေ -> MA KYI PYAR SWE, မသင်းသဇင်လွင် -> MA THIN THAZIN LWIN, ဦးသိန်းလွင်ဦး -> U THEIN LWIN OO, ဦးချစ်ဆွေ -> U CHIT SWE).

4. BACK SIDE INFORMATION (အနောက်ခြမ်း):
   - "address": Complete residential address under "နေရပ်လိပ်စာ". Combine all handwritten lines (House/Street, Ward/Village, Township/City) into one clean string.
   - "occupation": Job under "အလုပ်အကိုင်" (e.g., ကုမ္ပဏီဝန်ထမ်း, ကျောင်းသူ, မှီခို, လုပ်ငန်းရှင်, နေ့စား).
   - "bloodGroup": Blood group under "သွေးအုပ်စု" (e.g., A, B, AB, O, B(+)).

5. DATE OF BIRTH:
   - "dob": Extract in DD/MM/YYYY format. Convert Myanmar numerals to English digits (e.g., ၁၄.၇.၁၉၈၈ -> 14/07/1988).

Return strictly valid JSON only. Do not include markdown wraps like \`\`\`json.
JSON Schema:
{
  "cardSide": "FRONT" | "BACK" | "BOTH",
  "nrcNumber": string,
  "nrcNumberMm": string,
  "nameEn": string,
  "nameMm": string,
  "fatherName": string,
  "fatherNameMm": string,
  "dob": string,
  "address": string,
  "occupation": string,
  "bloodGroup": string,
  "confidence": number
}`;

    const ai = getAiClient();
    // Use official active models with robust fallbacks
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];

    let responseText = '';
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: detectedMime,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`Model ${model} OCR failed, trying fallback:`, err?.message || err);
      }
    }

    if (!responseText) {
      throw lastErr || new Error('No text generated from Gemini OCR models');
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) parsedData = JSON.parse(match[0]);
    }

    return res.json({
      success: true,
      data: parsedData,
      confidence: parsedData.confidence || 95,
      fileName,
    });
  } catch (error: any) {
    console.error('Error processing NRC OCR via Gemini:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process NRC OCR',
      errorMessageMm: 'မှတ်ပုံတင် OCR ဖတ်ရှုခြင်း မအောင်မြင်ပါ။ VPN ချိတ်ဆက်ထားခြင်း ရှိမရှိနှင့် API Key စစ်ဆေးပေးပါရန်။',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-stack Remittance & NRC OCR server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;