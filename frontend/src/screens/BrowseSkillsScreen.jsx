import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../constants/colors';
import SearchBar from '../components/SearchBar';
import SearchFilters from '../components/SearchFilters';
import SharedSkillCard from '../components/SharedSkillCard';
import TrendingSkills from '../components/TrendingSkills';
import CategorySelector from '../components/CategorySelector';
import { 
  searchSkills, 
  getTrendingSkills, 
  getSkillCategories, 
  likeSkill, 
  downloadSkill,
  generateSampleSkills,
  generateSampleTrendingSkills 
} from '../api/social';

const BrowseSkillsScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [skills, setSkills] = useState([]);
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('discover'); // discover, trending, categories

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSkills(true),
        fetchTrendingSkills(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const params = {
        page: currentPage,
        limit: 20,
        q: searchQuery,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
      };

      const data = await searchSkills(params);
      let newSkills = data.skills || [];
      
      // If no skills from API, use sample data for demonstration
      if (newSkills.length === 0 && currentPage === 1) {
        newSkills = generateSampleSkills(20);
        console.log('Using sample data for demonstration');
      }
      
      if (reset) {
        setSkills(newSkills);
        setPage(2);
      } else {
        setSkills(prev => [...prev, ...newSkills]);
        setPage(currentPage + 1);
      }
      
      setHasMore(newSkills.length === 20);
    } catch (error) {
      console.error('Error fetching skills:', error);
      // Fallback to sample data
      if (reset) {
        setSkills(generateSampleSkills(20));
        setPage(2);
      }
    }
  };

  const fetchTrendingSkills = async () => {
    try {
      const data = await getTrendingSkills(10);
      let trending = data.skills || [];
      
      // If no trending skills from API, use sample data
      if (trending.length === 0) {
        trending = generateSampleTrendingSkills(10);
        console.log('Using sample trending data for demonstration');
      }
      
      setTrendingSkills(trending);
    } catch (error) {
      console.error('Error fetching trending skills:', error);
      // Fallback to sample data
      setTrendingSkills(generateSampleTrendingSkills(10));
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getSkillCategories();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback categories
      setCategories([
        'Technology', 'Business', 'Creative', 'Health', 'Language',
        'Music', 'Sports', 'Cooking', 'Education', 'Personal Development'
      ]);
    }
  };

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setPage(1);
    fetchSkills(true);
  }, [selectedCategory, selectedDifficulty]);

  const handleFilterChange = useCallback((category, difficulty) => {
    setSelectedCategory(category);
    setSelectedDifficulty(difficulty);
    setPage(1);
    fetchSkills(true);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadInitialData();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      fetchSkills(false).finally(() => setIsLoadingMore(false));
    }
  };

  const handleSkillPress = (skill) => {
    // Navigate to shared skill detail screen
    navigation.navigate('SharedSkillDetail', { skillId: skill._id });
  };

  const handleDownloadSkill = async (skillId) => {
    try {
      await downloadSkill(skillId);
      // Show success message or update UI
      console.log('Skill downloaded successfully');
      // In a real app, you'd show a toast or success message
    } catch (error) {
      console.error('Error downloading skill:', error);
      // In a real app, you'd show an error message
    }
  };

  const handleLikeSkill = async (skillId, isLiked) => {
    try {
      await likeSkill(skillId);
      console.log(`Skill ${isLiked ? 'liked' : 'unliked'} successfully`);
      // Update the skill in the list
      setSkills(prevSkills => 
        prevSkills.map(skill => 
          skill._id === skillId 
            ? { 
                ...skill, 
                user_has_liked: isLiked,
                likes_count: isLiked ? skill.likes_count + 1 : skill.likes_count - 1
              }
            : skill
        )
      );
    } catch (error) {
      console.error('Error liking skill:', error);
      throw error; // Re-throw so the component can handle the error
    }
  };

  const renderSkillItem = ({ item }) => (
    <SharedSkillCard
      skill={item}
      onPress={() => handleSkillPress(item)}
      onDownload={() => handleDownloadSkill(item._id)}
      onLike={(skillId, isLiked) => handleLikeSkill(skillId, isLiked)}
    />
  );

  const renderListFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading more skills...</Text>
        </View>
      );
    }
    if (!hasMore && skills.length > 0) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>You've seen all skills!</Text>
        </View>
      );
    }
    return null;
  };

  const renderDiscoverTab = () => (
    <View style={styles.discoverContainer}>
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onSearch={handleSearch}
          placeholder="Search skills..."
        />
        <SearchFilters
          categories={categories}
          selectedCategory={selectedCategory}
          selectedDifficulty={selectedDifficulty}
          onFilterChange={handleFilterChange}
        />
      </View>
      
      <FlatList
        data={skills}
        renderItem={renderSkillItem}
        keyExtractor={(item) => item._id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderListFooter}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.skillsList}
      />
    </View>
  );

  const renderTrendingTab = () => (
    <ScrollView
      style={styles.trendingContainer}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {trendingSkills.length === 0 && !loading ? (
        <View style={styles.emptyStateContainer}>
          <MaterialIcons name="trending-up" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>No Trending Skills</Text>
          <Text style={styles.emptyStateText}>
            Check back later for trending content!
          </Text>
        </View>
      ) : (
        <TrendingSkills
          skills={trendingSkills}
          onSkillPress={handleSkillPress}
          onDownload={handleDownloadSkill}
        />
      )}
    </ScrollView>
  );

  const renderCategoriesTab = () => (
    <ScrollView
      style={styles.categoriesContainer}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <CategorySelector
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={(category) => {
          setSelectedCategory(category);
          setActiveTab('discover');
          fetchSkills(true);
        }}
      />
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading skills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Discover Skills</Text>
            <Text style={styles.headerSubtitle}>
              Learn from the community, share your knowledge
            </Text>
          </View>
        </View>
        
        {/* Modern Tab Navigation */}
        <View style={styles.modernTabContainer}>
          <TouchableOpacity
            style={[
              styles.modernTab, 
              activeTab === 'discover' && styles.modernActiveTab
            ]}
            onPress={() => setActiveTab('discover')}
          >
            <View style={[
              styles.modernTabIcon,
              activeTab === 'discover' && styles.modernActiveTabIcon
            ]}>
              <MaterialIcons 
                name="search" 
                size={18} 
                color={activeTab === 'discover' ? colors.white : colors.gray500} 
              />
            </View>
            <Text style={[
              styles.modernTabText, 
              activeTab === 'discover' && styles.modernActiveTabText
            ]}>
              Discover
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab, 
              activeTab === 'trending' && styles.modernActiveTab
            ]}
            onPress={() => setActiveTab('trending')}
          >
            <View style={[
              styles.modernTabIcon,
              activeTab === 'trending' && styles.modernActiveTabIcon
            ]}>
              <MaterialIcons 
                name="trending-up" 
                size={18} 
                color={activeTab === 'trending' ? colors.white : colors.gray500} 
              />
            </View>
            <Text style={[
              styles.modernTabText, 
              activeTab === 'trending' && styles.modernActiveTabText
            ]}>
              Trending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab, 
              activeTab === 'categories' && styles.modernActiveTab
            ]}
            onPress={() => setActiveTab('categories')}
          >
            <View style={[
              styles.modernTabIcon,
              activeTab === 'categories' && styles.modernActiveTabIcon
            ]}>
              <MaterialIcons 
                name="apps" 
                size={18} 
                color={activeTab === 'categories' ? colors.white : colors.gray500} 
              />
            </View>
            <Text style={[
              styles.modernTabText, 
              activeTab === 'categories' && styles.modernActiveTabText
            ]}>
              Categories
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'discover' && renderDiscoverTab()}
        {activeTab === 'trending' && renderTrendingTab()}
        {activeTab === 'categories' && renderCategoriesTab()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  headerSection: {
    backgroundColor: colors.white,
    paddingTop: 60,
    paddingBottom: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  modernTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginTop: 20,
  },
  modernTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modernActiveTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernTabIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginRight: 8,
  },
  modernActiveTabIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modernTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modernActiveTabText: {
    color: colors.white,
  },
  contentContainer: {
    flex: 1,
  },
  discoverContainer: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  searchSection: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  skillsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  trendingContainer: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  categoriesContainer: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
    marginTop: 16,
    marginHorizontal: 20,
    letterSpacing: -0.5,
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
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default BrowseSkillsScreen;