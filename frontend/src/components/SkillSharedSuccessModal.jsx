import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../constants/colors';

const SkillSharedSuccessModal = ({
  visible,
  onClose,
  onContinue,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const celebrationAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
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
        ]),
        Animated.spring(celebrationAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 6,
          delay: 200,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      celebrationAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <Animated.View
            style={[
              styles.backdropOverlay,
              { opacity: opacityAnim },
            ]}
          />
        </View>
      </TouchableWithoutFeedback>

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
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View
              style={[
                styles.celebrationContainer,
                {
                  transform: [{ scale: celebrationAnim }],
                },
              ]}
            >
              <View style={styles.mainIconContainer}>
                <MaterialIcons
                  name="share"
                  size={48}
                  color="white"
                />
              </View>
              
              {/* Floating celebration icons */}
              <Animated.View style={[styles.floatingIcon, styles.floatingIcon1]}>
                <MaterialIcons name="people" size={18} color="rgba(255,255,255,0.8)" />
              </Animated.View>
              <Animated.View style={[styles.floatingIcon, styles.floatingIcon2]}>
                <MaterialIcons name="favorite" size={16} color="rgba(255,255,255,0.7)" />
              </Animated.View>
              <Animated.View style={[styles.floatingIcon, styles.floatingIcon3]}>
                <MaterialIcons name="star" size={14} color="rgba(255,255,255,0.6)" />
              </Animated.View>
            </Animated.View>
          </LinearGradient>

          <View style={styles.contentContainer}>
            <Text style={styles.title}>🎉 Skill Shared!</Text>
            <Text style={styles.message}>
              Your skill has been successfully shared to the social feed! The community can now discover and learn from your knowledge.
            </Text>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <MaterialIcons name="visibility" size={18} color={colors.primary} />
                <Text style={styles.featureText}>Visible to community</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="thumb-up" size={18} color={colors.primary} />
                <Text style={styles.featureText}>Ready for engagement</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="school" size={18} color={colors.primary} />
                <Text style={styles.featureText}>Helping others learn</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={onContinue}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.continueButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.continueButtonText}>View Social Feed</Text>
                <MaterialIcons name="arrow-forward" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
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
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  celebrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mainIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    right: -15,
  },
  floatingIcon2: {
    bottom: 5,
    left: -20,
  },
  floatingIcon3: {
    top: 15,
    left: -25,
  },
  contentContainer: {
    padding: 28,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresList: {
    marginBottom: 28,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
    fontWeight: '500',
  },
  continueButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 6,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default SkillSharedSuccessModal;