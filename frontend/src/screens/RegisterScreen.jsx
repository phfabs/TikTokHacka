import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { colors } from '../constants/colors';
import { Sparkles } from 'lucide-react-native';
import { authAPI } from "../api/auth";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import RegistrationSuccessModal from '../components/RegistrationSuccessModal';

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

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { login: contextLogin } = useAuth();

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

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const result = await authAPI.register({ username: name, email, password });
      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [email, password, name]);

  useEffect(() => {
    const GoogleSignin = getGoogleSignin();
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: 'YOUR_WEB_CLIENT_ID', // Replace with your actual web client ID
        offlineAccess: true,
      });
    }
  }, []);

  const handleGoogleRegister = async () => {
    const GoogleSignin = getGoogleSignin();
    if (!GoogleSignin) {
      setError('Google Sign-In is not available in this environment. Please use email/password registration.');
      return;
    }
    
    setGoogleLoading(true);
    setError('');
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = userInfo;
      
      const result = await authAPI.googleLogin(idToken);
      if (result.success) {
        const loginSuccess = await contextLogin(result.data.user, result.data.token);
        if (!loginSuccess) {
          setError('Failed to store login data');
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Google register error:', error);
      setError('Google registration failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleRegister = async () => {
    const AppleAuthentication = getAppleAuthentication();
    if (!AppleAuthentication || Platform.OS !== 'ios') {
      setError('Apple Sign-In is not available on this platform.');
      return;
    }
    
    setAppleLoading(true);
    setError('');
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
          setError('Failed to store login data');
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Apple register error:', error);
      if (error.code !== 'ERR_CANCELED') {
        setError('Apple registration failed. Please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#EDE9FE', '#8B5CF6']} style={styles.background}>
      <Animated.View style={[styles.mascotWrapper, { transform: [{ translateY: bounceAnim }] }]}> 
        <View style={[styles.mascotCircle, { backgroundColor: 'rgba(255,255,255,0.3)' }]}> 
          <Sparkles size={40} color={'white'} strokeWidth={2.5} />
        </View>
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ width:'100%', alignItems:'center' }}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform:[{translateY: slideAnim}] }]}> 
          <Text style={styles.appTitle}>Create Account</Text>
          <Text style={styles.tagline}>Start your learning journey</Text>

          <Input label="Name" placeholder="Enter your name" value={name} onChangeText={setName}/>
          <Input label="Email" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry error={error||undefined} />
          {error ? <Text style={styles.errorText}>{error}</Text>:null}

          <Button title="Register" onPress={handleRegister} isLoading={isLoading} disabled={!email.trim()||!password.trim()||!name.trim()} style={styles.primaryButton} />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleRegister}
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
                onPress={handleAppleRegister}
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

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={()=>navigation.replace('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      
      <RegistrationSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onContinue={() => {
          setShowSuccessModal(false);
          navigation.replace("Login");
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex:1,
    justifyContent:'flex-start',
    alignItems:'center',
  },
  mascotWrapper:{ marginTop:80, marginBottom:20 },
  mascotCircle:{ width:80,height:80,borderRadius:40,justifyContent:'center',alignItems:'center' },
  card:{ width:'88%', padding:24, borderRadius:32, backgroundColor:colors.white, shadowColor:colors.black, shadowOffset:{width:0,height:6}, shadowOpacity:0.06, shadowRadius:12, elevation:10 },
  appTitle:{ fontSize:28, fontWeight:'800', textAlign:'center', color:colors.text },
  tagline:{ fontSize:16, textAlign:'center', color:colors.textSecondary, marginBottom:24 },
  primaryButton:{ marginTop:12, backgroundColor:colors.secondary },
  loginLink:{ color:colors.secondary, fontWeight:'600' },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: colors.textSecondary,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
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