import { io } from 'socket.io-client';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/apiConfig';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.currentUserId = null;
  }

  async connect() {
    try {
      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found, cannot connect to WebSocket');
        return false;
      }

      // Get current user info
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        this.currentUserId = user._id;
      }

      // Create socket connection
      this.socket = io(API_BASE_URL, {
        auth: {
          token: token
        },
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,
        autoConnect: true,
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
        timeout: 20000,
      });

      this.setupEventListeners();
      
      return new Promise((resolve) => {
        this.socket.on('connect', () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Join user's personal room for notifications
          if (this.currentUserId) {
            this.joinPersonalRoom(this.currentUserId);
          }
          
          resolve(true);
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnected = false;
          resolve(false);
        });
      });

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      return false;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Rejoin rooms
      if (this.currentUserId) {
        this.joinPersonalRoom(this.currentUserId);
      }
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔄❌ WebSocket reconnection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('🔄❌ WebSocket reconnection failed after max attempts');
      this.isConnected = false;
    });

    // Personal notifications
    this.socket.on('personal_notification', (data) => {
      console.log('🔔 Personal notification received:', data);
      this.emitToListeners('personal_notification', data);
    });

    // Skill updates (likes, comments, downloads)
    this.socket.on('skill_update', (data) => {
      console.log('📊 Skill update received:', data);
      this.emitToListeners('skill_update', data);
    });

    // System updates (trending, moderation, etc.)
    this.socket.on('system_update', (data) => {
      console.log('🔄 System update received:', data);
      this.emitToListeners('system_update', data);
    });

    // User presence updates
    this.socket.on('user_presence', (data) => {
      console.log('👤 User presence update:', data);
      this.emitToListeners('user_presence', data);
    });

    // Follow notifications
    this.socket.on('follow_notification', (data) => {
      console.log('👥 Follow notification received:', data);
      this.emitToListeners('follow_notification', data);
    });

    // Comment notifications
    this.socket.on('comment_notification', (data) => {
      console.log('💬 Comment notification received:', data);
      this.emitToListeners('comment_notification', data);
    });

    // Like notifications
    this.socket.on('like_notification', (data) => {
      console.log('❤️ Like notification received:', data);
      this.emitToListeners('like_notification', data);
    });

    // Download notifications
    this.socket.on('download_notification', (data) => {
      console.log('⬇️ Download notification received:', data);
      this.emitToListeners('download_notification', data);
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        if (this.socket && !this.isConnected) {
          this.socket.connect();
        }
      }, this.reconnectInterval * this.reconnectAttempts);
    }
  }

  joinPersonalRoom(userId) {
    if (!this.socket || !this.isConnected) return;
    
    console.log(`🏠 Joining personal room for user: ${userId}`);
    this.socket.emit('join_personal_room', { user_id: userId });
  }

  joinSkillRoom(skillId) {
    if (!this.socket || !this.isConnected) return;
    
    console.log(`📚 Joining skill room: ${skillId}`);
    this.socket.emit('join_skill_room', { skill_id: skillId });
  }

  leaveSkillRoom(skillId) {
    if (!this.socket || !this.isConnected) return;
    
    console.log(`📚 Leaving skill room: ${skillId}`);
    this.socket.emit('leave_skill_room', { skill_id: skillId });
  }

  // Event listener management
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emitToListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Send events to server
  sendSkillView(skillId) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('skill_viewed', { 
      skill_id: skillId,
      timestamp: new Date().toISOString()
    });
  }

  sendUserActivity(activityType, data = {}) {
    if (!this.socket || !this.isConnected) return;
    
    this.socket.emit('user_activity', {
      activity_type: activityType,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
      this.currentUserId = null;
    }
  }

  // Health check
  ping() {
    if (!this.socket || !this.isConnected) return false;
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      this.socket.emit('ping', { timestamp: Date.now() });
      
      this.socket.once('pong', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// React hook for WebSocket integration
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Connect on mount
    const connect = async () => {
      const connected = await websocketService.connect();
      setIsConnected(connected);
    };

    connect();

    // Set up notification listener
    const handleNotification = (data) => {
      setNotifications(prev => [data, ...prev.slice(0, 49)]); // Keep last 50
    };

    websocketService.addEventListener('personal_notification', handleNotification);
    websocketService.addEventListener('follow_notification', handleNotification);
    websocketService.addEventListener('comment_notification', handleNotification);
    websocketService.addEventListener('like_notification', handleNotification);
    websocketService.addEventListener('download_notification', handleNotification);

    // Monitor connection status
    const statusInterval = setInterval(() => {
      const status = websocketService.getConnectionStatus();
      setIsConnected(status.isConnected);
    }, 5000);

    return () => {
      clearInterval(statusInterval);
      websocketService.removeEventListener('personal_notification', handleNotification);
      websocketService.removeEventListener('follow_notification', handleNotification);
      websocketService.removeEventListener('comment_notification', handleNotification);
      websocketService.removeEventListener('like_notification', handleNotification);
      websocketService.removeEventListener('download_notification', handleNotification);
    };
  }, []);

  const joinSkillRoom = (skillId) => {
    websocketService.joinSkillRoom(skillId);
  };

  const leaveSkillRoom = (skillId) => {
    websocketService.leaveSkillRoom(skillId);
  };

  const sendSkillView = (skillId) => {
    websocketService.sendSkillView(skillId);
  };

  const sendUserActivity = (activityType, data) => {
    websocketService.sendUserActivity(activityType, data);
  };

  return {
    isConnected,
    notifications,
    joinSkillRoom,
    leaveSkillRoom,
    sendSkillView,
    sendUserActivity,
    connectionStatus: websocketService.getConnectionStatus(),
  };
};

export default websocketService;