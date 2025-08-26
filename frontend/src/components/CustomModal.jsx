import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CustomModal = ({
  visible,
  onClose,
  title,
  message,
  type = 'info', // 'success', 'error', 'warning', 'info', 'confirmation'
  primaryButton,
  secondaryButton,
  icon,
  showCloseButton = true,
  backdropDismiss = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: icon || 'check-circle',
          iconColor: '#22C55E',
          gradientColors: ['#22C55E', '#16A34A'],
          accentColor: '#22C55E',
        };
      case 'error':
        return {
          icon: icon || 'error',
          iconColor: '#EF4444',
          gradientColors: ['#EF4444', '#DC2626'],
          accentColor: '#EF4444',
        };
      case 'warning':
        return {
          icon: icon || 'warning',
          iconColor: '#F59E0B',
          gradientColors: ['#F59E0B', '#D97706'],
          accentColor: '#F59E0B',
        };
      case 'confirmation':
        return {
          icon: icon || 'help-outline',
          iconColor: '#8B5CF6',
          gradientColors: ['#8B5CF6', '#7C3AED'],
          accentColor: '#8B5CF6',
        };
      default: // info
        return {
          icon: icon || 'info',
          iconColor: '#3B82F6',
          gradientColors: ['#3B82F6', '#2563EB'],
          accentColor: '#3B82F6',
        };
    }
  };

  const typeConfig = getTypeConfig();

  const handleBackdropPress = () => {
    if (backdropDismiss) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />
      
      {/* Backdrop with Blur */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <Animated.View
            style={[
              styles.backdropOverlay,
              {
                opacity: opacityAnim,
              },
            ]}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Modal Content */}
      <View style={styles.modalContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Header with gradient background */}
          <LinearGradient
            colors={typeConfig.gradientColors}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Close button */}
            {showCloseButton && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            )}

            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconBackground, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <MaterialIcons
                  name={typeConfig.icon}
                  size={48}
                  color="white"
                />
              </View>
            </View>
          </LinearGradient>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Title */}
            <Text style={styles.title}>{title}</Text>
            
            {/* Message */}
            {message && (
              <Text style={styles.message}>{message}</Text>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {secondaryButton && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={secondaryButton.onPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>
                    {secondaryButton.text}
                  </Text>
                </TouchableOpacity>
              )}
              
              {primaryButton && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    { backgroundColor: typeConfig.accentColor },
                    secondaryButton ? { marginLeft: 12 } : {},
                  ]}
                  onPress={primaryButton.onPress}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[typeConfig.accentColor, typeConfig.gradientColors[1]]}
                    style={styles.primaryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.primaryButtonText}>
                      {primaryButton.text}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    maxWidth: 380,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  headerGradient: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  contentContainer: {
    padding: 32,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  primaryButton: {
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomModal;