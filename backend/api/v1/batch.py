from flask import Blueprint, request, jsonify, g
from marshmallow import Schema, fields, ValidationError, validate
from typing import cast
from datetime import datetime
from backend.auth.routes import require_auth
from backend.services.batch_processor import batch_processor

# Create blueprint
batch_bp = Blueprint('batch', __name__)

# Validation Schemas
class ProcessBatchSchema(Schema):
    batch_type = fields.Str(required=True, validate=validate.OneOf([
        "engagement", "trending", "notifications", "cache_maintenance", "analytics"
    ]))

class CleanupDataSchema(Schema):
    days_old = fields.Int(load_default=90, validate=validate.Range(min=1, max=365))

# Error handlers
@batch_bp.errorhandler(ValidationError)
def handle_marshmallow_validation(err):
    return jsonify({"error": "Validation failed", "details": err.messages}), 422

@batch_bp.errorhandler(ValueError)
def handle_value_error(err):
    return jsonify({"error": str(err)}), 400

@batch_bp.errorhandler(Exception)
def handle_generic_error(err):
    return jsonify({"error": "An unexpected error occurred."}), 500

# Batch processing endpoints
@batch_bp.route('/status', methods=['GET'])
@require_auth
def get_batch_status():
    """Get status of batch processing system (admin only)"""
    try:
        # TODO: Add proper admin role check
        
        status = batch_processor.get_batch_status()
        
        return jsonify({
            "message": "Batch processing status retrieved successfully",
            "status": status
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to get batch status: {str(e)}"}), 500

@batch_bp.route('/start', methods=['POST'])
@require_auth
def start_batch_processing():
    """Start batch processing system (admin only)"""
    try:
        # TODO: Add proper admin role check
        
        batch_processor.start_batch_processing()
        
        return jsonify({
            "message": "Batch processing started successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to start batch processing: {str(e)}"}), 500

@batch_bp.route('/stop', methods=['POST'])
@require_auth
def stop_batch_processing():
    """Stop batch processing system (admin only)"""
    try:
        # TODO: Add proper admin role check
        
        batch_processor.stop_batch_processing()
        
        return jsonify({
            "message": "Batch processing stopped successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to stop batch processing: {str(e)}"}), 500

@batch_bp.route('/process', methods=['POST'])
@require_auth
def process_immediate_batch():
    """Process a specific batch type immediately (admin only)"""
    try:
        # TODO: Add proper admin role check
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        validated_data = cast(dict, ProcessBatchSchema().load(data))
        
        result = batch_processor.process_immediate_batch(validated_data['batch_type'])
        
        if result['success']:
            return jsonify({
                "message": result['message'],
                "processed_items": result['processed_items']
            }), 200
        else:
            return jsonify({"error": result['message']}), 500
            
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400

@batch_bp.route('/cleanup', methods=['POST'])
@require_auth
def cleanup_old_data():
    """Clean up old data (admin only)"""
    try:
        # TODO: Add proper admin role check
        
        data = request.get_json() or {}
        validated_data = cast(dict, CleanupDataSchema().load(data))
        
        batch_processor.cleanup_old_data(validated_data['days_old'])
        
        return jsonify({
            "message": f"Data cleanup initiated for data older than {validated_data['days_old']} days"
        }), 200
        
    except ValidationError as e:
        return jsonify({"error": "Invalid input", "details": e.messages}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to cleanup data: {str(e)}"}), 500

@batch_bp.route('/health', methods=['GET'])
def batch_health():
    """Health check for batch processing system"""
    try:
        status = batch_processor.get_batch_status()
        
        if status['running']:
            # Check if any threads have died
            dead_threads = [name for name, alive in status['active_threads'].items() if not alive]
            
            if dead_threads:
                return jsonify({
                    "status": "degraded",
                    "message": f"Some batch processes are not running: {', '.join(dead_threads)}",
                    "timestamp": datetime.utcnow().isoformat()
                }), 503
            else:
                return jsonify({
                    "status": "healthy",
                    "message": "All batch processes running normally",
                    "timestamp": datetime.utcnow().isoformat()
                }), 200
        else:
            return jsonify({
                "status": "stopped",
                "message": "Batch processing is not running",
                "timestamp": datetime.utcnow().isoformat()
            }), 200
            
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "message": f"Batch processing system error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }), 503