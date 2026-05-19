/**
 * AI Parking Assistant — Gemini-powered lot recommendation.
 *
 * User describes their intent in natural language (e.g. "gần Highland Coffee Cầu Giấy")
 * and the AI analyzes available lots to suggest the best match.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchDevices } from "./parking.functions";
import { computeStats, getDeviceId } from "./parking.types";
import { lookupCoord, MOCK_LOTS } from "./lot-coordinates";

const AskInput = z.object({
  query: z.string().min(2).max(500),
});

interface LotContext {
  id: string;
  name: string;
  description: string;
  available: number;
  total: number;
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
}

interface AiRecommendation {
  lotId: string;
  lotName: string;
  reason: string;
  score: number; // 1-10
}

export interface AiParkingResponse {
  recommendations: AiRecommendation[];
  explanation: string;
  query: string;
}

function buildLotContext(): LotContext[] {
  // We'll call fetchDevices synchronously isn't possible, so we build from MOCK_LOTS
  // and any real data we can get. For server function, we'll fetch inside.
  return [];
}

async function callGemini(
  prompt: string,
  systemInstruction: string
): Promise<string> {
  // Try Groq first (faster, higher free quota), fallback to Gemini
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return callGroq(prompt, systemInstruction, groqKey);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chưa cấu hình GROQ_API_KEY hoặc GEMINI_API_KEY");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error("Gemini không trả về kết quả");
  }
  return content;
}

async function callGroq(
  prompt: string,
  systemInstruction: string,
  apiKey: string
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq không trả về kết quả");
  }
  return content;
}

export const askParkingAi = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string }) => AskInput.parse(input))
  .handler(async ({ data }): Promise<AiParkingResponse> => {
    // 1. Gather lot context
    const devicesResult = await fetchDevices();
    const devices = devicesResult.devices ?? [];

    const lots: LotContext[] = [
      ...devices.map((d) => {
        const stats = computeStats(d);
        const coord = lookupCoord(d.name);
        return {
          id: getDeviceId(d),
          name: d.name,
          description: d.description ?? "",
          available: stats.available,
          total: stats.total,
          isOnline: d.is_online,
          lat: coord?.lat ?? null,
          lng: coord?.lng ?? null,
        };
      }),
      ...MOCK_LOTS.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        available: m.available,
        total: m.total,
        isOnline: m.isOnline,
        lat: m.lat,
        lng: m.lng,
      })),
    ];

    // 2. Build prompt
    const lotsJson = lots.map((l) => ({
      id: l.id,
      name: l.name,
      address: l.description,
      available_slots: l.available,
      total_slots: l.total,
      is_online: l.isOnline,
      latitude: l.lat,
      longitude: l.lng,
    }));

    const systemInstruction = `Bạn là trợ lý AI của SmartPark — hệ thống tìm bãi đỗ xe thông minh tại Hà Nội.

Nhiệm vụ: Phân tích yêu cầu của người dùng và gợi ý bãi đỗ xe phù hợp nhất từ danh sách có sẵn.

Quy tắc:
- Ưu tiên bãi CÒN CHỖ TRỐNG (available_slots > 0)
- Ưu tiên bãi ĐANG ONLINE (is_online = true)
- Phân tích vị trí/địa điểm người dùng đề cập để tìm bãi GẦN NHẤT
- Nếu người dùng đề cập landmark (quán cafe, trường học, bệnh viện...), suy luận vị trí và match với bãi gần đó
- Giải thích ngắn gọn, thân thiện bằng tiếng Việt
- Trả về tối đa 3 gợi ý, sắp xếp theo độ phù hợp giảm dần

Trả về JSON theo format:
{
  "recommendations": [
    { "lotId": "string", "lotName": "string", "reason": "string (1-2 câu giải thích)", "score": number (1-10) }
  ],
  "explanation": "string (tóm tắt ngắn gọn phân tích của bạn, 1-2 câu)"
}`;

    const userPrompt = `Danh sách bãi đỗ xe hiện tại:
${JSON.stringify(lotsJson, null, 2)}

Yêu cầu của người dùng: "${data.query}"

Hãy phân tích và gợi ý bãi đỗ phù hợp nhất.`;

    // 3. Call Gemini
    const raw = await callGemini(userPrompt, systemInstruction);

    // 4. Parse response
    let parsed: { recommendations: AiRecommendation[]; explanation: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON from markdown code block
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1]);
      } else {
        throw new Error("Không thể phân tích phản hồi từ AI");
      }
    }

    // Validate recommendations reference real lots
    const validLotIds = new Set(lots.map((l) => l.id));
    parsed.recommendations = (parsed.recommendations ?? [])
      .filter((r) => validLotIds.has(r.lotId))
      .slice(0, 3);

    return {
      recommendations: parsed.recommendations,
      explanation: parsed.explanation ?? "",
      query: data.query,
    };
  });
