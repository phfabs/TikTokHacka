import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getSharedSkillDetail, likeSkill, downloadSkill } from '../api/social';
import CommentsSection from '../components/CommentsSection';
import SuccessModal from '../components/SuccessModal';
import CustomModal from '../components/CustomModal';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 320;
const HERO_HEIGHT = 280;
const CARD_MARGIN = 16;
const CARD_PADDING = 20;

const SharedSkillDetailScreen = ({ route, navigation }) => {
  const { skillId } = route?.params || {};
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [downloadsCount, setDownloadsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); // overview, curriculum, comments
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [isDownvoted, setIsDownvoted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  
  // Modal states
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadedSkillTitle, setDownloadedSkillTitle] = useState('');
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 100, HERO_HEIGHT],
    outputRange: [0, 0.8, 1],
    extrapolate: 'clamp',
  });
  
  const heroScale = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [1, 1.1],
    extrapolate: 'clamp',
  });
  
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (skillId) {
      fetchSkillDetail();
    } else {
      setLoading(false);
    }
  }, [skillId]);

  const fetchSkillDetail = async () => {
    if (!skillId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await getSharedSkillDetail(skillId);
      const skillData = response.skill;
      setSkill(skillData);
      setIsLiked(skillData.user_has_liked || false);
      setLikesCount(skillData.likes_count || 0);
      setDownloadsCount(skillData.downloads_count || 0);
      setIsUpvoted(skillData.user_has_upvoted || false);
      setIsDownvoted(skillData.user_has_downvoted || false);
      setIsSaved(skillData.user_has_saved || false);
      setUpvotes(skillData.upvotes || 0);
      setDownvotes(skillData.downvotes || 0);
      setSaveCount(skillData.save_count || 0);
    } catch (error) {
      console.error('Error fetching skill detail:', error);
      Alert.alert('Error', 'Failed to load skill details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
      
      await likeSkill(skillId);
    } catch (error) {
      // Revert optimistic update
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
      setErrorMessage('Failed to update like status. Please try again.');
      setShowErrorModal(true);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadSkill(skillId);
      setDownloadsCount(prev => prev + 1);
      setDownloadedSkillTitle(skill?.title || 'Skill');
      setShowDownloadSuccess(true);
    } catch (error) {
      setErrorMessage('Failed to download skill. Please try again.');
      setShowErrorModal(true);
    }
  };

  const handleUpvote = async () => {
    try {
      if (isUpvoted) {
        setIsUpvoted(false);
        setUpvotes(prev => prev - 1);
      } else {
        setIsUpvoted(true);
        setUpvotes(prev => prev + 1);
        if (isDownvoted) {
          setIsDownvoted(false);
          setDownvotes(prev => prev - 1);
        }
      }
      // TODO: Call API to update upvote
    } catch (error) {
      console.error('Error upvoting:', error);
    }
  };

  const handleDownvote = async () => {
    try {
      if (isDownvoted) {
        setIsDownvoted(false);
        setDownvotes(prev => prev - 1);
      } else {
        setIsDownvoted(true);
        setDownvotes(prev => prev + 1);
        if (isUpvoted) {
          setIsUpvoted(false);
          setUpvotes(prev => prev - 1);
        }
      }
      // TODO: Call API to update downvote
    } catch (error) {
      console.error('Error downvoting:', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaved(!isSaved);
      setSaveCount(prev => isSaved ? prev - 1 : prev + 1);
      // TODO: Call API to update save
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSkillDetail();
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  };

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return colors.success;
      case 'intermediate':
        return colors.warning;
      case 'advanced':
        return colors.error;
      default:
        return colors.gray500;
    }
  };

  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count?.toString() || '0';
  };

  const getGradientColors = (category) => {
    const categoryKey = category?.toLowerCase() || 'default';
    return colors.gradients?.[categoryKey] || colors.gradients?.default || ['#667eea', '#764ba2'];
  };

  const renderCurriculumDay = ({ item, index }) => (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>Day {index + 1}</Text>
        </View>
        {item.estimated_time && (
          <View style={styles.timeEstimate}>
            <MaterialIcons name="schedule" size={14} color={colors.gray600} />
            <Text style={styles.timeText}>
              {typeof item.estimated_time === 'string' ? item.estimated_time : `${item.estimated_time} min`}
            </Text>
          </View>
        )}
      </View>
      
      <Text style={styles.dayItemTitle}>{item.title}</Text>
      <Text style={styles.dayDescription}>{item.description}</Text>
      
      {/* Show Tasks instead of Resources */}
      {item.tasks && item.tasks.length > 0 && (
        <View style={styles.tasksSection}>
          <Text style={styles.tasksTitle}>Daily Tasks:</Text>
          {item.tasks.map((task, idx) => (
            <View key={idx} style={styles.taskItem}>
              <MaterialIcons 
                name={task.completed ? "check-circle" : "radio-button-unchecked"} 
                size={18} 
                color={task.completed ? colors.success : colors.textTertiary} 
              />
              <Text style={[
                styles.taskText,
                task.completed && styles.completedTaskText
              ]}>
                {task.description || task.title || task}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Show Resources as secondary information if available */}
      {item.resources && item.resources.length > 0 && (
        <View style={styles.resourcesSection}>
          <Text style={styles.resourcesTitle}>Resources:</Text>
          {item.resources.slice(0, 2).map((resource, idx) => (
            <TouchableOpacity key={idx} style={styles.resourceItem}>
              <MaterialIcons name="link" size={14} color={colors.primary} />
              <Text style={styles.resourceText} numberOfLines={1}>
                {resource.title || resource.url || resource}
              </Text>
            </TouchableOpacity>
          ))}
          {item.resources.length > 2 && (
            <Text style={styles.moreResourcesText}>
              +{item.resources.length - 2} more resources
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderModernCurriculumDay = ({ item, index }) => (
    <View style={styles.modernLessonCard}>
      <View style={styles.lessonHeader}>
        <View style={styles.lessonNumber}>
          <Text style={styles.lessonNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.lessonContent}>
          <Text style={styles.lessonTitle}>{item.title}</Text>
          <Text style={styles.lessonDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <View style={styles.lessonMeta}>
          {item.estimated_time && (
            <View style={styles.lessonDuration}>
              <MaterialIcons name="schedule" size={14} color={colors.textTertiary} />
              <Text style={styles.lessonDurationText}>{item.estimated_time}m</Text>
            </View>
          )}
          <TouchableOpacity style={styles.lessonPlayButton}>
            <MaterialIcons name="play-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderTabButton = (tab, label, icon) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <MaterialIcons 
        name={icon} 
        size={18} 
        color={activeTab === tab ? colors.white : colors.gray600} 
      />
      <Text style={[
        styles.tabButtonText,
        activeTab === tab && styles.activeTabButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading skill details...</Text>
      </View>
    );
  }

  if (!skillId) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={colors.error} />
        <Text style={styles.errorText}>Invalid skill link</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!skill) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={colors.error} />
        <Text style={styles.errorText}>Skill not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Floating Header */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <View style={styles.floatingHeaderContent}>
          <TouchableOpacity 
            style={styles.floatingBackButton} 
            onPress={() => {
              console.log('Floating back button pressed');
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('SocialFeed');
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.floatingTitle} numberOfLines={1}>{skill?.title}</Text>
          <TouchableOpacity style={styles.floatingShareButton}>
            <MaterialIcons name="share" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            progressViewOffset={100}
          />
        }
      >
        {/* Modern Hero Section */}
        <Animated.View style={[
          styles.heroSection,
          {
            transform: [
              { scale: heroScale },
              { translateY: heroTranslateY }
            ]
          }
        ]}>
          <LinearGradient
            colors={getGradientColors(skill?.category)}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroOverlay} />
            
            {/* Hero Navigation */}
            <View style={styles.heroNavigation}>
              <TouchableOpacity 
                style={styles.heroBackButton} 
                onPress={() => {
                  console.log('Hero back button pressed');
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('SocialFeed');
                  }
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <MaterialIcons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
              
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.heroActionButton} onPress={handleSave}>
                  <MaterialIcons 
                    name={isSaved ? "bookmark" : "bookmark-border"} 
                    size={22} 
                    color={colors.white} 
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroActionButton}>
                  <MaterialIcons name="share" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Hero Content */}
            <View style={styles.heroContent}>
              {/* Skill Badges */}
              <View style={styles.skillBadges}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{skill?.category}</Text>
                </View>
                <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(skill?.difficulty) }]}>
                  <Text style={styles.difficultyText}>{skill?.difficulty}</Text>
                </View>
              </View>
              
              {/* Plan Title */}
              <Text style={styles.heroTitle}>{skill?.title}</Text>
              
              {/* Plan Stats */}
              <View style={styles.planStats}>
                <View style={styles.statItem}>
                  <MaterialIcons name="schedule" size={16} color={colors.white} />
                  <Text style={styles.statText}>{skill?.estimated_duration || 30} days</Text>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}>
                  <MaterialIcons name="people" size={16} color={colors.white} />
                  <Text style={styles.statText}>{formatCount(downloadsCount)} enrolled</Text>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statItem}>
                  <MaterialIcons name="star" size={16} color={colors.white} />
                  <Text style={styles.statText}>4.8</Text>
                </View>
              </View>

              {/* Author Info */}
              <View style={styles.authorSection}>
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorAvatarText}>
                    {skill?.shared_by_username?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>
                    {skill?.shared_by_display_name || skill?.shared_by_username || 'Anonymous'}
                  </Text>
                  <Text style={styles.authorTitle}>Plan Creator</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Modern Action Bar */}
        <View style={styles.modernActionBar}>
          {/* Social Actions */}
          <View style={styles.socialActions}>
            <TouchableOpacity 
              style={[styles.socialButton, isUpvoted && styles.upvotedSocialButton]}
              onPress={handleUpvote}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="thumb-up" 
                size={20} 
                color={isUpvoted ? colors.white : colors.textSecondary} 
              />
              <Text style={[
                styles.socialButtonText, 
                isUpvoted && styles.upvotedSocialButtonText
              ]}>
                {formatCount(upvotes)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => setActiveTab('comments')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chat-bubble-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.socialButtonText}>{formatCount(skill?.comments_count || 0)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.socialButton, isSaved && styles.savedSocialButton]}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name={isSaved ? "bookmark" : "bookmark-border"} 
                size={20} 
                color={isSaved ? colors.white : colors.textSecondary} 
              />
              <Text style={[
                styles.socialButtonText,
                isSaved && styles.savedSocialButtonText
              ]}>
                {formatCount(saveCount)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Primary CTA */}
          <TouchableOpacity 
            style={styles.primaryCTA}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <MaterialIcons name="download" size={20} color={colors.white} />
            <Text style={styles.primaryCTAText}>Enroll Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Content Cards */}
        <View style={styles.contentContainer}>
          {/* About Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="info-outline" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>About This Plan</Text>
            </View>
            
            <Text 
              style={styles.descriptionText}
              numberOfLines={showFullDescription ? undefined : 4}
            >
              {skill?.skill_description || skill?.description}
            </Text>
            
            {(skill?.skill_description || skill?.description)?.length > 200 && (
              <TouchableOpacity 
                style={styles.readMoreButton}
                onPress={toggleDescription}
                activeOpacity={0.7}
              >
                <Text style={styles.readMoreText}>
                  {showFullDescription ? 'Read Less' : 'Read More'}
                </Text>
                <MaterialIcons 
                  name={showFullDescription ? "expand-less" : "expand-more"} 
                  size={16} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
            )}

            {/* Creator's Message */}
            {skill?.personal_message && (
              <View style={styles.creatorMessage}>
                <View style={styles.messageHeader}>
                  <MaterialIcons name="format-quote" size={18} color={colors.primary} />
                  <Text style={styles.messageLabel}>Creator's Message</Text>
                </View>
                <Text style={styles.messageText}>{skill?.personal_message}</Text>
              </View>
            )}

            {/* Tags */}
            {skill?.tags && skill.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {skill.tags.map((tag, index) => (
                  <TouchableOpacity key={index} style={styles.modernTag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* What You'll Learn Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="check-circle-outline" size={20} color={colors.success} />
              <Text style={styles.cardTitle}>What You'll Learn</Text>
            </View>
            <View style={styles.learningOutcomes}>
              <View style={styles.outcomeItem}>
                <MaterialIcons name="check" size={16} color={colors.success} />
                <Text style={styles.outcomeText}>Master {skill?.category} fundamentals</Text>
              </View>
              <View style={styles.outcomeItem}>
                <MaterialIcons name="check" size={16} color={colors.success} />
                <Text style={styles.outcomeText}>Build practical projects</Text>
              </View>
              <View style={styles.outcomeItem}>
                <MaterialIcons name="check" size={16} color={colors.success} />
                <Text style={styles.outcomeText}>Industry best practices</Text>
              </View>
            </View>
          </View>

          {/* Modern Tab Navigation */}
          <View style={styles.modernTabNavigation}>
            {[
              { key: 'overview', label: 'Overview', icon: 'dashboard' },
              { key: 'curriculum', label: 'Curriculum', icon: 'list-alt' },
              { key: 'comments', label: 'Discussion', icon: 'forum' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.modernTab, activeTab === tab.key && styles.activeModernTab]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <MaterialIcons 
                  name={tab.icon} 
                  size={18} 
                  color={activeTab === tab.key ? colors.white : colors.textSecondary} 
                />
                <Text style={[
                  styles.modernTabLabel, 
                  activeTab === tab.key && styles.activeModernTabLabel
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Modern Tab Content */}
          {activeTab === 'overview' && (
            <View style={styles.modernCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="analytics" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Plan Statistics</Text>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.modernStatCard}>
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name="schedule" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{skill?.estimated_duration || 30}</Text>
                  <Text style={styles.statLabel}>Days Duration</Text>
                </View>
                <View style={styles.modernStatCard}>
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name="trending-up" size={22} color={colors.success} />
                  </View>
                  <Text style={styles.statValue}>{skill?.difficulty || 'Beginner'}</Text>
                  <Text style={styles.statLabel}>Difficulty</Text>
                </View>
                <View style={styles.modernStatCard}>
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name="people" size={22} color={colors.warning} />
                  </View>
                  <Text style={styles.statValue}>{formatCount(downloadsCount)}</Text>
                  <Text style={styles.statLabel}>Enrolled</Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'curriculum' && (
            <View style={styles.modernCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="list-alt" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Plan Curriculum</Text>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressText}>
                    {(() => {
                      // Handle both data structures
                      const curriculumData = skill?.curriculum?.daily_tasks || skill?.curriculum || [];
                      return curriculumData.length || 0;
                    })()} days
                  </Text>
                </View>
              </View>
              {(() => {
                // Debug logging
                console.log('Skill data for curriculum:', {
                  hasSkill: !!skill,
                  hasCurriculum: !!skill?.curriculum,
                  curriculumType: typeof skill?.curriculum,
                  curriculumLength: skill?.curriculum?.length,
                  hasDailyTasks: !!skill?.curriculum?.daily_tasks,
                  dailyTasksLength: skill?.curriculum?.daily_tasks?.length,
                  curriculumKeys: skill?.curriculum ? Object.keys(skill.curriculum) : 'N/A'
                });
                
                // Handle both data structures: direct array or nested daily_tasks
                const curriculumData = skill?.curriculum?.daily_tasks || skill?.curriculum || [];
                
                if (curriculumData && curriculumData.length > 0) {
                  return (
                    <FlatList
                      data={curriculumData}
                      renderItem={renderCurriculumDay}
                      keyExtractor={(item, index) => `day-${index}`}
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={false}
                      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                    />
                  );
                } else {
                  return (
                    <View style={styles.emptyCurriculum}>
                      <MaterialIcons name="school" size={48} color={colors.textTertiary} />
                      <Text style={styles.emptyCurriculumText}>No curriculum available</Text>
                      <Text style={styles.emptyCurriculumSubtext}>
                        This plan doesn't have a detailed curriculum yet.
                        {skill?.curriculum && typeof skill.curriculum === 'object' 
                          ? ` (Found: ${Object.keys(skill.curriculum).join(', ')})` 
                          : ''
                        }
                      </Text>
                    </View>
                  );
                }
              })()}
            </View>
          )}

          {activeTab === 'comments' && (
            <View style={styles.modernCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="forum" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Plan Discussion</Text>
                <TouchableOpacity style={styles.addCommentButton}>
                  <MaterialIcons name="add-comment" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <CommentsSection 
                skillId={skillId}
                onUserPress={(user) => navigation.navigate('UserProfile', { userId: user._id })}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Beautiful Modal Components */}
      <SuccessModal
        visible={showDownloadSuccess}
        onClose={() => setShowDownloadSuccess(false)}
        title="Skill Downloaded! 🎉"
        message={`"${downloadedSkillTitle}" has been successfully added to your personal skill repository. You can now start learning!`}
        buttonText="Start Learning"
        icon="download-done"
        autoClose={false}
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
  // Base Layout
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  scrollView: {
    flex: 1,
  },
  
  // Modern Floating Header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 80,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0),
    pointerEvents: 'box-none', // Allow touches to pass through to children
  },
  floatingHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  floatingTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  floatingBackButton: {
    width: 44, // Increased touch target
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    zIndex: 1002, // Higher z-index than header
  },
  floatingShareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Hero Section
  heroSection: {
    height: HEADER_HEIGHT,
    justifyContent: 'flex-end',
    position: 'relative',
    marginTop: Platform.OS === 'ios' ? -44 : -(StatusBar.currentHeight || 0),
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  heroNavigation: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glass?.background || 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass?.border || 'rgba(255, 255, 255, 0.18)',
    zIndex: 100, // Ensure it's above other elements
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  heroActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glass?.background || 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass?.border || 'rgba(255, 255, 255, 0.18)',
  },
  heroContent: {
    padding: 24,
    paddingBottom: 32,
  },
  skillBadges: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass?.border || 'rgba(255, 255, 255, 0.18)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 36,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass?.background || 'rgba(255, 255, 255, 0.25)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glass?.border || 'rgba(255, 255, 255, 0.18)',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postTime: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
  },
  postSeparator: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.6,
    marginHorizontal: 6,
  },
  viewCount: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
  },
  
  // Voting Bar
  votingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  votingSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteButton: {
    padding: 8,
    borderRadius: 12,
  },
  upvotedButton: {
    backgroundColor: (colors.reddit?.upvote || '#FF4500') + '15',
  },
  downvotedButton: {
    backgroundColor: (colors.reddit?.downvote || '#7193FF') + '15',
  },
  voteCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 8,
    minWidth: 40,
    textAlign: 'center',
  },
  engagementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  
  // Content Section
  contentSection: {
    backgroundColor: colors.white,
  },
  contentCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  skillDescription: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 20,
  },
  personalMessage: {
    backgroundColor: colors.primaryUltraLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 8,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  
  // Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
  
  // Overview Section
  overviewSection: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Curriculum Section
  curriculumSection: {
    padding: 20,
    gap: 16,
  },
  
  // Comments Section
  commentsSection: {
    flex: 1,
  },
  
  // Removed unused stickyActionBar style
  // Removed unused action bar button styles
  
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
    marginTop: 20,
    marginBottom: 32,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Day Card for Curriculum
  dayCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 3,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  dayDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  dayTime: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '600',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  skillTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  skillDescription: {
    fontSize: 17,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: 24,
  },
  skillMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Removed duplicate authorSection, authorAvatar, authorAvatarText, authorInfo, authorName - these are defined later in the styles
  authorLabel: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  skillStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  skillDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  // Removed duplicate difficultyBadge, difficultyText, categoryBadge, categoryText - these are defined earlier in the styles
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  // Removed duplicate tag and tagText - these are defined elsewhere in the styles
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    marginHorizontal: 6,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  likeButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.error,
  },
  likedButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  downloadButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
    marginLeft: 8,
  },
  likedButtonText: {
    color: colors.white,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    backgroundColor: colors.white,
    marginHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceTertiary,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 8,
  },
  activeTabButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  curriculumSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  customTasksSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  commentsSection: {
    flex: 1,
    minHeight: 400,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '600',
  },
  dayItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  dayDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  resourcesSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resourcesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  resourceText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },

  // Tasks Section Styles
  tasksSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tasksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  taskText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  moreResourcesText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 32,
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
    marginTop: 20,
    marginBottom: 32,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // Modern Styles
  heroGradient: {
    height: HERO_HEIGHT,
    justifyContent: 'flex-end',
  },
  
  planStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statSeparator: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 12,
  },
  
  statText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  
  authorTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '400',
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  // Modern Action Bar
  modernActionBar: {
    backgroundColor: colors.white,
    marginHorizontal: CARD_MARGIN,
    marginTop: -30, // Reduced negative margin to prevent covering back button
    marginBottom: 20,
    borderRadius: 16,
    padding: CARD_PADDING,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 5, // Reduced z-index so it doesn't cover navigation
  },

  socialActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },

  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    minWidth: 80,
    justifyContent: 'center',
  },

  upvotedSocialButton: {
    backgroundColor: colors.reddit?.upvote || '#FF4500',
  },

  savedSocialButton: {
    backgroundColor: colors.reddit?.save || '#FFD700',
  },

  socialButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 6,
  },

  upvotedSocialButtonText: {
    color: colors.white,
  },

  savedSocialButtonText: {
    color: colors.white,
  },

  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  primaryCTAText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Content Container
  contentContainer: {
    padding: CARD_MARGIN,
    paddingBottom: 120, // Extra bottom padding to prevent overlap with any bottom elements
  },

  // Modern Cards
  modernCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: CARD_PADDING,
    marginBottom: 20, // Increased margin between cards
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },

  // Description Section
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    marginBottom: 12,
  },

  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },

  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },

  // Creator Message
  creatorMessage: {
    backgroundColor: colors.primaryUltraLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },

  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontStyle: 'italic',
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },

  modernTag: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },

  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Learning Outcomes
  learningOutcomes: {
    gap: 12,
  },

  outcomeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  outcomeText: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },

  // Modern Tab Navigation
  modernTabNavigation: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: CARD_MARGIN,
  },

  modernTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },

  activeModernTab: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },

  modernTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  activeModernTabLabel: {
    color: colors.white,
    fontWeight: '700',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  modernStatCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },

  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Progress Badge
  progressBadge: {
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // Modern Lesson Cards
  modernLessonCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 16,
  },

  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  lessonNumberText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  lessonContent: {
    flex: 1,
  },

  lessonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },

  lessonDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  lessonMeta: {
    alignItems: 'flex-end',
  },

  lessonDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  lessonDurationText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 4,
  },

  lessonPlayButton: {
    padding: 4,
  },

  lessonSeparator: {
    height: 12,
  },

  // Add Comment Button
  addCommentButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.primaryUltraLight,
  },

  // Empty Curriculum State
  emptyCurriculum: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyCurriculumText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyCurriculumSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SharedSkillDetailScreen;