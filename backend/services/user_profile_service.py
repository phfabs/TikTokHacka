from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from flask import g, current_app
from bson import ObjectId
import logging
import secrets
from backend.auth.models import User

class UserProfileService:
    """Service for managing user profiles and related features"""

    @staticmethod
    def get_user_profile(user_id: str, viewer_id: str = None, include_private: bool = False) -> Optional[Dict]:
        """Get user profile with privacy controls"""
        
        try:
            user = User.find_by_id(user_id)
            if not user:
                return None
            
            # Check if user is deactivated
            if user.get('is_deactivated', False) and user_id != viewer_id:
                return None
            
            # Base profile data
            profile = {
                "user_id": user_id,
                "username": user.get("username", ""),
                "email": user.get("email", "") if include_private else None,
                "bio": user.get("bio", ""),
                "location": user.get("location", ""),
                "website": user.get("website", ""),
                "profile_picture": user.get("profile_picture"),
                "created_at": user.get("created_at", datetime.utcnow()).isoformat(),
                "last_active": user.get("last_active", datetime.utcnow()).isoformat(),
                "is_verified": user.get("is_verified", False),
                "avatar_url": f"https://ui-avatars.com/api/?name={user.get('username', 'U')[0]}&background=8B5CF6&color=fff&size=100"
            }
            
            # Privacy settings
            privacy_settings = user.get('privacy_settings', {})
            
            # Add conditional fields based on privacy
            if include_private or not privacy_settings.get('hide_skills', False):
                profile["skills_interests"] = user.get("skills_interests", [])
                profile["learning_goals"] = user.get("learning_goals", [])
                profile["preferred_difficulty"] = user.get("preferred_difficulty", "Beginner")
            
            if include_private or not privacy_settings.get('hide_stats', False):
                # Get user statistics
                from backend.services.follow_service import FollowService
                follow_stats = FollowService.get_user_follow_stats(user_id)
                
                profile.update({
                    "followers_count": follow_stats["followers_count"],
                    "following_count": follow_stats["following_count"],
                    "skills_shared_count": UserProfileService._get_shared_skills_count(user_id),
                    "total_downloads": UserProfileService._get_total_downloads(user_id),
                    "total_likes_received": UserProfileService._get_total_likes(user_id)
                })
            
            if include_private:
                profile.update({
                    "timezone": user.get("timezone", "UTC"),
                    "birth_date": user.get("birth_date").isoformat() if user.get("birth_date") else None,
                    "email_verified": user.get("email_verified", False),
                    "privacy_settings": privacy_settings
                })
            
            # Add relationship status if viewer is provided
            if viewer_id and viewer_id != user_id:
                from backend.services.follow_service import FollowService
                relationship = FollowService.get_follow_status(viewer_id, user_id)
                profile["relationship"] = relationship
            
            return profile
            
        except Exception as e:
            logging.error(f"Error getting user profile: {e}")
            return None

    @staticmethod
    def update_user_profile(user_id: str, update_data: Dict) -> Tuple[bool, str, Optional[Dict]]:
        """Update user profile"""
        
        try:
            # Check for username uniqueness if updating username
            if 'username' in update_data:
                existing_user = User.find_by_username(update_data['username'])
                if existing_user and str(existing_user['_id']) != user_id:
                    return False, "Username already taken", None
            
            # Prepare update data
            update_fields = {}
            allowed_fields = [
                'username', 'bio', 'location', 'website', 'birth_date',
                'skills_interests', 'learning_goals', 'preferred_difficulty',
                'timezone', 'privacy_settings'
            ]
            
            for field in allowed_fields:
                if field in update_data:
                    update_fields[field] = update_data[field]
            
            update_fields['updated_at'] = datetime.utcnow()
            
            # Update user in database
            user_collection = g.db.users
            result = user_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                # Get updated profile
                updated_profile = UserProfileService.get_user_profile(user_id, include_private=True)
                
                logging.info(f"User {user_id} updated profile")
                
                return True, "Profile updated successfully", updated_profile
            else:
                return False, "No changes made to profile", None
                
        except Exception as e:
            logging.error(f"Error updating user profile: {e}")
            return False, "Failed to update profile", None

    @staticmethod
    def search_users(query: str, searcher_id: str = None, limit: int = 20, skip: int = 0) -> Dict:
        """Search for users by various criteria"""
        
        try:
            # Build search query
            search_filters = []
            
            # Text search on username, bio, skills
            search_filters.append({
                "$or": [
                    {"username": {"$regex": query, "$options": "i"}},
                    {"bio": {"$regex": query, "$options": "i"}},
                    {"skills_interests": {"$in": [{"$regex": query, "$options": "i"}]}}
                ]
            })
            
            # Exclude deactivated users
            search_filters.append({"is_deactivated": {"$ne": True}})
            
            # Exclude users who have blocked the searcher (if searcher provided)
            if searcher_id:
                # This would require additional logic to check user_relationships
                pass
            
            # Execute search
            user_collection = g.db.users
            pipeline = [
                {"$match": {"$and": search_filters}},
                {"$project": {
                    "username": 1,
                    "bio": 1,
                    "location": 1,
                    "profile_picture": 1,
                    "skills_interests": 1,
                    "is_verified": 1,
                    "created_at": 1
                }},
                {"$sort": {"username": 1}},
                {"$skip": skip},
                {"$limit": limit}
            ]
            
            results = list(user_collection.aggregate(pipeline))
            
            # Format results
            formatted_users = []
            for user in results:
                formatted_users.append({
                    "user_id": str(user["_id"]),
                    "username": user["username"],
                    "bio": user.get("bio", ""),
                    "location": user.get("location", ""),
                    "profile_picture": user.get("profile_picture"),
                    "skills_interests": user.get("skills_interests", [])[:3],  # Show first 3
                    "is_verified": user.get("is_verified", False),
                    "avatar_url": f"https://ui-avatars.com/api/?name={user['username'][0]}&background=8B5CF6&color=fff&size=60"
                })
            
            # Get total count for pagination
            total_count = user_collection.count_documents({"$and": search_filters})
            
            return {
                "users": formatted_users,
                "total_count": total_count,
                "page_info": {
                    "has_more": (skip + limit) < total_count,
                    "next_skip": skip + limit if (skip + limit) < total_count else None
                }
            }
            
        except Exception as e:
            logging.error(f"Error searching users: {e}")
            return {"users": [], "total_count": 0, "page_info": {"has_more": False}}

    @staticmethod
    def get_user_leaderboard(leaderboard_type: str = "overall", limit: int = 50) -> Dict:
        """Get user leaderboard based on various metrics"""
        
        try:
            user_collection = g.db.users
            
            if leaderboard_type == "followers":
                # Get users with most followers
                pipeline = [
                    {"$match": {"is_deactivated": {"$ne": True}}},
                    {"$lookup": {
                        "from": "user_relationships",
                        "let": {"user_id": "$_id"},
                        "pipeline": [
                            {"$match": {
                                "$expr": {"$eq": ["$following_id", "$$user_id"]},
                                "relationship_type": "follow",
                                "is_active": True
                            }},
                            {"$count": "followers"}
                        ],
                        "as": "follower_data"
                    }},
                    {"$addFields": {
                        "followers_count": {
                            "$ifNull": [{"$arrayElemAt": ["$follower_data.followers", 0]}, 0]
                        }
                    }},
                    {"$sort": {"followers_count": -1, "username": 1}},
                    {"$limit": limit},
                    {"$project": {
                        "username": 1,
                        "bio": 1,
                        "profile_picture": 1,
                        "is_verified": 1,
                        "followers_count": 1
                    }}
                ]
            
            elif leaderboard_type == "skills_shared":
                # Get users who shared most skills
                pipeline = [
                    {"$match": {"is_deactivated": {"$ne": True}}},
                    {"$lookup": {
                        "from": "shared_skills",
                        "localField": "_id",
                        "foreignField": "shared_by",
                        "as": "shared_skills"
                    }},
                    {"$addFields": {
                        "skills_count": {"$size": "$shared_skills"}
                    }},
                    {"$sort": {"skills_count": -1, "username": 1}},
                    {"$limit": limit},
                    {"$project": {
                        "username": 1,
                        "bio": 1,
                        "profile_picture": 1,
                        "is_verified": 1,
                        "skills_count": 1
                    }}
                ]
            
            else:  # overall
                # Combined score based on multiple metrics
                pipeline = [
                    {"$match": {"is_deactivated": {"$ne": True}}},
                    {"$lookup": {
                        "from": "shared_skills",
                        "localField": "_id",
                        "foreignField": "shared_by",
                        "as": "shared_skills"
                    }},
                    {"$lookup": {
                        "from": "user_relationships",
                        "let": {"user_id": "$_id"},
                        "pipeline": [
                            {"$match": {
                                "$expr": {"$eq": ["$following_id", "$$user_id"]},
                                "relationship_type": "follow",
                                "is_active": True
                            }}
                        ],
                        "as": "followers"
                    }},
                    {"$addFields": {
                        "overall_score": {
                            "$add": [
                                {"$size": "$shared_skills"},
                                {"$multiply": [{"$size": "$followers"}, 0.5]}
                            ]
                        }
                    }},
                    {"$sort": {"overall_score": -1, "username": 1}},
                    {"$limit": limit},
                    {"$project": {
                        "username": 1,
                        "bio": 1,
                        "profile_picture": 1,
                        "is_verified": 1,
                        "overall_score": 1
                    }}
                ]
            
            results = list(user_collection.aggregate(pipeline))
            
            # Format results
            leaderboard = []
            for idx, user in enumerate(results):
                leaderboard.append({
                    "rank": idx + 1,
                    "user_id": str(user["_id"]),
                    "username": user["username"],
                    "bio": user.get("bio", ""),
                    "profile_picture": user.get("profile_picture"),
                    "is_verified": user.get("is_verified", False),
                    "score": user.get("followers_count") or user.get("skills_count") or user.get("overall_score", 0),
                    "avatar_url": f"https://ui-avatars.com/api/?name={user['username'][0]}&background=8B5CF6&color=fff&size=60"
                })
            
            return {"users": leaderboard}
            
        except Exception as e:
            logging.error(f"Error getting user leaderboard: {e}")
            return {"users": []}

    @staticmethod
    def get_user_detailed_stats(user_id: str) -> Dict:
        """Get detailed statistics for a user"""
        
        try:
            stats = {}
            
            # Follow stats
            from backend.services.follow_service import FollowService
            follow_stats = FollowService.get_user_follow_stats(user_id)
            stats.update(follow_stats)
            
            # Skills stats
            stats.update({
                "skills_shared": UserProfileService._get_shared_skills_count(user_id),
                "total_downloads": UserProfileService._get_total_downloads(user_id),
                "total_likes_received": UserProfileService._get_total_likes(user_id),
                "total_comments_received": UserProfileService._get_total_comments_received(user_id),
                "custom_tasks_contributed": UserProfileService._get_custom_tasks_count(user_id)
            })
            
            # Activity stats (last 30 days)
            stats["recent_activity"] = UserProfileService._get_recent_activity_stats(user_id)
            
            # Achievement stats
            stats["achievements"] = UserProfileService._calculate_achievement_progress(user_id)
            
            return stats
            
        except Exception as e:
            logging.error(f"Error getting detailed user stats: {e}")
            return {}

    @staticmethod
    def get_user_public_stats(user_id: str, viewer_id: str = None) -> Dict:
        """Get public statistics for a user"""
        
        try:
            # Check privacy settings
            user = User.find_by_id(user_id)
            if not user:
                return {}
            
            privacy_settings = user.get('privacy_settings', {})
            if privacy_settings.get('hide_stats', False) and viewer_id != user_id:
                return {"message": "User has made their stats private"}
            
            # Return basic public stats
            from backend.services.follow_service import FollowService
            follow_stats = FollowService.get_user_follow_stats(user_id)
            
            public_stats = {
                "followers_count": follow_stats["followers_count"],
                "following_count": follow_stats["following_count"],
                "skills_shared": UserProfileService._get_shared_skills_count(user_id),
                "total_downloads": UserProfileService._get_total_downloads(user_id),
                "total_likes_received": UserProfileService._get_total_likes(user_id),
                "join_date": user.get("created_at", datetime.utcnow()).isoformat()
            }
            
            return public_stats
            
        except Exception as e:
            logging.error(f"Error getting public user stats: {e}")
            return {}

    @staticmethod
    def _get_shared_skills_count(user_id: str) -> int:
        """Get count of skills shared by user"""
        try:
            return g.db.shared_skills.count_documents({"shared_by": ObjectId(user_id)})
        except:
            return 0

    @staticmethod
    def _get_total_downloads(user_id: str) -> int:
        """Get total downloads across all user's skills"""
        try:
            pipeline = [
                {"$match": {"shared_by": ObjectId(user_id)}},
                {"$group": {"_id": None, "total": {"$sum": "$downloads_count"}}}
            ]
            result = list(g.db.shared_skills.aggregate(pipeline))
            return result[0]["total"] if result else 0
        except:
            return 0

    @staticmethod
    def _get_total_likes(user_id: str) -> int:
        """Get total likes across all user's skills"""
        try:
            pipeline = [
                {"$match": {"shared_by": ObjectId(user_id)}},
                {"$group": {"_id": None, "total": {"$sum": "$likes_count"}}}
            ]
            result = list(g.db.shared_skills.aggregate(pipeline))
            return result[0]["total"] if result else 0
        except:
            return 0

    @staticmethod
    def _get_total_comments_received(user_id: str) -> int:
        """Get total comments received on user's skills"""
        try:
            pipeline = [
                {"$lookup": {
                    "from": "shared_skills",
                    "localField": "plan_id",
                    "foreignField": "_id",
                    "as": "skill_info"
                }},
                {"$match": {"skill_info.shared_by": ObjectId(user_id)}},
                {"$count": "total"}
            ]
            result = list(g.db.plan_comments.aggregate(pipeline))
            return result[0]["total"] if result else 0
        except:
            return 0

    @staticmethod
    def _get_custom_tasks_count(user_id: str) -> int:
        """Get count of custom tasks contributed by user"""
        try:
            return g.db.custom_tasks.count_documents({"user_id": ObjectId(user_id)})
        except:
            return 0

    @staticmethod
    def _get_recent_activity_stats(user_id: str, days: int = 30) -> Dict:
        """Get user activity stats for recent period"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            stats = {
                "skills_shared": g.db.shared_skills.count_documents({
                    "shared_by": ObjectId(user_id),
                    "created_at": {"$gte": cutoff_date}
                }),
                "custom_tasks_added": g.db.custom_tasks.count_documents({
                    "user_id": ObjectId(user_id),
                    "created_at": {"$gte": cutoff_date}
                }),
                "comments_made": g.db.plan_comments.count_documents({
                    "user_id": ObjectId(user_id),
                    "created_at": {"$gte": cutoff_date}
                })
            }
            
            return stats
        except Exception as e:
            logging.error(f"Error getting recent activity stats: {e}")
            return {}

    @staticmethod
    def _calculate_achievement_progress(user_id: str) -> Dict:
        """Calculate achievement progress for user"""
        try:
            stats = UserProfileService.get_user_detailed_stats(user_id)
            achievements = {}
            
            # Define achievement thresholds
            achievement_levels = {
                "follower_milestones": [10, 50, 100, 500, 1000],
                "skills_shared_milestones": [1, 5, 10, 25, 50],
                "likes_milestones": [10, 50, 100, 500, 1000],
                "downloads_milestones": [50, 200, 500, 1000, 5000]
            }
            
            # Calculate achievements
            followers = stats.get("followers_count", 0)
            skills_shared = stats.get("skills_shared", 0)
            likes = stats.get("total_likes_received", 0)
            downloads = stats.get("total_downloads", 0)
            
            achievements["followers"] = UserProfileService._get_achievement_level(
                followers, achievement_levels["follower_milestones"]
            )
            achievements["skills_shared"] = UserProfileService._get_achievement_level(
                skills_shared, achievement_levels["skills_shared_milestones"]
            )
            achievements["likes"] = UserProfileService._get_achievement_level(
                likes, achievement_levels["likes_milestones"]
            )
            achievements["downloads"] = UserProfileService._get_achievement_level(
                downloads, achievement_levels["downloads_milestones"]
            )
            
            return achievements
        except Exception as e:
            logging.error(f"Error calculating achievements: {e}")
            return {}

    @staticmethod
    def _get_achievement_level(current_value: int, milestones: List[int]) -> Dict:
        """Get achievement level and progress"""
        completed_levels = [m for m in milestones if current_value >= m]
        current_level = len(completed_levels)
        
        if current_level < len(milestones):
            next_milestone = milestones[current_level]
            progress = (current_value / next_milestone) * 100
        else:
            next_milestone = None
            progress = 100
        
        return {
            "current_level": current_level,
            "total_levels": len(milestones),
            "current_value": current_value,
            "next_milestone": next_milestone,
            "progress_percentage": min(progress, 100)
        }

    # Additional methods would include:
    # - get_user_activity()
    # - get_user_public_activity()  
    # - get_user_achievements()
    # - get_user_public_achievements()
    # - update_privacy_settings()
    # - get_trending_users()
    # - get_user_recommendations()
    # - request_email_verification()
    # - verify_email()
    # - deactivate_account()
    
    # For brevity, I'm showing the core structure. The remaining methods would follow similar patterns.