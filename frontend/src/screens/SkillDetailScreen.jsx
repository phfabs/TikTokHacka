import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ImageBackground, Dimensions, Modal, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getSkillById, markSkillDayComplete, undoSkillDayComplete, updateSkill, refreshSkillImage } from '../api/plans';
import CompletionCelebrationModal from '../components/CompletionCelebrationModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import CustomModal from '../components/CustomModal';

const { width, height } = Dimensions.get('window');

const SkillDetailScreen = () => {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { token } = useAuth();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [taskCompletionLoading, setTaskCompletionLoading] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [imageRefreshLoading, setImageRefreshLoading] = useState(false);
  
  // New modal states
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedDay, setCompletedDay] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false);
  const [undoDay, setUndoDay] = useState(null);
  const [showImageSuccessModal, setShowImageSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchSkill = async () => {
    try {
      setError(null);
      const data = await getSkillById(params.skillId, token);
      setSkill(data);
    } catch (err) {
      console.error('Failed fetch skill', err);
      setError('Failed to load skill details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    fetchSkill();
  };

  const handleResourcePress = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open this link');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Unable to open this link');
    }
  };

  const handleImageRefresh = async () => {
    setImageRefreshLoading(true);
    setShowMenuModal(false);
    
    try {
      const updatedSkill = await refreshSkillImage(skill._id, token);
      setSkill(updatedSkill);
      setShowImageSuccessModal(true);
    } catch (error) {
      console.error('Error refreshing image:', error);
      setErrorMessage('Failed to refresh background image. Please try again.');
      setShowErrorModal(true);
    } finally {
      setImageRefreshLoading(false);
    }
  };

  useEffect(() => {
    fetchSkill();
  }, [params.skillId]);

  const handleMarkComplete = async (dayNumber) => {
    const currentDay = skill.progress?.current_day || 1;
    
    if (dayNumber !== currentDay) {
      setErrorMessage(`You can only complete Day ${currentDay} next. Please complete days in order.`);
      setShowErrorModal(true);
      return;
    }

    try {
      setOperationLoading(true);
      await markSkillDayComplete(skill._id, dayNumber, token);
      await fetchSkill();
      
      setCompletedDay(dayNumber);
      setShowCompletionModal(true);
    } catch (err) {
      console.error('Complete day error', err);
      setErrorMessage('Failed to mark day as complete. Please try again.');
      setShowErrorModal(true);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUndoComplete = async (dayNumber) => {
    const currentDay = skill.progress?.current_day || 1;
    
    if (dayNumber !== currentDay - 1) {
      setErrorMessage('You can only undo the most recently completed day to maintain progress order.');
      setShowErrorModal(true);
      return;
    }

    setUndoDay(dayNumber);
    setShowUndoConfirmModal(true);
  };

  const handleTaskToggle = async (taskIndex) => {
    const currentDay = skill.progress?.current_day || 1;
    const currentDayTasks = skill.curriculum?.daily_tasks?.[currentDay - 1];
    
    if (!currentDayTasks || !currentDayTasks.tasks) return;

    try {
      setTaskCompletionLoading(true);
      
      const updatedTasks = [...currentDayTasks.tasks];
      const currentTask = updatedTasks[taskIndex];
      
      updatedTasks[taskIndex] = {
        ...currentTask,
        completed: !currentTask.completed
      };

      const updatedDailyTasks = [...skill.curriculum.daily_tasks];
      updatedDailyTasks[currentDay - 1] = {
        ...updatedDailyTasks[currentDay - 1],
        tasks: updatedTasks
      };

      const updatedSkill = {
        ...skill,
        curriculum: {
          ...skill.curriculum,
          daily_tasks: updatedDailyTasks
        }
      };

      setSkill(updatedSkill);

      const updateData = {
        curriculum: {
          ...skill.curriculum,
          daily_tasks: updatedDailyTasks
        }
      };

      await updateSkill(skill._id, updateData, token);
    } catch (err) {
      console.error('Task toggle error', err);
      setErrorMessage('Failed to update task. Please try again.');
      setShowErrorModal(true);
      await fetchSkill();
    } finally {
      setTaskCompletionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading skill details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!skill) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="search-off" size={64} color="#6B7280" />
        <Text style={styles.errorText}>Skill not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentDay = skill.progress?.current_day || 1;
  const completionPercentage = skill.progress?.completion_percentage || 0;
  const totalDays = skill.curriculum?.daily_tasks?.length || 30;
  const completedDays = skill.progress?.completed_days || 0;
  const todayTasks = skill.curriculum?.daily_tasks?.[currentDay - 1] || {};
  const isSkillComplete = completionPercentage >= 100;

  const renderDayCard = (day, index) => {
    const dayNumber = index + 1;
    const isCompleted = day.completed || false;
    const isCurrent = dayNumber === currentDay;
    const isNext = dayNumber === currentDay + 1;
    const isLocked = dayNumber > currentDay;
    const isExpanded = expandedDay === dayNumber;

    return (
      <View key={index} style={[
        styles.dayCard,
        isCompleted && styles.completedDayCard,
        isCurrent && styles.currentDayCard,
        isLocked && styles.lockedDayCard
      ]}>
        <TouchableOpacity 
          style={styles.dayHeader}
          onPress={() => setExpandedDay(isExpanded ? null : dayNumber)}
        >
          <View style={styles.dayHeaderLeft}>
            <View style={[
              styles.dayNumberCircle,
              isCompleted && styles.completedCircle,
              isCurrent && styles.currentCircle,
              isLocked && styles.lockedCircle
            ]}>
              {isCompleted ? (
                <MaterialIcons name="check" size={16} color="white" />
              ) : isLocked ? (
                <MaterialIcons name="lock" size={16} color="#9CA3AF" />
              ) : (
                <Text style={[
                  styles.dayNumberText,
                  isCurrent && styles.currentDayText,
                  isLocked && styles.lockedDayText
                ]}>
                  {dayNumber}
                </Text>
              )}
            </View>
            <View style={styles.dayInfo}>
              <Text style={[
                styles.dayTitle,
                isCompleted && styles.completedDayTitle,
                isCurrent && styles.currentDayTitle,
                isLocked && styles.lockedDayTitle
              ]}>
                {day.title || `Day ${dayNumber}`}
              </Text>
              <Text style={[
                styles.daySubtitle,
                isLocked && styles.lockedDaySubtitle
              ]}>
                {day.tasks?.length || 0} tasks • {day.estimated_time || '30 min'}
              </Text>
            </View>
          </View>
          <View style={styles.dayActions}>
            {isCompleted && dayNumber === currentDay - 1 && (
              <TouchableOpacity
                style={styles.undoButton}
                onPress={() => handleUndoComplete(dayNumber)}
                disabled={operationLoading}
              >
                <MaterialIcons name="undo" size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
            {isCurrent && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => handleMarkComplete(dayNumber)}
                disabled={operationLoading}
              >
                {operationLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcons name="check" size={16} color="white" />
                )}
              </TouchableOpacity>
            )}
            <MaterialIcons 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={20} 
              color="#6B7280" 
            />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.dayContent}>
            <View style={styles.tasksContainer}>
              <Text style={styles.tasksTitle}>Tasks:</Text>
              {day.tasks?.map((task, taskIndex) => (
                <View key={taskIndex} style={styles.taskItem}>
                  <View style={[
                    styles.taskBullet,
                    task.completed && styles.completedTaskBullet
                  ]}>
                    {task.completed && <MaterialIcons name="check" size={10} color="white" />}
                  </View>
                  <Text style={[
                    styles.taskText,
                    task.completed && styles.completedTaskText
                  ]}>
                    {task.description || task}
                  </Text>
                </View>
              ))}
            </View>
            {day.description && (
              <Text style={styles.dayDescription}>{day.description}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: skill.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800' }}
        style={styles.headerBackground}
        imageStyle={styles.headerImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{skill.title}</Text>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowMenuModal(true)}
            >
              <MaterialIcons name="more-vert" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.skillInfo}>
            <View style={styles.skillStats}>
              <View style={styles.statItem}>
                <MaterialIcons name="calendar-today" size={16} color="white" />
                <Text style={styles.statText}>Day {currentDay}/{totalDays}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="trending-up" size={16} color="white" />
                <Text style={styles.statText}>{Math.round(completionPercentage)}% Complete</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="school" size={16} color="white" />
                <Text style={styles.statText}>{skill.difficulty || 'Beginner'}</Text>
              </View>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
              </View>
              <Text style={styles.progressText}>{completedDays} of {totalDays} days completed</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.currentDaySection}>
          {isSkillComplete ? (
            <View style={styles.completionCard}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.completionGradient}
              >
                <View style={styles.completionIconContainer}>
                  <MaterialIcons name="celebration" size={48} color="white" />
                </View>
                <Text style={styles.completionTitle}>🎉 Skill Complete!</Text>
                <Text style={styles.completionSubtitle}>
                  Congratulations! You've successfully completed this 30-day skill journey.
                </Text>
                <View style={styles.completionStats}>
                  <View style={styles.completionStat}>
                    <MaterialIcons name="calendar-today" size={16} color="white" />
                    <Text style={styles.completionStatText}>{totalDays} Days</Text>
                  </View>
                  <View style={styles.completionStat}>
                    <MaterialIcons name="trending-up" size={16} color="white" />
                    <Text style={styles.completionStatText}>100% Complete</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <>
              <View style={styles.focusHeader}>
                <Text style={styles.sectionTitle}>Today's Focus</Text>
                <View style={styles.dayBadge}>
                  <MaterialIcons name="today" size={16} color="#667eea" />
                  <Text style={styles.dayBadgeText}>Day {currentDay}</Text>
                </View>
              </View>
              
              <View style={styles.focusCard}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.focusGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.focusContent}>
                    <View style={styles.focusTopSection}>
                      <View style={styles.focusInfo}>
                        <Text style={styles.focusTitle}>{todayTasks.title || `Day ${currentDay} Challenge`}</Text>
                        <View style={styles.focusMetrics}>
                          <View style={styles.focusMetric}>
                            <MaterialIcons name="assignment" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.focusMetricText}>
                              {todayTasks.tasks?.length || 0} tasks
                            </Text>
                          </View>
                          <View style={styles.focusMetric}>
                            <MaterialIcons name="schedule" size={14} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.focusMetricText}>
                              {todayTasks.estimated_time || '30 min'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.focusCompleteButton}
                        onPress={() => handleMarkComplete(currentDay)}
                        disabled={operationLoading}
                      >
                        {operationLoading ? (
                          <ActivityIndicator size="small" color="#667eea" />
                        ) : (
                          <>
                            <MaterialIcons name="check-circle" size={20} color="#667eea" />
                            <Text style={styles.focusCompleteButtonText}>Complete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    {todayTasks.tasks && todayTasks.tasks.length > 0 && (
                      <View style={styles.tasksSection}>
                        <Text style={styles.tasksHeader}>Today's Tasks</Text>
                        <View style={styles.tasksList}>
                          {todayTasks.tasks.map((task, index) => (
                            <TouchableOpacity 
                              key={index} 
                              style={[
                                styles.taskRow,
                                task.completed && styles.taskRowCompleted
                              ]}
                              onPress={() => handleTaskToggle(index)}
                              disabled={taskCompletionLoading}
                              activeOpacity={0.7}
                            >
                              <View style={[
                                styles.taskIndicator,
                                task.completed && styles.taskIndicatorCompleted
                              ]}>
                                {task.completed && (
                                  <MaterialIcons name="check" size={12} color="#667eea" />
                                )}
                              </View>
                              <Text style={[
                                styles.taskDescription,
                                task.completed && styles.taskDescriptionCompleted
                              ]}>
                                {task.description || task}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        
                        <View style={styles.focusProgressIndicator}>
                          <View style={styles.focusProgressTrack}>
                            <View style={[
                              styles.focusProgressBar,
                              { width: `${((todayTasks.tasks?.filter(t => t.completed).length || 0) / (todayTasks.tasks?.length || 1)) * 100}%` }
                            ]} />
                          </View>
                          <Text style={styles.focusProgressText}>
                            {todayTasks.tasks?.filter(t => t.completed).length || 0} of {todayTasks.tasks?.length || 0} completed
                          </Text>
                        </View>
                        
                        {/* Resources Button */}
                        {todayTasks.resources && todayTasks.resources.length > 0 && (
                          <TouchableOpacity
                            style={styles.resourcesButton}
                            onPress={() => setShowResourcesModal(true)}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="library-books" size={16} color="#667eea" />
                            <Text style={styles.resourcesButtonText}>View Resources</Text>
                            <MaterialIcons name="open-in-new" size={14} color="#667eea" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
            </>
          )}
        </View>

        <View style={styles.allDaysSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Days</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => setShowAllDays(!showAllDays)}
            >
              <Text style={styles.viewAllText}>
                {showAllDays ? 'Collapse' : 'View All'}
              </Text>
              <MaterialIcons 
                name={showAllDays ? "expand-less" : "expand-more"} 
                size={18} 
                color="#667eea" 
              />
            </TouchableOpacity>
          </View>
          
          {showAllDays ? (
            <View style={styles.allDaysContainer}>
              {skill.curriculum?.daily_tasks?.map((day, index) => renderDayCard(day, index))}
            </View>
          ) : (
            <View style={styles.daysPreview}>
              {skill.curriculum?.daily_tasks?.slice(0, 3).map((day, index) => renderDayCard(day, index))}
              {skill.curriculum?.daily_tasks?.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllDays(true)}
                >
                  <Text style={styles.showMoreText}>
                    Show {skill.curriculum.daily_tasks.length - 3} more days
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Resources Modal */}
      <Modal
        visible={showResourcesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResourcesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Day {currentDay} Resources</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowResourcesModal(false)}
            >
              <MaterialIcons name="close" size={24} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.resourcesSubtitle}>
              Curated resources to help you complete today's tasks
            </Text>
            
            {todayTasks.resources && todayTasks.resources.map((resource, index) => (
              <TouchableOpacity
                key={index}
                style={styles.resourceCard}
                onPress={() => handleResourcePress(resource.url)}
                activeOpacity={0.8}
              >
                <View style={styles.resourceCardContent}>
                  <View style={styles.resourceIcon}>
                    <MaterialIcons 
                      name={resource.icon || 'link'} 
                      size={20} 
                      color="#667eea" 
                    />
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <Text style={styles.resourceDescription}>{resource.description}</Text>
                    <View style={styles.resourceMeta}>
                      <View style={styles.resourceCategory}>
                        <Text style={styles.resourceCategoryText}>{resource.category}</Text>
                      </View>
                      <MaterialIcons name="open-in-new" size={14} color="#94a3b8" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
            <View style={styles.modalFooter}>
              <Text style={styles.footerText}>
                Resources are curated for your learning journey. Tap any resource to open it in your browser.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Three-dot Menu Modal */}
      <Modal
        visible={showMenuModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Skill Options</Text>
            </View>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleImageRefresh}
              disabled={imageRefreshLoading}
            >
              <MaterialIcons name="refresh" size={20} color="#667eea" />
              <Text style={styles.menuItemText}>
                {imageRefreshLoading ? 'Refreshing...' : 'Refresh Background Image'}
              </Text>
              {imageRefreshLoading && (
                <ActivityIndicator size="small" color="#667eea" style={styles.menuItemLoader} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                navigation.navigate('SkillEdit', { skillId: skill._id });
              }}
            >
              <MaterialIcons name="edit" size={20} color="#667eea" />
              <Text style={styles.menuItemText}>Edit Skill</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, styles.deleteMenuItem]}
              onPress={() => {
                setShowMenuModal(false);
                Alert.alert(
                  'Delete Skill',
                  'Are you sure you want to delete this skill? This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => {
                      setErrorMessage('Delete functionality will be implemented soon');
                      setShowErrorModal(true);
                    }}
                  ]
                );
              }}
            >
              <MaterialIcons name="delete" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, styles.deleteMenuItemText]}>Delete Skill</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Beautiful Modal Components */}
      <CompletionCelebrationModal
        visible={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        day={completedDay}
        skillTitle={skill?.title}
        totalDays={skill?.curriculum?.daily_tasks?.length || 30}
        onViewProgress={() => {
          setShowCompletionModal(false);
          navigation.navigate('Stats');
        }}
      />

      <CustomModal
        visible={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        title="Progress Tracking"
        message="Advanced progress tracking features are coming soon! For now, continue completing your daily tasks."
        type="info"
        icon="trending-up"
        primaryButton={{
          text: 'Got it',
          onPress: () => setShowProgressModal(false),
        }}
      />

      <ConfirmationModal
        visible={showUndoConfirmModal}
        onClose={() => {
          setShowUndoConfirmModal(false);
          setUndoDay(null);
        }}
        onConfirm={async () => {
          try {
            setOperationLoading(true);
            await undoSkillDayComplete(skill._id, undoDay, token);
            await fetchSkill();
            setShowUndoConfirmModal(false);
            setUndoDay(null);
          } catch (err) {
            console.error('Undo day error', err);
            setErrorMessage('Failed to undo completion. Please try again.');
            setShowErrorModal(true);
          } finally {
            setOperationLoading(false);
          }
        }}
        title="Undo Day Completion"
        message={`Are you sure you want to undo completion of Day ${undoDay}? This will reset your progress for this day.`}
        confirmText="Undo"
        cancelText="Cancel"
        destructive
        icon="undo"
      />

      <SuccessModal
        visible={showImageSuccessModal}
        onClose={() => setShowImageSuccessModal(false)}
        title="Image Refreshed!"
        message="Your skill background image has been successfully updated with a fresh new look."
        buttonText="Awesome!"
        icon="image"
      />

      <CustomModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Oops!"
        message={errorMessage}
        type="error"
        icon="error-outline"
        primaryButton={{
          text: 'Try Again',
          onPress: () => setShowErrorModal(false),
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBackground: {
    height: height * 0.35,
  },
  headerImage: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerGradient: {
    flex: 1,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillInfo: {
    paddingHorizontal: 20,
  },
  skillStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    paddingTop: 30,
    paddingBottom: 40,
  },
  currentDaySection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  completionCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  completionGradient: {
    padding: 32,
    alignItems: 'center',
  },
  completionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  completionSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  completionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  completionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  completionStatText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  dayBadgeText: {
    color: '#667eea',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  focusCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  focusGradient: {
    padding: 24,
    minHeight: 200,
  },
  focusContent: {
  },
  focusTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  focusInfo: {
    flex: 1,
    marginRight: 16,
  },
  focusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
    lineHeight: 26,
  },
  focusMetrics: {
    flexDirection: 'row',
    gap: 16,
  },
  focusMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  focusMetricText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  focusCompleteButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 120,
    justifyContent: 'center',
  },
  focusCompleteButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  tasksSection: {
    marginTop: 20,
  },
  tasksHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  tasksList: {
    marginBottom: 16,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  taskRowCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  taskIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  taskIndicatorCompleted: {
    backgroundColor: 'white',
    borderColor: 'white',
    transform: [{ scale: 1.1 }],
  },
  taskDescription: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  taskDescriptionCompleted: {
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'line-through',
  },
  focusProgressIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  focusProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 8,
  },
  focusProgressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  focusProgressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  allDaysSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  allDaysContainer: {
    gap: 8,
  },
  daysPreview: {
    gap: 8,
  },
  showMoreButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  showMoreText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 2,
  },
  completedDayCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  currentDayCard: {
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  lockedDayCard: {
    backgroundColor: '#F9FAFB',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayNumberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completedCircle: {
    backgroundColor: '#10B981',
  },
  currentCircle: {
    backgroundColor: '#667eea',
  },
  lockedCircle: {
    backgroundColor: '#E5E7EB',
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  currentDayText: {
    color: 'white',
  },
  lockedDayText: {
    color: '#9CA3AF',
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  completedDayTitle: {
    color: '#059669',
  },
  currentDayTitle: {
    color: '#667eea',
  },
  lockedDayTitle: {
    color: '#9CA3AF',
  },
  daySubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  lockedDaySubtitle: {
    color: '#D1D5DB',
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeButton: {
    backgroundColor: '#10B981',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoButton: {
    backgroundColor: '#FEF2F2',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayContent: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
  },
  tasksContainer: {
    marginTop: 8,
  },
  tasksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskBullet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTaskBullet: {
    backgroundColor: '#10B981',
  },
  taskText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  completedTaskText: {
    color: '#059669',
    textDecorationLine: 'line-through',
  },
  dayDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resourcesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourcesButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  resourcesSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
    lineHeight: 24,
  },
  resourceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceCardContent: {
    flexDirection: 'row',
    padding: 20,
  },
  resourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 12,
  },
  resourceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resourceCategory: {
    backgroundColor: '#667eea30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resourceCategoryText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalFooter: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 8,
    minWidth: 250,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    margin: 4,
  },
  menuItemText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  menuItemLoader: {
    marginLeft: 8,
  },
  deleteMenuItem: {
    marginTop: 4,
  },
  deleteMenuItemText: {
    color: '#ef4444',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SkillDetailScreen;