import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const UserProfileCard = ({ 
  user, 
  onFollow, 
  onUnfollow, 
  onPress, 
  showFollowButton = true,
  size = 'medium' // small, medium, large
}) => {
  const [isFollowing, setIsFollowing] = useState(user?.is_following || false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(user?.followers_count || 0);
  const buttonScale = new Animated.Value(1);

  const handleFollowPress = async () => {
    if (followLoading) return;

    try {
      setFollowLoading(true);
      
      // Optimistic update
      const newFollowingState = !isFollowing;
      setIsFollowing(newFollowingState);
      setFollowersCount(prev => newFollowingState ? prev + 1 : prev - 1);

      // Animate button
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      if (newFollowingState) {
        await onFollow?.(user._id);
      } else {
        await onUnfollow?.(user._id);
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsFollowing(!isFollowing);
      setFollowersCount(prev => isFollowing ? prev + 1 : prev - 1);
    } finally {
      setFollowLoading(false);
    }
  };

  const getCardStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallCard;
      case 'large':
        return styles.largeCard;
      default:
        return styles.mediumCard;
    }
  };

  const getAvatarSize = () => {
    switch (size) {
      case 'small':
        return 40;
      case 'large':
        return 80;
      default:
        return 56;
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

  return (
    <TouchableOpacity
      style={[styles.card, getCardStyle()]}
      onPress={() => onPress?.(user)}
      activeOpacity={0.95}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={[styles.avatar, { width: getAvatarSize(), height: getAvatarSize() }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { width: getAvatarSize(), height: getAvatarSize() }]}>
              <Text style={[styles.avatarText, { fontSize: getAvatarSize() * 0.4 }]}>
                {user?.display_name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          
          {user?.is_verified && (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={16} color={colors.primary} />
            </View>
          )}
        </View>

        {showFollowButton && size !== 'small' && (
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton
              ]}
              onPress={handleFollowPress}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? colors.white : colors.primary} />
              ) : (
                <>
                  <MaterialIcons 
                    name={isFollowing ? "person-remove" : "person-add"} 
                    size={16} 
                    color={isFollowing ? colors.white : colors.primary} 
                  />
                  <Text style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText
                  ]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.nameContainer}>
          <Text style={[styles.displayName, size === 'small' && styles.smallDisplayName]} numberOfLines={1}>
            {user?.display_name || user?.username || 'Unknown User'}
          </Text>
          {user?.username && user?.display_name !== user?.username && (
            <Text style={[styles.username, size === 'small' && styles.smallUsername]} numberOfLines={1}>
              @{user.username}
            </Text>
          )}
        </View>

        {user?.bio && size !== 'small' && (
          <Text style={styles.bio} numberOfLines={2}>
            {user.bio}
          </Text>
        )}

        {/* Specializations */}
        {user?.specializations && user.specializations.length > 0 && size !== 'small' && (
          <View style={styles.specializations}>
            {user.specializations.slice(0, 2).map((spec, index) => (
              <View key={index} style={styles.specializationTag}>
                <Text style={styles.specializationText}>{spec}</Text>
              </View>
            ))}
            {user.specializations.length > 2 && (
              <Text style={styles.moreSpecializations}>
                +{user.specializations.length - 2} more
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Stats */}
      {size !== 'small' && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(followersCount)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(user?.following_count)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(user?.skills_created)}</Text>
            <Text style={styles.statLabel}>Skills</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(user?.total_likes_received)}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>
      )}

      {/* Badges */}
      {user?.badges && user.badges.length > 0 && size === 'large' && (
        <View style={styles.badgesContainer}>
          <Text style={styles.badgesTitle}>Achievements</Text>
          <View style={styles.badges}>
            {user.badges.slice(0, 3).map((badge, index) => (
              <View key={index} style={styles.badge}>
                <MaterialIcons name="emoji-events" size={12} color={colors.warning} />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  smallCard: {
    padding: 12,
    marginBottom: 8,
  },
  mediumCard: {
    padding: 16,
    marginBottom: 12,
  },
  largeCard: {
    padding: 24,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.white,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 2,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  followingButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  followingButtonText: {
    color: colors.white,
  },
  userInfo: {
    marginBottom: 16,
  },
  nameContainer: {
    marginBottom: 8,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  smallDisplayName: {
    fontSize: 16,
  },
  username: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  smallUsername: {
    fontSize: 12,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  specializations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  specializationTag: {
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  specializationText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  moreSpecializations: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  badgesContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  badgesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default UserProfileCard;