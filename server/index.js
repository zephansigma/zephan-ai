import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';

const app = express();
const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.OPENAI_MODEL || 'gpt-6-astra';

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Copy .env.example to .env and add your key.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const allowedOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',').map(x => x.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Native app requests may not send an Origin header.
    if (!origin || origin.startsWith('capacitor://') || origin.startsWith('ionic://localhost') || origin.startsWith('https://localhost') || origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 25, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'Zephan AI', model: MODEL });
});

function collectCitations(response) {
  const found = new Map();
  for (const item of (response.output || [])) {
    if (item.type !== 'message') continue;
    for (const part of (item.content || [])) {
      for (const ann of (part.annotations || [])) {
        if (ann.type === 'url_citation' && ann.url) {
          const c = ann;
          found.set(c.url, { title: c.title || c.url, url: c.url });
        }
      }
    }
  }
  return [...found.values()];
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, useWebSearch = true } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Pesan belum diisi.' });
    }

    // Accept only the last 20 turns and plain text to limit payload size.
    const safeMessages = messages.slice(-20).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 12000)
    })).filter(m => m.content.trim());

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Pesan terakhir harus dari pengguna.' });
    }

    const request = {
      model: MODEL,
      instructions: [
        'Kamu adalah Zephan AI, asisten AI yang ramah, jelas, jujur, dan membantu.',
        'Jawab dalam bahasa yang digunakan pengguna kecuali diminta lain.',
        'Untuk pertanyaan faktual, utamakan sumber primer dan terpercaya: situs pemerintah, universitas, jurnal ilmiah, dokumentasi resmi, dan organisasi bereputasi.',
        'Jangan mengarang fakta, kutipan, tautan, atau sumber. Jika bukti tidak cukup, katakan dengan jelas.',
        'Jika web search digunakan, rangkum temuan dengan bahasa sendiri dan pertahankan sitasi sumber yang diberikan sistem.',
        'Bedakan fakta, perkiraan, dan opini. Untuk informasi yang cepat berubah, jelaskan tanggal/konteksnya.'
      ].join(' '),
      input: safeMessages
    };

    if (useWebSearch) {
      request.tools = [{
        type: 'web_search',
        search_context_size: 'medium',
        user_location: { type: 'approximate', country: 'ID', timezone: 'Asia/Jakarta' }
      }];
      request.tool_choice = 'auto';
    }

    const response = await openai.responses.create(request);
    res.json({
      answer: response.output_text || 'Maaf, Zephan AI belum mendapatkan jawaban.',
      sources: collectCitations(response),
      model: MODEL
    });
  } catch (error) {
    console.error('Chat error:', error?.message || error);
    const status = error?.status === 429 ? 429 : 500;
    res.status(status).json({
      error: status === 429
        ? 'Batas penggunaan API sedang tercapai. Coba lagi nanti.'
        : 'Terjadi kesalahan saat menghubungi AI. Periksa konfigurasi server dan API key.'
    });
  }
});

app.listen(PORT, () => console.log(`Zephan AI server running on http://localhost:${PORT}`));
