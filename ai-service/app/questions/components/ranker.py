import logging
from typing import List
from app.questions.models import LLMQuestionItem

logger = logging.getLogger("app")


class QuestionRanker:
    """
    Ranks generated questions based on confidence, coverage, specificity, and diversity.
    """

    def rank(self, items: List[LLMQuestionItem]) -> List[LLMQuestionItem]:
        logger.info("QuestionGeneration: Ranking started.")
        
        # Score each question
        scored_items = []
        for item in items:
            score = self._score_item(item)
            scored_items.append((score, item))

        # Sort by score descending
        scored_items.sort(key=lambda x: x[0], reverse=True)
        ranked = [item for _, item in scored_items]

        # Apply diversity reranking: reduce redundancy of overlapping page references
        diverse_ranked = self._diversify(ranked)

        logger.info("QuestionGeneration: Ranking completed.")
        return diverse_ranked

    def _score_item(self, item: LLMQuestionItem) -> float:
        # 1. Grounded confidence level score
        confidence_scores = {"HIGH": 3.0, "MEDIUM": 2.0, "LOW": 1.0}
        conf_score = confidence_scores.get(item.confidence.value, 1.0)

        # 2. Coverage score based on count of grounding pages
        coverage_score = min(len(set(item.related_pages)) * 1.5, 4.5)

        # 3. Specificity heuristic based on length & word count (longer is generally more specific)
        words = item.question.split()
        word_count = len(words)
        
        if 8 <= word_count <= 25:
            specificity_score = 2.0
        elif 5 <= word_count < 8:
            specificity_score = 1.0
        else:
            specificity_score = 0.5

        return conf_score + coverage_score + specificity_score

    def _diversify(self, items: List[LLMQuestionItem]) -> List[LLMQuestionItem]:
        # Penalize questions that reference pages that are already heavily cited by higher-ranked questions
        re_ranked = []
        cited_pages_count = {}

        for item in items:
            penalty = 0.0
            for page in item.related_pages:
                penalty += cited_pages_count.get(page, 0) * 0.5
            
            # Re-score with penalty
            base_score = self._score_item(item)
            final_score = base_score - penalty
            re_ranked.append((final_score, item))

        re_ranked.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in re_ranked]
