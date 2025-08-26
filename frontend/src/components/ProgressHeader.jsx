import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

const ProgressHeader = ({ skillName = '', completedDays = 0, totalDays = 30 }) => {
  const percent = Math.round((completedDays / totalDays) * 100);
  const anim = React.useRef(new Animated.Value(0)).current;
  const floatAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: percent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{skillName}</Text>
      <Text style={styles.subtitle}>{completedDays}/{totalDays} days completed • {percent}%</Text>
      <View style={styles.barBackground}>
        <Animated.View
          style={{
            width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            height: '100%',
            shadowColor: '#22C55E',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <LinearGradient
            colors={['#22C55E', '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.barFill}
          />
        </Animated.View>
      </View>
      <Animated.View
        style={[
          styles.badge,
          {
            transform: [{ translateY: floatAnim }],
            shadowColor: '#06B6D4',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 6,
          },
        ]}
      >
        <Sparkles size={16} color="white" />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  barBackground: {
    height: 10, 
    backgroundColor: colors.gray300,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e7ef',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  badge: {
    position: 'absolute',
    right: 8,
    top: -16,
    backgroundColor: '#06B6D4',
    borderRadius: 16,
    padding: 6,
    zIndex: 10,
  },
});

export default ProgressHeader;