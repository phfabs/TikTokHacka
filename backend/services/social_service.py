from typing import List, Optional, Dict, Any
from datetime import datetime
from flask import g
from bson import ObjectId
import logging
from backend.repositories.shared_skill_repository import SharedSkillRepository
from backend.repositories.skill_repository import SkillRepository
from backend.repositories.custom_task_repository import CustomTaskRepository
from backend.repositories.interaction_repository import InteractionRepository
from backend.repositories.comment_repository import CommentRepository

class SocialService:
    """Service for managing social features - skill sharing, discovery, and community interactions"""

    @staticmethod
    def share_skill(user_id: str, skill_id: str, description: str, tags: List[str], 
                   visibility: str = "public", include_custom_tasks: bool = False) -> Dict[str, Any]:
        """Share a user's skill with the community"""
        
        # Get the original skill
        skill_repo = SkillRepository(g.db.skills)
        original_skill = skill_repo.find_by_id(skill_id, user_id)
        
        if not original_skill:
            raise ValueError("Skill not found or access denied")
        
        # Check if skill is already shared by this user
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        existing_shared = g.db.shared_skills.find_one({
            "original_skill_id": ObjectId(skill_id),
            "shared_by": ObjectId(user_id)
        })
        
        if existing_shared:
            raise ValueError("This skill has already been shared")
        
        # Determine category from skill title/content
        category = SocialService._categorize_skill(original_skill.get('title', ''))
        
        # Check for custom tasks if requested
        has_custom_tasks = False
        if include_custom_tasks:
            custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
            task_count = custom_task_repo.count_tasks_for_skill(skill_id)
            has_custom_tasks = task_count > 0
        
        # Create shared skill data
        shared_skill_data = {
            "original_skill_id": ObjectId(skill_id),
            "shared_by": ObjectId(user_id),
            "title": original_skill["title"],
            "description": description.strip(),
            "curriculum": original_skill["curriculum"],
            "difficulty": original_skill.get("difficulty", "beginner"),
            "category": category,
            "tags": [tag.strip().lower() for tag in tags if tag.strip()],
            "visibility": visibility,
            "has_custom_tasks": has_custom_tasks,
            "image_url": original_skill.get("image_url")
        }
        
        # Create the shared skill
        shared_skill = shared_skill_repo.create(shared_skill_data)
        
        logging.info(f"User {user_id} shared skill '{original_skill['title']}' as {shared_skill['_id']}")
        
        return {
            "shared_skill_id": str(shared_skill["_id"]),
            "title": shared_skill["title"],
            "description": shared_skill["description"],
            "category": shared_skill["category"],
            "tags": shared_skill["tags"],
            "has_custom_tasks": shared_skill["has_custom_tasks"],
            "visibility": shared_skill["visibility"]
        }

    @staticmethod
    def get_shared_skills(filters: Dict = None, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """Get shared skills with pagination and filtering"""
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Get skills
        skills = shared_skill_repo.find_public_skills(skip=skip, limit=limit, filters=filters)
        total_count = shared_skill_repo.count_public_skills(filters=filters)
        
        # Enrich with user information
        enriched_skills = SocialService._enrich_skills_with_user_info(skills)
        
        return {
            "skills": enriched_skills,
            "pagination": {
                "current_page": page,
                "total_pages": (total_count + limit - 1) // limit,
                "total_count": total_count,
                "has_next": (skip + limit) < total_count,
                "has_previous": page > 1
            }
        }

    @staticmethod
    def get_shared_skill_detail(skill_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get detailed information about a shared skill"""
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        skill = shared_skill_repo.find_by_id(skill_id)
        
        if not skill:
            raise ValueError("Shared skill not found")
        
        # Get custom tasks for this skill
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        custom_tasks = custom_task_repo.find_by_skill(skill_id)
        
        # Organize custom tasks by day
        tasks_by_day = {}
        for task in custom_tasks:
            day = task["day"]
            if day not in tasks_by_day:
                tasks_by_day[day] = []
            
            # Add user info to task
            task["user_info"] = SocialService._get_user_info(str(task["user_id"]))
            tasks_by_day[day].append(task)
        
        # Get interaction stats
        interaction_repo = InteractionRepository(g.db.plan_interactions)
        interaction_stats = interaction_repo.get_plan_stats(skill_id)
        
        # Get user's interactions if user_id provided
        user_interactions = {}
        if user_id:
            user_interactions = {
                "has_liked": interaction_repo.check_user_has_liked(user_id, skill_id),
                "has_downloaded": interaction_repo.check_user_has_downloaded(user_id, skill_id),
                "user_rating": interaction_repo.get_user_rating_for_plan(user_id, skill_id)
            }
        
        # Get comment stats
        comment_repo = CommentRepository(g.db.plan_comments)
        comment_stats = comment_repo.get_plan_comment_stats(skill_id)
        
        # Enrich with user info
        skill["user_info"] = SocialService._get_user_info(str(skill["shared_by"]))
        
        return {
            "skill": skill,
            "custom_tasks_by_day": tasks_by_day,
            "stats": {
                **interaction_stats,
                "comments": comment_stats["total_comments"]
            },
            "user_interactions": user_interactions
        }

    @staticmethod
    def get_trending_skills(time_period: str = "week", limit: int = 10) -> List[Dict]:
        """Get trending skills based on recent activity"""
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        trending_skills = shared_skill_repo.get_trending_skills(time_period, limit)
        
        return SocialService._enrich_skills_with_user_info(trending_skills)

    @staticmethod
    def get_categories() -> List[Dict]:
        """Get skill categories with counts"""
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        return shared_skill_repo.get_categories_with_counts()

    @staticmethod
    def download_skill(user_id: str, shared_skill_id: str) -> Dict[str, Any]:
        """Download a shared skill to user's personal collection"""
        
        # Get the shared skill
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        shared_skill = shared_skill_repo.find_by_id(shared_skill_id)
        
        if not shared_skill:
            raise ValueError("Shared skill not found")
        
        # Check if user already has this skill
        skill_repo = SkillRepository(g.db.skills)
        existing_skill = g.db.skills.find_one({
            "user_id": user_id,
            "title": shared_skill["title"]
        })
        
        if existing_skill:
            raise ValueError("You already have a skill with this title")
        
        # Create new skill from shared skill
        skill_data = {
            "user_id": user_id,
            "title": shared_skill["title"],
            "skill_name": shared_skill["title"],
            "difficulty": shared_skill["difficulty"],
            "curriculum": shared_skill["curriculum"],
            "image_url": shared_skill.get("image_url"),
            "progress": {
                "completed_days": 0,
                "completion_percentage": 0,
                "current_day": 1,
                "started_at": datetime.utcnow(),
                "last_activity": None,
                "projected_completion": None
            },
            "status": "active",
            "source": "community",  # Mark as community-downloaded
            "source_skill_id": ObjectId(shared_skill_id)
        }
        
        new_skill = skill_repo.create(skill_data)
        
        # Record the download interaction
        interaction_repo = InteractionRepository(g.db.plan_interactions)
        interaction_repo.upsert_interaction(user_id, shared_skill_id, "download")
        
        # Update download count
        shared_skill_repo.increment_downloads(shared_skill_id)
        
        logging.info(f"User {user_id} downloaded shared skill {shared_skill_id}")
        
        return {
            "skill_id": str(new_skill["_id"]),
            "title": new_skill["title"],
            "message": "Skill successfully added to your collection"
        }

    @staticmethod
    def _categorize_skill(title: str) -> str:
        """Categorize a skill based on its title"""
        title_lower = title.lower()
        
        # Programming and Technology
        if any(tech in title_lower for tech in [
            'python', 'javascript', 'react', 'node', 'programming', 'coding', 
            'web development', 'app development', 'software', 'algorithm'
        ]):
            return 'programming'
        
        # Languages
        elif any(lang in title_lower for lang in [
            'spanish', 'french', 'german', 'chinese', 'japanese', 'korean', 
            'italian', 'portuguese', 'language', 'speaking', 'conversation'
        ]):
            return 'languages'
        
        # Creative Arts
        elif any(art in title_lower for tech in [
            'drawing', 'painting', 'photography', 'design', 'photoshop', 
            'illustrator', 'art', 'creative', 'graphic'
        ]):
            return 'creative'
        
        # Music
        elif any(music in title_lower for music in [
            'guitar', 'piano', 'violin', 'music', 'singing', 'composition', 'instrument'
        ]):
            return 'music'
        
        # Business and Career
        elif any(biz in title_lower for biz in [
            'business', 'marketing', 'management', 'leadership', 'career', 
            'entrepreneurship', 'sales', 'strategy'
        ]):
            return 'business'
        
        # Health and Fitness
        elif any(health in title_lower for health in [
            'fitness', 'workout', 'yoga', 'meditation', 'health', 'exercise', 'diet'
        ]):
            return 'health'
        
        # Science and Education
        elif any(science in title_lower for science in [
            'math', 'physics', 'chemistry', 'biology', 'science', 'research', 'study'
        ]):
            return 'science'
        
        # Cooking and Food
        elif any(food in title_lower for food in [
            'cooking', 'baking', 'recipe', 'cuisine', 'food', 'chef', 'culinary'
        ]):
            return 'cooking'
        
        else:
            return 'other'

    @staticmethod
    def _enrich_skills_with_user_info(skills: List[Dict]) -> List[Dict]:
        """Add user information to skills"""
        from backend.auth.models import User
        
        for skill in skills:
            user_id = str(skill["shared_by"])
            skill["user_info"] = SocialService._get_user_info(user_id)
        
        return skills

    @staticmethod
    def _get_user_info(user_id: str) -> Dict:
        """Get basic user information"""
        from backend.auth.models import User
        
        user = User.find_by_id(user_id)
        if user:
            return {
                "username": user.get("username", "Unknown"),
                "avatar_url": f"https://ui-avatars.com/api/?name={user.get('username', 'U')}&background=8B5CF6&color=fff&size=40"
            }
        else:
            return {
                "username": "Unknown User",
                "avatar_url": "https://ui-avatars.com/api/?name=U&background=8B5CF6&color=fff&size=40"
            }