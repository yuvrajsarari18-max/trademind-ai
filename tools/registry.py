"""
TradeMind AI — Tool Registry
Sabhi tools yahan register hote hain.
Agent decide karta hai kaunsa tool use karna hai.
"""

from typing import Callable, Any
from pydantic import BaseModel


# ─────────────────────────────────────────
#  Tool Definition
# ─────────────────────────────────────────
class Tool(BaseModel):
    name: str
    description: str
    parameters: dict  # JSON Schema format
    func: Any  # Callable

    class Config:
        arbitrary_types_allowed = True

    def run(self, **kwargs) -> str:
        try:
            result = self.func(**kwargs)
            return str(result)
        except Exception as e:
            return f"ERROR: Tool '{self.name}' failed — {e}"

    def to_openai_schema(self) -> dict:
        """LLM ko tool describe karo."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


# ─────────────────────────────────────────
#  Registry
# ─────────────────────────────────────────
class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool):
        self._tools[tool.name] = tool
        print(f"[Registry] Registered tool: {tool.name}")

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def execute(self, name: str, args: dict) -> str:
        tool = self.get(name)
        if not tool:
            return f"ERROR: Tool '{name}' not found in registry."
        return tool.run(**args)

    def all_schemas(self) -> list[dict]:
        """LLM ke liye sabhi tools ka schema."""
        return [t.to_openai_schema() for t in self._tools.values()]

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())


# ─────────────────────────────────────────
#  Decorator for easy registration
# ─────────────────────────────────────────
registry = ToolRegistry()


def tool(name: str, description: str, parameters: dict):
    """
    Use this decorator to register a function as a tool.

    Example:
        @tool(
            name="get_price",
            description="Get current price of a symbol",
            parameters={
                "type": "object",
                "properties": {
                    "symbol": {"type": "string", "description": "e.g. BTC/USDT"}
                },
                "required": ["symbol"]
            }
        )
        def get_price(symbol: str) -> str:
            ...
    """
    def decorator(func: Callable):
        registry.register(Tool(
            name=name,
            description=description,
            parameters=parameters,
            func=func,
        ))
        return func
    return decorator
