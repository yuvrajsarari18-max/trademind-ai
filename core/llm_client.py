"""
TradeMind AI — LLM Client
Model-independent abstraction using LiteLLM.
Ek line change karo .env mein — model swap ho jaata hai.
"""

import os
from dotenv import load_dotenv
from litellm import completion
from pydantic import BaseModel
from typing import Any

load_dotenv()

# ─────────────────────────────────────────
#  Config
# ─────────────────────────────────────────
DEFAULT_MODEL = os.getenv("LLM_MODEL", "gemini/gemini-2.0-flash")
MAX_TOKENS = 4096


# ─────────────────────────────────────────
#  Response wrapper
# ─────────────────────────────────────────
class LLMResponse(BaseModel):
    content: str
    model: str
    tokens_used: int
    is_tool_call: bool = False
    tool_name: str | None = None
    tool_args: dict | None = None


# ─────────────────────────────────────────
#  Main Client
# ─────────────────────────────────────────
class LLMClient:
    """
    Model-independent LLM wrapper.
    Gemini, GPT-4, Claude, Ollama — sab kaam karte hain.
    """

    def __init__(self, model: str | None = None):
        self.model = model or DEFAULT_MODEL
        print(f"[LLMClient] Using model: {self.model}")

    def chat(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        temperature: float = 0.3,
    ) -> LLMResponse:
        """
        LLM se baat karo.
        messages format: [{"role": "user/assistant/system", "content": "..."}]
        """
        try:
            kwargs: dict[str, Any] = {
                "model": self.model,
                "messages": messages,
                "max_tokens": MAX_TOKENS,
                "temperature": temperature,
            }

            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = "auto"

            response = completion(**kwargs)
            msg = response.choices[0].message

            # Tool call hai?
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                tool_call = msg.tool_calls[0]
                import json
                return LLMResponse(
                    content=msg.content or "",
                    model=self.model,
                    tokens_used=response.usage.total_tokens,
                    is_tool_call=True,
                    tool_name=tool_call.function.name,
                    tool_args=json.loads(tool_call.function.arguments),
                )

            return LLMResponse(
                content=msg.content or "",
                model=self.model,
                tokens_used=response.usage.total_tokens,
            )

        except Exception as e:
            raise RuntimeError(f"LLM call failed: {e}") from e

    def think(self, system_prompt: str, user_message: str) -> str:
        """Simple single-turn reasoning call."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        return self.chat(messages).content


# ─────────────────────────────────────────
#  Singleton
# ─────────────────────────────────────────
_client: LLMClient | None = None


def get_llm() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
