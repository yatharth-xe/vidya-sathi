"""
Quiz Service — Centralized Domain Logic for Practice Quiz Evaluation & Level Transitions.
"""
from typing import Tuple

def evaluate_quiz_performance(score: int, total: int = 5) -> Tuple[int, bool, str]:
    """
    Centralized Level Transition Policy for Level 3 Practice Quizzes.

    Rules:
    - >= 80%: level 1 ("Doubt Cleared"), teacher_intimated = False
    - 60% - 79.9%: level 2 ("Guided Help"), teacher_intimated = False
    - < 60%: level 4 ("Teacher Support Recommended"), teacher_intimated = True

    Returns:
        (level: int, teacher_intimated: bool, recommendation: str)
    """
    safe_total = max(1, total)
    percentage = (score / safe_total) * 100.0

    if percentage >= 80.0:
        return (
            1,
            False,
            "Great work! You have cleared your doubts and mastered this concept.",
        )
    elif percentage >= 60.0:
        return (
            2,
            False,
            "Good progress! Review guided hints to strengthen your understanding.",
        )
    else:
        return (
            4,
            True,
            "Your teacher has been notified that you may benefit from additional support.",
        )
