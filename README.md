# TradeMind AI 🤖📈

> **AI-powered trading agent** — ReAct + Reflexion + Multi-Strategy reasoning loop

## What is this?
A real autonomous AI trading agent (NOT just a chatbot) that:
- Plans what to analyze → Executes tool calls → Observes results → Self-reflects → Gives final verdict
- Gives confidence score with every signal (e.g., "78% confidence, 22% fail chance")
- Explains WHY it made a decision (RSI + Price Action + News)
- Works for Crypto + Indian Stock Market
- Model-independent — swap Gemini, GPT-4, Claude, or local Ollama in 1 line

## Architecture
- **Plan-and-Execute** — Big goal → Step-by-step plan
- **ReAct Loop** — Think → Tool Call → Observe → Repeat
- **Reflexion** — Self-critique → Fix gaps → Final answer

## Project Structure
```
trademind-ai/
├── core/          ← Agent brain (ReAct loop, Planner, Reflexion, LLM client)
├── tools/         ← Price, News, Technical Analysis tools
├── strategies/    ← RSI, MACD, Price Action, 50+ strategies
├── api/           ← FastAPI backend
└── frontend/      ← Next.js UI (Phase 2)
```

## Setup
```bash
cp .env.example .env
# Add your API keys in .env
pip install -r requirements.txt
python main.py
```

## Status: 🚧 In Development
