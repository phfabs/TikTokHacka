import os
import logging
import random

import aiohttp

UNSPLASH_API = "https://api.unsplash.com/photos/random"
ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY")
HEADERS = {"Accept-Version": "v1", "Authorization": f"Client-ID {ACCESS_KEY}"} if ACCESS_KEY else {}

SKILL_IMAGES = {
    "programming": [
        "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
        "https://images.unsplash.com/photo-1542831371-29b0f74f9713",
        "https://images.unsplash.com/photo-1518932945647-7a1c969f8be2",
        "https://images.unsplash.com/photo-1573164713712-03790a178651",
        "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c"
    ],
    "web_development": [
        "https://images.unsplash.com/photo-1627398242454-45a1465c2479",
        "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
        "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0",
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085"
    ],
    "data_science": [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
        "https://images.unsplash.com/photo-1504639725590-34d0984388bd",
        "https://images.unsplash.com/photo-1529078155058-5d716f45d604",
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31"
    ],
    "mobile_development": [
        "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c",
        "https://images.unsplash.com/photo-1563564028-98a6e76da2b8",
        "https://images.unsplash.com/photo-1556656793-08538906a9f8",
        "https://images.unsplash.com/photo-1585079542156-2755d9c8a094",
        "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb"
    ],
    "language": [
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570",
        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8",
        "https://images.unsplash.com/photo-1532012197267-da84d127e765"
    ],
    "design": [
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
        "https://images.unsplash.com/photo-1559028006-448665bd7c7f",
        "https://images.unsplash.com/photo-1609921212029-bb5a28e60960",
        "https://images.unsplash.com/photo-1572044162444-ad60f128bdea",
        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f"
    ],
    "photography": [
        "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a",
        "https://images.unsplash.com/photo-1502920917128-1aa500764cbd",
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
        "https://images.unsplash.com/photo-1452780212940-6f5c0d14d848",
        "https://images.unsplash.com/photo-1554048612-b6a482b224d0"
    ],
    "music": [
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
        "https://images.unsplash.com/photo-1564186763535-ebb21ef5277f",
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
        "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae",
        "https://images.unsplash.com/photo-1507838153414-b4b713384a76"
    ],
    "business": [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
        "https://images.unsplash.com/photo-1560472354-b33ff0c44a43",
        "https://images.unsplash.com/photo-1664475786764-8b7b6daa31f2",
        "https://images.unsplash.com/photo-1556155092-8707de31f9c4"
    ],
    "marketing": [
        "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a",
        "https://images.unsplash.com/photo-1553729459-efe14ef6055d",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
        "https://images.unsplash.com/photo-1533750349088-cd871a92f312",
        "https://images.unsplash.com/photo-1557804506-669a67965ba0"
    ],
    "fitness": [
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48",
        "https://images.unsplash.com/photo-1549060279-7e168fcee0c2",
        "https://images.unsplash.com/photo-1605296867424-35fc25c9212a",
        "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5"
    ],
    "cooking": [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136",
        "https://images.unsplash.com/photo-1507048331197-7d4ac70811cf",
        "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f",
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136",
        "https://images.unsplash.com/photo-1490818387583-1baba5e638af"
    ],
    "science": [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
        "https://images.unsplash.com/photo-1554475901-4538ddfbccc2",
        "https://images.unsplash.com/photo-1532094349884-543bc11b234d",
        "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3"
    ],
    "writing": [
        "https://images.unsplash.com/photo-1455390582262-044cdead277a",
        "https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3",
        "https://images.unsplash.com/photo-1542435503-956c469947f6",
        "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3"
    ],
    "default": [
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
        "https://images.unsplash.com/photo-1549692520-acc6669e2f0c",
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173",
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
        "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f"
    ]
}

