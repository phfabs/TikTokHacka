import React, { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "../api/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("authToken");
      const storedUser = await AsyncStorage.getItem("userData");
      if (storedToken && storedUser) {
        const isValid = await authAPI.verifyToken(storedToken);
        if (isValid) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } else {
          await clearAuthData();
        }
      }
    } catch (err) {
      console.error("Auth initialization error:", err);
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, authToken) => {
    try {
      await AsyncStorage.setItem("authToken", authToken);
      await AsyncStorage.setItem("userData", JSON.stringify(userData));
      setUser(userData);
      setToken(authToken);
      return true;
    } catch (err) {
      console.error("Login storage error:", err);
      return false;
    }
  };

  const clearAuthData = async () => {
    await AsyncStorage.multiRemove(["authToken", "userData"]);
  };

  const logout = async () => {
    try {
      await clearAuthData();
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const isAuthenticated = () => {
    return !!user && !!token;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
