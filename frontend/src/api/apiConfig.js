import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||      
  process.env.REACT_APP_API_BASE_URL ||        
  "http://192.168.0.116:8080";                 
//"http://10.0.2.2:5000/auth"; // Android Emulator
//"http://192.168.0.116:5000/auth"; // For iPhone on local Wi-Fi
// "https://orbital-teamyiz-backend.onrender.com";  // for deployment

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;