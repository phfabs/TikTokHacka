import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { CheckSquare, Square, BookOpen } from 'lucide-react-native';
import { colors } from '../constants/colors';

const DayCard = ({ day, onPress, isCompleted, onToggleComplete }) => {
  const [scaleValue] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const tasks = day.task || day.tasks || [];
  const resources = day.resource || [];

  const estimatedTime = tasks.length * 15; 
  const title = day.title || `Day ${day.day}`;
  const description = day.tasks && day.tasks.length > 0 
    ? day.tasks.map(t => t.description).join(' | ') 
    : 'No tasks listed.';

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={[styles.card, isCompleted && styles.cardCompleted]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.dayNumber, isCompleted && styles.completedText]}>Day {day.day}</Text>
          <Text style={[styles.estimatedTime, isCompleted && styles.completedText]}>{estimatedTime} min</Text>
        </View>
        <Text style={[styles.title, isCompleted && styles.completedText]}>{title}</Text>
        <Text style={[styles.description, isCompleted && styles.completedText]}>{description}</Text>

        {resources.length > 0 && (
          <View style={styles.resourcesContainer}>
            <View style={styles.resourcesHeader}>
              <BookOpen size={16} color={colors.textSecondary} />
              <Text style={styles.resourcesTitle}>Suggested Resources:</Text>
            </View>
            {resources.map((resource, index) => (
              <Text key={index} style={[styles.resourceItem, isCompleted && styles.completedText]}>
                • {resource}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={onToggleComplete} style={styles.checkboxContainer}>
          {isCompleted ? (
            <CheckSquare size={24} color={colors.primary} />
          ) : (
            <Square size={24} color={colors.gray500} />
          )}
          <Text style={[styles.completionText, isCompleted && styles.completedTextStrong]}>
            {isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: colors.primaryLight, 
  },
  cardCompleted: {
    backgroundColor: colors.gray100, 
    borderLeftColor: colors.primary, 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  estimatedTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  resourcesContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  resourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  resourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  resourceItem: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 10, 
    lineHeight: 18,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  completionText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
  completedText: {
    color: colors.gray500, 
    textDecorationLine: 'line-through',
  },
  completedTextStrong: {
    color: colors.primary, 
    fontWeight: '500',
  }
});

export default DayCard; 