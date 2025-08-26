import axios from "axios";
import { API_BASE_URL } from './apiConfig'; 



const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

const authAPI = {
  register: async (userData) => {
    try {
      const response = await axios.post(`${AUTH_BASE_URL}/register`, userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Registration failed",
      };
    }
  },

  login: async (credentials) => {
    try {
      const response = await axios.post(`${AUTH_BASE_URL}/login`, credentials);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  },

  verifyToken: async (token) => {
    try {
      const response = await axios.post(`${AUTH_BASE_URL}/verify`, { token });
      return response.data.valid;
    } catch {
      return false;
    }
  },

  googleLogin: async (googleToken) => {
    try {
      const response = await axios.post(`${AUTH_BASE_URL}/google`, { 
        token: googleToken 
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Google login failed",
      };
    }
  },

  appleLogin: async (appleData) => {
    try {
      const response = await axios.post(`${AUTH_BASE_URL}/apple`, appleData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Apple login failed",
      };
    }
  },
};

export { authAPI };
