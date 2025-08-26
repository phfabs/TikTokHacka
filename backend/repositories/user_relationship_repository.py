from bson import ObjectId
from pymongo.results import InsertOneResult, UpdateResult, DeleteResult
from datetime import datetime
from typing import List, Dict, Optional

class UserRelationshipRepository:
    """Repository for managing user relationships (follows, blocks, etc.)"""

    def __init__(self, db_collection):
        self.collection = db_collection

    def create_relationship(self, follower_id: str, following_id: str, 
                          relationship_type: str = "follow") -> Dict:
        """Create a new user relationship"""
        relationship_data = {
            "follower_id": ObjectId(follower_id),
            "following_id": ObjectId(following_id),
            "relationship_type": relationship_type,  # 'follow', 'block'
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        result: InsertOneResult = self.collection.insert_one(relationship_data)
        return self.collection.find_one({"_id": result.inserted_id})

    def find_relationship(self, follower_id: str, following_id: str, 
                         relationship_type: str = "follow") -> Optional[Dict]:
        """Find a specific relationship between two users"""
        return self.collection.find_one({
            "follower_id": ObjectId(follower_id),
            "following_id": ObjectId(following_id),
            "relationship_type": relationship_type,
            "is_active": True
        })

    def delete_relationship(self, follower_id: str, following_id: str, 
                          relationship_type: str = "follow") -> DeleteResult:
        """Delete a relationship (unfollow, unblock)"""
        return self.collection.delete_one({
            "follower_id": ObjectId(follower_id),
            "following_id": ObjectId(following_id),
            "relationship_type": relationship_type
        })

    def get_followers(self, user_id: str, limit: int = 50, skip: int = 0) -> List[Dict]:
        """Get users following this user"""
        pipeline = [
            {"$match": {
                "following_id": ObjectId(user_id),
                "relationship_type": "follow",
                "is_active": True
            }},
            {"$lookup": {
                "from": "users",
                "localField": "follower_id",
                "foreignField": "_id",
                "as": "follower_info"
            }},
            {"$unwind": "$follower_info"},
            {"$project": {
                "follower_id": 1,
                "created_at": 1,
                "follower_info.username": 1,
                "follower_info.email": 1,
                "follower_info.profile_picture": 1
            }},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def get_following(self, user_id: str, limit: int = 50, skip: int = 0) -> List[Dict]:
        """Get users this user is following"""
        pipeline = [
            {"$match": {
                "follower_id": ObjectId(user_id),
                "relationship_type": "follow",
                "is_active": True
            }},
            {"$lookup": {
                "from": "users",
                "localField": "following_id",
                "foreignField": "_id",
                "as": "following_info"
            }},
            {"$unwind": "$following_info"},
            {"$project": {
                "following_id": 1,
                "created_at": 1,
                "following_info.username": 1,
                "following_info.email": 1,
                "following_info.profile_picture": 1
            }},
            {"$sort": {"created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def get_follower_count(self, user_id: str) -> int:
        """Get count of followers for a user"""
        return self.collection.count_documents({
            "following_id": ObjectId(user_id),
            "relationship_type": "follow",
            "is_active": True
        })

    def get_following_count(self, user_id: str) -> int:
        """Get count of users this user is following"""
        return self.collection.count_documents({
            "follower_id": ObjectId(user_id),
            "relationship_type": "follow",
            "is_active": True
        })

    def get_mutual_followers(self, user1_id: str, user2_id: str) -> List[Dict]:
        """Get mutual followers between two users"""
        pipeline = [
            {"$match": {
                "following_id": {"$in": [ObjectId(user1_id), ObjectId(user2_id)]},
                "relationship_type": "follow",
                "is_active": True
            }},
            {"$group": {
                "_id": "$follower_id",
                "count": {"$sum": 1}
            }},
            {"$match": {"count": 2}},  # Users who follow both
            {"$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": "$user_info"},
            {"$project": {
                "user_id": "$_id",
                "username": "$user_info.username",
                "profile_picture": "$user_info.profile_picture"
            }}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def get_suggested_follows(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get suggested users to follow based on mutual connections"""
        pipeline = [
            # Get users that current user's follows are following
            {"$match": {
                "follower_id": ObjectId(user_id),
                "relationship_type": "follow",
                "is_active": True
            }},
            {"$lookup": {
                "from": "user_relationships",
                "let": {"following_id": "$following_id"},
                "pipeline": [
                    {"$match": {
                        "$expr": {"$eq": ["$follower_id", "$$following_id"]},
                        "relationship_type": "follow",
                        "is_active": True
                    }}
                ],
                "as": "their_follows"
            }},
            {"$unwind": "$their_follows"},
            {"$group": {
                "_id": "$their_follows.following_id",
                "mutual_count": {"$sum": 1}
            }},
            # Exclude users already being followed or self
            {"$lookup": {
                "from": "user_relationships",
                "let": {"suggested_user": "$_id"},
                "pipeline": [
                    {"$match": {
                        "$expr": {
                            "$and": [
                                {"$eq": ["$follower_id", ObjectId(user_id)]},
                                {"$eq": ["$following_id", "$$suggested_user"]},
                                {"$eq": ["$is_active", True]}
                            ]
                        }
                    }}
                ],
                "as": "existing_follow"
            }},
            {"$match": {
                "_id": {"$ne": ObjectId(user_id)},  # Not self
                "existing_follow": {"$size": 0}     # Not already following
            }},
            {"$lookup": {
                "from": "users",
                "localField": "_id",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": "$user_info"},
            {"$project": {
                "user_id": "$_id",
                "username": "$user_info.username",
                "profile_picture": "$user_info.profile_picture",
                "mutual_connections": "$mutual_count"
            }},
            {"$sort": {"mutual_connections": -1, "username": 1}},
            {"$limit": limit}
        ]
        
        return list(self.collection.aggregate(pipeline))

    def is_following(self, follower_id: str, following_id: str) -> bool:
        """Check if user is following another user"""
        return self.find_relationship(follower_id, following_id, "follow") is not None

    def is_blocked(self, blocker_id: str, blocked_id: str) -> bool:
        """Check if user has blocked another user"""
        return self.find_relationship(blocker_id, blocked_id, "block") is not None

    def get_relationship_stats(self, user_id: str) -> Dict:
        """Get relationship statistics for a user"""
        follower_count = self.get_follower_count(user_id)
        following_count = self.get_following_count(user_id)
        
        # Get blocked users count
        blocked_count = self.collection.count_documents({
            "follower_id": ObjectId(user_id),
            "relationship_type": "block",
            "is_active": True
        })
        
        return {
            "followers": follower_count,
            "following": following_count,
            "blocked": blocked_count
        }

    def bulk_unfollow(self, user_id: str, following_ids: List[str]) -> int:
        """Bulk unfollow multiple users"""
        result = self.collection.delete_many({
            "follower_id": ObjectId(user_id),
            "following_id": {"$in": [ObjectId(fid) for fid in following_ids]},
            "relationship_type": "follow"
        })
        
        return result.deleted_count

    def get_recent_followers(self, user_id: str, days: int = 7, limit: int = 10) -> List[Dict]:
        """Get recent followers within specified days"""
        from datetime import timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {
                "following_id": ObjectId(user_id),
                "relationship_type": "follow",
                "is_active": True,
                "created_at": {"$gte": cutoff_date}
            }},
            {"$lookup": {
                "from": "users",
                "localField": "follower_id",
                "foreignField": "_id",
                "as": "follower_info"
            }},
            {"$unwind": "$follower_info"},
            {"$project": {
                "follower_id": 1,
                "created_at": 1,
                "follower_info.username": 1,
                "follower_info.profile_picture": 1
            }},
            {"$sort": {"created_at": -1}},
            {"$limit": limit}
        ]
        
        return list(self.collection.aggregate(pipeline))