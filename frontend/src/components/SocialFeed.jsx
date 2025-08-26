import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getSocialFeed, likeSkill, bookmarkSkill, followUser, unfollowUser } from '../api/social';
import SharedSkillCard from './SharedSkillCard';
import UserProfileCard from './UserProfileCard';

const SocialFeed = ({ navigation, onSkillPress, onUserPress }) => {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    loadFeed(true);
  }, []);

  const loadFeed = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const currentPage = reset ? 1 : page;
      const data = await getSocialFeed(currentPage, 20);
      
      const newItems = data.feed_items || [];
      
      if (reset) {
        setFeedItems(newItems);
        setPage(2);
      } else {
        setFeedItems(prev => [...prev, ...newItems]);
        setPage(currentPage + 1);
      }
      
      setHasMore(newItems.length === 20);
    } catch (error) {
      console.error('Error loading social feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed(true);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !loading) {
      setIsLoadingMore(true);
      loadFeed(false);
    }
  };

  const handleLikeSkill = async (skillId, isLiked) => {
    try {
      await likeSkill(skillId);
      
      // Update feed items optimistically
      setFeedItems(prevItems =>
        prevItems.map(item => {
          if (item.type === 'skill_shared' && item.skill?._id === skillId) {
            return {
              ...item,
              skill: {
                ...item.skill,
                user_has_liked: isLiked,
                likes_count: isLiked ? item.skill.likes_count + 1 : item.skill.likes_count - 1
              }
            };
          }
          return item;
        })
      );
    } catch (error) {
      console.error('Error liking skill:', error);
      throw error;
    }
  };

  const handleBookmarkSkill = async (skillId) => {
    try {
      await bookmarkSkill(skillId);
      // Show success feedback
    } catch (error) {
      console.error('Error bookmarking skill:', error);
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      await followUser(userId);
      
      // Update feed items optimistically
      setFeedItems(prevItems =>
        prevItems.map(item => {
          if (item.user?._id === userId) {
            return {
              ...item,
              user: {
                ...item.user,
                is_following: true,
                followers_count: item.user.followers_count + 1
              }
            };
          }
          return item;
        })
      );
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollowUser = async (userId) => {
    try {
      await unfollowUser(userId);
      
      // Update feed items optimistically
      setFeedItems(prevItems =>
        prevItems.map(item => {
          if (item.user?._id === userId) {
            return {
              ...item,
              user: {
                ...item.user,
                is_following: false,
                followers_count: Math.max(0, item.user.followers_count - 1)
              }
            };
          }
          return item;
        })
      );
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const renderFeedItem = ({ item }) => {
    switch (item.type) {
      case 'skill_shared':
        return (
          <View style={styles.feedItemContainer}>
            <View style={styles.feedHeader}>
              <TouchableOpacity
                style={styles.userHeader}
                onPress={() => onUserPress?.(item.user)}
              >
                {item.user?.avatar_url ? (
                  <Image source={{ uri: item.user.avatar_url }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userAvatarText}>
                      {item.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.user?.display_name || item.user?.username || 'Unknown User'}</Text>
                  <Text style={styles.actionText}>shared a new skill</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            
            <SharedSkillCard
              skill={item.skill}
              onPress={() => onSkillPress?.(item.skill)}
              onLike={handleLikeSkill}
              onDownload={() => handleBookmarkSkill(item.skill._id)}
            />
          </View>
        );

      case 'user_followed':
        return (
          <View style={styles.feedItemContainer}>
            <View style={styles.feedHeader}>
              <TouchableOpacity
                style={styles.userHeader}
                onPress={() => onUserPress?.(item.user)}
              >
                {item.user?.avatar_url ? (
                  <Image source={{ uri: item.user.avatar_url }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userAvatarText}>
                      {item.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.user?.display_name || item.user?.username || 'Unknown User'}</Text>
                  <Text style={styles.actionText}>started following {item.target_user?.display_name || item.target_user?.username}</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            
            <UserProfileCard
              user={item.target_user}
              onFollow={handleFollowUser}
              onUnfollow={handleUnfollowUser}
              onPress={onUserPress}
              size="small"
            />
          </View>
        );

      case 'skill_completed':
        return (
          <View style={styles.feedItemContainer}>
            <View style={styles.feedHeader}>
              <TouchableOpacity
                style={styles.userHeader}
                onPress={() => onUserPress?.(item.user)}
              >
                {item.user?.avatar_url ? (
                  <Image source={{ uri: item.user.avatar_url }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userAvatarText}>
                      {item.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.user?.display_name || item.user?.username || 'Unknown User'}</Text>
                  <Text style={styles.actionText}>completed a skill</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            </View>
            
            <View style={styles.completionCard}>
              <View style={styles.completionHeader}>
                <MaterialIcons name="emoji-events" size={24} color={colors.warning} />
                <Text style={styles.completionTitle}>Skill Completed!</Text>
              </View>
              <TouchableOpacity
                style={styles.completedSkillInfo}
                onPress={() => onSkillPress?.(item.skill)}
              >
                <Text style={styles.completedSkillTitle}>{item.skill?.title}</Text>
                <Text style={styles.completedSkillCategory}>{item.skill?.category}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderListFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading more...</Text>
        </View>
      );
    }
    if (!hasMore && feedItems.length > 0) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>You're all caught up!</Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your feed...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={feedItems}
      renderItem={renderFeedItem}
      keyExtractor={(item) => `${item.type}_${item._id || item.id}`}
      contentContainerStyle={styles.feedContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={renderListFooter}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  feedContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  feedItemContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  actionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  completionCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
  },
  completedSkillInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completedSkillTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  completedSkillCategory: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    marginTop: 16,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  endMessage: {
    alignItems: 'center',
    paddingVertical: 32,
    marginTop: 16,
  },
  endMessageText: {
    fontSize: 16,
    color: colors.textTertiary,
    fontWeight: '500',
  },
});

export default SocialFeed;