import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const { width } = Dimensions.get('window');

const SharedSkillCard = ({ skill, onPress, onDownload, onLike, onUserPress, onComment, onShare }) => {
  const [isLiked, setIsLiked] = useState(skill?.user_has_liked || false);
  const [likesCount, setLikesCount] = useState(skill?.likes_count || 0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(skill?.user_has_downloaded || false);
  const [likeLoading, setLikeLoading] = useState(false);
  const heartScale = new Animated.Value(1);
  const likeOpacity = new Animated.Value(0);

  const handleLike = async () => {
    if (likeLoading) return;
    
    try {
      setLikeLoading(true);
      
      // Double tap heart animation
      if (!isLiked) {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(heartScale, {
              toValue: 1.5,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(heartScale, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(likeOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(likeOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        ]).start();
      }

      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

      if (onLike) {
        await onLike(skill._id, newLikedState);
      }
    } catch (error) {
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
      Alert.alert('Error', 'Failed to update like status');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDownload = async () => {
    if (isDownloading || isDownloaded) return;

    try {
      setIsDownloading(true);
      if (onDownload) {
        await onDownload(skill._id);
        setIsDownloaded(true);
        Alert.alert('Success', 'Skill downloaded to your repository!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download skill');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count?.toString() || '0';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'now';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return colors.success;
      case 'intermediate': return colors.warning;
      case 'advanced': return colors.error;
      default: return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Post Header - Twitter/Instagram style */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => onUserPress?.(skill?.author)}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {skill?.shared_by_username?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          
          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>
                {skill?.author?.display_name || skill?.shared_by_username || 'Anonymous'}
              </Text>
              {skill?.author?.is_verified && (
                <MaterialIcons name="verified" size={16} color={colors.primary} style={styles.verifiedIcon} />
              )}
              <Text style={styles.username}>
                @{skill?.shared_by_username || 'anonymous'}
              </Text>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.timestamp}>{formatDate(skill?.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <MaterialIcons name="more-horiz" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <TouchableOpacity 
        style={styles.content} 
        onPress={() => onPress?.(skill)}
        activeOpacity={0.95}
      >
        <Text style={styles.skillTitle}>
          {skill?.title || 'Untitled Skill'}
        </Text>
        
        <Text style={styles.skillDescription} numberOfLines={3}>
          {skill?.description || 'No description available'}
        </Text>

        {/* Tags and metadata */}
        <View style={styles.metaContainer}>
          {skill?.category && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{skill.category}</Text>
            </View>
          )}
          
          <View style={[
            styles.difficultyPill,
            { backgroundColor: getDifficultyColor(skill?.difficulty) }
          ]}>
            <Text style={styles.difficultyText}>
              {skill?.difficulty || 'Beginner'}
            </Text>
          </View>

          {skill?.tags && skill.tags.length > 0 && (
            <View style={styles.hashtagsContainer}>
              {skill.tags.slice(0, 2).map((tag, index) => (
                <Text key={index} style={styles.hashtag}>
                  #{tag}
                </Text>
              ))}
              {skill.tags.length > 2 && (
                <Text style={styles.moreHashtags}>
                  +{skill.tags.length - 2} more
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Course preview card */}
        <View style={styles.coursePreview}>
          <View style={styles.courseHeader}>
            <MaterialIcons name="school" size={16} color={colors.primary} />
            <Text style={styles.courseLabel}>30-Day Learning Path</Text>
          </View>
          <View style={styles.courseStats}>
            <View style={styles.courseStat}>
              <MaterialIcons name="schedule" size={14} color={colors.textTertiary} />
              <Text style={styles.courseStatText}>
                {skill?.estimated_duration || '30'} days
              </Text>
            </View>
            <View style={styles.courseStat}>
              <MaterialIcons name="people" size={14} color={colors.textTertiary} />
              <Text style={styles.courseStatText}>
                {formatCount(skill?.downloads_count)} learners
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Engagement Actions - Twitter/Instagram style */}
      <View style={styles.actions}>
        <View style={styles.engagementRow}>
          {/* Like Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            disabled={likeLoading}
            activeOpacity={0.7}
          >
            {likeLoading ? (
              <ActivityIndicator size="small" color={colors.like} />
            ) : (
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <MaterialIcons
                  name={isLiked ? "favorite" : "favorite-border"}
                  size={20}
                  color={isLiked ? colors.like : colors.textTertiary}
                />
              </Animated.View>
            )}
            <Text style={[
              styles.actionText, 
              isLiked && { color: colors.like }
            ]}>
              {formatCount(likesCount)}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onComment?.(skill)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="chat-bubble-outline" size={20} color={colors.textTertiary} />
            <Text style={styles.actionText}>
              {formatCount(skill?.comments_count || 0)}
            </Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onShare?.(skill)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="share" size={20} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Download Button */}
          <TouchableOpacity
            style={[
              styles.downloadButton,
              isDownloaded && styles.downloadedButton
            ]}
            onPress={handleDownload}
            disabled={isDownloading || isDownloaded}
            activeOpacity={0.7}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialIcons 
                name={isDownloaded ? "check" : "download"} 
                size={18} 
                color={colors.white} 
              />
            )}
            <Text style={styles.downloadText}>
              {isDownloaded ? 'Downloaded' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Like Animation Overlay */}
      <Animated.View 
        style={[
          styles.likeAnimation,
          { opacity: likeOpacity }
        ]}
        pointerEvents="none"
      >
        <MaterialIcons name="favorite" size={50} color={colors.like} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    marginBottom: 1, // Minimal separation like Twitter
    paddingTop: 12,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
    paddingTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginRight: 4,
  },
  verifiedIcon: {
    marginRight: 4,
  },
  username: {
    fontSize: 15,
    color: colors.textTertiary,
    marginRight: 4,
  },
  separator: {
    fontSize: 15,
    color: colors.textTertiary,
    marginRight: 4,
  },
  timestamp: {
    fontSize: 15,
    color: colors.textTertiary,
  },
  moreButton: {
    padding: 8,
    marginTop: -4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  skillDescription: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryPill: {
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  difficultyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'capitalize',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hashtag: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 8,
  },
  moreHashtags: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  coursePreview: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  courseStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  courseStatText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    flex: 1,
  },
  actionText: {
    fontSize: 13,
    color: colors.textTertiary,
    marginLeft: 6,
    fontWeight: '500',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  downloadedButton: {
    backgroundColor: colors.success,
    opacity: 0.8,
  },
  downloadText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 4,
  },
  likeAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
    zIndex: 1000,
  },
});

export default SharedSkillCard;