class UnsplashService:
    @staticmethod
    def _categorize_skill(query: str) -> str:
        query_lower = query.lower()
        
        if any(term in query_lower for term in [
            "spanish", "french", "german", "chinese", "japanese", "korean", "italian language", 
            "portuguese", "arabic", "english language", "speaking", "conversation", "grammar", "vocabulary"
        ]) or (("learn" in query_lower or "study" in query_lower) and any(lang in query_lower for lang in ["spanish", "french", "german", "chinese", "japanese", "korean", "italian", "portuguese", "arabic"])):
            return "language"
        
        elif any(term in query_lower for term in [
            "cooking", "culinary", "chef", "recipe", "food", "baking", "nutrition", 
            "kitchen", "meal", "dish", "cuisine"
        ]) or (("italian" in query_lower or "french" in query_lower or "chinese" in query_lower or "japanese" in query_lower or "mexican" in query_lower or "indian" in query_lower or "thai" in query_lower) and "cuisine" in query_lower):
            return "cooking"
        
        elif "creative writing" in query_lower:
            return "writing"
            
        elif any(term in query_lower for term in [
            "ui", "ux", "design", "graphic", "visual", "photoshop", "illustrator", "figma", 
            "sketch", "adobe", "creative", "art", "drawing", "painting", "illustration"
        ]):
            return "design"
        
        elif any(term in query_lower for term in [
            "photography", "photo", "camera", "shooting", "portrait", "landscape", "editing", 
            "lightroom", "composition"
        ]):
            return "photography"
        
        elif any(term in query_lower for term in [
            "music", "piano", "guitar", "singing", "composition", "theory", "instrument", 
            "song", "melody", "harmony", "rhythm", "audio", "sound"
        ]):
            return "music"
        
        elif any(term in query_lower for term in [
            "data science", "machine learning", "ai", "artificial intelligence", "analytics", 
            "statistics", "pandas", "numpy", "tensorflow", "pytorch", "database"
        ]):
            return "data_science"
        
        elif any(term in query_lower for term in [
            "web", "html", "css", "react", "angular", "vue", "frontend", "backend", "fullstack", 
            "node", "express", "django", "flask", "api", "rest", "graphql"
        ]):
            return "web_development"
        
        elif any(term in query_lower for term in [
            "mobile", "android", "ios", "flutter", "react native", "app development"
        ]):
            return "mobile_development"
        
        elif any(term in query_lower for term in [
            "programming", "code", "coding", "software", "developer", "python", "java", "javascript", 
            "c++", "c#", "ruby", "php", "go", "rust", "kotlin", "swift", "algorithm", "data structure"
        ]):
            return "programming"
        
        elif any(term in query_lower for term in [
            "marketing", "advertising", "branding", "social media", "seo", "content marketing", 
            "copywriting", "email", "campaign", "promotion"
        ]):
            return "marketing"
        
        elif any(term in query_lower for term in [
            "business", "management", "leadership", "strategy", "finance", "accounting", 
            "economics", "entrepreneurship", "startup", "sales"
        ]):
            return "business"
        
        elif any(term in query_lower for term in [
            "fitness", "exercise", "workout", "gym", "strength", "cardio", "yoga", 
            "pilates", "running", "swimming", "health", "wellness"
        ]):
            return "fitness"
        
        elif any(term in query_lower for term in [
            "science", "physics", "chemistry", "biology", "math", "mathematics", 
            "research", "laboratory", "experiment"
        ]):
            return "science"
        
        elif any(term in query_lower for term in [
            "writing", "author", "novel", "story", "blog", "journalism", "editing", "publishing"
        ]):
            return "writing"
        
        return "default"

    @staticmethod
    async def fetch_image(query: str, use_specific_query: bool = True) -> str:
        """
        Fetch a skill-relevant image from Unsplash API
        
        Args:
            query: The skill name or topic
            use_specific_query: If True, use the exact query; if False, use category-based keywords
        
        Returns:
            URL of the fetched image
        """
        if not ACCESS_KEY:
            logging.warning("UNSPLASH_ACCESS_KEY not set; returning random skill-relevant image")
            return UnsplashService._get_fallback_image(query)

        search_query = UnsplashService._generate_search_query(query, use_specific_query)
        

        search_strategies = [
            search_query,
            UnsplashService._get_category_keywords(query),
            UnsplashService._get_broader_keywords(query)
        ]
        
        for strategy_query in search_strategies:
            try:
                image_url = await UnsplashService._fetch_from_unsplash(strategy_query)
                if image_url:
                    logging.info(f"Fetched image from Unsplash for '{query}' using query '{strategy_query}': {image_url}")
                    return image_url
            except Exception as e:
                logging.warning(f"Failed to fetch image with query '{strategy_query}': {e}")
                continue
        
        logging.warning(f"All Unsplash strategies failed for '{query}', using fallback")
        return UnsplashService._get_fallback_image(query)
    
    @staticmethod
    async def _fetch_from_unsplash(query: str) -> str:
        """Make the actual API call to Unsplash"""
        params = {
            "query": query,
            "orientation": "landscape",  
            "per_page": 1,
            "content_filter": "high"  
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(UNSPLASH_API, headers=HEADERS, params=params, timeout=15) as resp:
                if resp.status != 200:
                    raise ValueError(f"Unsplash API returned status {resp.status}")
                
                data = await resp.json()
                
                image_url = (
                    data.get("urls", {}).get("regular") or 
                    data.get("urls", {}).get("small") or
                    data.get("urls", {}).get("thumb")
                )
                
                if not image_url:
                    raise ValueError("No image URL found in response")
                
                return image_url
    
    @staticmethod
    def _generate_search_query(query: str, use_specific: bool = True) -> str:
        """Generate an enhanced search query for Unsplash"""
        if not use_specific:
            return UnsplashService._get_category_keywords(query)
        
        cleaned_query = query.lower().strip()
        
        category = UnsplashService._categorize_skill(query)
        
        if category == "programming":
            return f"{cleaned_query} coding development computer"
        elif category == "language":
            return f"{cleaned_query} language learning books study"
        elif category == "design":
            return f"{cleaned_query} design creative art workspace"
        elif category == "photography":
            return f"{cleaned_query} photography camera lens"
        elif category == "music":
            return f"{cleaned_query} music instrument sound"
        elif category == "fitness":
            return f"{cleaned_query} fitness exercise workout"
        elif category == "cooking":
            return f"{cleaned_query} cooking food kitchen"
        elif category == "business":
            return f"{cleaned_query} business office professional"
        elif category == "science":
            return f"{cleaned_query} science research laboratory"
        elif category == "writing":
            return f"{cleaned_query} writing books author"
        else:
            return f"{cleaned_query} learning education study"
    
    @staticmethod
    def _get_category_keywords(query: str) -> str:
        """Get category-specific keywords for broader search"""
        category = UnsplashService._categorize_skill(query)
        
        category_keywords = {
            "programming": "programming code developer computer technology",
            "web_development": "web development coding computer screen",
            "data_science": "data science analytics computer charts",
            "mobile_development": "mobile app development smartphone",
            "language": "language learning books education study",
            "design": "design creative art workspace tablet",
            "photography": "photography camera equipment lens",
            "music": "music instrument piano guitar",
            "business": "business office professional meeting",
            "marketing": "marketing digital advertising creative",
            "fitness": "fitness exercise gym workout",
            "cooking": "cooking food kitchen ingredients",
            "science": "science laboratory research experiment",
            "writing": "writing books author notebook",
            "default": "learning education study books"
        }
        
        return category_keywords.get(category, category_keywords["default"])
    
    @staticmethod
    def _get_broader_keywords(query: str) -> str:
        """Get very broad keywords as last resort"""
        category = UnsplashService._categorize_skill(query)
        
        broad_keywords = {
            "programming": "technology",
            "web_development": "technology",
            "data_science": "technology",
            "mobile_development": "technology",
            "language": "education",
            "design": "creative",
            "photography": "creative",
            "music": "creative",
            "business": "professional",
            "marketing": "professional",
            "fitness": "health",
            "cooking": "lifestyle",
            "science": "education",
            "writing": "creative",
            "default": "learning"
        }
        
        return broad_keywords.get(category, broad_keywords["default"])
    
    @staticmethod
    def _get_fallback_image(query: str) -> str:
        """Get fallback image from hardcoded list"""
        category = UnsplashService._categorize_skill(query)
        images = SKILL_IMAGES.get(category, SKILL_IMAGES["default"])
        selected_image = random.choice(images)
        cache_buster = f"?refresh={random.randint(1000, 9999)}"
        fallback_image = selected_image + cache_buster
        logging.info(f"Using fallback {category} image for '{query}': {fallback_image}")
        return fallback_image