// ─────────────────────────────────────────────────────────────
//  TradeMind AI — LLM Client
//  NVIDIA NIM API (OpenAI-compatible)
//  Model: nvidia/llama-3.1-nemotron-70b-instruct (most powerful)
// ─────────────────────────────────────────────────────────────
import OpenAI from "openai";
import "dotenv/config";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODEL = process.env.NVIDIA_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";

// NVIDIA NIM client (OpenAI-compatible)
const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: NVIDIA_BASE_URL,
});

// ─────────────────────────────────────────────
//  Simple reasoning call (no tools)
// ─────────────────────────────────────────────
export async function think(systemPrompt, userMessage) {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });
  return response.choices[0].message.content;
}

// ─────────────────────────────────────────────
//  Full chat call with tool support
// ─────────────────────────────────────────────
export async function chat(messages, tools = []) {
  const params = {
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  };

  if (tools.length > 0) {
    params.tools = tools.map((t) => ({ type: "function", function: t }));
    params.tool_choice = "auto";
  }

  const response = await client.chat.completions.create(params);
  const msg = response.choices[0].message;

  // Tool call requested by model
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const call = msg.tool_calls[0];
    return {
      isToolCall: true,
      toolName: call.function.name,
      toolArgs: JSON.parse(call.function.arguments),
      content: "",
    };
  }

  return {
    isToolCall: false,
    content: msg.content || "",
    toolName: null,
    toolArgs: null,
  };
}

export const modelName = MODEL;
