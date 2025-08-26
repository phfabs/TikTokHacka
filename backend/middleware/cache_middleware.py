from functools import wraps
from flask import request, jsonify, g
from typing import Callable, Any, Optional
import hashlib
import json
from backend.services.cache_service import CacheService

def cache_response(ttl: int = None, key_prefix: str = None, 
                  invalidate_on_methods: list = None):
    """
    Decorator to cache API response
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Custom prefix for cache key
        invalidate_on_methods: HTTP methods that should invalidate cache
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Skip caching for non-GET requests by default
            if request.method != 'GET':
                return f(*args, **kwargs)
            
            # Generate cache key
            cache_key = _generate_cache_key(
                request.endpoint, 
                request.args.to_dict(),
                key_prefix,
                getattr(g, 'current_user', {}).get('_id', 'anonymous')
            )
            
            # Try to get from cache
            cached_response = CacheService.get(cache_key)
            if cached_response is not None:
                return jsonify(cached_response)
            
            # Execute the function
            response = f(*args, **kwargs)
            
            # Cache successful responses
            if hasattr(response, 'status_code') and response.status_code == 200:
                response_data = response.get_json()
                if response_data:
                    CacheService.set(cache_key, response_data, ttl or CacheService.DEFAULT_TTL)
            
            return response
        
        return wrapper
    return decorator

def cache_user_specific(ttl: int = None, cache_key_suffix: str = ""):
    """
    Decorator to cache user-specific data
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return f(*args, **kwargs)
            
            user_id = str(g.current_user['_id'])
            cache_key = f"{CacheService.USER_PREFIX}{user_id}:{f.__name__}:{cache_key_suffix}"
            
            # Try cache first
            cached_data = CacheService.get(cache_key)
            if cached_data is not None:
                return jsonify(cached_data)
            
            # Execute function
            response = f(*args, **kwargs)
            
            # Cache successful responses
            if hasattr(response, 'status_code') and response.status_code == 200:
                response_data = response.get_json()
                if response_data:
                    CacheService.set(cache_key, response_data, ttl or CacheService.MEDIUM_TTL)
            
            return response
        
        return wrapper
    return decorator

