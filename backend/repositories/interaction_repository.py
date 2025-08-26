from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime, timedelta
from typing import List, Dict, Optional

class InteractionRepository:
    """Repository for managing user interactions with shared skills (likes, downloads, ratings)"""

    def __init__(self, db_collection):
        self.collection = db_collection

    def upsert_interaction(self, user_id: str, plan_id: str, interaction_type: str, data: Dict = None) -> Dict:
        """Upsert an interaction (like, download, rate)"""
        interaction_data = {
            "user_id": ObjectId(user_id),
            "plan_id": ObjectId(plan_id),
            "interaction_type": interaction_type,
            "created_at": datetime.utcnow()
        }
        
        # Add additional data for specific interaction types
        if data:
            if interaction_type == "rate" and "rating" in data:
                interaction_data["rating"] = data["rating"]

        # Use upsert to replace existing interaction of same type
        result = self.collection.replace_one(
            {
                "user_id": ObjectId(user_id),
                "plan_id": ObjectId(plan_id),
                "interaction_type": interaction_type
            },
            interaction_data,
            upsert=True
        )

        # Return the interaction document
        return self.collection.find_one({
            "user_id": ObjectId(user_id),
            "plan_id": ObjectId(plan_id),
            "interaction_type": interaction_type
        })

    def remove_interaction(self, user_id: str, plan_id: str, interaction_type: str) -> DeleteResult:
        """Remove a specific interaction"""
        return self.collection.delete_one({
            "user_id": ObjectId(user_id),
            "plan_id": ObjectId(plan_id),
            "interaction_type": interaction_type
        })

    def get_user_interaction(self, user_id: str, plan_id: str, interaction_type: str) -> Optional[Dict]:
        """Get a specific interaction by user and plan"""
        return self.collection.find_one({
            "user_id": ObjectId(user_id),
            "plan_id": ObjectId(plan_id),
            "interaction_type": interaction_type
        })

    def get_user_interactions(self, user_id: str, interaction_type: Optional[str] = None) -> List[Dict]:
        """Get all interactions for a user, optionally filtered by type"""
        query = {"user_id": ObjectId(user_id)}
        
        if interaction_type:
            query["interaction_type"] = interaction_type
            
        return list(self.collection.find(query).sort("created_at", -1))

    def get_plan_interactions(self, plan_id: str, interaction_type: Optional[str] = None) -> List[Dict]:
        """Get all interactions for a plan, optionally filtered by type"""
        query = {"plan_id": ObjectId(plan_id)}
        
        if interaction_type:
            query["interaction_type"] = interaction_type
            
        return list(self.collection.find(query).sort("created_at", -1))

    def get_plan_stats(self, plan_id: str) -> Dict:
        """Get interaction statistics for a plan"""
        pipeline = [
            {"$match": {"plan_id": ObjectId(plan_id)}},
            {"$group": {
                "_id": "$interaction_type",
                "count": {"$sum": 1},
                "avg_rating": {
                    "$avg": {
                        "$cond": [
                            {"$eq": ["$interaction_type", "rate"]},
                            "$rating",
                            None
                        ]
                    }
                }
            }}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        # Format the results into a more usable structure
        stats = {
            "likes": 0,
            "downloads": 0,
            "ratings": {
                "count": 0,
                "average": 0.0
            }
        }
        
        for result in results:
            interaction_type = result["_id"]
            if interaction_type == "like":
                stats["likes"] = result["count"]
            elif interaction_type == "download":
                stats["downloads"] = result["count"]
            elif interaction_type == "rate":
                stats["ratings"]["count"] = result["count"]
                stats["ratings"]["average"] = round(result.get("avg_rating", 0.0), 2)
        
        return stats

    def get_user_liked_plans(self, user_id: str) -> List[Dict]:
        """Get all plans liked by a user"""
        return list(self.collection.find({
            "user_id": ObjectId(user_id),
            "interaction_type": "like"
        }).sort("created_at", -1))

    def get_user_downloaded_plans(self, user_id: str) -> List[Dict]:
        """Get all plans downloaded by a user"""
        return list(self.collection.find({
            "user_id": ObjectId(user_id),
            "interaction_type": "download"
        }).sort("created_at", -1))

    def get_user_rated_plans(self, user_id: str) -> List[Dict]:
        """Get all plans rated by a user"""
        return list(self.collection.find({
            "user_id": ObjectId(user_id),
            "interaction_type": "rate"
        }).sort("created_at", -1))

    def check_user_has_liked(self, user_id: str, plan_id: str) -> bool:
        """Check if user has liked a specific plan"""
        count = self.collection.count_documents({
            "user_id": ObjectId(user_id),
            "plan_id": ObjectId(plan_id),
            "interaction_type": "like"
        })
        return count > 0

    def check_user_has_downloaded(self, user_id: str, plan_id: str) -> bool:
        """Check if user has downloaded a specific plan"""
        count = self.collection.count_documents({
            "user_id": ObjectId(user_id),
            "plan_id": ObjectId(plan_id),
            "interaction_type": "download"
        })
        return count > 0

    def get_user_rating_for_plan(self, user_id: str, plan_id: str) -> Optional[int]:
        """Get user's rating for a specific plan"""
        interaction = self.collection.find_one({
            "user_id": ObjectId(user_id),
            "plan_id": ObjectId(plan_id),
            "interaction_type": "rate"
        })
        return interaction.get("rating") if interaction else None

    def get_rating_distribution(self, plan_id: str) -> Dict:
        """Get rating distribution for a plan"""
        pipeline = [
            {"$match": {
                "plan_id": ObjectId(plan_id),
                "interaction_type": "rate"
            }},
            {"$group": {
                "_id": "$rating",
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": -1}}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        # Initialize distribution
        distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        
        # Fill in actual counts
        for result in results:
            rating = result["_id"]
            if rating in distribution:
                distribution[rating] = result["count"]
        
        return distribution

    def get_popular_plans(self, interaction_type: str, limit: int = 20, days: int = 30) -> List[Dict]:
        """Get most popular plans based on interaction type"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {
                "interaction_type": interaction_type,
                "created_at": {"$gte": cutoff_date}
            }},
            {"$group": {
                "_id": "$plan_id",
                "count": {"$sum": 1},
                "latest_interaction": {"$max": "$created_at"}
            }},
            {"$sort": {"count": -1, "latest_interaction": -1}},
            {"$limit": limit},
            {"$lookup": {
                "from": "shared_skills",
                "localField": "_id",
                "foreignField": "_id",
                "as": "skill_info"
            }},
            {"$unwind": "$skill_info"},
            {"$project": {
                "plan_id": "$_id",
                "interaction_count": "$count",
                "skill_info": 1
            }}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def get_user_interaction_stats(self, user_id: str) -> Dict:
        """Get interaction statistics for a user"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$group": {
                "_id": "$interaction_type",
                "count": {"$sum": 1}
            }}
        ]
        
        results = list(self.collection.aggregate(pipeline))
        
        stats = {
            "likes_given": 0,
            "downloads_made": 0,
            "ratings_given": 0
        }
        
        for result in results:
            interaction_type = result["_id"]
            if interaction_type == "like":
                stats["likes_given"] = result["count"]
            elif interaction_type == "download":
                stats["downloads_made"] = result["count"]
            elif interaction_type == "rate":
                stats["ratings_given"] = result["count"]
        
        return stats