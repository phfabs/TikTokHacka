import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../../constants/colors';

const ProgressRing = ({ 
  size = 120, 
  strokeWidth = 8, 
  progress = 0, 
  color = colors.primary, 
  backgroundColor = colors.gray200,
  showPercentage = true,
  centerText = null,
  gradientColors = null,
  animate = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (animate) {
      // Animate entrance
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Animate progress
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 1500,
        useNativeDriver: false,
      }).start();
    } else {
      animatedProgress.setValue(progress);
      scaleValue.setValue(1);
    }
  }, [progress, animate]);

  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  const finalGradientColors = gradientColors || [color, color];

  const AnimatedText = Animated.createAnimatedComponent(Text);

  return (
    <Animated.View style={[
      styles.container, 
      { 
        width: size, 
        height: size, 
        transform: [{ scale: scaleValue }] 
      }
    ]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={finalGradientColors[0]} />
            <Stop offset="100%" stopColor={finalGradientColors[1]} />
          </LinearGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <Circle
          stroke={gradientColors ? `url(#${gradientId})` : color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (progress / 100) * circumference}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      
      {/* Center content */}
      <View style={styles.centerContent}>
        {centerText ? (
          centerText
        ) : showPercentage ? (
          <Text style={[styles.percentageText, { color }]}>
            {Math.ceil(progress)}%
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ProgressRing;