// ─────────────────────────────────────────────
//  TradeMind AI — Price Tools
//  Live crypto prices using CCXT (free, no API key needed)
// ─────────────────────────────────────────────
import ccxt from "ccxt";
import { registerTool } from "./registry.js";

const exchange = new ccxt.binance({ enableRateLimit: true });

// ── Tool 1: Live Price ────────────────────────
registerTool({
  name: "get_live_price",
  description: "Get the current live price of a crypto symbol like BTC/USDT or ETH/USDT",
  parameters: {
    type: "object",
    properties: {
      symbol: {
        type: "string",
        description: "Trading pair e.g. BTC/USDT, ETH/USDT, SOL/USDT",
      },
    },
    required: ["symbol"],
  },
  handler: async ({ symbol }) => {
    const ticker = await exchange.fetchTicker(symbol);
    return {
      symbol,
      price: ticker.last,
      change_24h: ticker.percentage?.toFixed(2) + "%",
      high_24h: ticker.high,
      low_24h: ticker.low,
      volume_24h: ticker.quoteVolume?.toFixed(2),
      timestamp: new Date().toISOString(),
    };
  },
});

// ── Tool 2: OHLCV Candle Data ─────────────────
registerTool({
  name: "get_ohlcv",
  description: "Get OHLCV candle data for a symbol to perform technical analysis",
  parameters: {
    type: "object",
    properties: {
      symbol: { type: "string", description: "e.g. BTC/USDT" },
      timeframe: {
        type: "string",
        description: "Candle timeframe: 1m, 5m, 15m, 1h, 4h, 1d",
        enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
      },
      limit: {
        type: "number",
        description: "Number of candles to fetch (max 100)",
      },
    },
    required: ["symbol", "timeframe"],
  },
  handler: async ({ symbol, timeframe = "15m", limit = 50 }) => {
    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
    const candles = ohlcv.map(([ts, o, h, l, c, v]) => ({
      time: new Date(ts).toISOString(),
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
    }));

    // Last 5 candles summary
    const last5 = candles.slice(-5);
    const closes = candles.map((c) => c.close);
    const latest = closes[closes.length - 1];
    const oldest = closes[0];
    const trend = latest > oldest ? "📈 Bullish" : "📉 Bearish";

    return {
      symbol,
      timeframe,
      total_candles: candles.length,
      trend,
      current_price: latest,
      last_5_candles: last5,
      all_closes: closes, // for indicator calculation
    };
  },
});

// ── Tool 3: Multi-symbol scan ─────────────────
registerTool({
  name: "scan_markets",
  description: "Scan multiple symbols at once and return a quick overview",
  parameters: {
    type: "object",
    properties: {
      symbols: {
        type: "array",
        items: { type: "string" },
        description: "List of symbols to scan e.g. ['BTC/USDT', 'ETH/USDT']",
      },
    },
    required: ["symbols"],
  },
  handler: async ({ symbols }) => {
    const results = [];
    for (const symbol of symbols) {
      try {
        const ticker = await exchange.fetchTicker(symbol);
        results.push({
          symbol,
          price: ticker.last,
          change_24h: ticker.percentage?.toFixed(2) + "%",
          momentum: ticker.percentage > 0 ? "🟢 Up" : "🔴 Down",
        });
      } catch {
        results.push({ symbol, error: "Failed to fetch" });
      }
    }
    return results;
  },
});
