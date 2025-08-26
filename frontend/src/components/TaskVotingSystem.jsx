import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getSkillCustomTasks, voteOnTask } from '../api/social';

const TaskVotingSystem = ({ skillId, day, onTaskSelect }) => {
  const [customTasks, setCustomTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState({});

  useEffect(() => {
    fetchCustomTasks();
  }, [skillId, day]);

  const fetchCustomTasks = async () => {
    try {
      setLoading(true);
      const response = await getSkillCustomTasks(skillId, day);
      setCustomTasks(response.tasks || []);
    } catch (error) {
      console.error('Error fetching custom tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (taskId, voteType) => {
    try {
      setVotingLoading(prev => ({ ...prev, [taskId]: true }));
      
      await voteOnTask(taskId, voteType);
      
      // Update local state optimistically
      setCustomTasks(prevTasks =>
        prevTasks.map(task => {
          if (task._id === taskId) {
            const newTask = { ...task };
            const userVote = task.user_vote;
            
            if (userVote === voteType) {
              // Remove vote
              newTask.user_vote = null;
              if (voteType === 'up') {
                newTask.upvotes = (newTask.upvotes || 0) - 1;
              } else {
                newTask.downvotes = (newTask.downvotes || 0) - 1;
              }
            } else {
              // Add or change vote
              if (userVote) {
                // Change from one vote to another
                if (userVote === 'up') {
                  newTask.upvotes = (newTask.upvotes || 0) - 1;
                } else {
                  newTask.downvotes = (newTask.downvotes || 0) - 1;
                }
              }
              
              newTask.user_vote = voteType;
              if (voteType === 'up') {
                newTask.upvotes = (newTask.upvotes || 0) + 1;
              } else {
                newTask.downvotes = (newTask.downvotes || 0) + 1;
              }
            }
            
            return newTask;
          }
          return task;
        })
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to vote on task');
    } finally {
      setVotingLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count?.toString() || '0';
  };

  const getTaskTypeIcon = (taskType) => {
    switch (taskType) {
      case 'reading':
        return 'book';
      case 'exercise':
        return 'fitness-center';
      case 'project':
        return 'build';
      case 'video':
        return 'play-circle';
      case 'quiz':
        return 'quiz';
      default:
        return 'assignment';
    }
  };

  const renderCustomTask = ({ item, index }) => {
    const isVoting = votingLoading[item._id];
    const upvotes = item.upvotes || 0;
    const downvotes = item.downvotes || 0;
    const score = upvotes - downvotes;
    const userVote = item.user_vote;

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View style={styles.taskMeta}>
            <View style={styles.taskTypeIndicator}>
              <MaterialIcons 
                name={getTaskTypeIcon(item.task?.task_type)} 
                size={14} 
                color={colors.primary} 
              />
              <Text style={styles.taskTypeText}>
                {item.task?.task_type || 'task'}
              </Text>
            </View>
            
            <View style={styles.contributorInfo}>
              <View style={styles.contributorAvatar}>
                <Text style={styles.contributorAvatarText}>
                  {item.contributor?.username?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <Text style={styles.contributorName}>
                {item.contributor?.username || 'Anonymous'}
              </Text>
            </View>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={[styles.scoreText, score > 0 && styles.positiveScore]}>
              {score > 0 ? '+' : ''}{score}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.taskContent}
          onPress={() => onTaskSelect && onTaskSelect(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.task?.title || 'Untitled Task'}
          </Text>
          <Text style={styles.taskDescription} numberOfLines={3}>
            {item.task?.description || 'No description available'}
          </Text>
          
          {item.task?.estimated_time && (
            <View style={styles.timeEstimate}>
              <MaterialIcons name="schedule" size={14} color={colors.gray500} />
              <Text style={styles.timeText}>
                {item.task.estimated_time} min
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.voteContainer}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              styles.upvoteButton,
              userVote === 'up' && styles.activeUpvote
            ]}
            onPress={() => handleVote(item._id, 'up')}
            disabled={isVoting}
          >
            {isVoting ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <>
                <MaterialIcons 
                  name="thumb-up" 
                  size={16} 
                  color={userVote === 'up' ? colors.white : colors.success} 
                />
                <Text style={[
                  styles.voteText,
                  userVote === 'up' && styles.activeVoteText
                ]}>
                  {formatCount(upvotes)}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.voteButton,
              styles.downvoteButton,
              userVote === 'down' && styles.activeDownvote
            ]}
            onPress={() => handleVote(item._id, 'down')}
            disabled={isVoting}
          >
            <MaterialIcons 
              name="thumb-down" 
              size={16} 
              color={userVote === 'down' ? colors.white : colors.error} 
            />
            <Text style={[
              styles.voteText,
              userVote === 'down' && styles.activeVoteText
            ]}>
              {formatCount(downvotes)}
            </Text>
          </TouchableOpacity>

          <View style={styles.usageStats}>
            <MaterialIcons name="people" size={14} color={colors.gray500} />
            <Text style={styles.usageText}>
              {formatCount(item.usage_count || 0)} used
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="extension" size={48} color={colors.gray400} />
      <Text style={styles.emptyStateTitle}>No Custom Tasks Yet</Text>
      <Text style={styles.emptyStateText}>
        Be the first to contribute a custom task for Day {day}!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading custom tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          Community Tasks - Day {day}
        </Text>
        <Text style={styles.sectionSubtitle}>
          Vote for the best alternative tasks
        </Text>
      </View>

      {customTasks.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={customTasks.sort((a, b) => {
            const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
            const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
            return scoreB - scoreA; // Sort by score descending
          })}
          renderItem={renderCustomTask}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray600,
    marginTop: 12,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.gray600,
  },
  listContainer: {
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  taskMeta: {
    flex: 1,
  },
  taskTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  contributorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contributorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray400,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  contributorAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  contributorName: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: '500',
  },
  scoreContainer: {
    backgroundColor: colors.gray50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray600,
  },
  positiveScore: {
    color: colors.success,
  },
  taskContent: {
    padding: 16,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 8,
    lineHeight: 22,
  },
  taskDescription: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
    marginBottom: 12,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: colors.gray500,
    marginLeft: 4,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    minWidth: 60,
    justifyContent: 'center',
  },
  upvoteButton: {
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  downvoteButton: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  activeUpvote: {
    backgroundColor: colors.success,
  },
  activeDownvote: {
    backgroundColor: colors.error,
  },
  voteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
    marginLeft: 4,
  },
  activeVoteText: {
    color: colors.white,
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  usageText: {
    fontSize: 12,
    color: colors.gray500,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray700,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TaskVotingSystem;