from abc import ABC, abstractmethod
from typing import List, Dict, Optional


class LLMProvider(ABC):
    """
    Abstract Base Class for LLM providers, ensuring clean separation of 
    LLM generation client implementations.
    """

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Executes a single text generation request.
        """
        pass

    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]], format: Optional[str] = None) -> str:
        """
        Executes a multi-turn chat interaction.
        """
        pass
