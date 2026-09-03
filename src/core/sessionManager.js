// ─────────────────────────────────────────────
//  TradeMind AI — Session Manager
//  Chat se settings manage karo
//  "ETH dekho 3 ghante" → agent configure ho jaata hai
// ─────────────────────────────────────────────

export class SessionManager {
  constructor() {
    this.symbols = ["BTC/USDT", "ETH/USDT"];
    this.timeframe = "15m";
    this.sessionHours = 3;
    this.startTime = null;
    this.endTime = null;
    this.isRunning = false;
    this.scanIntervalMin = 15;
    this.mode = "auto"; // auto | focus | manual
    this.focusSymbol = null;
  }

  // Parse user command and update settings
  parseCommand(input) {
    const changes = [];
    const lower = input.toLowerCase();

    // Symbol detection
    const symbolMap = {
      btc: "BTC/USDT", bitcoin: "BTC/USDT",
      eth: "ETH/USDT", ethereum: "ETH/USDT",
      sol: "SOL/USDT", solana: "SOL/USDT",
      bnb: "BNB/USDT",
      xrp: "XRP/USDT",
      ada: "ADA/USDT",
    };

    for (const [key, symbol] of Object.entries(symbolMap)) {
      if (lower.includes(key)) {
        if (!this.symbols.includes(symbol)) {
          this.symbols = [symbol]; // focus mode
          this.focusSymbol = symbol;
          this.mode = "focus";
          changes.push(`📍 Focus set to ${symbol}`);
        }
      }
    }

    // "dono" / "aur" → multi symbol
    if (lower.includes("dono") || lower.includes(" aur ")) {
      const found = [];
      for (const [key, symbol] of Object.entries(symbolMap)) {
        if (lower.includes(key)) found.push(symbol);
      }
      if (found.length > 1) {
        this.symbols = [...new Set(found)];
        this.mode = "auto";
        this.focusSymbol = null;
        changes.push(`📊 Watching: ${this.symbols.join(", ")}`);
      }
    }

    // Time detection — "3 ghante", "2 hours", "30 min"
    const hourMatch = lower.match(/(\d+)\s*(ghante|hour|hr)/);
    const minMatch = lower.match(/(\d+)\s*(min|minute)/);
    if (hourMatch) {
      this.sessionHours = parseInt(hourMatch[1]);
      changes.push(`⏱️ Session: ${this.sessionHours} hour(s)`);
    } else if (minMatch) {
      this.sessionHours = parseInt(minMatch[1]) / 60;
      changes.push(`⏱️ Session: ${minMatch[1]} minutes`);
    }

    // Timeframe
    const tfMatch = lower.match(/(\d+)\s*(min|m|hour|h|day|d)\s*(timeframe|tf|candle)?/);
    if (tfMatch) {
      const num = tfMatch[1];
      const unit = tfMatch[2];
      if (unit.startsWith("m")) this.timeframe = `${num}m`;
      else if (unit.startsWith("h")) this.timeframe = `${num}h`;
      else if (unit.startsWith("d")) this.timeframe = `${num}d`;
      changes.push(`🕯️ Timeframe: ${this.timeframe}`);
    }

    // Scan interval
    const scanMatch = lower.match(/har\s+(\d+)\s*(min|minute)/);
    if (scanMatch) {
      this.scanIntervalMin = parseInt(scanMatch[1]);
      changes.push(`🔄 Scan every ${this.scanIntervalMin} min`);
    }

    return changes.length > 0
      ? changes.join("\n")
      : null;
  }

  // Start the session
  start() {
    this.startTime = new Date();
    this.endTime = new Date(
      this.startTime.getTime() + this.sessionHours * 60 * 60 * 1000
    );
    this.isRunning = true;
  }

  // Check if session is still active
  isActive() {
    if (!this.isRunning) return false;
    return new Date() < this.endTime;
  }

  // Time remaining
  timeRemaining() {
    if (!this.endTime) return "Not started";
    const ms = this.endTime - new Date();
    if (ms <= 0) return "Session ended";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m remaining`;
  }

  // Summary
  getStatus() {
    return {
      symbols: this.symbols,
      timeframe: this.timeframe,
      mode: this.mode,
      focusSymbol: this.focusSymbol,
      sessionHours: this.sessionHours,
      isRunning: this.isRunning,
      timeRemaining: this.timeRemaining(),
      scanIntervalMin: this.scanIntervalMin,
    };
  }
}
