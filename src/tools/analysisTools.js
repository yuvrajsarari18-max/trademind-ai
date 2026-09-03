// ─────────────────────────────────────────────
//  TradeMind AI — Analysis Tools
//  RSI, MACD, Bollinger Bands, candle patterns
// ─────────────────────────────────────────────
import {
  RSI,
  MACD,
  BollingerBands,
  ATR,
  EMA,
  SMA,
} from "technicalindicators";
import { registerTool } from "./registry.js";

// ── Tool: Technical Indicators ────────────────
registerTool({
  name: "calculate_indicators",
  description:
    "Calculate RSI, MACD, Bollinger Bands, EMA for a list of closing prices",
  parameters: {
    type: "object",
    properties: {
      closes: {
        type: "array",
        items: { type: "number" },
        description: "Array of closing prices (latest last)",
      },
      highs: {
        type: "array",
        items: { type: "number" },
        description: "Array of high prices (for ATR)",
      },
      lows: {
        type: "array",
        items: { type: "number" },
        description: "Array of low prices (for ATR)",
      },
    },
    required: ["closes"],
  },
  handler: async ({ closes, highs = [], lows = [] }) => {
    const result = {};

    // RSI (14)
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const rsi = rsiValues[rsiValues.length - 1];
    result.rsi = {
      value: rsi?.toFixed(2),
      signal:
        rsi < 30
          ? "🟢 Oversold (potential BUY)"
          : rsi > 70
          ? "🔴 Overbought (potential SELL)"
          : "⚪ Neutral",
    };

    // MACD (12,26,9)
    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const macd = macdValues[macdValues.length - 1];
    const macdPrev = macdValues[macdValues.length - 2];
    if (macd) {
      const crossover =
        macdPrev &&
        macd.MACD > macd.signal &&
        macdPrev.MACD < macdPrev.signal;
      const crossunder =
        macdPrev &&
        macd.MACD < macd.signal &&
        macdPrev.MACD > macdPrev.signal;
      result.macd = {
        macd_line: macd.MACD?.toFixed(4),
        signal_line: macd.signal?.toFixed(4),
        histogram: macd.histogram?.toFixed(4),
        signal: crossover
          ? "🟢 Bullish Crossover!"
          : crossunder
          ? "🔴 Bearish Crossunder!"
          : macd.histogram > 0
          ? "📈 Bullish momentum"
          : "📉 Bearish momentum",
      };
    }

    // Bollinger Bands (20, 2)
    const bbValues = BollingerBands.calculate({
      period: 20,
      values: closes,
      stdDev: 2,
    });
    const bb = bbValues[bbValues.length - 1];
    const currentPrice = closes[closes.length - 1];
    if (bb) {
      result.bollinger_bands = {
        upper: bb.upper?.toFixed(2),
        middle: bb.middle?.toFixed(2),
        lower: bb.lower?.toFixed(2),
        bandwidth: ((bb.upper - bb.lower) / bb.middle).toFixed(4),
        signal:
          currentPrice <= bb.lower
            ? "🟢 Price at Lower Band (potential bounce)"
            : currentPrice >= bb.upper
            ? "🔴 Price at Upper Band (potential reversal)"
            : "⚪ Price within bands",
      };
    }

    // EMA 20 & 50
    const ema20 = EMA.calculate({ values: closes, period: 20 });
    const ema50 = EMA.calculate({ values: closes, period: 50 });
    result.ema = {
      ema20: ema20[ema20.length - 1]?.toFixed(2),
      ema50: ema50[ema50.length - 1]?.toFixed(2),
      signal:
        ema20[ema20.length - 1] > ema50[ema50.length - 1]
          ? "🟢 EMA20 above EMA50 (Bullish)"
          : "🔴 EMA20 below EMA50 (Bearish)",
    };

    // ATR (volatility)
    if (highs.length > 0 && lows.length > 0) {
      const atrValues = ATR.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 14,
      });
      const atr = atrValues[atrValues.length - 1];
      result.atr = {
        value: atr?.toFixed(2),
        note: "Use for SL/TP calculation",
      };
    }

    return result;
  },
});

