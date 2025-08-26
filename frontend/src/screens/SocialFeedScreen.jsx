import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { useFocusEffect } from '@react-navigation/native';

// Components
import SharedSkillCard from '../components/SharedSkillCard';
import UserProfileCard from '../components/UserProfileCard';
import SocialFeed from '../components/SocialFeed';

// API
import { 
  getSocialFeed, 
  getTrendingSkills, 
  getDiscoverFeed,
  likeSharedSkill,
  downloadSkillFromSocial,
} from '../api/social';

const { width, height } = Dimensions.get('window');

const SocialFeedScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('feed'); // feed, discover, trending
  const [feedData, setFeedData] = useState([]);
  const [discoverData, setDiscoverData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);

  // Initialize data on screen focus
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
      StatusBar.setBarStyle('dark-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(colors.white, true);
      }
    }, [])
  );

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadFeedData(true);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeedData = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      let data;

      switch (activeTab) {
        case 'feed':
          data = await getSocialFeed(currentPage, 10);
          break;
        case 'discover':
          data = await getDiscoverFeed(currentPage, 10);
          break;
        case 'trending':
          data = await getTrendingSkills(10);
          break;
        default:
          data = await getSocialFeed(currentPage, 10);
      }

      const newItems = data.activities || data.skills || [];
      
      if (reset) {
        switch (activeTab) {
          case 'feed':
            setFeedData(newItems);
            break;
          case 'discover':
            setDiscoverData(newItems);
            break;
          case 'trending':
            setTrendingData(newItems);
            break;
        }
        setPage(2);
      } else {
        switch (activeTab) {
          case 'feed':
            setFeedData(prev => [...prev, ...newItems]);
            break;
          case 'discover':
            setDiscoverData(prev => [...prev, ...newItems]);
            break;
          case 'trending':
            setTrendingData(prev => [...prev, ...newItems]);
            break;
        }
        setPage(currentPage + 1);
      }

      setHasMore(data.has_more !== false && newItems.length === 10);
    } catch (error) {
      console.error('Error loading feed data:', error);
    }
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) {
      // Scroll to top if same tab is pressed
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      return;
    }

    setActiveTab(tab);
    setPage(1);
    setHasMore(true);
    
    // Load data for new tab if not already loaded
    const currentData = getCurrentData(tab);
    if (currentData.length === 0) {
      loadFeedData(true);
    }
  };

  const getCurrentData = (tab = activeTab) => {
    switch (tab) {
      case 'feed': return feedData;
      case 'discover': return discoverData;
      case 'trending': return trendingData;
      default: return feedData;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeedData(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadFeedData(false).finally(() => setLoadingMore(false));
    }
  };

  const handleLikeSkill = async (skillId, liked) => {
    try {
      await likeSharedSkill(skillId);
    } catch (error) {
      console.error('Error liking skill:', error);
    }
  };

  const handleDownloadSkill = async (skillId) => {
    try {
      const result = await downloadSkillFromSocial(skillId);
      if (result.success) {
        // Refresh the current tab to update download status
        await loadFeedData(true);
      }
      return result;
    } catch (error) {
      console.error('Error downloading skill:', error);
      throw error;
    }
  };

  const handleSkillPress = (skill) => {
    const skillId = skill?._id || skill?.skill_id || skill?.id;
    if (skillId) {
      navigation.navigate('SharedSkillDetail', { skillId });
    } else {
      console.error('No valid skill ID found:', skill);
      Alert.alert('Error', 'Unable to open skill details. Invalid skill data.');
    }
  };

  const handleUserPress = (user) => {
    navigation.navigate('UserProfile', { userId: user._id });
  };

  const handleCommentPress = (skill) => {
    const skillId = skill?._id || skill?.skill_id || skill?.id;
    if (skillId) {
      navigation.navigate('SharedSkillDetail', { 
        skillId,
        focusComments: true 
      });
    } else {
      console.error('No valid skill ID found for comments:', skill);
      Alert.alert('Error', 'Unable to open skill comments. Invalid skill data.');
    }
  };

  const handleSharePress = (skill) => {
    // Implement share functionality
    console.log('Share skill:', skill);
  };

  const handleCreatePress = () => {
    navigation.navigate('ShareSkill');
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const handleNotificationsPress = () => {
    // Navigate to notifications screen
    console.log('Notifications pressed');
  };

  // Header animation based on scroll
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const opacity = Math.max(0, Math.min(1, 1 - value / 100));
      headerOpacity.setValue(opacity);
    });

    return () => scrollY.removeListener(listener);
  }, []);

  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <View style={styles.headerTop}>
        <View style={styles.logoSection}>
          <MaterialIcons name="school" size={28} color={colors.primary} />
          <Text style={styles.logoText}>SkillShare</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleSearchPress}>
            <MaterialIcons name="search" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleNotificationsPress}>
            <MaterialIcons name="notifications-none" size={24} color={colors.text} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'feed', label: 'Following', icon: 'people' },
          { key: 'discover', label: 'Discover', icon: 'explore' },
          { key: 'trending', label: 'Trending', icon: 'trending-up' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => handleTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={tab.icon} 
              size={20} 
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
    </Animated.View>
  );

  const renderSuggestionsHeader = () => {
    // No suggestions for now - clean social feed
    return null;
  };

  const renderSkillPost = ({ item, index }) => {
    const skill = item.skill || item;
    
    return (
      <SharedSkillCard
        skill={skill}
        onPress={handleSkillPress}
        onLike={handleLikeSkill}
        onDownload={handleDownloadSkill}
        onUserPress={handleUserPress}
        onComment={handleCommentPress}
        onShare={handleSharePress}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons 
        name="psychology"
        size={64} 
        color={colors.textTertiary} 
      />
      <Text style={styles.emptyStateTitle}>No Skills Shared Yet</Text>
      <Text style={styles.emptyStateText}>
        Be the first to share a skill from your repository with the community!
      </Text>
      <TouchableOpacity style={styles.discoverButton} onPress={handleCreatePress}>
        <MaterialIcons name="add" size={20} color={colors.white} />
        <Text style={styles.discoverButtonText}>Share a Skill</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  const currentData = getCurrentData();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {renderHeader()}
      
      <FlatList
        ref={flatListRef}
        data={currentData}
        renderItem={renderSkillPost}
        keyExtractor={(item, index) => `${activeTab}-${item._id || item.skill_id || index}`}
        ListHeaderComponent={renderSuggestionsHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderLoadingFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.feedContent,
          currentData.length === 0 && styles.emptyContent
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreatePress}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    zIndex: 1000,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.like,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    // Active tab styles handled by indicator
  },
  tabText: {
    fontSize: 15,
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
  feedContent: {
    paddingBottom: 100, // Account for FAB
  },
  emptyContent: {
    flexGrow: 1,
  },
  suggestionsContainer: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 16,
    marginBottom: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  suggestionsList: {
    paddingLeft: 16,
  },
  suggestionCard: {
    marginRight: 12,
    width: 140,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  discoverButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default SocialFeedScreen;