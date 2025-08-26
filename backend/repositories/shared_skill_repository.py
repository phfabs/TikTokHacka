from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class SharedSkillRepository:
    """Repository for managing shared skills in the social platform"""

    def __init__(self, db_collection):
        self.collection = db_collection

    def create(self, skill_data: Dict) -> Dict:
        """Create a new shared skill"""
        skill_data['created_at'] = datetime.utcnow()
        skill_data['updated_at'] = datetime.utcnow()
        skill_data['likes_count'] = 0
        skill_data['downloads_count'] = 0
        skill_data['rating'] = {'average': 0.0, 'count': 0}
        
        result: InsertOneResult = self.collection.insert_one(skill_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def find_by_id(self, skill_id: str) -> Optional[Dict]:
        """Find a shared skill by its ID"""
        try:
            return self.collection.find_one({"_id": ObjectId(skill_id)})
        except:
            return None

    def find_by_user(self, user_id: str) -> List[Dict]:
        """Find all skills shared by a specific user"""
        return list(self.collection.find({
            "shared_by": ObjectId(user_id)
        }).sort("created_at", -1))

    def find_public_skills(self, skip: int = 0, limit: int = 10, filters: Dict = None) -> List[Dict]:
        """Find public shared skills with pagination and optional filters"""
        query = {"visibility": "public"}
        
        # Apply filters if provided
        if filters:
            if filters.get('category'):
                query['category'] = filters['category']
            if filters.get('difficulty'):
                query['difficulty'] = filters['difficulty']
            if filters.get('has_custom_tasks') is not None:
                query['has_custom_tasks'] = filters['has_custom_tasks']
            if filters.get('min_rating'):
                query['rating.average'] = {"$gte": float(filters['min_rating'])}

        return list(self.collection.find(query)
                   .sort("created_at", -1)
                   .skip(skip)
                   .limit(limit))

    def search_skills(self, query: str, skip: int = 0, limit: int = 10, filters: Dict = None) -> List[Dict]:
        """Search skills using MongoDB text search"""
        search_query = {
            "$text": {"$search": query},
            "visibility": "public"
        }
        
        # Apply additional filters
        if filters:
            if filters.get('category'):
                search_query['category'] = filters['category']
            if filters.get('difficulty'):
                search_query['difficulty'] = filters['difficulty']
            if filters.get('has_custom_tasks') is not None:
                search_query['has_custom_tasks'] = filters['has_custom_tasks']

        return list(self.collection.find(search_query, {"score": {"$meta": "textScore"}})
                   .sort([("score", {"$meta": "textScore"}), ("likes_count", -1)])
                   .skip(skip)
                   .limit(limit))

    def get_trending_skills(self, time_period: str = "week", limit: int = 10) -> List[Dict]:
        """Get trending skills based on recent activity"""
        # Define time window
        time_windows = {
            "day": 1,
            "week": 7,
            "month": 30
        }
        days = time_windows.get(time_period, 7)
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Aggregation pipeline to calculate trending score
        pipeline = [
            {"$match": {
                "visibility": "public",
                "created_at": {"$gte": cutoff_date}
            }},
            {"$addFields": {
                "trending_score": {
                    "$add": [
                        {"$multiply": ["$likes_count", 2]},
                        "$downloads_count",
                        {"$multiply": ["$rating.average", "$rating.count", 0.5]}
                    ]
                }
            }},
            {"$sort": {"trending_score": -1, "created_at": -1}},
            {"$limit": limit}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def get_categories_with_counts(self) -> List[Dict]:
        """Get skill categories with their counts"""
        pipeline = [
            {"$match": {"visibility": "public"}},
            {"$group": {
                "_id": "$category",
                "count": {"$sum": 1},
                "avg_rating": {"$avg": "$rating.average"}
            }},
            {"$sort": {"count": -1}},
            {"$project": {
                "category": "$_id",
                "count": 1,
                "avg_rating": {"$round": ["$avg_rating", 1]},
                "_id": 0
            }}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def increment_likes(self, skill_id: str) -> UpdateResult:
        """Increment the likes count for a skill"""
        return self.collection.update_one(
            {"_id": ObjectId(skill_id)},
            {
                "$inc": {"likes_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def decrement_likes(self, skill_id: str) -> UpdateResult:
        """Decrement the likes count for a skill"""
        return self.collection.update_one(
            {"_id": ObjectId(skill_id)},
            {
                "$inc": {"likes_count": -1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def increment_downloads(self, skill_id: str) -> UpdateResult:
        """Increment the downloads count for a skill"""
        return self.collection.update_one(
            {"_id": ObjectId(skill_id)},
            {
                "$inc": {"downloads_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    def update_rating(self, skill_id: str, new_average: float, new_count: int) -> UpdateResult:
        """Update the rating for a skill"""
        return self.collection.update_one(
            {"_id": ObjectId(skill_id)},
            {
                "$set": {
                    "rating.average": round(new_average, 2),
                    "rating.count": new_count,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    def update_custom_task_status(self, skill_id: str, has_custom_tasks: bool) -> UpdateResult:
        """Update whether the skill has custom tasks"""
        return self.collection.update_one(
            {"_id": ObjectId(skill_id)},
            {
                "$set": {
                    "has_custom_tasks": has_custom_tasks,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    def delete_by_id(self, skill_id: str, user_id: str) -> DeleteResult:
        """Delete a shared skill (only by the owner)"""
        return self.collection.delete_one({
            "_id": ObjectId(skill_id),
            "shared_by": ObjectId(user_id)
        })

    def count_public_skills(self, filters: Dict = None) -> int:
        """Count public skills with optional filters"""
        query = {"visibility": "public"}
        
        if filters:
            if filters.get('category'):
                query['category'] = filters['category']
            if filters.get('difficulty'):
                query['difficulty'] = filters['difficulty']
            if filters.get('has_custom_tasks') is not None:
                query['has_custom_tasks'] = filters['has_custom_tasks']

        return self.collection.count_documents(query)