// ─────────────────────────────────────────────
//  TradeMind AI — LLM Client
//  Model-independent. Swap model in .env anytime.
// ─────────────────────────────────────────────
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const MODEL = process.env.LLM_MODEL || "gemini-2.0-flash";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Tool schema format ────────────────────────
function buildGeminiFunctions(tools) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

// ── Main client class ─────────────────────────
export class LLMClient {
  constructor(model = MODEL) {
    this.model = model;
    this.geminiModel = genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { temperature: 0.3 },
    });
    console.log(`[LLMClient] Model: ${this.model}`);
  }

  // Single reasoning call
  async think(systemPrompt, userMessage) {
    const prompt = `${systemPrompt}\n\nUser: ${userMessage}`;
    const result = await this.geminiModel.generateContent(prompt);
    return result.response.text();
  }

  // Chat with tool calling
  async chat(messages, tools = []) {
    const geminiTools =
      tools.length > 0
        ? [{ functionDeclarations: buildGeminiFunctions(tools) }]
        : [];

    const chat = this.geminiModel.startChat({
      tools: geminiTools,
      history: messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: m.content }],
      })),
    });

    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMsg.content);
    const response = result.response;

    // Tool call check
    const fnCall = response.functionCalls?.();
    if (fnCall && fnCall.length > 0) {
      return {
        isToolCall: true,
        toolName: fnCall[0].name,
        toolArgs: fnCall[0].args,
        content: "",
      };
    }

    return {
      isToolCall: false,
      content: response.text(),
      toolName: null,
      toolArgs: null,
    };
  }
}

// Singleton
let _client = null;
export function getLLM() {
  if (!_client) _client = new LLMClient();
  return _client;
}