def invalidate_cache_on_change(cache_patterns: list):
    """
    Decorator to invalidate cache when data changes
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Execute the function first
            response = f(*args, **kwargs)
            
            # Invalidate cache on successful operations
            if hasattr(response, 'status_code') and response.status_code in [200, 201, 204]:
                for pattern in cache_patterns:
                    # Replace placeholders in pattern
                    if '{user_id}' in pattern and hasattr(g, 'current_user'):
                        pattern = pattern.replace('{user_id}', str(g.current_user['_id']))
                    
                    # Add any URL parameters to pattern
                    for key, value in kwargs.items():
                        pattern = pattern.replace(f'{{{key}}}', str(value))
                    
                    CacheService.delete_pattern(pattern)
            
            return response
        
        return wrapper
    return decorator

def rate_limit(requests_per_minute: int = 60, per_user: bool = True):
    """
    Rate limiting decorator using Redis
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Determine identifier for rate limiting
            if per_user and hasattr(g, 'current_user') and g.current_user:
                identifier = f"user:{g.current_user['_id']}"
            else:
                identifier = f"ip:{request.remote_addr}"
            
            # Check rate limit
            limit_info = CacheService.check_rate_limit(
                identifier=f"{request.endpoint}:{identifier}",
                limit=requests_per_minute,
                window_seconds=60
            )
            
            if not limit_info["allowed"]:
                return jsonify({
                    "error": "Rate limit exceeded",
                    "retry_after": limit_info.get("reset_time"),
                    "remaining": limit_info["remaining"]
                }), 429
            
            # Add rate limit headers
            response = f(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers['X-RateLimit-Remaining'] = str(limit_info["remaining"])
                response.headers['X-RateLimit-Reset'] = limit_info.get("reset_time", "")
            
            return response
        
        return wrapper
    return decorator

def cache_search_results(ttl: int = None):
    """
    Specialized caching for search results
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Get search query from request
            query = request.args.get('query', '')
            if not query:
                return f(*args, **kwargs)
            
            # Check cache first
            cached_results = CacheService.get_search_results(query)
            if cached_results is not None:
                return jsonify({
                    "message": "Search results retrieved from cache",
                    "cached": True,
                    **cached_results
                })
            
            # Execute search
            response = f(*args, **kwargs)
            
            # Cache successful search results
            if hasattr(response, 'status_code') and response.status_code == 200:
                response_data = response.get_json()
                if response_data and 'users' in response_data:
                    CacheService.cache_search_results(
                        query, 
                        response_data, 
                        ttl or CacheService.SHORT_TTL
                    )
            
            return response
        
        return wrapper
    return decorator

def warm_cache_on_startup():
    """
    Warm cache when application starts
    """
    try:
        if CacheService.is_available():
            CacheService.warm_cache("trending")
            print("✅ Cache warmed successfully")
        else:
            print("⚠️ Redis not available - skipping cache warming")
    except Exception as e:
        print(f"❌ Cache warming failed: {e}")

def _generate_cache_key(endpoint: str, params: dict, prefix: str = None, user_id: str = None) -> str:
    """
    Generate a cache key based on endpoint and parameters
    """
    key_parts = []
    
    if prefix:
        key_parts.append(prefix)
    
    key_parts.append(endpoint.replace('.', '_'))
    
    if user_id and user_id != 'anonymous':
        key_parts.append(f"user_{user_id}")
    
    # Add sorted parameters
    if params:
        param_string = json.dumps(params, sort_keys=True)
        param_hash = hashlib.md5(param_string.encode()).hexdigest()
        key_parts.append(param_hash)
    
    return ":".join(key_parts)

class CacheManager:
    """
    Cache manager for handling complex cache operations
    """
    
    @staticmethod
    def invalidate_user_related_cache(user_id: str):
        """
        Invalidate all cache related to a specific user
        """
        patterns = [
            f"{CacheService.USER_PREFIX}*{user_id}*",
            f"{CacheService.FEED_PREFIX}*{user_id}*",
            f"{CacheService.NOTIFICATION_PREFIX}user:{user_id}",
            f"{CacheService.ANALYTICS_PREFIX}user:{user_id}*"
        ]
        
        for pattern in patterns:
            CacheService.delete_pattern(pattern)
    
    @staticmethod
    def invalidate_skill_related_cache(skill_id: str):
        """
        Invalidate all cache related to a specific skill
        """
        patterns = [
            f"{CacheService.SKILL_PREFIX}*{skill_id}*",
            f"{CacheService.ANALYTICS_PREFIX}skill:{skill_id}*",
            f"{CacheService.TRENDING_PREFIX}*"
        ]
        
        for pattern in patterns:
            CacheService.delete_pattern(pattern)
    
    @staticmethod
    def invalidate_trending_cache():
        """
        Invalidate all trending-related cache
        """
        CacheService.delete_pattern(f"{CacheService.TRENDING_PREFIX}*")
    
    @staticmethod
    def bulk_cache_users(user_ids: list, fetch_function: Callable):
        """
        Bulk cache user data
        """
        # Get existing cached data
        cache_keys = [f"{CacheService.USER_PREFIX}profile:{uid}" for uid in user_ids]
        cached_data = CacheService.mget(cache_keys)
        
        # Find missing data
        missing_user_ids = []
        for i, user_id in enumerate(user_ids):
            cache_key = cache_keys[i]
            if cache_key not in cached_data:
                missing_user_ids.append(user_id)
        
        # Fetch missing data
        if missing_user_ids:
            fresh_data = fetch_function(missing_user_ids)
            
            # Cache the fresh data
            cache_pairs = {}
            for user_id, user_data in fresh_data.items():
                cache_key = f"{CacheService.USER_PREFIX}profile:{user_id}"
                cache_pairs[cache_key] = user_data
            
            CacheService.mset(cache_pairs, CacheService.MEDIUM_TTL)
    
    @staticmethod
    def preload_user_feed_cache(user_id: str, feed_data: list):
        """
        Preload user feed cache after computing expensive operations
        """
        CacheService.cache_user_feed(user_id, feed_data, CacheService.SHORT_TTL)
    
    @staticmethod
    def schedule_cache_refresh(cache_type: str, delay_seconds: int = 0):
        """
        Schedule cache refresh (would integrate with a task queue in production)
        """
        # This is a placeholder for background task integration
        # In production, you'd use Celery or similar
        import threading
        import time
        
        def refresh_cache():
            if delay_seconds > 0:
                time.sleep(delay_seconds)
            CacheService.warm_cache(cache_type)
        
        thread = threading.Thread(target=refresh_cache)
        thread.daemon = True
        thread.start()

def cache_health_check() -> dict:
    """
    Health check for cache system
    """
    if not CacheService.is_available():
        return {
            "status": "unhealthy",
            "message": "Redis connection not available"
        }
    
    try:
        # Test basic operations
        test_key = "health_check_test"
        test_value = {"timestamp": "test"}
        
        # Test set
        set_success = CacheService.set(test_key, test_value, 10)
        if not set_success:
            return {
                "status": "unhealthy",
                "message": "Cache set operation failed"
            }
        
        # Test get
        retrieved_value = CacheService.get(test_key)
        if retrieved_value != test_value:
            return {
                "status": "unhealthy", 
                "message": "Cache get operation failed"
            }
        
        # Clean up
        CacheService.delete(test_key)
        
        # Get stats
        stats = CacheService.get_cache_stats()
        
        return {
            "status": "healthy",
            "message": "Cache system operational",
            "stats": stats
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Cache health check failed: {str(e)}"
        }