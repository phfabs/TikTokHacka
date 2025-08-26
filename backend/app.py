import os
import json
from datetime import datetime
from bson import ObjectId
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_socketio import SocketIO
from pymongo import MongoClient
from backend.auth.routes import auth_bp
from backend.services.ai_service import AIService
import logging
from dotenv import load_dotenv

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

load_dotenv()


def create_app():
    app = Flask(__name__)
    app.json_encoder = CustomJSONEncoder

    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    app.config['MONGO_URI'] = os.getenv('MONGO_URI', 'mongodb://localhost:27017/skillplan_db')
    app.config['SECRET_KEY'] = os.getenv('WEBSOCKET_SECRET_KEY', 'websocket-secret-key-change-in-production')

    # CORS configuration for both HTTP and WebSocket
    allowed_origins = [
        os.getenv('FRONTEND_URL', 'http://localhost:8081'),
        'http://localhost:8081',
        'exp://192.168.0.116:8081'  
    ]
    
    CORS(app, origins=allowed_origins)
    
    # Initialize SocketIO with CORS
    socketio = SocketIO(app, cors_allowed_origins=allowed_origins, 
                       logger=True, engineio_logger=True)
    
    # Initialize WebSocket service
    from backend.services.websocket_service import WebSocketService
    websocket_service = WebSocketService(socketio)
    
    # Make WebSocket service available globally
    app.websocket_service = websocket_service
    app.socketio = socketio
    
    # Initialize email service
    from backend.services.email_service import email_service
    app.email_service = email_service
    
    # Initialize and start batch processor
    from backend.services.batch_processor import batch_processor
    if os.getenv('ENABLE_BATCH_PROCESSING', 'true').lower() == 'true':
        try:
            batch_processor.start_batch_processing(app)
            app.batch_processor = batch_processor
            print("✅ Batch processing started")
        except Exception as e:
            print(f"⚠️ Failed to start batch processing: {e}")
    
    # Initialize cache warming
    from backend.middleware.cache_middleware import warm_cache_on_startup
    warm_cache_on_startup()


    @app.before_request
    def before_request():
        try:
            if 'db_client' not in g:
                mongo_uri = os.getenv("MONGO_URI")
                if not mongo_uri:
                    raise ValueError("MONGO_URI environment variable not set.")
                g.db_client = MongoClient(mongo_uri)
                g.db = g.db_client.get_default_database()
        except Exception as e:
            app.logger.critical(f"Could not connect to MongoDB: {e}")
            g.db = None 

    @app.teardown_request
    def teardown_request(exception):
        db_client = g.pop('db_client', None)
        if db_client is not None:
            db_client.close()

    logging.basicConfig(level=logging.INFO)
    app.logger.setLevel(logging.INFO)

    
    app.register_blueprint(auth_bp)

    from backend.api.v1.plans import v1_plans_blueprint
    app.register_blueprint(v1_plans_blueprint, url_prefix='/api/v1/plans')
    
    # Register social features blueprints
    from backend.api.v1.social import social_bp
    app.register_blueprint(social_bp, url_prefix='/api/v1/social')
    
    from backend.api.v1.discovery import discovery_bp
    app.register_blueprint(discovery_bp, url_prefix='/api/v1/discovery')
    
    from backend.api.v1.websocket import websocket_bp
    app.register_blueprint(websocket_bp, url_prefix='/api/v1/websocket')
    
    from backend.api.v1.notifications import notifications_bp
    app.register_blueprint(notifications_bp, url_prefix='/api/v1/notifications')
    
    from backend.api.v1.follow import follow_bp
    app.register_blueprint(follow_bp, url_prefix='/api/v1/follow')
    
    from backend.api.v1.users import users_bp
    app.register_blueprint(users_bp, url_prefix='/api/v1/users')
    
    from backend.api.v1.analytics import analytics_bp
    app.register_blueprint(analytics_bp, url_prefix='/api/v1/analytics')
    
    from backend.api.v1.moderation import moderation_bp
    app.register_blueprint(moderation_bp, url_prefix='/api/v1/moderation')
    
    from backend.api.v1.cache import cache_bp
    app.register_blueprint(cache_bp, url_prefix='/api/v1/cache')
    
    from backend.api.v1.batch import batch_bp
    app.register_blueprint(batch_bp, url_prefix='/api/v1/batch')
    
    from backend.api.v1.feed import feed_bp
    app.register_blueprint(feed_bp, url_prefix='/api/v1/feed')
    
    from backend.api.v1.skill_sharing import skill_sharing_bp
    app.register_blueprint(skill_sharing_bp, url_prefix='/api/v1/social')
    
    from backend.api.v1.skill_enhancement import skill_enhancement_bp
    app.register_blueprint(skill_enhancement_bp, url_prefix='/api/v1/enhancement')
    
    from backend.api.v1.collaboration import collaboration_bp
    app.register_blueprint(collaboration_bp, url_prefix='/api/v1/collaboration')
    
    from backend.api.v1.content_moderation import content_moderation_bp
    app.register_blueprint(content_moderation_bp, url_prefix='/api/v1/moderation')


    @app.route('/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'message': 'YiZ Planner API is running'}), 200

   
    @app.route('/generate-plan', methods=['POST'])
    def generate_plan():
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No JSON data provided"}), 400

            skill = data.get("skill_name", "").strip()
            if not skill:
                return jsonify({"error": "skill_name is required"}), 400

            import asyncio
            plan_tasks = asyncio.run(AIService.generate_structured_plan(skill))

            return jsonify({
                "skill": skill,
                "plan": {"daily_tasks": plan_tasks}
            }), 200

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except ConnectionError as e:
            app.logger.error(f"AI Service connection error: {e}")
            return jsonify({"error": "Could not connect to AI service"}), 503
        except Exception as e:
            app.logger.error(f"Unexpected error in generate_plan: {str(e)}")
            return jsonify({"error": "Internal server error"}), 500

    return app, socketio


app, socketio = create_app()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)