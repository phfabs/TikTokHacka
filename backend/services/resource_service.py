import re
import urllib.parse
from typing import List, Dict, Any


class ResourceService:
    """Service for generating real, actionable learning resources with live URLs"""
    
    PROGRAMMING_RESOURCES = {
        "python": {
            "documentation": "https://docs.python.org/3/",
            "tutorial": "https://www.learnpython.org/",
            "practice": "https://www.hackerrank.com/domains/python",
            "tools": "https://repl.it/languages/python3"
        },
        "javascript": {
            "documentation": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
            "tutorial": "https://javascript.info/",
            "practice": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/",
            "tools": "https://codepen.io/"
        },
        "react": {
            "documentation": "https://reactjs.org/docs/getting-started.html",
            "tutorial": "https://reactjs.org/tutorial/tutorial.html",
            "practice": "https://codesandbox.io/",
            "tools": "https://create-react-app.dev/"
        },
        "java": {
            "documentation": "https://docs.oracle.com/javase/8/docs/api/",
            "tutorial": "https://www.codecademy.com/learn/learn-java",
            "practice": "https://www.codewars.com/",
            "tools": "https://www.jdoodle.com/online-java-compiler/"
        }
    }
    
    LANGUAGE_RESOURCES = {
        "spanish": {
            "grammar": "https://www.spanishdict.com/grammar",
            "vocabulary": "https://www.memrise.com/courses/english/spanish/",
            "listening": "https://www.news.google.com/topstories?hl=es",
            "speaking": "https://www.italki.com/"
        },
        "french": {
            "grammar": "https://www.lawlessfrench.com/grammar/",
            "vocabulary": "https://www.duolingo.com/course/fr/en/Learn-French",
            "listening": "https://www.france24.com/en/live",
            "speaking": "https://www.conversationexchange.com/"
        },
        "german": {
            "grammar": "https://www.deutsch101.com/",
            "vocabulary": "https://www.babbel.com/en/magazine/german-vocabulary",
            "listening": "https://www.dw.com/en/learn-german/s-2469",
            "speaking": "https://www.tandem.net/"
        }
    }
    
    FITNESS_RESOURCES = {
        "yoga": {
            "videos": "https://www.youtube.com/user/yogawithadriene",
            "poses": "https://www.yogajournal.com/poses/",
            "meditation": "https://www.headspace.com/",
            "equipment": "https://www.manduka.com/"
        },
        "running": {
            "training": "https://www.runnersworld.com/training/",
            "tracking": "https://www.strava.com/",
            "nutrition": "https://www.runnersworld.com/nutrition-weight-loss/",
            "gear": "https://www.runningwarehouse.com/"
        },
        "strength": {
            "workouts": "https://www.bodybuilding.com/exercises/",
            "form": "https://www.youtube.com/user/athleanx",
            "nutrition": "https://www.myfitnesspal.com/",
            "tracking": "https://www.jefit.com/"
        }
    }
    
    CREATIVE_RESOURCES = {
        "design": {
            "tutorials": "https://www.youtube.com/user/PhlearnLLC",
            "tools": "https://www.figma.com/",
            "inspiration": "https://dribbble.com/",
            "assets": "https://unsplash.com/"
        },
        "photography": {
            "tutorials": "https://www.youtube.com/user/DigitalRevCom",
            "editing": "https://www.adobe.com/products/photoshop-lightroom.html",
            "inspiration": "https://500px.com/",
            "gear": "https://www.bhphotovideo.com/"
        },
        "music": {
            "theory": "https://www.musictheory.net/",
            "practice": "https://www.flowkey.com/",
            "tools": "https://www.bandlab.com/",
            "inspiration": "https://open.spotify.com/"
        }
    }
    
    GENERAL_RESOURCES = {
        "documentation": "https://www.w3schools.com/",
        "tutorial": "https://www.codecademy.com/",
        "practice": "https://www.coursera.org/",
        "tools": "https://www.khanacademy.org/",
        "community": "https://stackoverflow.com/",
        "videos": "https://www.youtube.com/"
    }
    
    @staticmethod
    def generate_resources_for_day(skill_title: str, day_number: int, day_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate 3-4 relevant resources for a specific day"""
        skill_category = ResourceService._categorize_skill(skill_title)
        skill_type = ResourceService._get_skill_type(skill_title)
        
        resources = []
        
        if skill_category == "programming" and skill_type in ResourceService.PROGRAMMING_RESOURCES:
            skill_resources = ResourceService.PROGRAMMING_RESOURCES[skill_type]
        elif skill_category == "language" and skill_type in ResourceService.LANGUAGE_RESOURCES:
            skill_resources = ResourceService.LANGUAGE_RESOURCES[skill_type]
        elif skill_category == "fitness" and skill_type in ResourceService.FITNESS_RESOURCES:
            skill_resources = ResourceService.FITNESS_RESOURCES[skill_type]
        elif skill_category == "creative" and skill_type in ResourceService.CREATIVE_RESOURCES:
            skill_resources = ResourceService.CREATIVE_RESOURCES[skill_type]
        else:
            skill_resources = ResourceService.GENERAL_RESOURCES
        
        # Generate resources based on day progression
        if day_number <= 7:  # First week - foundational resources
            resources.extend(ResourceService._get_beginner_resources(skill_resources, skill_title))
        elif day_number <= 14:  # Second week - practice resources
            resources.extend(ResourceService._get_practice_resources(skill_resources, skill_title))
        elif day_number <= 21:  # Third week - intermediate resources
            resources.extend(ResourceService._get_intermediate_resources(skill_resources, skill_title))
        else:  # Final week - advanced resources
            resources.extend(ResourceService._get_advanced_resources(skill_resources, skill_title))
        
        # Add day-specific resources based on task content
        if day_data.get('tasks'):
            for task in day_data['tasks']:
                if task.get('description'):
                    resources.extend(ResourceService._get_task_specific_resources(
                        task['description'], skill_title, skill_resources
                    ))
        
        unique_resources = []
        seen_urls = set()
        
        for resource in resources:
            if resource['url'] not in seen_urls:
                unique_resources.append(resource)
                seen_urls.add(resource['url'])
                if len(unique_resources) >= 4:
                    break
        
        while len(unique_resources) < 4:
            general_resource = ResourceService._get_general_resource(skill_title, len(unique_resources))
            if general_resource['url'] not in seen_urls:
                unique_resources.append(general_resource)
                seen_urls.add(general_resource['url'])
        
        return unique_resources[:4]
    
    @staticmethod
    def _categorize_skill(skill_title: str) -> str:
        """Categorize skill into main categories"""
        skill_lower = skill_title.lower()
        
        programming_keywords = ['python', 'javascript', 'java', 'react', 'programming', 'coding', 'development', 'web']
        language_keywords = ['spanish', 'french', 'german', 'language', 'english', 'mandarin', 'italian']
        fitness_keywords = ['yoga', 'running', 'fitness', 'exercise', 'strength', 'gym', 'workout']
        creative_keywords = ['design', 'photography', 'music', 'art', 'drawing', 'creative']
        
        if any(keyword in skill_lower for keyword in programming_keywords):
            return "programming"
        elif any(keyword in skill_lower for keyword in language_keywords):
            return "language"
        elif any(keyword in skill_lower for keyword in fitness_keywords):
            return "fitness"
        elif any(keyword in skill_lower for keyword in creative_keywords):
            return "creative"
        else:
            return "general"
    
    @staticmethod
    def _get_skill_type(skill_title: str) -> str:
        """Get specific skill type within category"""
        skill_lower = skill_title.lower()
        
        if 'python' in skill_lower:
            return 'python'
        elif 'javascript' in skill_lower or 'js' in skill_lower:
            return 'javascript'
        elif 'react' in skill_lower:
            return 'react'
        elif 'java' in skill_lower:
            return 'java'
        elif 'spanish' in skill_lower:
            return 'spanish'
        elif 'french' in skill_lower:
            return 'french'
        elif 'german' in skill_lower:
            return 'german'
        elif 'yoga' in skill_lower:
            return 'yoga'
        elif 'running' in skill_lower:
            return 'running'
        elif 'strength' in skill_lower or 'gym' in skill_lower:
            return 'strength'
        elif 'design' in skill_lower:
            return 'design'
        elif 'photography' in skill_lower:
            return 'photography'
        elif 'music' in skill_lower:
            return 'music'
        else:
            return 'general'
    
    @staticmethod
    def _get_beginner_resources(skill_resources: Dict[str, str], skill_title: str) -> List[Dict[str, Any]]:
        """Get resources for beginners (days 1-7)"""
        resources = []
        
        if 'documentation' in skill_resources:
            resources.append({
                "title": f"Official {skill_title} Documentation",
                "description": "Complete reference and getting started guide",
                "url": skill_resources['documentation'],
                "category": "documentation",
                "icon": "description"
            })
        
        if 'tutorial' in skill_resources:
            resources.append({
                "title": f"Interactive {skill_title} Tutorial",
                "description": "Step-by-step beginner-friendly tutorial",
                "url": skill_resources['tutorial'],
                "category": "tutorial",
                "icon": "school"
            })
        
        return resources
    
    @staticmethod
    def _get_practice_resources(skill_resources: Dict[str, str], skill_title: str) -> List[Dict[str, Any]]:
        """Get resources for practice (days 8-14)"""
        resources = []
        
        if 'practice' in skill_resources:
            resources.append({
                "title": f"{skill_title} Practice Exercises",
                "description": "Hands-on exercises to reinforce learning",
                "url": skill_resources['practice'],
                "category": "practice",
                "icon": "fitness_center"
            })
        
        if 'tools' in skill_resources:
            resources.append({
                "title": f"Online {skill_title} Tools",
                "description": "Interactive tools and online editors",
                "url": skill_resources['tools'],
                "category": "tools",
                "icon": "build"
            })
        
        return resources
    
    @staticmethod
    def _get_intermediate_resources(skill_resources: Dict[str, str], skill_title: str) -> List[Dict[str, Any]]:
        """Get resources for intermediate learners (days 15-21)"""
        resources = []
        
        if 'community' in skill_resources:
            resources.append({
                "title": f"{skill_title} Community",
                "description": "Join discussions and get help from experts",
                "url": skill_resources.get('community', 'https://stackoverflow.com/'),
                "category": "community",
                "icon": "group"
            })
        
        if 'advanced' in skill_resources:
            resources.append({
                "title": f"Advanced {skill_title} Concepts",
                "description": "Deep dive into advanced topics",
                "url": skill_resources['advanced'],
                "category": "advanced",
                "icon": "trending_up"
            })
        
        return resources
    
    @staticmethod
    def _get_advanced_resources(skill_resources: Dict[str, str], skill_title: str) -> List[Dict[str, Any]]:
        """Get resources for advanced learners (days 22-30)"""
        resources = []
        
        resources.append({
            "title": f"{skill_title} Project Ideas",
            "description": "Real-world projects to showcase your skills",
            "url": f"https://github.com/topics/{skill_title.lower().replace(' ', '-')}",
            "category": "projects",
            "icon": "code"
        })
        
        resources.append({
            "title": f"{skill_title} Certification",
            "description": "Get certified in your new skill",
            "url": "https://www.coursera.org/",
            "category": "certification",
            "icon": "verified"
        })
        
        return resources
    
    @staticmethod
    def _get_task_specific_resources(task_description: str, skill_title: str, skill_resources: Dict[str, str]) -> List[Dict[str, Any]]:
        """Generate resources based on specific task content"""
        resources = []
        task_lower = task_description.lower()
        
        if 'setup' in task_lower or 'install' in task_lower:
            resources.append({
                "title": f"{skill_title} Setup Guide",
                "description": "Complete installation and setup instructions",
                "url": skill_resources.get('documentation', 'https://www.google.com/search?q=' + urllib.parse.quote(f"{skill_title} setup guide")),
                "category": "setup",
                "icon": "settings"
            })
        
        if 'practice' in task_lower or 'exercise' in task_lower:
            resources.append({
                "title": f"{skill_title} Exercises",
                "description": "Practice problems and exercises",
                "url": skill_resources.get('practice', 'https://www.google.com/search?q=' + urllib.parse.quote(f"{skill_title} practice exercises")),
                "category": "practice",
                "icon": "fitness_center"
            })
        
        if 'project' in task_lower:
            resources.append({
                "title": f"{skill_title} Project Examples",
                "description": "Sample projects and code examples",
                "url": f"https://github.com/search?q={urllib.parse.quote(skill_title)}&type=repositories",
                "category": "projects",
                "icon": "code"
            })
        
        return resources
    
    @staticmethod
    def _get_general_resource(skill_title: str, index: int) -> Dict[str, Any]:
        """Get general fallback resources"""
        general_options = [
            {
                "title": f"{skill_title} Video Tutorials",
                "description": "Video lessons and tutorials",
                "url": f"https://www.youtube.com/results?search_query={urllib.parse.quote(skill_title + ' tutorial')}",
                "category": "videos",
                "icon": "play_circle"
            },
            {
                "title": f"{skill_title} Online Course",
                "description": "Comprehensive online learning course",
                "url": f"https://www.coursera.org/search?query={urllib.parse.quote(skill_title)}",
                "category": "course",
                "icon": "school"
            },
            {
                "title": f"{skill_title} Community Forum",
                "description": "Discussion forum and Q&A",
                "url": f"https://www.reddit.com/search/?q={urllib.parse.quote(skill_title)}",
                "category": "community",
                "icon": "forum"
            },
            {
                "title": f"{skill_title} Reference Guide",
                "description": "Quick reference and cheat sheet",
                "url": f"https://www.google.com/search?q={urllib.parse.quote(skill_title + ' reference guide')}",
                "category": "reference",
                "icon": "library_books"
            }
        ]
        
        return general_options[index % len(general_options)]