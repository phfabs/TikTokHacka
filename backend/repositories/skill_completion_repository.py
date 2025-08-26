from datetime import datetime, timedelta
from typing import List, Dict, Optional
from bson import ObjectId
from pymongo.collection import Collection
from pymongo.results import InsertOneResult, DeleteResult


class SkillCompletionRepository:
    def __init__(self, collection: Collection):
        self.collection = collection
    
    def create_completion(self, skill_id: str, user_id: str, day_number: int, completion_data: dict = None) -> InsertOneResult:
        """Record a skill day completion"""
        completion_record = {
            "skill_id": ObjectId(skill_id),
            "user_id": ObjectId(user_id),
            "day_number": day_number,
            "completed_at": datetime.utcnow(),
            "completion_data": completion_data or {}
        }
        return self.collection.insert_one(completion_record)
    
    def delete_completion(self, skill_id: str, user_id: str, day_number: int) -> DeleteResult:
        """Remove a skill day completion (for undo functionality)"""
        return self.collection.delete_one({
            "skill_id": ObjectId(skill_id),
            "user_id": ObjectId(user_id),
            "day_number": day_number
        })
    
    def find_completion(self, skill_id: str, user_id: str, day_number: int) -> Optional[Dict]:
        """Find a specific skill day completion"""
        return self.collection.find_one({
            "skill_id": ObjectId(skill_id),
            "user_id": ObjectId(user_id),
            "day_number": day_number
        })
    
    def find_skill_completions(self, skill_id: str, user_id: str) -> List[Dict]:
        """Get all completions for a specific skill"""
        return list(self.collection.find({
            "skill_id": ObjectId(skill_id),
            "user_id": ObjectId(user_id)
        }).sort("day_number", 1))
    
    def find_user_completions(self, user_id: str, days: int = 30) -> List[Dict]:
        """Get all user completions within the last N days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        return list(self.collection.find({
            "user_id": ObjectId(user_id),
            "completed_at": {"$gte": cutoff_date}
        }).sort("completed_at", -1))
    
    def find_completions_by_date(self, user_id: str, date: datetime) -> List[Dict]:
        """Get all completions for a specific date"""
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        return list(self.collection.find({
            "user_id": ObjectId(user_id),
            "completed_at": {
                "$gte": start_of_day,
                "$lte": end_of_day
            }
        }))
    
    def get_completion_stats(self, user_id: str, days: int = 30) -> Dict:
        """Get completion statistics for the user"""
        pipeline = [
            {
                "$match": {
                    "user_id": ObjectId(user_id),
                    "completed_at": {"$gte": datetime.utcnow() - timedelta(days=days)}
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$completed_at"}},
                        "skill_id": "$skill_id"
                    },
                    "completions": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "skill_completions": {"$sum": 1},
                    "total_completions": {"$sum": "$completions"}
                }
            },
            {
                "$sort": {"_id": 1}
            }
        ]
        
        return list(self.collection.aggregate(pipeline))