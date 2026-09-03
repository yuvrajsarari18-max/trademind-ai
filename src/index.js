// ─────────────────────────────────────────────
//  TradeMind AI — Main Entry Point
//  Chat-based CLI interface
// ─────────────────────────────────────────────
import "dotenv/config";
import readline from "readline";
import chalk from "chalk";
import { runAgent } from "./core/agentLoop.js";
import { SessionManager } from "./core/sessionManager.js";

// Load all tools
import "./tools/priceTools.js";
import "./tools/analysisTools.js";

const session = new SessionManager();

// ── CLI Setup ─────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(q) {
  return new Promise((res) => rl.question(q, res));
}

// ── Banner ────────────────────────────────────
function showBanner() {
  console.log(chalk.cyan(`
╔══════════════════════════════════════════════╗
║          🤖 TradeMind AI v1.0               ║
║   ReAct + Reflexion Trading Agent           ║
║   Type "help" for commands                  ║
╚══════════════════════════════════════════════╝
  `));
}

function showHelp() {
  console.log(chalk.yellow(`
📋 COMMANDS:
  "ETH dekho"              → Focus on ETH/USDT
  "BTC aur ETH dono"       → Watch both
  "3 ghante ke liye"       → Set 3hr session
  "har 10 min scan karo"   → Scan every 10 min
  "status"                 → Show session status
  "analyze ETH"            → Deep analyze ETH now
  "BTC aaj kaisa hai?"     → Quick BTC analysis
  "exit"                   → Quit
  `));
}

// ── Auto-scan mode ────────────────────────────
async function autoScan() {
  if (!session.isActive()) return;

  console.log(chalk.gray(`\n🔄 Auto-scanning: ${session.symbols.join(", ")}...`));

  for (const symbol of session.symbols) {
    try {
      await runAgent(
        `Quick analysis of ${symbol} on ${session.timeframe} timeframe. Is there a trading setup?`,
        (msg) => {
          if (msg.includes("🟢") || msg.includes("🔴") || msg.includes("✅")) {
            console.log(chalk.green(msg));
          } else {
            console.log(chalk.gray(msg));
          }
        }
      );
    } catch (err) {
      console.log(chalk.red(`Error scanning ${symbol}: ${err.message}`));
    }
  }
}

// ── Main Chat Loop ────────────────────────────
async function main() {
  showBanner();

  console.log(chalk.green("✅ TradeMind AI ready!\n"));
  console.log(chalk.gray("Type your query or command:\n"));

  let scanTimer = null;

  while (true) {
    const input = await prompt(chalk.cyan("You → "));

    if (!input.trim()) continue;

    // Exit
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      console.log(chalk.yellow("\n👋 Session ended. Happy trading!"));
      if (scanTimer) clearInterval(scanTimer);
      rl.close();
      break;
    }

    // Help
    if (input.toLowerCase() === "help") {
      showHelp();
      continue;
    }

    // Status
    if (input.toLowerCase() === "status") {
      const status = session.getStatus();
      console.log(chalk.cyan("\n📊 Session Status:"));
      console.log(JSON.stringify(status, null, 2));
      continue;
    }

    // Check for setting changes
    const settingChange = session.parseCommand(input);
    if (settingChange) {
      console.log(chalk.green(`\n⚙️ Settings updated:\n${settingChange}`));

      // Start session if not started
      if (!session.isRunning) {
        session.start();
        console.log(chalk.cyan(`⏱️ Session started! ${session.timeRemaining()}`));

        // Start auto-scan
        scanTimer = setInterval(async () => {
          if (session.isActive()) {
            await autoScan();
          } else {
            console.log(chalk.yellow("\n⏱️ Session time completed!"));
            console.log(chalk.cyan("Type 'exit' to quit or set new session time."));
            clearInterval(scanTimer);
          }
        }, session.scanIntervalMin * 60 * 1000);

        // First scan immediately
        await autoScan();
      }
      continue;
    }

    // Analysis query → run agent
    console.log(chalk.cyan("\n🤖 TradeMind analyzing...\n"));

    try {
      const result = await runAgent(input, (msg) => {
        process.stdout.write(chalk.gray(msg + "\n"));
      });

      console.log(chalk.green("\n" + "═".repeat(50)));
      console.log(chalk.bold.white("📊 FINAL ANALYSIS:"));
      console.log(chalk.green("═".repeat(50)));
      console.log(chalk.white(result));
      console.log(chalk.green("═".repeat(50) + "\n"));

    } catch (err) {
      console.log(chalk.red(`\n❌ Error: ${err.message}`));
    }
  }
}

main().catch(console.error);
