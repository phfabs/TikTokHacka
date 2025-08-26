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

const { width: screenWidth } = Dimensions.get('window');

const CompletionCelebrationModal = ({
  visible,
  onClose,
  day,
  skillTitle,
  totalDays = 30,
  onViewProgress,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      celebrationAnim.setValue(0);
      progressAnim.setValue(0);

      // Start entrance animation sequence
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 6,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(celebrationAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 6,
          delay: 200,
        }),
        Animated.timing(progressAnim, {
          toValue: day / totalDays,
          duration: 1000,
          useNativeDriver: false,
          delay: 300,
        }),
      ]).start();
    }
  }, [visible]);

  const progressPercentage = Math.round((day / totalDays) * 100);
  const isCompleted = day === totalDays;

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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <BlurView intensity={25} style={StyleSheet.absoluteFill} />
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
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Header with celebration animation */}
          <LinearGradient
            colors={isCompleted ? ['#22C55E', '#16A34A'] : ['#8B5CF6', '#7C3AED']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Celebration Icons */}
            <Animated.View
              style={[
                styles.celebrationContainer,
                {
                  transform: [{ scale: celebrationAnim }],
                },
              ]}
            >
              {/* Main celebration icon */}
              <View style={styles.mainIconContainer}>
                <MaterialIcons
                  name={isCompleted ? "celebration" : "check-circle"}
                  size={64}
                  color="white"
                />
              </View>
              
              {/* Floating celebration icons */}
              <Animated.View style={[styles.floatingIcon, styles.floatingIcon1]}>
                <MaterialIcons name="star" size={20} color="rgba(255,255,255,0.8)" />
              </Animated.View>
              <Animated.View style={[styles.floatingIcon, styles.floatingIcon2]}>
                <MaterialIcons name="emoji-events" size={18} color="rgba(255,255,255,0.7)" />
              </Animated.View>
              <Animated.View style={[styles.floatingIcon, styles.floatingIcon3]}>
                <MaterialIcons name="favorite" size={16} color="rgba(255,255,255,0.6)" />
              </Animated.View>
            </Animated.View>

          </LinearGradient>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Title */}
            <Text style={styles.title}>
              {isCompleted ? '🎉 Skill Mastered!' : '✨ Day Complete!'}
            </Text>
            
            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.message}>
                {isCompleted 
                  ? `Congratulations! You've completed all ${totalDays} days of "${skillTitle}". You're now a master!`
                  : `Great job completing Day ${day} of "${skillTitle}"! You're making excellent progress.`
                }
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{day}</Text>
                <Text style={styles.statLabel}>Days Complete</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalDays - day}</Text>
                <Text style={styles.statLabel}>Days Remaining</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  {isCompleted ? 'Celebrate!' : 'Continue'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  onViewProgress?.();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isCompleted ? ['#22C55E', '#16A34A'] : ['#8B5CF6', '#7C3AED']}
                  style={styles.primaryButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.primaryButtonText}>
                    {isCompleted ? 'View Achievement' : 'View Progress'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 28,
    overflow: 'hidden',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 25,
    },
    shadowOpacity: 0.5,
    shadowRadius: 50,
    elevation: 25,
  },
  headerGradient: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  celebrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  mainIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  floatingIcon: {
    position: 'absolute',
  },
  floatingIcon1: {
    top: -10,
    right: -10,
  },
  floatingIcon2: {
    bottom: 0,
    left: -15,
  },
  floatingIcon3: {
    top: 10,
    left: -20,
  },
  contentContainer: {
    padding: 32,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  messageContainer: {
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  secondaryButton: {
    flex: 0.8,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompletionCelebrationModal;