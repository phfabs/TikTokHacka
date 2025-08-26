import redis
import json
import pickle
import logging
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta
from flask import current_app
import os

class CacheService:
    """Redis-based caching service for performance optimization"""
    
    _redis_client = None
    
    # Cache key prefixes
    USER_PREFIX = "user:"
    SKILL_PREFIX = "skill:"
    ANALYTICS_PREFIX = "analytics:"
    TRENDING_PREFIX = "trending:"
    FEED_PREFIX = "feed:"
    NOTIFICATION_PREFIX = "notification:"
    SEARCH_PREFIX = "search:"
    MODERATION_PREFIX = "moderation:"
    
    # Default TTL values (in seconds)
    DEFAULT_TTL = 3600  # 1 hour
    SHORT_TTL = 300     # 5 minutes
    MEDIUM_TTL = 1800   # 30 minutes
    LONG_TTL = 86400    # 24 hours
    TRENDING_TTL = 900  # 15 minutes

    @classmethod
    def get_redis_client(cls):
        """Get Redis client instance"""
        if cls._redis_client is None:
            try:
                redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
                cls._redis_client = redis.from_url(
                    redis_url,
                    decode_responses=False,  # We handle encoding ourselves
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True
                )
                
                # Test connection
                cls._redis_client.ping()
                logging.info("Redis connection established successfully")
                
            except Exception as e:
                logging.error(f"Redis connection failed: {e}")
                cls._redis_client = None
                
        return cls._redis_client

    @classmethod
    def is_available(cls) -> bool:
        """Check if Redis is available"""
        try:
            client = cls.get_redis_client()
            return client is not None and client.ping()
        except:
            return False

    @classmethod
    def set(cls, key: str, value: Any, ttl: int = None) -> bool:
        """Set a value in cache"""
        if not cls.is_available():
            return False
        
        try:
            client = cls.get_redis_client()
            
            # Serialize the value
            if isinstance(value, (dict, list)):
                serialized_value = json.dumps(value, default=str)
            else:
                serialized_value = pickle.dumps(value)
            
            # Set with TTL
            ttl = ttl or cls.DEFAULT_TTL
            result = client.setex(key, ttl, serialized_value)
            
            return bool(result)
            
        except Exception as e:
            logging.error(f"Cache set error for key {key}: {e}")
            return False

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """Get a value from cache"""
        if not cls.is_available():
            return None
        
        try:
            client = cls.get_redis_client()
            value = client.get(key)
            
            if value is None:
                return None
            
            # Try JSON first, then pickle
            try:
                return json.loads(value.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                return pickle.loads(value)
                
        except Exception as e:
            logging.error(f"Cache get error for key {key}: {e}")
            return None

    @classmethod
    def delete(cls, key: str) -> bool:
        """Delete a key from cache"""
        if not cls.is_available():
            return False
        
        try:
            client = cls.get_redis_client()
            result = client.delete(key)
            return bool(result)
            
        except Exception as e:
            logging.error(f"Cache delete error for key {key}: {e}")
            return False

    @classmethod
    def delete_pattern(cls, pattern: str) -> int:
        """Delete all keys matching a pattern"""
        if not cls.is_available():
            return 0
        
        try:
            client = cls.get_redis_client()
            keys = client.keys(pattern)
            if keys:
                return client.delete(*keys)
            return 0
            
        except Exception as e:
            logging.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0

    @classmethod
    def exists(cls, key: str) -> bool:
        """Check if key exists in cache"""
        if not cls.is_available():
            return False
        
        try:
            client = cls.get_redis_client()
            return bool(client.exists(key))
            
        except Exception as e:
            logging.error(f"Cache exists error for key {key}: {e}")
            return False

    @classmethod
    def expire(cls, key: str, ttl: int) -> bool:
        """Set expiration time for a key"""
        if not cls.is_available():
            return False
        
        try:
            client = cls.get_redis_client()
            return bool(client.expire(key, ttl))
            
        except Exception as e:
            logging.error(f"Cache expire error for key {key}: {e}")
            return False

    @classmethod
    def increment(cls, key: str, amount: int = 1) -> Optional[int]:
        """Increment a numeric value"""
        if not cls.is_available():
            return None
        
        try:
            client = cls.get_redis_client()
            return client.incrby(key, amount)
            
        except Exception as e:
            logging.error(f"Cache increment error for key {key}: {e}")
            return None

    @classmethod
    def decrement(cls, key: str, amount: int = 1) -> Optional[int]:
        """Decrement a numeric value"""
        if not cls.is_available():
            return None
        
        try:
            client = cls.get_redis_client()
            return client.decrby(key, amount)
            
        except Exception as e:
            logging.error(f"Cache decrement error for key {key}: {e}")
            return None

    # Specialized caching methods
    
    @classmethod
    def cache_user_profile(cls, user_id: str, profile_data: Dict, ttl: int = None) -> bool:
        """Cache user profile data"""
        key = f"{cls.USER_PREFIX}profile:{user_id}"
        return cls.set(key, profile_data, ttl or cls.MEDIUM_TTL)

    @classmethod
    def get_user_profile(cls, user_id: str) -> Optional[Dict]:
        """Get cached user profile"""
        key = f"{cls.USER_PREFIX}profile:{user_id}"
        return cls.get(key)

    @classmethod
    def cache_skill_data(cls, skill_id: str, skill_data: Dict, ttl: int = None) -> bool:
        """Cache skill data"""
        key = f"{cls.SKILL_PREFIX}data:{skill_id}"
        return cls.set(key, skill_data, ttl or cls.MEDIUM_TTL)

    @classmethod
    def get_skill_data(cls, skill_id: str) -> Optional[Dict]:
        """Get cached skill data"""
        key = f"{cls.SKILL_PREFIX}data:{skill_id}"
        return cls.get(key)

    @classmethod
    def cache_trending_skills(cls, trending_data: List[Dict], ttl: int = None) -> bool:
        """Cache trending skills"""
        key = f"{cls.TRENDING_PREFIX}skills"
        return cls.set(key, trending_data, ttl or cls.TRENDING_TTL)

    @classmethod
    def get_trending_skills(cls) -> Optional[List[Dict]]:
        """Get cached trending skills"""
        key = f"{cls.TRENDING_PREFIX}skills"
        return cls.get(key)

    @classmethod
    def cache_user_feed(cls, user_id: str, feed_data: List[Dict], ttl: int = None) -> bool:
        """Cache user activity feed"""
        key = f"{cls.FEED_PREFIX}user:{user_id}"
        return cls.set(key, feed_data, ttl or cls.SHORT_TTL)

    @classmethod
    def get_user_feed(cls, user_id: str) -> Optional[List[Dict]]:
        """Get cached user feed"""
        key = f"{cls.FEED_PREFIX}user:{user_id}"
        return cls.get(key)

    @classmethod
    def invalidate_user_feed(cls, user_id: str) -> bool:
        """Invalidate user feed cache"""
        key = f"{cls.FEED_PREFIX}user:{user_id}"
        return cls.delete(key)

    @classmethod
    def cache_search_results(cls, query: str, results: List[Dict], ttl: int = None) -> bool:
        """Cache search results"""
        # Create a hash of the query for the key
        import hashlib
        query_hash = hashlib.md5(query.encode()).hexdigest()
        key = f"{cls.SEARCH_PREFIX}results:{query_hash}"
        return cls.set(key, results, ttl or cls.SHORT_TTL)

    @classmethod
    def get_search_results(cls, query: str) -> Optional[List[Dict]]:
        """Get cached search results"""
        import hashlib
        query_hash = hashlib.md5(query.encode()).hexdigest()
        key = f"{cls.SEARCH_PREFIX}results:{query_hash}"
        return cls.get(key)

    @classmethod
    def cache_analytics_data(cls, analytics_key: str, data: Dict, ttl: int = None) -> bool:
        """Cache analytics data"""
        key = f"{cls.ANALYTICS_PREFIX}{analytics_key}"
        return cls.set(key, data, ttl or cls.MEDIUM_TTL)

    @classmethod
    def get_analytics_data(cls, analytics_key: str) -> Optional[Dict]:
        """Get cached analytics data"""
        key = f"{cls.ANALYTICS_PREFIX}{analytics_key}"
        return cls.get(key)

    @classmethod
    def cache_user_notifications(cls, user_id: str, notifications: List[Dict], ttl: int = None) -> bool:
        """Cache user notifications"""
        key = f"{cls.NOTIFICATION_PREFIX}user:{user_id}"
        return cls.set(key, notifications, ttl or cls.SHORT_TTL)

    @classmethod
    def get_user_notifications(cls, user_id: str) -> Optional[List[Dict]]:
        """Get cached user notifications"""
        key = f"{cls.NOTIFICATION_PREFIX}user:{user_id}"
        return cls.get(key)

    @classmethod
    def invalidate_user_notifications(cls, user_id: str) -> bool:
        """Invalidate user notifications cache"""
        key = f"{cls.NOTIFICATION_PREFIX}user:{user_id}"
        return cls.delete(key)

    # Rate limiting
    
    @classmethod
    def check_rate_limit(cls, identifier: str, limit: int, window_seconds: int) -> Dict[str, Any]:
        """Check rate limit for an identifier"""
        if not cls.is_available():
            return {"allowed": True, "remaining": limit}
        
        try:
            client = cls.get_redis_client()
            key = f"rate_limit:{identifier}"
            
            # Use sliding window counter
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=window_seconds)
            
            # Clean old entries and count current requests
            pipe = client.pipeline()
            pipe.zremrangebyscore(key, 0, window_start.timestamp())
            pipe.zcard(key)
            pipe.expire(key, window_seconds)
            
            results = pipe.execute()
            current_requests = results[1]
            
            if current_requests < limit:
                # Add current request
                client.zadd(key, {str(now.timestamp()): now.timestamp()})
                remaining = limit - current_requests - 1
                return {
                    "allowed": True,
                    "remaining": remaining,
                    "reset_time": (now + timedelta(seconds=window_seconds)).isoformat()
                }
            else:
                return {
                    "allowed": False,
                    "remaining": 0,
                    "reset_time": (now + timedelta(seconds=window_seconds)).isoformat()
                }
                
        except Exception as e:
            logging.error(f"Rate limit check error: {e}")
            return {"allowed": True, "remaining": limit}

    # Cache warming and maintenance
    
    @classmethod
    def warm_cache(cls, cache_type: str = "all"):
        """Warm up cache with frequently accessed data"""
        if not cls.is_available():
            return
        
        try:
            if cache_type in ["all", "trending"]:
                cls._warm_trending_cache()
            
            if cache_type in ["all", "popular_skills"]:
                cls._warm_popular_skills_cache()
                
            logging.info(f"Cache warming completed for: {cache_type}")
            
        except Exception as e:
            logging.error(f"Cache warming error: {e}")

    @classmethod
    def _warm_trending_cache(cls):
        """Warm trending content cache"""
        # This would typically call the analytics service to get trending data
        # For now, we'll create a placeholder
        trending_skills = []  # Would fetch from AnalyticsService
        cls.cache_trending_skills(trending_skills)

    @classmethod
    def _warm_popular_skills_cache(cls):
        """Warm popular skills cache"""
        # This would fetch popular skills from the database
        pass

    @classmethod
    def clear_all_cache(cls) -> int:
        """Clear all application cache (be careful!)"""
        if not cls.is_available():
            return 0
        
        try:
            prefixes = [
                cls.USER_PREFIX, cls.SKILL_PREFIX, cls.ANALYTICS_PREFIX,
                cls.TRENDING_PREFIX, cls.FEED_PREFIX, cls.NOTIFICATION_PREFIX,
                cls.SEARCH_PREFIX, cls.MODERATION_PREFIX
            ]
            
            total_deleted = 0
            for prefix in prefixes:
                deleted = cls.delete_pattern(f"{prefix}*")
                total_deleted += deleted
            
            logging.info(f"Cleared {total_deleted} cache entries")
            return total_deleted
            
        except Exception as e:
            logging.error(f"Clear cache error: {e}")
            return 0

    @classmethod
    def get_cache_stats(cls) -> Dict[str, Any]:
        """Get cache statistics"""
        if not cls.is_available():
            return {"status": "unavailable"}
        
        try:
            client = cls.get_redis_client()
            info = client.info()
            
            stats = {
                "status": "available",
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "used_memory_peak_human": info.get("used_memory_peak_human", "0B"),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
                "keys": client.dbsize(),
                "uptime_in_seconds": info.get("uptime_in_seconds", 0)
            }
            
            # Calculate hit rate
            total_requests = stats["hits"] + stats["misses"]
            if total_requests > 0:
                stats["hit_rate"] = round((stats["hits"] / total_requests) * 100, 2)
            else:
                stats["hit_rate"] = 0
            
            return stats
            
        except Exception as e:
            logging.error(f"Cache stats error: {e}")
            return {"status": "error", "error": str(e)}

    # Context manager for cache operations
    
    @classmethod
    def get_or_set(cls, key: str, fetch_function, ttl: int = None) -> Any:
        """Get from cache or fetch and set if not found"""
        # Try to get from cache first
        cached_value = cls.get(key)
        if cached_value is not None:
            return cached_value
        
        # Fetch fresh data
        fresh_value = fetch_function()
        
        # Cache the result
        if fresh_value is not None:
            cls.set(key, fresh_value, ttl or cls.DEFAULT_TTL)
        
        return fresh_value

    @classmethod
    def mget(cls, keys: List[str]) -> Dict[str, Any]:
        """Get multiple keys at once"""
        if not cls.is_available():
            return {}
        
        try:
            client = cls.get_redis_client()
            values = client.mget(keys)
            
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        result[key] = json.loads(value.decode('utf-8'))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        result[key] = pickle.loads(value)
                
            return result
            
        except Exception as e:
            logging.error(f"Cache mget error: {e}")
            return {}

    @classmethod
    def mset(cls, key_value_pairs: Dict[str, Any], ttl: int = None) -> bool:
        """Set multiple key-value pairs at once"""
        if not cls.is_available():
            return False
        
        try:
            client = cls.get_redis_client()
            pipe = client.pipeline()
            
            for key, value in key_value_pairs.items():
                if isinstance(value, (dict, list)):
                    serialized_value = json.dumps(value, default=str)
                else:
                    serialized_value = pickle.dumps(value)
                
                pipe.setex(key, ttl or cls.DEFAULT_TTL, serialized_value)
            
            results = pipe.execute()
            return all(results)
            
        except Exception as e:
            logging.error(f"Cache mset error: {e}")
            return False