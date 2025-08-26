from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime
from typing import List, Dict, Optional

class CustomTaskRepository:
    """Repository for managing custom tasks added to shared skills"""

    def __init__(self, db_collection):
        self.collection = db_collection

    def create(self, task_data: Dict) -> Dict:
        """Create a new custom task"""
        task_data['created_at'] = datetime.utcnow()
        task_data['updated_at'] = datetime.utcnow()
        task_data['votes'] = {'up': 0, 'down': 0}
        
        result: InsertOneResult = self.collection.insert_one(task_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def find_by_id(self, task_id: str) -> Optional[Dict]:
        """Find a custom task by its ID"""
        try:
            return self.collection.find_one({"_id": ObjectId(task_id)})
        except:
            return None

    def find_by_skill(self, skill_id: str, day: Optional[int] = None) -> List[Dict]:
        """Find custom tasks for a skill, optionally filtered by day"""
        query = {"skill_id": ObjectId(skill_id)}
        
        if day is not None:
            query['day'] = day
            
        return list(self.collection.find(query)
                   .sort([("votes.up", -1), ("created_at", -1)]))

    def find_by_skill_and_day(self, skill_id: str, day: int) -> List[Dict]:
        """Find custom tasks for a specific skill and day"""
        return list(self.collection.find({
            "skill_id": ObjectId(skill_id),
            "day": day
        }).sort([("votes.up", -1), ("created_at", -1)]))

    def find_by_user(self, user_id: str, limit: int = 50) -> List[Dict]:
        """Find custom tasks created by a specific user"""
        return list(self.collection.find({
            "user_id": ObjectId(user_id)
        }).sort("created_at", -1).limit(limit))

    def get_task_stats_for_skill(self, skill_id: str) -> Dict:
        """Get statistics about custom tasks for a skill"""
        pipeline = [
            {"$match": {"skill_id": ObjectId(skill_id)}},
            {"$group": {
                "_id": None,
                "total_tasks": {"$sum": 1},
                "total_upvotes": {"$sum": "$votes.up"},
                "total_downvotes": {"$sum": "$votes.down"},
                "unique_days": {"$addToSet": "$day"},
                "unique_contributors": {"$addToSet": "$user_id"}
            }},
            {"$project": {
                "_id": 0,
                "total_tasks": 1,
                "total_upvotes": 1,
                "total_downvotes": 1,
                "days_with_custom_tasks": {"$size": "$unique_days"},
                "contributor_count": {"$size": "$unique_contributors"}
            }}
        ]
        
        result = list(self.collection.aggregate(pipeline))
        return result[0] if result else {
            "total_tasks": 0,
            "total_upvotes": 0,
            "total_downvotes": 0,
            "days_with_custom_tasks": 0,
            "contributor_count": 0
        }

    def get_popular_tasks(self, limit: int = 20) -> List[Dict]:
        """Get most popular custom tasks across all skills"""
        pipeline = [
            {"$addFields": {
                "popularity_score": {
                    "$subtract": ["$votes.up", "$votes.down"]
                }
            }},
            {"$sort": {"popularity_score": -1, "created_at": -1}},
            {"$limit": limit},
            {"$lookup": {
                "from": "shared_skills",
                "localField": "skill_id",
                "foreignField": "_id",
                "as": "skill_info"
            }},
            {"$unwind": "$skill_info"},
            {"$project": {
                "task": 1,
                "day": 1,
                "votes": 1,
                "popularity_score": 1,
                "created_at": 1,
                "skill_title": "$skill_info.title",
                "skill_category": "$skill_info.category"
            }}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def vote_up(self, task_id: str) -> UpdateResult:
        """Add an upvote to a task"""
        return self.collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$inc": {"votes.up": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def vote_down(self, task_id: str) -> UpdateResult:
        """Add a downvote to a task"""
        return self.collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$inc": {"votes.down": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def remove_vote_up(self, task_id: str) -> UpdateResult:
        """Remove an upvote from a task"""
        return self.collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$inc": {"votes.up": -1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def remove_vote_down(self, task_id: str) -> UpdateResult:
        """Remove a downvote from a task"""
        return self.collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$inc": {"votes.down": -1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def update_task(self, task_id: str, user_id: str, updates: Dict) -> UpdateResult:
        """Update a custom task (only by the creator)"""
        updates['updated_at'] = datetime.utcnow()
        return self.collection.update_one(
            {"_id": ObjectId(task_id), "user_id": ObjectId(user_id)},
            {"$set": updates}
        )

    def delete_task(self, task_id: str, user_id: str) -> DeleteResult:
        """Delete a custom task (only by the creator)"""
        return self.collection.delete_one({
            "_id": ObjectId(task_id),
            "user_id": ObjectId(user_id)
        })

    def count_tasks_for_skill(self, skill_id: str) -> int:
        """Count custom tasks for a specific skill"""
        return self.collection.count_documents({"skill_id": ObjectId(skill_id)})

    def count_tasks_by_user(self, user_id: str) -> int:
        """Count custom tasks created by a user"""
        return self.collection.count_documents({"user_id": ObjectId(user_id)})

    def get_user_task_stats(self, user_id: str) -> Dict:
        """Get statistics about a user's custom task contributions"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$group": {
                "_id": None,
                "total_tasks": {"$sum": 1},
                "total_upvotes": {"$sum": "$votes.up"},
                "total_downvotes": {"$sum": "$votes.down"},
                "unique_skills": {"$addToSet": "$skill_id"}
            }},
            {"$project": {
                "_id": 0,
                "total_tasks": 1,
                "total_upvotes": 1,
                "total_downvotes": 1,
                "skills_contributed": {"$size": "$unique_skills"},
                "avg_score": {
                    "$divide": [
                        {"$subtract": ["$total_upvotes", "$total_downvotes"]},
                        "$total_tasks"
                    ]
                }
            }}
        ]
        
        result = list(self.collection.aggregate(pipeline))
        return result[0] if result else {
            "total_tasks": 0,
            "total_upvotes": 0,
            "total_downvotes": 0,
            "skills_contributed": 0,
            "avg_score": 0
        }

    def check_user_has_task_for_day(self, skill_id: str, day: int, user_id: str) -> bool:
        """Check if a user already has a custom task for a specific skill and day"""
        count = self.collection.count_documents({
            "skill_id": ObjectId(skill_id),
            "day": day,
            "user_id": ObjectId(user_id)
        })
        return count > 0