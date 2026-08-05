import logging
from typing import Any, Dict

from app.workflows.base import WorkflowNode
from app.workflows.exceptions import NodeExecutionError
from app.questions.pipeline import QuestionGenerationPipeline

logger = logging.getLogger("app")


class GenerateQuestionsNode(WorkflowNode):
    """
    Generates a list of suggested questions from representative document chunks
    delegating to the dedicated QuestionGenerationPipeline.
    """

    node_name = "generate_questions"

    def __init__(self, pipeline: QuestionGenerationPipeline, question_count: int = 5) -> None:
        self.pipeline = pipeline
        self.question_count = question_count

    async def execute(self, state: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[{self.node_name}] Initiating suggested question generation (count={self.question_count})...")
        try:
            chunks = state.get("chunks", [])

            # Execute pipeline
            result = await self.pipeline.generate(chunks=chunks, count=self.question_count)

            # Format outputs for state
            serialized_questions = [q.model_dump() for q in result.questions]

            return {
                "suggested_questions": serialized_questions,
                "suggested_questions_metadata": result.metadata
            }

        except Exception as e:
            raise NodeExecutionError(self.node_name, str(e)) from e
