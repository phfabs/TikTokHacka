from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any, Optional

@dataclass
class BasePlan(ABC):
    user_id: str
    title: str
    status: str
    created_at: datetime
    updated_at: datetime
    
    @abstractmethod
    def get_progress_summary(self) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def can_be_marked_complete(self) -> bool:
        pass

@dataclass  
class SkillPlan(BasePlan):
    skill_name: str
    curriculum: Dict[str, Any]
    progress: Dict[str, Any]
    difficulty: str
    
    def get_progress_summary(self) -> Dict[str, Any]:
        return {
            "type": "skill",
            "current_day": self.progress.get("current_day", 1),
            "completion_percentage": self.progress.get("completion_percentage", 0),
            "days_remaining": self.curriculum["total_days"] - self.progress.get("completed_days", 0)
        }
    
    def can_be_marked_complete(self) -> bool:
        return self.progress.get("completed_days", 0) >= self.curriculum["total_days"]

@dataclass
class HabitPlan(BasePlan):
    category: str
    pattern: Dict[str, Any]
    streaks: Dict[str, Any]
    goals: Dict[str, Any]
    
    def get_progress_summary(self) -> Dict[str, Any]:
        return {
            "type": "habit", 
            "current_streak": self.streaks.get("current_streak", 0),
            "success_rate": self.streaks.get("success_rate_30d", 0),
            "next_milestone": self._get_next_milestone()
        }
    
    def can_be_marked_complete(self) -> bool:
        target_streak = self.goals.get("target_streak")
        if target_streak:
            return self.streaks.get("current_streak", 0) >= target_streak
        return False
        
    def _get_next_milestone(self) -> Optional[Dict]:
        current_streak = self.streaks.get("current_streak", 0)
        for milestone in self.goals.get("milestone_rewards", []):
            if not milestone.get("achieved", False) and milestone["days"] > current_streak:
                return milestone
        return None 