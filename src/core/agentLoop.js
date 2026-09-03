// ─────────────────────────────────────────────────────────────
//  TradeMind AI — Agent Loop
//  ONLY JOB: Run ReAct + Reflexion reasoning loop
//  (No LLM setup, no tools — all imported clean)
// ─────────────────────────────────────────────────────────────
import { chat, think, modelName } from "./llmClient.js";
import { getAllToolSchemas, executeTool } from "../tools/registry.js";

const MAX_STEPS = parseInt(process.env.MAX_REACT_STEPS) || 15;
const MAX_REFLEXION = parseInt(process.env.MAX_REFLEXION_LOOPS) || 3;

// ── System prompts ──────────────────────────────
const AGENT_SYSTEM_PROMPT = `You are TradeMind AI — a world-class crypto and stock market analyst.

Your task: Analyze markets using real data from tools, then give a precise trading recommendation.

STRICT RULES:
- NEVER assume or make up prices — always use tools to fetch real data
- Always check: price, indicators (RSI/MACD), candle patterns, and risk
- Give confidence score 0.0 to 1.0 based on how strong the setup is
- When ready to conclude, output exactly: FINAL_ANSWER: [your analysis]

FINAL_ANSWER must include:
  ✅ Signal: BUY / SELL / WAIT
  📊 Confidence: X%
  📍 Entry: price
  🛑 Stop Loss: price
  🎯 Target 1 & 2: prices
  📝 Reason: what indicators/patterns support this`;

const CRITIC_SYSTEM_PROMPT = `You are a senior trading risk manager reviewing an AI analyst's recommendation.

Check:
1. Was real data used? (not assumptions)
2. Are RSI, MACD, and candle patterns all considered?
3. Is risk/reward clearly defined?
4. Is the confidence score realistic?

If the analysis is complete and solid → respond: APPROVED: [reason]
If something is missing → respond: NEEDS_MORE: [exactly what to fetch/check]`;

// ── Main agent function ─────────────────────────
export async function runAgent(userQuery, onStep = () => {}) {
  const tools = getAllToolSchemas();

  // Message history (ReAct memory)
  const messages = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    { role: "user", content: userQuery },
  ];

  onStep(`\n🤖 Model: ${modelName}`);
  onStep(`📋 Query: ${userQuery}`);
  onStep(`\n━━━ ReAct Loop Starting ━━━\n`);

  let finalAnswer = null;
  let step = 0;

  // ══════════════════════════════════════════
  //  PHASE 1 — ReAct Loop (Think → Act → Observe)
  // ══════════════════════════════════════════
  while (step < MAX_STEPS && !finalAnswer) {
    step++;
    onStep(`[Step ${step}] Thinking...`);

    const response = await chat(messages, tools);

    if (response.isToolCall) {
      // ── ACT: Execute tool ──
      onStep(`  🔧 Calling: ${response.toolName}(${JSON.stringify(response.toolArgs)})`);
      const result = await executeTool(response.toolName, response.toolArgs);
      onStep(`  📊 Got data: ${result.substring(0, 120)}...`);

      // Add to memory
      messages.push({ role: "assistant", content: null, tool_calls: [{
        id: `call_${step}`,
        type: "function",
        function: { name: response.toolName, arguments: JSON.stringify(response.toolArgs) }
      }]});
      messages.push({ role: "tool", tool_call_id: `call_${step}`, content: result });

    } else if (response.content.includes("FINAL_ANSWER:")) {
      // ── Reached conclusion ──
      finalAnswer = response.content.split("FINAL_ANSWER:")[1].trim();
      onStep(`\n✅ Agent concluded in ${step} steps\n`);

    } else {
      // ── THINK: Reasoning step ──
      onStep(`  💭 ${response.content.substring(0, 120)}...`);
      messages.push({ role: "assistant", content: response.content });
    }
  }

  // Force conclusion if max steps hit
  if (!finalAnswer) {
    onStep(`\n⚡ Max steps reached — forcing conclusion...`);
    const forced = await chat([
      ...messages,
      { role: "user", content: "Summarize your FINAL_ANSWER now based on all data gathered." }
    ], []);
    finalAnswer = forced.content.replace("FINAL_ANSWER:", "").trim();
  }

  // ══════════════════════════════════════════
  //  PHASE 2 — Reflexion Loop (Self-Critique)
  // ══════════════════════════════════════════
  onStep(`\n━━━ Reflexion Loop Starting ━━━\n`);

  for (let iter = 1; iter <= MAX_REFLEXION; iter++) {
    onStep(`[Reflexion ${iter}/${MAX_REFLEXION}] Critic reviewing...`);

    const critique = await think(
      CRITIC_SYSTEM_PROMPT,
      `Analysis:\n${finalAnswer}`
    );

    if (critique.startsWith("APPROVED:")) {
      onStep(`  ✅ Critic approved!\n`);
      break;
    }

    if (critique.includes("NEEDS_MORE:")) {
      const missing = critique.split("NEEDS_MORE:")[1].split("\n")[0].trim();
      onStep(`  ⚠️ Gap found: ${missing}`);

      // Fetch missing data
      const fixMessages = [
        ...messages,
        { role: "user", content: `You missed: ${missing}. Gather this data with tools and give updated FINAL_ANSWER.` }
      ];

      for (let i = 0; i < 5; i++) {
        const fix = await chat(fixMessages, tools);
        if (fix.isToolCall) {
          const res = await executeTool(fix.toolName, fix.toolArgs);
          onStep(`  🔧 Extra: ${fix.toolName}`);
          fixMessages.push({ role: "assistant", content: `Tool: ${fix.toolName}` });
          fixMessages.push({ role: "user", content: `Result: ${res}` });
        } else {
          finalAnswer = fix.content.replace("FINAL_ANSWER:", "").trim();
          break;
        }
      }
    }
  }

  return finalAnswer;
}
