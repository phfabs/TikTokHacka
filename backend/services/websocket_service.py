from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask import request
from backend.auth.utils import decode_token
import json

class WebSocketService:
    """Service for managing real-time WebSocket communications"""
    
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self.connected_users = {}  # {user_id: {session_id: socket_info}}
        self.skill_rooms = {}  # {skill_id: [user_ids]}
        self.logger = logging.getLogger(__name__)
        
        self._setup_event_handlers()

    def _setup_event_handlers(self):
        """Set up WebSocket event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect(auth=None):
            """Handle client connection with authentication"""
            try:
                # Authenticate user
                token = None
                if auth and 'token' in auth:
                    token = auth['token']
                elif request.args.get('token'):
                    token = request.args.get('token')
                
                if not token:
                    self.logger.warning(f"WebSocket connection attempt without token from {request.sid}")
                    disconnect()
                    return False
                
                # Decode JWT token
                try:
                    user_data = decode_token(token)
                    user_id = str(user_data['user_id'])
                except Exception as e:
                    self.logger.warning(f"Invalid token in WebSocket connection: {e}")
                    disconnect()
                    return False
                
                # Store user connection
                if user_id not in self.connected_users:
                    self.connected_users[user_id] = {}
                
                self.connected_users[user_id][request.sid] = {
                    'connected_at': datetime.utcnow(),
                    'user_id': user_id,
                    'session_id': request.sid
                }
                
                # Join user to their personal room
                join_room(f"user_{user_id}")
                
                self.logger.info(f"User {user_id} connected via WebSocket (session: {request.sid})")
                
                # Emit connection success
                emit('connected', {
                    'user_id': user_id,
                    'message': 'Successfully connected to real-time updates',
                    'timestamp': datetime.utcnow().isoformat()
                })
                
                return True
                
            except Exception as e:
                self.logger.error(f"Error handling WebSocket connection: {e}")
                disconnect()
                return False

        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Handle client disconnection"""
            try:
                # Find and remove user connection
                user_id = None
                for uid, sessions in self.connected_users.items():
                    if request.sid in sessions:
                        user_id = uid
                        del sessions[request.sid]
                        if not sessions:  # Remove user if no more sessions
                            del self.connected_users[uid]
                        break
                
                if user_id:
                    # Leave all rooms
                    leave_room(f"user_{user_id}")
                    for skill_id, users in self.skill_rooms.items():
                        if user_id in users:
                            users.remove(user_id)
                            leave_room(f"skill_{skill_id}")
                    
                    self.logger.info(f"User {user_id} disconnected from WebSocket (session: {request.sid})")
                
            except Exception as e:
                self.logger.error(f"Error handling WebSocket disconnect: {e}")

        @self.socketio.on('join_skill')
        def handle_join_skill(data):
            """Join a skill room for real-time updates"""
            try:
                skill_id = data.get('skill_id')
                if not skill_id:
                    emit('error', {'message': 'skill_id is required'})
                    return
                
                # Get user_id from connection
                user_id = self._get_user_id_from_session(request.sid)
                if not user_id:
                    emit('error', {'message': 'User not authenticated'})
                    return
                
                # Join skill room
                join_room(f"skill_{skill_id}")
                
                # Track skill room membership
                if skill_id not in self.skill_rooms:
                    self.skill_rooms[skill_id] = []
                if user_id not in self.skill_rooms[skill_id]:
                    self.skill_rooms[skill_id].append(user_id)
                
                emit('skill_joined', {
                    'skill_id': skill_id,
                    'message': f'Joined skill room for real-time updates'
                })
                
                self.logger.info(f"User {user_id} joined skill room {skill_id}")
                
            except Exception as e:
                self.logger.error(f"Error joining skill room: {e}")
                emit('error', {'message': 'Failed to join skill room'})

        @self.socketio.on('leave_skill')
        def handle_leave_skill(data):
            """Leave a skill room"""
            try:
                skill_id = data.get('skill_id')
                if not skill_id:
                    emit('error', {'message': 'skill_id is required'})
                    return
                
                user_id = self._get_user_id_from_session(request.sid)
                if not user_id:
                    emit('error', {'message': 'User not authenticated'})
                    return
                
                # Leave skill room
                leave_room(f"skill_{skill_id}")
                
                # Remove from skill room tracking
                if skill_id in self.skill_rooms and user_id in self.skill_rooms[skill_id]:
                    self.skill_rooms[skill_id].remove(user_id)
                    if not self.skill_rooms[skill_id]:
                        del self.skill_rooms[skill_id]
                
                emit('skill_left', {
                    'skill_id': skill_id,
                    'message': 'Left skill room'
                })
                
                self.logger.info(f"User {user_id} left skill room {skill_id}")
                
            except Exception as e:
                self.logger.error(f"Error leaving skill room: {e}")
                emit('error', {'message': 'Failed to leave skill room'})

    def _get_user_id_from_session(self, session_id: str) -> Optional[str]:
        """Get user_id from session_id"""
        for user_id, sessions in self.connected_users.items():
            if session_id in sessions:
                return user_id
        return None

    def notify_skill_interaction(self, skill_id: str, interaction_type: str, user_id: str, data: Dict = None):
        """Notify users in skill room about interactions"""
        try:
            message = {
                'type': 'skill_interaction',
                'skill_id': skill_id,
                'interaction_type': interaction_type,  # 'like', 'comment', 'rate', 'custom_task'
                'user_id': user_id,
                'data': data or {},
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Emit to skill room
            self.socketio.emit('skill_update', message, room=f"skill_{skill_id}")
            
            self.logger.info(f"Notified skill {skill_id} room about {interaction_type} from user {user_id}")
            
        except Exception as e:
            self.logger.error(f"Error notifying skill interaction: {e}")

    def notify_user_personal(self, user_id: str, notification_type: str, data: Dict):
        """Send personal notification to user"""
        try:
            message = {
                'type': 'personal_notification',
                'notification_type': notification_type,  # 'like_received', 'comment_reply', 'follow'
                'data': data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Emit to user's personal room
            self.socketio.emit('notification', message, room=f"user_{user_id}")
            
            self.logger.info(f"Sent {notification_type} notification to user {user_id}")
            
        except Exception as e:
            self.logger.error(f"Error sending personal notification: {e}")

    def broadcast_trending_update(self, trending_skills: List[Dict]):
        """Broadcast trending skills update to all connected users"""
        try:
            message = {
                'type': 'trending_update',
                'trending_skills': trending_skills,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Broadcast to all connected users
            self.socketio.emit('trending_update', message, broadcast=True)
            
            self.logger.info(f"Broadcasted trending update to all users")
            
        except Exception as e:
            self.logger.error(f"Error broadcasting trending update: {e}")

    def notify_custom_task_added(self, skill_id: str, day: int, task_data: Dict, user_id: str):
        """Notify skill room about new custom task"""
        try:
            self.notify_skill_interaction(
                skill_id=skill_id,
                interaction_type='custom_task_added',
                user_id=user_id,
                data={
                    'day': day,
                    'task': task_data,
                    'message': f'New custom task added to day {day}'
                }
            )
            
        except Exception as e:
            self.logger.error(f"Error notifying custom task addition: {e}")

    def notify_comment_added(self, skill_id: str, comment_data: Dict, user_id: str):
        """Notify skill room and mentioned users about new comment"""
        try:
            self.notify_skill_interaction(
                skill_id=skill_id,
                interaction_type='comment_added',
                user_id=user_id,
                data={
                    'comment': comment_data,
                    'message': 'New comment added'
                }
            )
            
            # If it's a reply, notify parent comment author
            if comment_data.get('parent_comment_id'):
                parent_user_id = comment_data.get('parent_user_id')
                if parent_user_id and parent_user_id != user_id:
                    self.notify_user_personal(
                        user_id=parent_user_id,
                        notification_type='comment_reply',
                        data={
                            'skill_id': skill_id,
                            'comment': comment_data,
                            'replier': user_id
                        }
                    )
            
        except Exception as e:
            self.logger.error(f"Error notifying comment addition: {e}")

    def notify_like_received(self, skill_id: str, skill_owner_id: str, liker_id: str, skill_title: str):
        """Notify skill owner about received like"""
        try:
            if skill_owner_id != liker_id:  # Don't notify self-likes
                self.notify_user_personal(
                    user_id=skill_owner_id,
                    notification_type='like_received',
                    data={
                        'skill_id': skill_id,
                        'skill_title': skill_title,
                        'liker_id': liker_id,
                        'message': f'Someone liked your skill "{skill_title}"'
                    }
                )
                
        except Exception as e:
            self.logger.error(f"Error notifying like received: {e}")

    def get_connected_users_count(self) -> int:
        """Get count of currently connected users"""
        return len(self.connected_users)

    def get_skill_room_users(self, skill_id: str) -> List[str]:
        """Get users currently in a skill room"""
        return self.skill_rooms.get(skill_id, [])

    def is_user_online(self, user_id: str) -> bool:
        """Check if user is currently online"""
        return user_id in self.connected_users and len(self.connected_users[user_id]) > 0

    def get_connection_stats(self) -> Dict:
        """Get WebSocket connection statistics"""
        try:
            total_connections = sum(len(sessions) for sessions in self.connected_users.values())
            
            return {
                'connected_users': len(self.connected_users),
                'total_connections': total_connections,
                'skill_rooms': len(self.skill_rooms),
                'total_room_memberships': sum(len(users) for users in self.skill_rooms.values()),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error getting connection stats: {e}")
            return {}