from typing import List, Optional, Dict, Any
from datetime import datetime
from flask import g
from bson import ObjectId
import logging
import re
from backend.repositories.shared_skill_repository import SharedSkillRepository
from backend.repositories.custom_task_repository import CustomTaskRepository

class SearchService:
    """Service for searching and discovering shared skills"""

    @staticmethod
    def search_skills(query: str, filters: Dict = None, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """Search skills using text search with filters and pagination"""
        
        # Sanitize query
        query = query.strip()
        if not query:
            raise ValueError("Search query cannot be empty")
        
        # Limit query length
        if len(query) > 100:
            query = query[:100]
        
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Perform search
        if len(query) < 2:
            # For very short queries, use basic filtering
            skills = shared_skill_repo.find_public_skills(skip=skip, limit=limit, filters=filters)
        else:
            # Use text search
            skills = shared_skill_repo.search_skills(query, skip=skip, limit=limit, filters=filters)
        
        # Count total results for pagination
        total_count = SearchService._count_search_results(query, filters)
        
        # Enrich skills with additional data
        enriched_skills = SearchService._enrich_search_results(skills, query)
        
        return {
            "query": query,
            "skills": enriched_skills,
            "pagination": {
                "current_page": page,
                "total_pages": (total_count + limit - 1) // limit,
                "total_count": total_count,
                "has_next": (skip + limit) < total_count,
                "has_previous": page > 1
            },
            "filters_applied": filters or {}
        }

    @staticmethod
    def get_search_suggestions(query: str, limit: int = 5) -> List[str]:
        """Get search suggestions based on partial query"""
        
        if not query or len(query) < 2:
            return []
        
        query_regex = re.escape(query.lower())
        
        # Search in titles and tags
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        
        # Aggregate suggestions from titles
        title_pipeline = [
            {"$match": {
                "visibility": "public",
                "title": {"$regex": query_regex, "$options": "i"}
            }},
            {"$project": {"title": 1}},
            {"$limit": limit}
        ]
        
        title_results = list(g.db.shared_skills.aggregate(title_pipeline))
        suggestions = [result["title"] for result in title_results]
        
        # Add tag suggestions if we need more
        if len(suggestions) < limit:
            tag_pipeline = [
                {"$match": {
                    "visibility": "public",
                    "tags": {"$regex": query_regex, "$options": "i"}
                }},
                {"$unwind": "$tags"},
                {"$match": {
                    "tags": {"$regex": query_regex, "$options": "i"}
                }},
                {"$group": {"_id": "$tags"}},
                {"$limit": limit - len(suggestions)}
            ]
            
            tag_results = list(g.db.shared_skills.aggregate(tag_pipeline))
            suggestions.extend([result["_id"] for result in tag_results])
        
        return suggestions[:limit]

    @staticmethod
    def get_trending_searches(days: int = 7, limit: int = 10) -> List[Dict]:
        """Get trending search terms (would require search tracking)"""
        
        # This would require implementing search analytics
        # For now, return popular categories as trending terms
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        categories = shared_skill_repo.get_categories_with_counts()
        
        return [
            {
                "term": cat["category"],
                "count": cat["count"],
                "type": "category"
            }
            for cat in categories[:limit]
        ]

    @staticmethod
    def advanced_search(criteria: Dict) -> Dict[str, Any]:
        """Perform advanced search with multiple criteria"""
        
        # Build query from criteria
        query = {}
        filters = {}
        
        # Text search
        if criteria.get("title"):
            query["title"] = {"$regex": criteria["title"], "$options": "i"}
        
        if criteria.get("description"):
            query["description"] = {"$regex": criteria["description"], "$options": "i"}
        
        # Category filter
        if criteria.get("category"):
            filters["category"] = criteria["category"]
        
        # Difficulty filter
        if criteria.get("difficulty"):
            filters["difficulty"] = criteria["difficulty"]
        
        # Rating filter
        if criteria.get("min_rating"):
            try:
                filters["min_rating"] = float(criteria["min_rating"])
            except (ValueError, TypeError):
                pass
        
        # Custom tasks filter
        if criteria.get("has_custom_tasks") is not None:
            filters["has_custom_tasks"] = criteria["has_custom_tasks"]
        
        # Tags filter
        if criteria.get("tags"):
            if isinstance(criteria["tags"], list):
                query["tags"] = {"$in": criteria["tags"]}
            else:
                query["tags"] = criteria["tags"]
        
        # Date range filter
        if criteria.get("created_after"):
            try:
                date = datetime.fromisoformat(criteria["created_after"])
                query["created_at"] = {"$gte": date}
            except (ValueError, TypeError):
                pass
        
        # Apply search
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        
        # Combine query and filters
        final_query = {**query, "visibility": "public"}
        if filters.get("category"):
            final_query["category"] = filters["category"]
        if filters.get("difficulty"):
            final_query["difficulty"] = filters["difficulty"]
        if filters.get("min_rating"):
            final_query["rating.average"] = {"$gte": filters["min_rating"]}
        if filters.get("has_custom_tasks") is not None:
            final_query["has_custom_tasks"] = filters["has_custom_tasks"]
        
        # Execute search
        skills = list(g.db.shared_skills.find(final_query)
                     .sort([("rating.average", -1), ("likes_count", -1)])
                     .limit(50))
        
        # Enrich results
        enriched_skills = SearchService._enrich_search_results(skills)
        
        return {
            "criteria": criteria,
            "skills": enriched_skills,
            "count": len(enriched_skills)
        }

    @staticmethod
    def search_custom_tasks(query: str, skill_id: Optional[str] = None, limit: int = 20) -> List[Dict]:
        """Search custom tasks by content"""
        
        custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
        
        # Build search query
        search_query = {
            "$or": [
                {"task.title": {"$regex": query, "$options": "i"}},
                {"task.description": {"$regex": query, "$options": "i"}},
                {"task.instructions": {"$regex": query, "$options": "i"}}
            ]
        }
        
        if skill_id:
            search_query["skill_id"] = ObjectId(skill_id)
        
        # Search tasks
        tasks = list(g.db.custom_tasks.find(search_query)
                    .sort([("votes.up", -1), ("created_at", -1)])
                    .limit(limit))
        
        # Enrich with user and skill info
        for task in tasks:
            task["user_info"] = SearchService._get_user_info(str(task["user_id"]))
            
            # Get skill info
            skill_info = g.db.shared_skills.find_one(
                {"_id": task["skill_id"]},
                {"title": 1, "category": 1}
            )
            if skill_info:
                task["skill_info"] = {
                    "title": skill_info["title"],
                    "category": skill_info.get("category", "other")
                }
        
        return tasks

    @staticmethod
    def get_filter_options() -> Dict[str, List]:
        """Get available filter options for search"""
        
        shared_skill_repo = SharedSkillRepository(g.db.shared_skills)
        
        # Get categories
        categories = shared_skill_repo.get_categories_with_counts()
        
        # Get difficulty levels with counts
        difficulty_pipeline = [
            {"$match": {"visibility": "public"}},
            {"$group": {
                "_id": "$difficulty",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        difficulty_results = list(g.db.shared_skills.aggregate(difficulty_pipeline))
        difficulties = [
            {
                "difficulty": result["_id"],
                "count": result["count"]
            }
            for result in difficulty_results
        ]
        
        # Get popular tags
        tag_pipeline = [
            {"$match": {"visibility": "public", "tags": {"$ne": []}}},
            {"$unwind": "$tags"},
            {"$group": {
                "_id": "$tags",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        
        tag_results = list(g.db.shared_skills.aggregate(tag_pipeline))
        tags = [
            {
                "tag": result["_id"],
                "count": result["count"]
            }
            for result in tag_results
        ]
        
        return {
            "categories": categories,
            "difficulties": difficulties,
            "popular_tags": tags,
            "rating_options": [
                {"label": "4.5+ stars", "value": 4.5},
                {"label": "4.0+ stars", "value": 4.0},
                {"label": "3.5+ stars", "value": 3.5},
                {"label": "3.0+ stars", "value": 3.0}
            ]
        }

    @staticmethod
    def _count_search_results(query: str, filters: Dict = None) -> int:
        """Count search results for pagination"""
        
        if len(query) < 2:
            # For short queries, count with filters
            search_query = {"visibility": "public"}
        else:
            # Text search count
            search_query = {
                "$text": {"$search": query},
                "visibility": "public"
            }
        
        # Apply filters
        if filters:
            if filters.get("category"):
                search_query["category"] = filters["category"]
            if filters.get("difficulty"):
                search_query["difficulty"] = filters["difficulty"]
            if filters.get("has_custom_tasks") is not None:
                search_query["has_custom_tasks"] = filters["has_custom_tasks"]
            if filters.get("min_rating"):
                search_query["rating.average"] = {"$gte": float(filters["min_rating"])}
        
        return g.db.shared_skills.count_documents(search_query)

    @staticmethod
    def _enrich_search_results(skills: List[Dict], query: str = None) -> List[Dict]:
        """Enrich search results with additional information"""
        
        for skill in skills:
            # Add user info
            skill["user_info"] = SearchService._get_user_info(str(skill["shared_by"]))
            
            # Add custom task count if applicable
            if skill.get("has_custom_tasks"):
                custom_task_repo = CustomTaskRepository(g.db.custom_tasks)
                task_count = custom_task_repo.count_tasks_for_skill(str(skill["_id"]))
                skill["custom_task_count"] = task_count
            else:
                skill["custom_task_count"] = 0
            
            # Add relevance score for text searches
            if query and "score" in skill:
                # Boost score for exact title matches
                if query.lower() in skill["title"].lower():
                    skill["relevance"] = "high"
                elif any(tag for tag in skill.get("tags", []) if query.lower() in tag.lower()):
                    skill["relevance"] = "medium"
                else:
                    skill["relevance"] = "low"
        
        return skills

    @staticmethod
    def _get_user_info(user_id: str) -> Dict:
        """Get basic user information"""
        from backend.auth.models import User
        
        user = User.find_by_id(user_id)
        if user:
            return {
                "user_id": user_id,
                "username": user.get("username", "Unknown"),
                "avatar_url": f"https://ui-avatars.com/api/?name={user.get('username', 'U')}&background=8B5CF6&color=fff&size=40"
            }
        else:
            return {
                "user_id": user_id,
                "username": "Unknown User",
                "avatar_url": "https://ui-avatars.com/api/?name=U&background=8B5CF6&color=fff&size=40"
            }