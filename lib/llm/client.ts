/**
 * LLM client — wraps Vertex AI Gemini (primary), Claude, and OpenAI (fallbacks).
 * All text generation goes through this module.
 *
 * Provider priority: Gemini (GOOGLE_CLOUD_PROJECT) > Claude (ANTHROPIC_API_KEY) > OpenAI (OPENAI_API_KEY)
 *
 * Rule: LLM is NEVER the source of truth for coordinates, distances,
 *       speeds, or Geotab facts. It only narrates structured inputs.
 */

interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  /** When true, instructs the provider to return valid JSON directly (no markdown wrapping). */
  jsonMode?: boolean;
}

export async function generateText(
  systemPrompt: string,
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const { maxTokens = 1024, temperature = 0.7, jsonMode = false } = options;

  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return generateGemini(systemPrompt, messages, maxTokens, temperature, jsonMode);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return generateClaude(systemPrompt, messages, maxTokens, temperature);
  }
  if (process.env.OPENAI_API_KEY) {
    return generateOpenAI(systemPrompt, messages, maxTokens, temperature, jsonMode);
  }

  throw new Error(
    "No LLM provider configured. Set GOOGLE_CLOUD_PROJECT (Vertex AI), ANTHROPIC_API_KEY, or OPENAI_API_KEY."
  );
}

// ─── Vertex AI Gemini ──────────────────────────────────────────────────────────

async function generateGemini(
  systemPrompt: string,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  jsonMode: boolean
): Promise<string> {
  const { VertexAI } = await import("@google-cloud/vertexai");

  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  // Use flash for speed-sensitive tasks, pro for quality (story generation uses jsonMode=true)
  const model = jsonMode ? "gemini-1.5-pro" : "gemini-2.0-flash-001";

  const vertexAI = new VertexAI({ project, location });
  const generativeModel = vertexAI.getGenerativeModel({
    model,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
    systemInstruction: systemPrompt,
  });

  // Convert messages to Gemini content format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const result = await generativeModel.generateContent({ contents });
  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) {
    throw new Error("Vertex AI Gemini returned empty response");
  }

  return text;
}

// ─── Anthropic Claude ──────────────────────────────────────────────────────────

async function generateClaude(
  systemPrompt: string,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// ─── OpenAI ────────────────────────────────────────────────────────────────────

async function generateOpenAI(
  systemPrompt: string,
  messages: LLMMessage[],
  maxTokens: number,
  temperature: number,
  jsonMode: boolean
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
