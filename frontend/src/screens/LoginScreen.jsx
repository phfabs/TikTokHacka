import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// Check if we're in Expo Go (modules won't be available)
const isExpoGo = () => {
  try {
    // This will throw in Expo Go but work in development builds
    const { NativeModules } = require('react-native');
    return !NativeModules.RNGoogleSignin;
  } catch (e) {
    return true;
  }
};

// Function to safely get Google SignIn if available
const getGoogleSignin = () => {
  if (isExpoGo()) return null;
  try {
    return require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch (e) {
    return null;
  }
};

// Function to safely get Apple Authentication if available
const getAppleAuthentication = () => {
  try {
    return require('expo-apple-authentication');
  } catch (e) {
    return null;
  }
};

export default function LoginScreen() {
  const navigation = useNavigation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { login: contextLogin } = useAuth();
  const [localError, setLocalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(40)).current;
  const bounceAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -6, duration: 1500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    setLocalError('');
    setIsLoading(true);
    if (!identifier.trim() || !password.trim()) {
      setLocalError("Both fields are required");
      setIsLoading(false);
      return;
    }
    try {
      const result = await authAPI.login({ identifier, password });
      if (result.success) {
        const loginSuccess = await contextLogin(result.data.user, result.data.token);
        if (!loginSuccess) {
          setLocalError('Failed to store login data');
        }
      } else {
        setLocalError(result.error);
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Login failed. Please check your credentials.";
      setLocalError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (localError) {
      setLocalError('');
    }
  }, [identifier, password]);

  useEffect(() => {
    const GoogleSignin = getGoogleSignin();
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: 'YOUR_WEB_CLIENT_ID', // Replace with your actual web client ID
        offlineAccess: true,
      });
    }
  }, []);

  const handleGoogleLogin = async () => {
    const GoogleSignin = getGoogleSignin();
    if (!GoogleSignin) {
      setLocalError('Google Sign-In is not available in this environment. Please use email/password login.');
      return;
    }
    
    setGoogleLoading(true);
    setLocalError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = userInfo;
      
      const result = await authAPI.googleLogin(idToken);
      if (result.success) {
        const loginSuccess = await contextLogin(result.data.user, result.data.token);
        if (!loginSuccess) {
          setLocalError('Failed to store login data');
        }
      } else {
        setLocalError(result.error);
      }
    } catch (error) {
      console.error('Google login error:', error);
      setLocalError('Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    const AppleAuthentication = getAppleAuthentication();
    if (!AppleAuthentication || Platform.OS !== 'ios') {
      setLocalError('Apple Sign-In is not available on this platform.');
      return;
    }
    
    setAppleLoading(true);
    setLocalError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      const result = await authAPI.appleLogin({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        email: credential.email,
        fullName: credential.fullName,
      });
      
      if (result.success) {
        const loginSuccess = await contextLogin(result.data.user, result.data.token);
        if (!loginSuccess) {
          setLocalError('Failed to store login data');
        }
      } else {
        setLocalError(result.error);
      }
    } catch (error) {
      console.error('Apple login error:', error);
      if (error.code !== 'ERR_CANCELED') {
        setLocalError('Apple login failed. Please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#CCFBF1', '#14B8A6']} style={styles.background}>
      {/* mascot */}
      <Animated.View style={[styles.mascotWrapper, { transform: [{ translateY: bounceAnim }] }]}>
        <View style={styles.mascotCircle}>
          <Sparkles size={40} color={'white'} strokeWidth={2.5} />
        </View>
      </Animated.View>

      {/* Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ width: '100%', alignItems: 'center' }}
      >
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.appTitle}>YiZ Planner</Text>
          <Text style={styles.tagline}>Login to continue</Text>

          <Input
            label="Email"
            placeholder="Enter your email"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={localError || undefined}
          />

          <Button
            title="Login"
            onPress={handleLogin}
            isLoading={isLoading}
            disabled={!identifier.trim() || !password.trim()}
            style={styles.primaryButton}
          />


          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
              disabled={googleLoading || isLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <Animated.View style={styles.loadingSpinner}>
                  <MaterialIcons name="refresh" size={20} color="#4285F4" />
                </Animated.View>
              ) : (
                <Image 
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                  style={styles.googleIcon}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleLogin}
                disabled={appleLoading || isLoading}
                activeOpacity={0.8}
              >
                {appleLoading ? (
                  <Animated.View style={styles.loadingSpinner}>
                    <MaterialIcons name="refresh" size={20} color="white" />
                  </Animated.View>
                ) : (
                  <MaterialIcons name="apple" size={20} color="white" />
                )}
                <Text style={[styles.socialButtonText, styles.appleButtonText]}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  mascotWrapper: {
    marginTop: 80,
    marginBottom: 20,
  },
  mascotCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    padding: 24,
    borderRadius: 32,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  registerLink: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  socialButtonsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
  },
  appleButtonText: {
    color: 'white',
  },
  loadingSpinner: {
    transform: [{ rotate: '45deg' }],
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
});