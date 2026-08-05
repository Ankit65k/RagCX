import logging
from typing import List, Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from app.questions.exceptions import PromptBuilderError

logger = logging.getLogger("app")

_SYSTEM_INSTRUCTION = (
    "You are a professional document analyst and educator.\n"
    "Your task is to analyze the provided document excerpts and generate highly specific, insightful, and diverse questions "
    "that readers are likely to ask to understand the document's core content.\n\n"
    "Follow these strict criteria:\n"
    "1. Every question MUST be directly grounded in the provided context excerpts.\n"
    "2. Cover different topics and themes present across the chunks to ensure diversity.\n"
    "3. Avoid duplicate or near-duplicate questions.\n"
    "4. Avoid simple yes/no questions.\n"
    "5. Do NOT speculate or refer to external knowledge outside the provided document context.\n\n"
    "You MUST respond with a valid JSON object matching this structure:\n"
    "{\n"
    "  \"questions\": [\n"
    "    {\n"
    "      \"question\": \"The specific question text\",\n"
    "      \"related_pages\": [page numbers supporting the question],\n"
    "      \"confidence\": \"HIGH\" | \"MEDIUM\" | \"LOW\"\n"
    "    }\n"
    "  ]\n"
    "}"
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
