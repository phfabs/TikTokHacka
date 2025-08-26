import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Animated
} from 'react-native';
import { colors } from '../constants/colors';
import { CheckCircle, Circle, BookOpen, ExternalLink, ArrowRight } from 'lucide-react-native';

const DayDetail = ({ day, isCompleted, onToggleComplete }) => {
  if (!day) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No day details available.</Text>
      </View>
    );
  }

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const title = day.title || `Day ${day.day}`;

  const handleResourcePress = (url) => {
    const searchableUrl = url.startsWith('http') ? url : `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
    Linking.canOpenURL(searchableUrl).then(supported => {
      if (supported) {
        Linking.openURL(searchableUrl);
      } else {
        console.log("Don't know how to open URI: " + searchableUrl);
      }
    });
  };

  return (
    <Animated.ScrollView style={[styles.container, {opacity: fadeAnim}]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <Text style={styles.sectionTitle}>Today's Tasks</Text>

      {day.tasks && day.tasks.map((task, index) => (
        <View key={index} style={styles.taskContainer}>
          <View style={styles.taskHeader}>
            <ArrowRight size={18} color={colors.primary} style={styles.taskIcon} />
            <Text style={styles.taskDescription}>{task.description}</Text>
          </View>
          
          <View style={styles.resourcesSection}>
            <Text style={styles.resourcesTitle}>Resources:</Text>
            {task.resources && task.resources.map((resource, rIndex) => (
              <TouchableOpacity key={rIndex} style={styles.resourceItem} onPress={() => handleResourcePress(resource)}>
                <BookOpen size={16} color={colors.textSecondary} style={styles.resourceIcon} />
                <Text style={styles.resourceText} numberOfLines={1}>{resource}</Text>
                <ExternalLink size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      
      <TouchableOpacity 
        style={[styles.completeButton, isCompleted && styles.completedButtonActive]} 
        onPress={onToggleComplete}
      >
        {isCompleted ? 
          <CheckCircle size={20} color={colors.white} /> : 
          <Circle size={20} color={colors.white} />
        }
        <Text style={styles.completeButtonText}>
          {isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
        </Text>
      </TouchableOpacity>
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50, 
  },
  contentContainer: {
    padding: 24,
  },
  headerContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 10,
    marginBottom: 16,
  },
  taskContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskIcon: {
    marginRight: 12,
    marginTop: 3,
  },
  taskDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 24,
  },
  resourcesSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: 12,
  },
  resourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  resourceIcon: {
    marginRight: 10,
  },
  resourceText: {
    fontSize: 14,
    color: colors.primary,
    flex: 1,
  },
  completeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  completedButtonActive: {
    backgroundColor: colors.primary, 
    shadowColor: colors.primary,
  },
  completeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: colors.error,
  }
});

export default DayDetail; 