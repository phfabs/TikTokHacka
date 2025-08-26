import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';

// Components
import SharedSkillCard from '../components/SharedSkillCard';
import UserProfileCard from '../components/UserProfileCard';

// API
import {
  getUserProfile,
  getMySharedSkills,
  getFollowers,
  getFollowing,
  getUserActivity,
  followUser,
  unfollowUser,
} from '../api/social';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = 280;
const PROFILE_IMAGE_SIZE = 88;

const EnhancedProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params || {};
  const isOwnProfile = !userId; // If no userId provided, it's current user's profile

  const [activeTab, setActiveTab] = useState('skills'); // skills, followers, following, activity
  const [profile, setProfile] = useState(null);
  const [mySkills, setMySkills] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  // Header animation
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const opacity = Math.min(value / 100, 1);
      headerOpacity.setValue(opacity);
    });

    return () => scrollY.removeListener(listener);
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const profileData = await getUserProfile(userId);
      setProfile(profileData.profile || profileData.user);
      setIsFollowing(profileData.profile?.is_following || false);
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    try {
      switch (tab) {
        case 'skills':
          if (isOwnProfile) {
            const skillsData = await getMySharedSkills();
            setMySkills(skillsData.skills || []);
          } else {
            // Load user's public skills
            const skillsData = await getMySharedSkills(userId);
            setMySkills(skillsData.skills || []);
          }
          break;
        
        case 'followers':
          const followersData = await getFollowers(userId);
          setFollowers(followersData.followers || []);
          break;
        
        case 'following':
          const followingData = await getFollowing(userId);
          setFollowing(followingData.following || []);
          break;
        
        case 'activity':
          const activityData = await getUserActivity(userId);
          setActivity(activityData.activities || []);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tab} data:`, error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProfileData(),
      loadTabData(activeTab)
    ]);
    setRefreshing(false);
  };

  const handleFollowToggle = async () => {
    if (followLoading) return;

    try {
      setFollowLoading(true);
      
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
        setProfile(prev => ({
          ...prev,
          followers_count: (prev.followers_count || 0) - 1
        }));
      } else {
        await followUser(userId);
        setIsFollowing(true);
        setProfile(prev => ({
          ...prev,
          followers_count: (prev.followers_count || 0) + 1
        }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSkillPress = (skill) => {
    navigation.navigate('SharedSkillDetail', { skillId: skill._id });
  };

  const handleUserPress = (user) => {
    navigation.navigate('UserProfile', { userId: user._id });
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen
    navigation.navigate('EditProfile');
  };

  const handleShareProfile = () => {
    // Implement share profile functionality
    console.log('Share profile');
  };

  const handleCreateSkill = () => {
    navigation.navigate('CreateSharedSkill');
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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[colors.instagram.purple, colors.instagram.pink, colors.instagram.orange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      />

      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {profile?.display_name || profile?.username || 'Profile'}
        </Text>

        <TouchableOpacity style={styles.navButton} onPress={handleShareProfile}>
          <MaterialIcons name="share" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImageWrapper}>
            <View style={styles.profileImage}>
              <Text style={styles.profileImageText}>
                {profile?.display_name?.charAt(0)?.toUpperCase() || 
                 profile?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            {profile?.is_verified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={20} color={colors.primary} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>
            {profile?.display_name || profile?.username || 'Anonymous'}
          </Text>
          <Text style={styles.username}>
            @{profile?.username || 'anonymous'}
          </Text>
          
          {profile?.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {profile?.location && (
            <View style={styles.locationContainer}>
              <MaterialIcons name="location-on" size={16} color={colors.white} />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          )}

          <View style={styles.joinedDate}>
            <MaterialIcons name="calendar-today" size={16} color={colors.white} />
            <Text style={styles.joinedText}>
              Joined {new Date(profile?.created_at || Date.now()).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => setActiveTab('skills')}
          >
            <Text style={styles.statNumber}>
              {formatCount(profile?.skills_count || mySkills.length)}
            </Text>
            <Text style={styles.statLabel}>Skills</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => setActiveTab('followers')}
          >
            <Text style={styles.statNumber}>
              {formatCount(profile?.followers_count || 0)}
            </Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => setActiveTab('following')}
          >
            <Text style={styles.statNumber}>
              {formatCount(profile?.following_count || 0)}
            </Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOwnProfile ? (
            <>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={handleCreateSkill}>
                <MaterialIcons name="add" size={20} color={colors.white} />
                <Text style={styles.createButtonText}>Share Skill</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton
                ]}
                onPress={handleFollowToggle}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? colors.text : colors.white} />
                ) : (
                  <Text style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText
                  ]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton}>
                <MaterialIcons name="message" size={20} color={colors.white} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );

  const renderStickyHeader = () => (
    <Animated.View style={[
      styles.stickyHeader,
      {
        opacity: headerOpacity,
        transform: [{
          translateY: headerOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, 0],
          })
        }]
      }
    ]}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <View style={styles.stickyHeaderInfo}>
        <Text style={styles.stickyHeaderName}>
          {profile?.display_name || profile?.username || 'Profile'}
        </Text>
        <Text style={styles.stickyHeaderStat}>
          {formatCount(profile?.skills_count || mySkills.length)} skills
        </Text>
      </View>

      <TouchableOpacity onPress={handleShareProfile}>
        <MaterialIcons name="share" size={24} color={colors.text} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'skills', label: 'Skills', icon: 'psychology' },
        { key: 'followers', label: 'Followers', icon: 'people' },
        { key: 'following', label: 'Following', icon: 'person-add' },
        { key: 'activity', label: 'Activity', icon: 'timeline' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeTab === tab.key && styles.activeTab
          ]}
          onPress={() => setActiveTab(tab.key)}
        >
          <MaterialIcons 
            name={tab.icon} 
            size={18} 
            color={activeTab === tab.key ? colors.primary : colors.textTertiary} 
          />
          <Text style={[
            styles.tabText,
            activeTab === tab.key && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
          {activeTab === tab.key && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSkillItem = ({ item }) => (
    <SharedSkillCard
      skill={item}
      onPress={handleSkillPress}
      onUserPress={handleUserPress}
    />
  );

  const renderUserItem = ({ item }) => (
    <UserProfileCard
      user={item}
      onPress={() => handleUserPress(item)}
      showFollowButton={!isOwnProfile}
    />
  );

  const renderActivityItem = ({ item }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <MaterialIcons 
          name={item.type === 'skill_shared' ? 'share' : 'favorite'} 
          size={20} 
          color={colors.primary} 
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>
          {item.type === 'skill_shared' ? 'Shared a skill' : 'Liked a skill'}
        </Text>
        <Text style={styles.activityTitle}>{item.skill?.title}</Text>
        <Text style={styles.activityTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderTabContent = () => {
    const getData = () => {
      switch (activeTab) {
        case 'skills': return mySkills;
        case 'followers': return followers;
        case 'following': return following;
        case 'activity': return activity;
        default: return [];
      }
    };

    const data = getData();
    const renderItem = activeTab === 'skills' ? renderSkillItem : 
                      activeTab === 'activity' ? renderActivityItem : renderUserItem;

    return (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${activeTab}-${item._id || index}`}
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name={activeTab === 'skills' ? 'psychology' : 
                    activeTab === 'activity' ? 'timeline' : 'people'} 
              size={48} 
              color={colors.textTertiary} 
            />
            <Text style={styles.emptyStateText}>
              {activeTab === 'skills' && 'No skills shared yet'}
              {activeTab === 'followers' && 'No followers yet'}
              {activeTab === 'following' && 'Not following anyone yet'}
              {activeTab === 'activity' && 'No recent activity'}
            </Text>
          </View>
        )}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {renderStickyHeader()}
      
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressViewOffset={HEADER_HEIGHT}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {renderHeader()}
        {renderTabBar()}
        {renderTabContent()}
      </Animated.ScrollView>
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
    backgroundColor: colors.white,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: HEADER_HEIGHT,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    paddingBottom: 12,
  },
  navButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  profileSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 2,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  joinedDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinedText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  editButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginLeft: 8,
  },
  createButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  followButton: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginRight: 8,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.white,
  },
  followButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  followingButtonText: {
    color: colors.white,
  },
  messageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 24,
    marginLeft: 8,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 88 : 64,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 1000,
  },
  stickyHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  stickyHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  stickyHeaderStat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTertiary,
    marginLeft: 6,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  tabContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryUltraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});

export default EnhancedProfileScreen;