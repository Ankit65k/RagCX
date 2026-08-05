"""
RAG Prompt Templates.

All prompt assembly goes through LangChain PromptTemplate / ChatPromptTemplate
objects — never raw string concatenation. This makes prompts:
  • Testable in isolation (render with known inputs, assert output)
  • Swappable (change the system instruction without touching pipeline logic)
  • Auditable (the template is a first-class artifact, not buried in code)
"""

from typing import Dict, List, Optional

from langchain_core.prompts import ChatPromptTemplate, PromptTemplate

# ---------------------------------------------------------------------------
# System instruction — defines the assistant's behaviour and grounding rules
# ---------------------------------------------------------------------------
_SYSTEM_INSTRUCTION = (
    "You are a precise, factual document assistant. "
    "Answer the user's question using ONLY the context provided below.\n\n"
    "You MUST respond with a valid JSON object matching the following structure:\n"
    "{\n"
    "  \"answer\": \"Your direct answer based strictly on the context. If context is insufficient, set this exactly to: 'I couldn\\'t find relevant information in the uploaded documents.'\",\n"
    "  \"confidence\": \"HIGH\" | \"MEDIUM\" | \"LOW\",\n"
    "  \"citations\": [\n"
    "    {\n"
    "      \"documentId\": \"The Document ID from the matching context block header\",\n"
    "      \"page\": <integer page number from the header>,\n"
    "      \"chunkId\": \"The Chunk ID from the header\"\n"
    "    }\n"
    "  ],\n"
    "  \"reasoning\": \"Step-by-step internal reasoning justifying the answer and confidence assessment\"\n"
    "}\n\n"
    "Do not speculate, invent citations, or use external knowledge."
)

# ---------------------------------------------------------------------------
# Context block template — wraps each retrieved chunk with source metadata
# ---------------------------------------------------------------------------
_CONTEXT_BLOCK_TEMPLATE = PromptTemplate.from_template(
    "[Document: {document_id} | Chunk ID: {chunk_id} | Page: {page_number} | Score: {score:.4f}]\n{text}"
)

# ---------------------------------------------------------------------------
# Main RAG chat template — system + context + optional history + question
# ---------------------------------------------------------------------------
_RAG_CHAT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", "{system_instruction}"),
    ("human",
     "--- CONTEXT ---\n{context}\n\n"
     "{history_section}"
     "--- QUESTION ---\n{question}"),
])


class RAGPromptTemplate:
    """
    Builds the final LLM prompt from retrieved context and the user question.

    Keeps all template logic in one place. Callers pass structured data;
    this class is responsible for rendering it into a prompt string.
    """

    @staticmethod
    def render_context_block(
        document_id: str,
        chunk_id: str,
        page_number: int,
        score: float,
        text: str,
    ) -> str:
        return _CONTEXT_BLOCK_TEMPLATE.format(
            document_id=document_id,
            chunk_id=chunk_id,
            page_number=page_number,
            score=score,
            text=text,
        )

    @staticmethod
    def build(
        context: str,
        question: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_instruction: str = _SYSTEM_INSTRUCTION,
    ) -> List[Dict[str, str]]:
        """
        Returns a list of message dicts compatible with OllamaProvider.chat().

        Args:
            context:              Pre-formatted context string (chunk blocks joined by \\n\\n).
            question:             The normalised user question.
            conversation_history: Optional prior turns [{role, content}, ...].
            system_instruction:   Override to customise assistant behaviour.

        Returns:
            List[Dict[str, str]] — ready for `await llm_provider.chat(messages)`.
        """
        history_section = ""
        if conversation_history:
            turns = "\n".join(
                f"{m['role'].upper()}: {m['content']}"
                for m in conversation_history
            )
            history_section = f"--- CONVERSATION HISTORY ---\n{turns}\n\n"

        # Render via ChatPromptTemplate to guarantee correct message structure
        rendered = _RAG_CHAT_TEMPLATE.format_messages(
            system_instruction=system_instruction,
            context=context,
            history_section=history_section,
            question=question,
        )

        # Convert LangChain message objects → plain dicts for OllamaProvider.chat()
        return [{"role": msg.type if msg.type != "human" else "user",
                 "content": msg.content}
                for msg in rendered]
