from typing import Dict, List, Any, Optional, Tuple
from flask import g, current_app
from bson import ObjectId
import logging
from backend.repositories.user_relationship_repository import UserRelationshipRepository
from backend.services.notification_service import NotificationService

class FollowService:
    """Service for managing user follow relationships and related features"""

    @staticmethod
    def follow_user(follower_id: str, following_id: str) -> Tuple[bool, str, Optional[Dict]]:
        """Follow a user"""
        
        # Validation
        if follower_id == following_id:
            return False, "Cannot follow yourself", None
        
        # Check if target user exists
        from backend.auth.models import User
        target_user = User.find_by_id(following_id)
        if not target_user:
            return False, "User not found", None
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        # Check if already following
        existing = relationship_repo.find_relationship(follower_id, following_id, "follow")
        if existing:
            return False, "Already following this user", None
        
        # Check if user is blocked
        if relationship_repo.is_blocked(following_id, follower_id):
            return False, "Cannot follow this user", None
        
        # Create follow relationship
        try:
            relationship = relationship_repo.create_relationship(
                follower_id, following_id, "follow"
            )
            
            # Create notification for the followed user
            follower_user = User.find_by_id(follower_id)
            follower_username = follower_user.get("username", "Someone") if follower_user else "Someone"
            
            NotificationService.create_notification(
                user_id=following_id,
                notification_type=NotificationService.FOLLOWER_ADDED,
                reference_type="user",
                reference_id=follower_id,
                data={
                    "follower_name": follower_username,
                    "message": f"{follower_username} started following you"
                },
                actor_id=follower_id
            )
            
            # Notify via WebSocket if available
            try:
                if hasattr(current_app, 'websocket_service'):
                    websocket_service = current_app.websocket_service
                    websocket_service.notify_user_personal(
                        user_id=following_id,
                        notification_type="new_follower",
                        data={
                            "follower_id": follower_id,
                            "follower_name": follower_username,
                            "message": f"{follower_username} started following you"
                        }
                    )
            except Exception as e:
                logging.error(f"Failed to send follow WebSocket notification: {e}")
            
            logging.info(f"User {follower_id} started following {following_id}")
            
            return True, "Successfully followed user", {
                "relationship_id": str(relationship["_id"]),
                "followed_user": {
                    "user_id": following_id,
                    "username": target_user.get("username", ""),
                    "profile_picture": target_user.get("profile_picture")
                }
            }
            
        except Exception as e:
            logging.error(f"Error following user: {e}")
            return False, "Failed to follow user", None

    @staticmethod
    def unfollow_user(follower_id: str, following_id: str) -> Tuple[bool, str]:
        """Unfollow a user"""
        
        if follower_id == following_id:
            return False, "Cannot unfollow yourself"
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        # Check if following
        existing = relationship_repo.find_relationship(follower_id, following_id, "follow")
        if not existing:
            return False, "Not following this user"
        
        try:
            result = relationship_repo.delete_relationship(follower_id, following_id, "follow")
            
            if result.deleted_count > 0:
                logging.info(f"User {follower_id} unfollowed {following_id}")
                return True, "Successfully unfollowed user"
            else:
                return False, "Failed to unfollow user"
                
        except Exception as e:
            logging.error(f"Error unfollowing user: {e}")
            return False, "Failed to unfollow user"

    @staticmethod
    def get_followers(user_id: str, limit: int = 50, skip: int = 0) -> Dict:
        """Get followers for a user"""
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            followers = relationship_repo.get_followers(user_id, limit, skip)
            total_count = relationship_repo.get_follower_count(user_id)
            
            # Format follower data
            formatted_followers = []
            for follower in followers:
                formatted_followers.append({
                    "user_id": str(follower["follower_id"]),
                    "username": follower["follower_info"]["username"],
                    "profile_picture": follower["follower_info"].get("profile_picture"),
                    "followed_at": follower["created_at"].isoformat(),
                    "avatar_url": f"https://ui-avatars.com/api/?name={follower['follower_info']['username'][0]}&background=8B5CF6&color=fff&size=40"
                })
            
            return {
                "followers": formatted_followers,
                "total_count": total_count,
                "page_info": {
                    "has_more": (skip + limit) < total_count,
                    "next_skip": skip + limit if (skip + limit) < total_count else None
                }
            }
            
        except Exception as e:
            logging.error(f"Error getting followers: {e}")
            return {"followers": [], "total_count": 0, "page_info": {"has_more": False}}

    @staticmethod
    def get_following(user_id: str, limit: int = 50, skip: int = 0) -> Dict:
        """Get users this user is following"""
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            following = relationship_repo.get_following(user_id, limit, skip)
            total_count = relationship_repo.get_following_count(user_id)
            
            # Format following data
            formatted_following = []
            for followed in following:
                formatted_following.append({
                    "user_id": str(followed["following_id"]),
                    "username": followed["following_info"]["username"],
                    "profile_picture": followed["following_info"].get("profile_picture"),
                    "followed_at": followed["created_at"].isoformat(),
                    "avatar_url": f"https://ui-avatars.com/api/?name={followed['following_info']['username'][0]}&background=8B5CF6&color=fff&size=40"
                })
            
            return {
                "following": formatted_following,
                "total_count": total_count,
                "page_info": {
                    "has_more": (skip + limit) < total_count,
                    "next_skip": skip + limit if (skip + limit) < total_count else None
                }
            }
            
        except Exception as e:
            logging.error(f"Error getting following: {e}")
            return {"following": [], "total_count": 0, "page_info": {"has_more": False}}

    @staticmethod
    def get_follow_status(current_user_id: str, target_user_id: str) -> Dict:
        """Get follow status between two users"""
        
        if current_user_id == target_user_id:
            return {
                "is_following": False,
                "is_followed_by": False,
                "is_self": True
            }
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            is_following = relationship_repo.is_following(current_user_id, target_user_id)
            is_followed_by = relationship_repo.is_following(target_user_id, current_user_id)
            
            return {
                "is_following": is_following,
                "is_followed_by": is_followed_by,
                "is_mutual": is_following and is_followed_by,
                "is_self": False
            }
            
        except Exception as e:
            logging.error(f"Error getting follow status: {e}")
            return {
                "is_following": False,
                "is_followed_by": False,
                "is_self": False
            }

    @staticmethod
    def get_follow_suggestions(user_id: str, limit: int = 10) -> Dict:
        """Get suggested users to follow"""
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            suggestions = relationship_repo.get_suggested_follows(user_id, limit)
            
            # Format suggestions
            formatted_suggestions = []
            for suggestion in suggestions:
                formatted_suggestions.append({
                    "user_id": str(suggestion["user_id"]),
                    "username": suggestion["username"],
                    "profile_picture": suggestion.get("profile_picture"),
                    "mutual_connections": suggestion["mutual_connections"],
                    "reason": f"Followed by {suggestion['mutual_connections']} people you follow",
                    "avatar_url": f"https://ui-avatars.com/api/?name={suggestion['username'][0]}&background=8B5CF6&color=fff&size=40"
                })
            
            return {
                "suggestions": formatted_suggestions,
                "total_count": len(formatted_suggestions)
            }
            
        except Exception as e:
            logging.error(f"Error getting follow suggestions: {e}")
            return {"suggestions": [], "total_count": 0}

    @staticmethod
    def get_mutual_followers(user1_id: str, user2_id: str) -> Dict:
        """Get mutual followers between two users"""
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            mutual = relationship_repo.get_mutual_followers(user1_id, user2_id)
            
            # Format mutual followers
            formatted_mutual = []
            for user in mutual:
                formatted_mutual.append({
                    "user_id": str(user["user_id"]),
                    "username": user["username"],
                    "profile_picture": user.get("profile_picture"),
                    "avatar_url": f"https://ui-avatars.com/api/?name={user['username'][0]}&background=8B5CF6&color=fff&size=40"
                })
            
            return {
                "mutual_followers": formatted_mutual,
                "count": len(formatted_mutual)
            }
            
        except Exception as e:
            logging.error(f"Error getting mutual followers: {e}")
            return {"mutual_followers": [], "count": 0}

    @staticmethod
    def get_user_follow_stats(user_id: str) -> Dict:
        """Get follow statistics for a user"""
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            stats = relationship_repo.get_relationship_stats(user_id)
            
            # Get recent followers (last 7 days)
            recent_followers = relationship_repo.get_recent_followers(user_id, days=7)
            
            return {
                "followers_count": stats["followers"],
                "following_count": stats["following"],
                "recent_followers_count": len(recent_followers),
                "recent_followers": [
                    {
                        "user_id": str(follower["follower_id"]),
                        "username": follower["follower_info"]["username"],
                        "followed_at": follower["created_at"].isoformat()
                    }
                    for follower in recent_followers[:5]  # Show only first 5
                ]
            }
            
        except Exception as e:
            logging.error(f"Error getting follow stats: {e}")
            return {
                "followers_count": 0,
                "following_count": 0,
                "recent_followers_count": 0,
                "recent_followers": []
            }

    @staticmethod
    def bulk_unfollow(user_id: str, following_ids: List[str]) -> Tuple[bool, str, Dict]:
        """Bulk unfollow multiple users"""
        
        if not following_ids:
            return False, "No users provided", {}
        
        # Remove self from list
        following_ids = [fid for fid in following_ids if fid != user_id]
        
        if not following_ids:
            return False, "Cannot unfollow yourself", {}
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            unfollowed_count = relationship_repo.bulk_unfollow(user_id, following_ids)
            
            logging.info(f"User {user_id} bulk unfollowed {unfollowed_count} users")
            
            return True, f"Successfully unfollowed {unfollowed_count} users", {
                "unfollowed_count": unfollowed_count,
                "total_requested": len(following_ids)
            }
            
        except Exception as e:
            logging.error(f"Error in bulk unfollow: {e}")
            return False, "Failed to unfollow users", {}

    @staticmethod
    def block_user(blocker_id: str, blocked_id: str) -> Tuple[bool, str]:
        """Block a user (also removes follow relationships)"""
        
        if blocker_id == blocked_id:
            return False, "Cannot block yourself"
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            # Check if already blocked
            if relationship_repo.is_blocked(blocker_id, blocked_id):
                return False, "User is already blocked"
            
            # Remove any follow relationships first
            relationship_repo.delete_relationship(blocker_id, blocked_id, "follow")
            relationship_repo.delete_relationship(blocked_id, blocker_id, "follow")
            
            # Create block relationship
            relationship_repo.create_relationship(blocker_id, blocked_id, "block")
            
            logging.info(f"User {blocker_id} blocked user {blocked_id}")
            
            return True, "User blocked successfully"
            
        except Exception as e:
            logging.error(f"Error blocking user: {e}")
            return False, "Failed to block user"

    @staticmethod
    def unblock_user(blocker_id: str, blocked_id: str) -> Tuple[bool, str]:
        """Unblock a user"""
        
        if blocker_id == blocked_id:
            return False, "Cannot unblock yourself"
        
        relationship_repo = UserRelationshipRepository(g.db.user_relationships)
        
        try:
            result = relationship_repo.delete_relationship(blocker_id, blocked_id, "block")
            
            if result.deleted_count > 0:
                logging.info(f"User {blocker_id} unblocked user {blocked_id}")
                return True, "User unblocked successfully"
            else:
                return False, "User was not blocked"
                
        except Exception as e:
            logging.error(f"Error unblocking user: {e}")
            return False, "Failed to unblock user"