// ── Tool: Candle Pattern Detection ───────────────
registerTool({
  name: "detect_patterns",
  description:
    "Detect candlestick patterns like Doji, Hammer, Engulfing in recent candles",
  parameters: {
    type: "object",
    properties: {
      candles: {
        type: "array",
        description:
          "Last 5-10 candles with open, high, low, close",
        items: {
          type: "object",
          properties: {
            open: { type: "number" },
            high: { type: "number" },
            low: { type: "number" },
            close: { type: "number" },
          },
        },
      },
    },
    required: ["candles"],
  },
  handler: async ({ candles }) => {
    const patterns = [];
    const c = candles;
    const last = c[c.length - 1];
    const prev = c[c.length - 2];

    if (!last) return { patterns: [], note: "Not enough candles" };

    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low;
    const upperWick = last.high - Math.max(last.open, last.close);
    const lowerWick = Math.min(last.open, last.close) - last.low;
    const isBullish = last.close > last.open;

    // Doji
    if (body <= range * 0.1) {
      patterns.push({ name: "Doji", signal: "⚠️ Indecision — possible reversal" });
    }

    // Hammer (bullish)
    if (lowerWick >= body * 2 && upperWick <= body * 0.5 && !isBullish === false) {
      patterns.push({ name: "Hammer", signal: "🟢 Bullish reversal signal" });
    }

    // Shooting Star (bearish)
    if (upperWick >= body * 2 && lowerWick <= body * 0.5 && isBullish) {
      patterns.push({ name: "Shooting Star", signal: "🔴 Bearish reversal signal" });
    }

    // Bullish Engulfing
    if (
      prev &&
      prev.close < prev.open && // prev bearish
      last.close > last.open && // last bullish
      last.open < prev.close &&
      last.close > prev.open
    ) {
      patterns.push({ name: "Bullish Engulfing", signal: "🟢 Strong bullish signal!" });
    }

    // Bearish Engulfing
    if (
      prev &&
      prev.close > prev.open && // prev bullish
      last.close < last.open && // last bearish
      last.open > prev.close &&
      last.close < prev.open
    ) {
      patterns.push({ name: "Bearish Engulfing", signal: "🔴 Strong bearish signal!" });
    }

    // Marubozu (strong momentum)
    if (body >= range * 0.9) {
      patterns.push({
        name: isBullish ? "Bullish Marubozu" : "Bearish Marubozu",
        signal: isBullish ? "🟢 Very strong buying pressure" : "🔴 Very strong selling pressure",
      });
    }

    return {
      patterns: patterns.length > 0 ? patterns : [{ name: "None", signal: "⚪ No clear pattern" }],
      last_candle: {
        bullish: isBullish,
        body_size: body.toFixed(2),
        upper_wick: upperWick.toFixed(2),
        lower_wick: lowerWick.toFixed(2),
      },
    };
  },
});

// ── Tool: Risk Calculator ──────────────────────
registerTool({
  name: "calculate_risk",
  description: "Calculate Stop Loss, Take Profit, and position size based on ATR or manual SL",
  parameters: {
    type: "object",
    properties: {
      entry_price: { type: "number", description: "Entry price" },
      atr: { type: "number", description: "ATR value for dynamic SL" },
      risk_percent: {
        type: "number",
        description: "Risk % of capital per trade (e.g. 1 = 1%)",
      },
      capital: { type: "number", description: "Total capital in USDT" },
      direction: {
        type: "string",
        enum: ["long", "short"],
        description: "Trade direction",
      },
    },
    required: ["entry_price", "atr"],
  },
  handler: async ({
    entry_price,
    atr,
    risk_percent = 1,
    capital = 1000,
    direction = "long",
  }) => {
    const slDistance = atr * 1.5; // 1.5x ATR stop loss
    const stopLoss =
      direction === "long"
        ? entry_price - slDistance
        : entry_price + slDistance;
    const target1 =
      direction === "long"
        ? entry_price + slDistance * 2 // 1:2 RR
        : entry_price - slDistance * 2;
    const target2 =
      direction === "long"
        ? entry_price + slDistance * 3 // 1:3 RR
        : entry_price - slDistance * 3;

    const riskAmount = (capital * risk_percent) / 100;
    const positionSize = riskAmount / slDistance;

    return {
      entry: entry_price.toFixed(2),
      stop_loss: stopLoss.toFixed(2),
      target_1: target1.toFixed(2) + " (1:2 RR)",
      target_2: target2.toFixed(2) + " (1:3 RR)",
      sl_distance: slDistance.toFixed(2),
      risk_amount_usdt: riskAmount.toFixed(2),
      position_size: positionSize.toFixed(4),
      risk_reward: "1:2 / 1:3",
    };
  },
});
