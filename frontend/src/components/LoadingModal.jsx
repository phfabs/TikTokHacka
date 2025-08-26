import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, StyleSheet, Text, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

// Steps to cycle through while waiting
const DEFAULT_STEPS = [
  { icon: 'psychology', text: 'Analyzing your learning style…' },
  { icon: 'search', text: 'Curating world-class resources…' },
  { icon: 'event-note', text: 'Structuring daily challenges…' },
  { icon: 'auto-fix-high', text: 'Adding pro study tips…' },
  { icon: 'check-circle', text: 'Finalizing your custom plan…' },
];

export default function LoadingModal({ visible, steps = DEFAULT_STEPS }) {
  const rotateAnim = useRef(new Animated.Value(0)).current; // ⟳ central icon
  const scaleAnim = useRef(new Animated.Value(1)).current;  // 🔄 pulsing scale
  const fadeAnim = useRef(new Animated.Value(1)).current;   // ⬚ step fade

  const [stepIndex, setStepIndex] = useState(0);

  // Rotation animation
  useEffect(() => {
    if (!visible) return;
    rotateAnim.setValue(0);
    const spinning = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinning.start();
    return () => spinning.stop();
  }, [visible]);

  // Pulsing scale animation
  useEffect(() => {
    if (!visible) return;
    scaleAnim.setValue(1);
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.25,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulsing.start();
    return () => pulsing.stop();
  }, [visible]);

  // Step cycling animation
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      // fade out current text
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // update step
        setStepIndex((prev) => (prev + 1) % steps.length);
        // fade in new text
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [visible, steps.length]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentStep = steps[stepIndex];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.centeredView}>
        {/* Spinning icon */}
        <Animated.View style={{ transform: [{ rotate: spin }, { scale: scaleAnim }] }}>
          <MaterialIcons name="autorenew" size={72} color="#14B8A6" />
        </Animated.View>

        {/* Dynamic step text with icon */}
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', marginTop: 32 }}>
          <MaterialIcons name={currentStep.icon} size={28} color="#7C3AED" />
          <Text style={styles.stepText}>{currentStep.text}</Text>
        </Animated.View>

        {/* Notice: progress bar removed as per UX refinement */}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stepText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  // Styles for removed progress bar kept commented in case needed later
}); 