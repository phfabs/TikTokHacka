from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from backend.auth.routes import require_auth
from backend.services.cache_service import CacheService
from backend.middleware.cache_middleware import cache_health_check, CacheManager

# Create blueprint
cache_bp = Blueprint('cache', __name__)

# Validation Schemas
class CacheKeySchema(Schema):
    key = fields.Str(required=True, validate=validate.Length(min=1, max=200))

class CacheSetSchema(Schema):
    key = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    value = fields.Raw(required=True)
    ttl = fields.Int(validate=validate.Range(min=1, max=86400))  # Max 24 hours

class WarmCacheSchema(Schema):
    cache_type = fields.Str(load_default="all", validate=validate.OneOf([
        "all", "trending", "popular_skills", "user_profiles"
    ]))

# Error handlers
@cache_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@cache_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@cache_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Health and status endpoints
@cache_bp.route('/health', methods=['GET'])
def get_cache_health():
    """Get cache system health status"""
    health_status = cache_health_check()
    status_code = 200 if health_status["status"] == "healthy" else 503
    
    return jsonify(health_status), status_code

@cache_bp.route('/stats', methods=['GET'])
@require_auth
def get_cache_stats():
    """Get cache statistics (admin only)"""
    try:
        # TODO: Add proper admin role check
        
        stats = CacheService.get_cache_stats()
        
        return jsonify({
            "message": "Cache statistics retrieved successfully",
            "stats": stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get cache stats: {str(e)}"}), 500

# Cache management endpoints
@cache_bp.route('/warm', methods=['POST'])
@require_auth
def warm_cache():
    """Warm cache with frequently accessed data (admin only)"""
    try:
        # TODO: Add proper admin role check
        
        data = request.get_json() or {}
        validated_data = cast(dict, WarmCacheSchema().load(data))
        
        if not CacheService.is_available():
            return jsonify({"error": "Cache service not available"}), 503
        
        CacheService.warm_cache(validated_data["cache_type"])
        
        return jsonify({
            "message": f"Cache warming initiated for: {validated_data['cache_type']}"
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to warm cache: {str(e)}"}), 500

@cache_bp.route('/clear', methods=['DELETE'])
@require_auth
def clear_cache():
    """Clear all application cache (admin only - use with caution!)"""
    try:
        # TODO: Add proper admin role check
        
        confirmation = request.args.get('confirm', '').lower()
        if confirmation != 'yes':
            return jsonify({
                "error": "This action requires confirmation",
                "message": "Add '?confirm=yes' to the URL to proceed"
            }), 400
        
        if not CacheService.is_available():
            return jsonify({"error": "Cache service not available"}), 503
        
        cleared_count = CacheService.clear_all_cache()
        
        return jsonify({
            "message": f"Cache cleared successfully",
            "cleared_entries": cleared_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to clear cache: {str(e)}"}), 500

@cache_bp.route('/invalidate/user/<user_id>', methods=['DELETE'])
@require_auth
def invalidate_user_cache(user_id: str):
    """Invalidate all cache for a specific user"""
    try:
        # Users can only invalidate their own cache, admins can invalidate any
        current_user_id = str(g.current_user['_id'])
        if current_user_id != user_id:
            # TODO: Add proper admin role check
            return jsonify({"error": "Unauthorized to invalidate other users' cache"}), 403
        
        CacheManager.invalidate_user_related_cache(user_id)
        
        return jsonify({
            "message": f"Cache invalidated for user {user_id}"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to invalidate user cache: {str(e)}"}), 500

@cache_bp.route('/invalidate/skill/<skill_id>', methods=['DELETE'])
@require_auth
def invalidate_skill_cache(skill_id: str):
    """Invalidate all cache for a specific skill"""
    try:
        # TODO: Check if user owns the skill or is admin
        
        CacheManager.invalidate_skill_related_cache(skill_id)
        
        return jsonify({
            "message": f"Cache invalidated for skill {skill_id}"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to invalidate skill cache: {str(e)}"}), 500

@cache_bp.route('/invalidate/trending', methods=['DELETE'])
@require_auth
def invalidate_trending_cache():
    """Invalidate trending content cache"""
    try:
        # TODO: Add proper admin/moderator role check
        
        CacheManager.invalidate_trending_cache()
        
        return jsonify({
            "message": "Trending cache invalidated successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to invalidate trending cache: {str(e)}"}), 500

# Development/debugging endpoints (should be disabled in production)
@cache_bp.route('/get', methods=['GET'])
@require_auth
def get_cache_value():
    """Get a value from cache by key (development only)"""
    try:
        # TODO: Disable this endpoint in production or add strict admin checks
        
        key = request.args.get('key')
        if not key:
            return jsonify({"error": "Key parameter is required"}), 400
        
        value = CacheService.get(key)
        
        if value is None:
            return jsonify({
                "message": "Key not found in cache",
                "key": key
            }), 404
        
        return jsonify({
            "message": "Cache value retrieved successfully",
            "key": key,
            "value": value
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get cache value: {str(e)}"}), 500

@cache_bp.route('/set', methods=['POST'])
@require_auth
def set_cache_value():
    """Set a value in cache (development only)"""
    try:
        # TODO: Disable this endpoint in production or add strict admin checks
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, CacheSetSchema().load(data))
        
        success = CacheService.set(
            validated_data['key'], 
            validated_data['value'], 
            validated_data.get('ttl')
        )
        
        if success:
            return jsonify({
                "message": "Cache value set successfully",
                "key": validated_data['key']
            }), 201
        else:
            return jsonify({"error": "Failed to set cache value"}), 500
        
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to set cache value: {str(e)}"}), 500

@cache_bp.route('/delete', methods=['DELETE'])
@require_auth
def delete_cache_value():
    """Delete a value from cache by key (development only)"""
    try:
        # TODO: Disable this endpoint in production or add strict admin checks
        
        key = request.args.get('key')
        if not key:
            return jsonify({"error": "Key parameter is required"}), 400
        
        success = CacheService.delete(key)
        
        if success:
            return jsonify({
                "message": "Cache key deleted successfully",
                "key": key
            }), 200
        else:
            return jsonify({
                "message": "Key not found or already deleted",
                "key": key
            }), 404
        
    except Exception as e:
        return jsonify({"error": f"Failed to delete cache value: {str(e)}"}), 500

@cache_bp.route('/exists', methods=['GET'])
@require_auth
def check_cache_exists():
    """Check if a key exists in cache (development only)"""
    try:
        # TODO: Disable this endpoint in production or add strict admin checks
        
        key = request.args.get('key')
        if not key:
            return jsonify({"error": "Key parameter is required"}), 400
        
        exists = CacheService.exists(key)
        
        return jsonify({
            "key": key,
            "exists": exists
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to check cache key: {str(e)}"}), 500

# Cache optimization endpoints
@cache_bp.route('/preload/trending', methods=['POST'])
@require_auth
def preload_trending_cache():
    """Preload trending content cache"""
    try:
        # TODO: Add proper admin role check
        
        # This would typically be called after computing expensive trending algorithms
        # For now, we'll just warm the trending cache
        CacheService.warm_cache("trending")
        
        return jsonify({
            "message": "Trending cache preloaded successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to preload trending cache: {str(e)}"}), 500

@cache_bp.route('/batch/invalidate', methods=['POST'])
@require_auth
def batch_invalidate_cache():
    """Batch invalidate multiple cache patterns"""
    try:
        # TODO: Add proper admin role check
        
        data = request.get_json()
        if not data or 'patterns' not in data:
            return jsonify({"error": "patterns array is required"}), 400
        
        patterns = data['patterns']
        if not isinstance(patterns, list) or len(patterns) == 0:
            return jsonify({"error": "patterns must be a non-empty array"}), 400
        
        total_deleted = 0
        for pattern in patterns:
            if isinstance(pattern, str):
                deleted = CacheService.delete_pattern(pattern)
                total_deleted += deleted
        
        return jsonify({
            "message": "Batch cache invalidation completed",
            "patterns_processed": len(patterns),
            "total_keys_deleted": total_deleted
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to batch invalidate cache: {str(e)}"}), 500

# Cache monitoring and debugging
@cache_bp.route('/monitor/keys', methods=['GET'])
@require_auth
def monitor_cache_keys():
    """Monitor cache keys (admin only - expensive operation)"""
    try:
        # TODO: Add proper admin role check and rate limiting
        
        if not CacheService.is_available():
            return jsonify({"error": "Cache service not available"}), 503
        
        client = CacheService.get_redis_client()
        
        # Get sample of keys (limited to prevent performance issues)
        pattern = request.args.get('pattern', '*')
        limit = min(request.args.get('limit', 100, type=int), 1000)
        
        keys = []
        for key in client.scan_iter(match=pattern, count=100):
            if len(keys) >= limit:
                break
            
            key_str = key.decode('utf-8') if isinstance(key, bytes) else key
            ttl = client.ttl(key)
            
            keys.append({
                "key": key_str,
                "ttl": ttl if ttl > 0 else "no expiration",
                "type": client.type(key).decode('utf-8') if isinstance(client.type(key), bytes) else client.type(key)
            })
        
        return jsonify({
            "message": f"Cache keys retrieved (limited to {limit})",
            "pattern": pattern,
            "keys": keys,
            "total_shown": len(keys)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to monitor cache keys: {str(e)}"}), 500

@cache_bp.route('/performance/hit-rate', methods=['GET'])
@require_auth
def get_cache_hit_rate():
    """Get cache hit rate performance metrics"""
    try:
        # TODO: Add proper admin role check
        
        stats = CacheService.get_cache_stats()
        
        return jsonify({
            "message": "Cache performance metrics retrieved",
            "hit_rate": stats.get("hit_rate", 0),
            "hits": stats.get("hits", 0),
            "misses": stats.get("misses", 0),
            "total_keys": stats.get("keys", 0),
            "memory_usage": stats.get("used_memory_human", "0B")
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get cache performance: {str(e)}"}), 500