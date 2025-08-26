import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

const StatCard = ({
  title,
  value,
  subtitle = null,
  icon = null,
  color = colors.primary,
  backgroundColor = colors.white,
  animate = true,
  onPress = null,
  style = {}
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (animate) {
      // Animate the number counting up
      Animated.timing(animatedValue, {
        toValue: typeof value === 'number' ? value : 1,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      // Animate card entrance
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      animatedValue.setValue(typeof value === 'number' ? value : 1);
      scaleValue.setValue(1);
    }
  }, [value, animate]);

  const AnimatedText = Animated.createAnimatedComponent(Text);

  const renderValue = () => {
    if (typeof value === 'number' && animate) {
      return (
        <AnimatedText style={[styles.value, { color }]}>
          {animatedValue.interpolate({
            inputRange: [0, value],
            outputRange: ['0', Math.ceil(value).toString()],
            extrapolate: 'clamp',
          })}
        </AnimatedText>
      );
    }
    return <Text style={[styles.value, { color }]}>{typeof value === 'number' ? Math.ceil(value) : value}</Text>;
  };

  const CardContent = (
    <Animated.View 
      style={[
        styles.card, 
        { backgroundColor, transform: [{ scale: scaleValue }] },
        style
      ]}
    >
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <MaterialIcons name={icon} size={24} color={color} />
          </View>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      <View style={styles.valueContainer}>
        {renderValue()}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 120,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 0.1,
  },
  valueContainer: {
    alignItems: 'flex-start',
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
});

export default StatCard;