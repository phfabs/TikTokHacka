import { useState, useEffect, useCallback } from 'react';
import api from '../api/apiConfig';

export const useSocialFeatures = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLike = useCallback(async (skillId, isLiked) => {
    try {
      setLoading(true);
      setError(null);
      
      if (isLiked) {
        await api.post(`/api/v1/social/skills/${skillId}/like`);
      } else {
        await api.delete(`/api/v1/social/skills/${skillId}/like`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error toggling like:', error);
      setError('Failed to update like status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = useCallback(async (skillId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(`/api/v1/social/skills/${skillId}/download`);
      
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      console.error('Error downloading skill:', error);
      setError('Failed to download skill');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleComment = useCallback(async (skillId, commentText) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(`/api/v1/social/skills/${skillId}/comments`, {
        text: commentText
      });
      
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRate = useCallback(async (skillId, rating) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(`/api/v1/social/skills/${skillId}/rate`, {
        rating
      });
      
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      console.error('Error rating skill:', error);
      setError('Failed to rate skill');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    handleLike,
    handleDownload,
    handleComment,
    handleRate,
  };
};

export const useSkillDiscovery = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const searchSkills = useCallback(async (query = '', filters = {}, reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentPage = reset ? 1 : page;
      const params = {
        q: query,
        page: currentPage,
        limit: 20,
        ...filters
      };

      const response = await api.get('/api/v1/discovery/skills/search', { params });
      const newSkills = response.data.skills || [];
      
      if (reset) {
        setSkills(newSkills);
        setPage(2);
      } else {
        setSkills(prev => [...prev, ...newSkills]);
        setPage(currentPage + 1);
      }
      
      setHasMore(newSkills.length === 20);
      
      return { 
        success: true, 
        skills: newSkills,
        hasMore: newSkills.length === 20
      };
    } catch (error) {
      console.error('Error searching skills:', error);
      setError('Failed to search skills');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadTrendingSkills = useCallback(async (limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/v1/discovery/skills/trending', {
        params: { limit }
      });
      
      return { 
        success: true, 
        skills: response.data.skills || []
      };
    } catch (error) {
      console.error('Error loading trending skills:', error);
      setError('Failed to load trending skills');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/v1/discovery/skills/categories');
      
      return { 
        success: true, 
        categories: response.data.categories || []
      };
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetSearch = useCallback(() => {
    setSkills([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  return {
    skills,
    loading,
    error,
    hasMore,
    searchSkills,
    loadTrendingSkills,
    loadCategories,
    resetSearch,
  };
};

export const useUserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadUserProfile = useCallback(async (userId = 'me') => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = userId === 'me' ? '/api/v1/users/me' : `/api/v1/users/${userId}`;
      const response = await api.get(endpoint);
      
      setProfile(response.data.user);
      
      return { 
        success: true, 
        user: response.data.user 
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.put('/api/v1/users/me', updateData);
      
      setProfile(response.data.user);
      
      return { 
        success: true, 
        user: response.data.user 
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/v1/users/me/stats');
      
      return { 
        success: true, 
        stats: response.data.stats 
      };
    } catch (error) {
      console.error('Error loading user stats:', error);
      setError('Failed to load user stats');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profile,
    loading,
    error,
    loadUserProfile,
    updateProfile,
    getUserStats,
  };
};

export const useFollowSystem = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const followUser = useCallback(async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/v1/follow', { user_id: userId });
      
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      console.error('Error following user:', error);
      setError('Failed to follow user');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const unfollowUser = useCallback(async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.delete(`/api/v1/follow/${userId}`);
      
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      setError('Failed to unfollow user');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollowStatus = useCallback(async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/v1/follow/status/${userId}`);
      
      return { 
        success: true, 
        isFollowing: response.data.is_following 
      };
    } catch (error) {
      console.error('Error getting follow status:', error);
      setError('Failed to get follow status');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollowSuggestions = useCallback(async (limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/v1/follow/suggestions', {
        params: { limit }
      });
      
      return { 
        success: true, 
        suggestions: response.data.suggestions || []
      };
    } catch (error) {
      console.error('Error getting follow suggestions:', error);
      setError('Failed to get follow suggestions');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    followUser,
    unfollowUser,
    getFollowStatus,
    getFollowSuggestions,
  };
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async (limit = 50) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/v1/notifications', {
        params: { limit }
      });
      
      setNotifications(response.data.notifications || []);
      
      return { 
        success: true, 
        notifications: response.data.notifications || []
      };
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Failed to load notifications');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/notifications/unread-count');
      
      setUnreadCount(response.data.count || 0);
      
      return { 
        success: true, 
        count: response.data.count || 0
      };
    } catch (error) {
      console.error('Error getting unread count:', error);
      setError('Failed to get unread count');
      throw error;
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await api.post(`/api/v1/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError('Failed to mark notification as read');
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/api/v1/notifications/read-all');
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
      
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError('Failed to mark all notifications as read');
      throw error;
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
  };
};