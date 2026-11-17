import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function collectCitations(response) {
  const found = new Map();
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      for (const annotation of part.annotations || []) {
        if (annotation.type === "url_citation" && annotation.url) {
          found.set(annotation.url, {
            title: annotation.title || annotation.url,
            url: annotation.url,
          });
        }
      }
    }
  }
  return [...found.values()];
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod === "GET") {
    return json(200, { ok: true, app: "Zephan AI", model: MODEL });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Metode permintaan tidak didukung." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, {
      error: "API key belum dipasang. Atur OPENAI_API_KEY di Environment Variables Netlify.",
    });
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { messages, useWebSearch = true } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return json(400, { error: "Pesan belum diisi." });
    }

    const safeMessages = messages.slice(-20).map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: String(message.content || "").slice(0, 12000),
    })).filter((message) => message.content.trim());

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return json(400, { error: "Pesan terakhir harus dari pengguna." });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const request = {
      model: MODEL,
      instructions: [
        "Kamu adalah Zephan AI, asisten AI yang ramah, jelas, jujur, dan membantu.",
        "Jawab dalam bahasa yang digunakan pengguna kecuali diminta lain.",
        "Untuk pertanyaan faktual, utamakan sumber primer dan terpercaya: situs pemerintah, universitas, jurnal ilmiah, dokumentasi resmi, dan organisasi bereputasi.",
        "Jangan mengarang fakta, kutipan, tautan, atau sumber. Jika bukti tidak cukup, katakan dengan jelas.",
        "Jika web search digunakan, rangkum temuan dengan bahasa sendiri dan pertahankan sitasi sumber yang diberikan sistem.",
        "Bedakan fakta, perkiraan, dan opini. Untuk informasi yang cepat berubah, jelaskan tanggal/konteksnya.",
      ].join(" "),
      input: safeMessages,
    };

    if (useWebSearch) {
      request.tools = [{
        type: "web_search",
        search_context_size: "medium",
        user_location: {
          type: "approximate",
          country: "ID",
          timezone: "Asia/Jakarta",
        },
      }];
      request.tool_choice = "auto";
    }

    const response = await client.responses.create(request);
    return json(200, {
      answer: response.output_text || "Maaf, Zephan AI belum mendapatkan jawaban.",
      sources: collectCitations(response),
      model: MODEL,
    });
  } catch (error) {
    console.error("Zephan AI function error:", error?.message || error);
    const status = error?.status === 429 ? 429 : 500;
    return json(status, {
      error: status === 429
        ? "Batas penggunaan API sedang tercapai. Coba lagi nanti."
        : "Terjadi kesalahan saat menghubungi AI. Periksa API key dan pengaturan model di Netlify.",
    });
  }
}
