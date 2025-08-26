// Clean social media data management - no hardcoded content
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  SHARED_SKILLS: 'shared_skills',
  SOCIAL_INTERACTIONS: 'social_interactions',
  USER_DOWNLOADS: 'user_downloads'
};

// Generate unique ID
export const generateId = () => {
  return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// Get current user (from auth system)
export const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      return JSON.parse(userData);
    }
    
    // Fallback user for testing
    return {
      _id: 'current_user',
      username: 'current_user',
      display_name: 'Current User',
      email: 'user@example.com',
      is_verified: false
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return {
      _id: 'current_user',
      username: 'current_user',
      display_name: 'Current User',
      email: 'user@example.com',
      is_verified: false
    };
  }
};

// Get shared skills (social feed)
export const getSharedSkills = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SHARED_SKILLS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting shared skills:', error);
    return [];
  }
};

// Save shared skills
export const saveSharedSkills = async (skills) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SHARED_SKILLS, JSON.stringify(skills));
  } catch (error) {
    console.error('Error saving shared skills:', error);
  }
};

// Get user's downloaded skills
export const getUserDownloads = async (userId) => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DOWNLOADS);
    const downloads = data ? JSON.parse(data) : {};
    return downloads[userId] || [];
  } catch (error) {
    console.error('Error getting user downloads:', error);
    return [];
  }
};

// Save user download
export const saveUserDownload = async (userId, skillId) => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DOWNLOADS);
    const downloads = data ? JSON.parse(data) : {};
    
    if (!downloads[userId]) {
      downloads[userId] = [];
    }
    
    // Add skill ID if not already downloaded
    if (!downloads[userId].includes(skillId)) {
      downloads[userId].push(skillId);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DOWNLOADS, JSON.stringify(downloads));
  } catch (error) {
    console.error('Error saving user download:', error);
  }
};

// Get social interactions (likes, etc.)
export const getSocialInteractions = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_INTERACTIONS);
    return data ? JSON.parse(data) : {
      likes: {},
      downloads: {}
    };
  } catch (error) {
    console.error('Error getting social interactions:', error);
    return {
      likes: {},
      downloads: {}
    };
  }
};

// Save social interactions
export const saveSocialInteractions = async (interactions) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_INTERACTIONS, JSON.stringify(interactions));
  } catch (error) {
    console.error('Error saving social interactions:', error);
  }
};

// Clear all social data (for testing)
export const clearSocialData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SHARED_SKILLS,
      STORAGE_KEYS.SOCIAL_INTERACTIONS,
      STORAGE_KEYS.USER_DOWNLOADS
    ]);
    console.log('Social data cleared');
  } catch (error) {
    console.error('Error clearing social data:', error);
  }
};