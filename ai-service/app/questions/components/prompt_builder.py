import logging
from typing import List, Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from app.questions.exceptions import PromptBuilderError

logger = logging.getLogger("app")

_SYSTEM_INSTRUCTION = (
    "You are a professional document analyst.\n"
    "Your task is to analyze the provided document excerpts and generate questions that this document can ANSWER.\n\n"
    "IMPORTANT:\n"
    "1. Generate ONLY questions that the text below can ANSWER.\n"
    "2. Do NOT write general questions. Write SPECIFIC questions about the actual content.\n"
    "3. Do NOT use outside knowledge. Only use the provided text.\n"
    "4. Each question must be answerable from the context provided.\n\n"
    "Output format: Write exactly 4 questions, one per line. Do NOT number or bullet them.\n"
    "Each line should be a complete question ending with a question mark."
)

_QUESTION_USER_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", "{system_instruction}"),
    ("human",
     "--- CONTEXT EXCERPTS ---\n"
     "{context}\n\n"
     "Generate exactly {count} suggested questions based ONLY on the context above.")
])


class QuestionPromptBuilder:
    """
    Builds LLM chat message prompts for suggested question generation.
    """

    def build(self, chunks: List[Any], count: int) -> List[Dict[str, str]]:
        logger.info("QuestionGeneration: Prompt building started.")
        try:
            # Build context representation
            context_blocks = []
            for c in chunks:
                doc_id = getattr(c, "documentId", "unknown")
                page = getattr(c, "pageNumber", 0)
                chunk_id = getattr(c, "chunkId", "unknown")
                text = getattr(c, "text", "")
                
                context_blocks.append(
                    f"[Document: {doc_id} | Chunk ID: {chunk_id} | Page: {page}]\n{text}"
                )

            context_str = "\n\n---\n\n".join(context_blocks)
            
            rendered = _QUESTION_USER_TEMPLATE.format_messages(
                system_instruction=_SYSTEM_INSTRUCTION,
                context=context_str,
                count=count
            )

            messages = [
                {"role": msg.type if msg.type != "human" else "user", "content": msg.content}
                for msg in rendered
            ]
            
            logger.info("QuestionGeneration: Prompt built successfully.")
            return messages

        except Exception as e:
            logger.error(f"QuestionGeneration: Failed to build prompt: {str(e)}")
            raise PromptBuilderError(f"Failed to build prompt: {str(e)}") from e
