// ─────────────────────────────────────────────
//  TradeMind AI — Agent Loop (ReAct + Reflexion)
//  THE MAIN BRAIN
// ─────────────────────────────────────────────
import { getLLM } from "./llmClient.js";
import { getAllToolSchemas, executeTool } from "../tools/registry.js";

const MAX_STEPS = parseInt(process.env.MAX_REACT_STEPS) || 15;
const MAX_REFLEXION = parseInt(process.env.MAX_REFLEXION_LOOPS) || 3;
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.70;

const SYSTEM_PROMPT = `You are TradeMind AI — an expert crypto and stock market trading analyst.

Your job is to analyze markets thoroughly using available tools and give a final trading recommendation.

RULES:
1. Always use tools to gather real data before making any recommendation
2. NEVER make up prices or indicators — always fetch real data
3. After gathering data, check your own reasoning for gaps
4. Give a confidence score (0.0 to 1.0) with your final answer
5. Always include: signal (BUY/SELL/WAIT), confidence %, stop loss, target, and reasoning

TOOLS AVAILABLE: get_live_price, get_ohlcv, calculate_indicators, detect_patterns, calculate_risk, scan_markets

When you have enough information to make a final decision, respond with:
FINAL_ANSWER: [your complete analysis]`;

const CRITIC_PROMPT = `You are a trading analysis critic. Review the following analysis and identify:
1. What data is missing or weak?
2. Is the confidence score justified?
3. What should the analyst check again?

If the analysis is solid (confidence >= 0.70 and all key factors checked), respond with:
APPROVED: [brief reason]

If gaps exist, respond with:
NEEDS_MORE: [specific what to check]
Confidence estimate: [0.0-1.0]`;

export async function runAgent(userQuery, onStep) {
  const llm = getLLM();
  const tools = getAllToolSchemas();
  const messages = [
    { role: "user", content: `${SYSTEM_PROMPT}\n\nAnalyze: ${userQuery}` },
  ];

  const log = (msg) => { if (onStep) onStep(msg); };

  log(`\n🧠 Starting TradeMind analysis...`);
  log(`📋 Query: ${userQuery}\n`);

  let finalAnswer = null;
  let stepCount = 0;

  // ─── PHASE 1 & 2: ReAct Loop ─────────────────
  log("━━━ Phase 1: ReAct Loop (Think → Act → Observe) ━━━");

  while (stepCount < MAX_STEPS && !finalAnswer) {
    stepCount++;
    log(`\n[Step ${stepCount}] Thinking...`);

    const response = await llm.chat(messages, tools);

    // Tool call
    if (response.isToolCall) {
      log(`  🔧 Tool: ${response.toolName}(${JSON.stringify(response.toolArgs)})`);

      const result = await executeTool(response.toolName, response.toolArgs);
      log(`  📊 Result: ${result.substring(0, 200)}...`);

      messages.push({ role: "assistant", content: `Using tool: ${response.toolName}` });
      messages.push({ role: "user", content: `Tool result: ${result}` });

    // Final answer
    } else if (response.content.includes("FINAL_ANSWER:")) {
      finalAnswer = response.content.split("FINAL_ANSWER:")[1].trim();
      log(`\n✅ Agent reached conclusion after ${stepCount} steps`);
      break;

    // Thinking step
    } else {
      log(`  💭 Thought: ${response.content.substring(0, 150)}...`);
      messages.push({ role: "assistant", content: response.content });
    }
  }

  if (!finalAnswer) {
    // Force conclusion if max steps reached
    const forceMsg = [...messages, {
      role: "user",
      content: "Provide your FINAL_ANSWER now based on all data gathered so far."
    }];
    const forced = await llm.chat(forceMsg, []);
    finalAnswer = forced.content.replace("FINAL_ANSWER:", "").trim();
  }

  // ─── PHASE 3: Reflexion Loop ──────────────────
  log("\n━━━ Phase 2: Reflexion (Self-Critique) ━━━");

  let approved = false;
  let iteration = 0;

  while (!approved && iteration < MAX_REFLEXION) {
    iteration++;
    log(`\n[Reflexion ${iteration}/${MAX_REFLEXION}] Critic reviewing...`);

    const criticResponse = await llm.think(
      CRITIC_PROMPT,
      `Analysis to review:\n${finalAnswer}`
    );

    if (criticResponse.includes("APPROVED:")) {
      log(`  ✅ Critic approved the analysis!`);
      approved = true;

    } else if (criticResponse.includes("NEEDS_MORE:")) {
      const missing = criticResponse.split("NEEDS_MORE:")[1]?.split("\n")[0]?.trim();
      log(`  ⚠️ Critic says: ${missing}`);

      // Get missing data
      const fixMessages = [
        ...messages,
        { role: "user", content: `Critic says you need to check: ${missing}. Please gather this data and update your analysis.` }
      ];

      let fixed = false;
      for (let i = 0; i < 5 && !fixed; i++) {
        const fixResponse = await llm.chat(fixMessages, tools);
        if (fixResponse.isToolCall) {
          const result = await executeTool(fixResponse.toolName, fixResponse.toolArgs);
          log(`  🔧 Extra check: ${fixResponse.toolName}`);
          fixMessages.push({ role: "assistant", content: `Tool: ${fixResponse.toolName}` });
          fixMessages.push({ role: "user", content: `Result: ${result}` });
        } else {
          finalAnswer = fixResponse.content.replace("FINAL_ANSWER:", "").trim();
          fixed = true;
        }
      }
    }
  }

  return finalAnswer;
}
