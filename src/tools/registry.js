// ─────────────────────────────────────────────
//  TradeMind AI — Tool Registry
//  Agent khud decide karta hai kaunsa tool use karna hai
// ─────────────────────────────────────────────

const _tools = new Map();

// Register a tool
export function registerTool({ name, description, parameters, handler }) {
  _tools.set(name, { name, description, parameters, handler });
  console.log(`[Tools] Registered: ${name}`);
}

// Execute a tool by name
export async function executeTool(name, args) {
  const tool = _tools.get(name);
  if (!tool) return `ERROR: Tool "${name}" not found.`;
  try {
    const result = await tool.handler(args);
    return typeof result === "string" ? result : JSON.stringify(result, null, 2);
  } catch (err) {
    return `ERROR: Tool "${name}" failed — ${err.message}`;
  }
}

// Get all tool schemas for LLM
export function getAllToolSchemas() {
  return Array.from(_tools.values()).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

// List tool names
export function listTools() {
  return Array.from(_tools.keys());
}
