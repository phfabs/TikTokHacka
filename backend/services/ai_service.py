import os
import httpx
import json
import logging
import time
from typing import Dict, Any, List
from datetime import datetime, timedelta
from backend.services.resource_service import ResourceService

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_NAME = os.getenv("AI_MODEL_NAME", "deepseek/deepseek-r1-0528:free")

class AIService:
    _plan_cache = {}
    _last_api_call = 0
    _api_cooldown = 60  
    
    @staticmethod
    async def generate_structured_plan(topic: str, plan_type: str = "skill") -> List[Dict[str, Any]]:
        """
        Generate a structured 30-day plan with smart fallbacks:
        1. Check cache first
        2. Try AI service if cooldown period passed
        3. Fall back to local template generation
        """
        
        cache_key = f"{topic.lower().strip()}_{plan_type}"
        if cache_key in AIService._plan_cache:
            logging.info(f"Using cached plan for {topic}")
            return AIService._plan_cache[cache_key]
        
        current_time = time.time()
        if current_time - AIService._last_api_call < AIService._api_cooldown:
            logging.info(f"API cooldown active, using local generation for {topic}")
            return AIService._generate_local_plan(topic, plan_type)
        
        if OPENROUTER_API_KEY:
            try:
                plan = await AIService._generate_ai_plan(topic, plan_type)
                AIService._plan_cache[cache_key] = plan
                AIService._last_api_call = current_time
                return plan
            except Exception as e:
                logging.warning(f"AI service failed for {topic}: {e}")
                return AIService._generate_local_plan(topic, plan_type)
        
        logging.info(f"No API key available, using local generation for {topic}")
        return AIService._generate_local_plan(topic, plan_type)
    
    @staticmethod
    async def _generate_ai_plan(topic: str, plan_type: str) -> List[Dict[str, Any]]:
        """Generate plan using AI service with timeout and error handling"""
        
        prompt = f"""Create a concise 30-day {plan_type} plan for "{topic}". 
        
        Return JSON with "daily_tasks" array containing 30 objects. Each object needs:
        - "day": number (1-30)
        - "title": short day theme
        - "tasks": array of 2 task objects with "description" and "resources" (2 items each)
        
        Example:
        {{"daily_tasks": [{{"day": 1, "title": "Getting Started", "tasks": [{{"description": "Learn basics", "resources": ["Tutorial", "Documentation"]}}, {{"description": "Practice", "resources": ["Exercise", "Example"]}}]}}]}}
        """
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:  
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": MODEL_NAME,
                        "messages": [{"role": "user", "content": prompt}],
                        "response_format": {"type": "json_object"},
                        "max_tokens": 4000,  
                        "temperature": 0.7
                    }
                )
                
                if response.status_code == 429:  
                    raise Exception("Rate limited by AI service")
                
                response.raise_for_status()
                response_data = response.json()
                ai_response_content = response_data["choices"][0]["message"]["content"]
                
                parsed_plan = json.loads(ai_response_content)
                
                if isinstance(parsed_plan, dict) and "daily_tasks" in parsed_plan:
                   
                    enhanced_plan = AIService._enhance_plan_with_resources(parsed_plan["daily_tasks"], topic)
                    return enhanced_plan
                
                raise ValueError("Invalid AI response format")
                
        except Exception as e:
            logging.error(f"AI service error: {e}")
            raise
    
    @staticmethod
    def _generate_local_plan(topic: str, plan_type: str) -> List[Dict[str, Any]]:
        """Generate a plan using local templates - fast and reliable"""
        
        
        skill_templates = {
            "programming": {
                "weeks": [
                    "Fundamentals and Setup",
                    "Core Concepts",
                    "Practical Application",
                    "Advanced Topics"
                ],
                "daily_patterns": [
                    "Learn syntax and setup development environment",
                    "Practice basic concepts with examples",
                    "Build a small project",
                    "Review and debug code",
                    "Explore advanced features"
                ]
            },
            "language": {
                "weeks": [
                    "Basic Vocabulary",
                    "Grammar Foundations", 
                    "Conversation Practice",
                    "Cultural Context"
                ],
                "daily_patterns": [
                    "Learn new vocabulary words",
                    "Practice grammar rules",
                    "Listen to native speakers",
                    "Practice speaking/writing",
                    "Review and memorize"
                ]
            },
            "fitness": {
                "weeks": [
                    "Foundation Building",
                    "Strength Development",
                    "Endurance Training",
                    "Advanced Techniques"
                ],
                "daily_patterns": [
                    "Basic exercises and form",
                    "Strength training routine",
                    "Cardio workout",
                    "Flexibility and recovery",
                    "Skill practice"
                ]
            },
            "creative": {
                "weeks": [
                    "Tools and Basics",
                    "Fundamental Techniques",
                    "Creative Expression",
                    "Advanced Skills"
                ],
                "daily_patterns": [
                    "Learn basic tools and techniques",
                    "Practice fundamental skills",
                    "Create original work",
                    "Study examples and styles",
                    "Refine and improve"
                ]
            }
        }
        
        template_key = AIService._categorize_topic(topic)
        template = skill_templates.get(template_key, skill_templates["programming"])
        
        plan = []
        
        for day in range(1, 31):
            week_index = (day - 1) // 7
            week_theme = template["weeks"][min(week_index, len(template["weeks"]) - 1)]
            
            pattern_index = (day - 1) % len(template["daily_patterns"])
            base_pattern = template["daily_patterns"][pattern_index]
            
            title = f"Day {day}: {week_theme}"
            
            tasks = [
                {
                    "description": f"{base_pattern} related to {topic}",
                    "resources": [
                        f"Search: '{topic} {base_pattern.split()[0].lower()}'",
                        f"Documentation: {topic} official guide"
                    ]
                },
                {
                    "description": f"Practice {topic} skills with hands-on exercises",
                    "resources": [
                        f"Tutorial: {topic} beginner guide",
                        f"Practice: {topic} exercises"
                    ]
                }
            ]
            
            plan.append({
                "day": day,
                "title": title,
                "tasks": tasks
            })
        
        enhanced_plan = AIService._enhance_plan_with_resources(plan, topic)
        
        cache_key = f"{topic.lower().strip()}_{plan_type}"
        AIService._plan_cache[cache_key] = enhanced_plan
        
        logging.info(f"Generated local plan for {topic} with {len(enhanced_plan)} days")
        return enhanced_plan
    
    @staticmethod
    def _enhance_plan_with_resources(plan: List[Dict[str, Any]], topic: str) -> List[Dict[str, Any]]:
        """Enhance plan with real resources using ResourceService"""
        enhanced_plan = []
        
        for day_index, day_data in enumerate(plan):
            day_number = day_index + 1
            
            resources = ResourceService.generate_resources_for_day(topic, day_number, day_data)
            
            enhanced_day = day_data.copy()
            enhanced_day['resources'] = resources
            
            enhanced_plan.append(enhanced_day)
        
        return enhanced_plan
    
    @staticmethod
    def _categorize_topic(topic: str) -> str:
        """Categorize topic to select appropriate template"""
        topic_lower = topic.lower()
        
        if any(word in topic_lower for word in ['python', 'javascript', 'java', 'programming', 'coding', 'development', 'software']):
            return "programming"
        elif any(word in topic_lower for word in ['spanish', 'french', 'german', 'language', 'english', 'mandarin']):
            return "language"
        elif any(word in topic_lower for word in ['fitness', 'exercise', 'gym', 'running', 'yoga', 'workout']):
            return "fitness"
        elif any(word in topic_lower for word in ['art', 'drawing', 'painting', 'music', 'creative', 'design']):
            return "creative"
        else:
            return "programming"  

class AIGenerationError(Exception):
    pass