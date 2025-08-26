import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { searchSkills, getSkillCategories } from '../api/social';
import SharedSkillCard from '../components/SharedSkillCard';
import { likeSharedSkill, downloadSkillFromSocial } from '../api/social';

const { width } = Dimensions.get('window');

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const searchInputRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  useEffect(() => {
    loadCategories();
    loadRecentSearches();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const delayedSearch = setTimeout(() => {
        performSearch();
      }, 500); // Debounce search
      
      return () => clearTimeout(delayedSearch);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const loadCategories = async () => {
    try {
      const response = await getSkillCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadRecentSearches = () => {
    // In a real app, this would load from AsyncStorage
    setRecentSearches(['React Native', 'JavaScript', 'UI Design', 'Python']);
  };

  const performSearch = async () => {
    if (!searchQuery.trim() && !selectedCategory && !selectedDifficulty) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await searchSkills({
        search: searchQuery.trim(),
        category: selectedCategory,
        difficulty: selectedDifficulty,
      });
      
      setSearchResults(response.skills || []);
      
      // Add to recent searches if there's a query
      if (searchQuery.trim()) {
        addToRecentSearches(searchQuery.trim());
      }
    } catch (error) {
      console.error('Error searching skills:', error);
      Alert.alert('Error', 'Failed to search skills');
    } finally {
      setLoading(false);
    }
  };

  const addToRecentSearches = (query) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item !== query);
      return [query, ...filtered].slice(0, 5); // Keep only 5 recent searches
    });
  };

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedDifficulty('');
  };

  const handleSkillPress = (skill) => {
    const skillId = skill?._id || skill?.skill_id || skill?.id;
    if (skillId) {
      navigation.navigate('SharedSkillDetail', { skillId });
    } else {
      Alert.alert('Error', 'Unable to open skill details');
    }
  };

  const handleLike = async (skillId) => {
    try {
      await likeSharedSkill(skillId);
      // Update the skill in results
      setSearchResults(prev => 
        prev.map(skill => 
          skill._id === skillId 
            ? { 
                ...skill, 
                user_has_liked: !skill.user_has_liked,
                likes_count: skill.user_has_liked ? skill.likes_count - 1 : skill.likes_count + 1
              }
            : skill
        )
      );
    } catch (error) {
      console.error('Error liking skill:', error);
    }
  };

  const handleDownload = async (skillId) => {
    try {
      await downloadSkillFromSocial(skillId);
      // Update the skill in results
      setSearchResults(prev => 
        prev.map(skill => 
          skill._id === skillId 
            ? { ...skill, user_has_downloaded: true, downloads_count: skill.downloads_count + 1 }
            : skill
        )
      );
    } catch (error) {
      console.error('Error downloading skill:', error);
    }
  };

  const renderSkillItem = ({ item }) => (
    <SharedSkillCard
      skill={item}
      onPress={handleSkillPress}
      onLike={handleLike}
      onDownload={handleDownload}
      onComment={handleSkillPress}
      onShare={() => console.log('Share:', item)}
    />
  );

  const renderRecentSearch = ({ item }) => (
    <TouchableOpacity
      style={styles.recentSearchItem}
      onPress={() => setSearchQuery(item)}
    >
      <MaterialIcons name="history" size={20} color={colors.textTertiary} />
      <Text style={styles.recentSearchText}>{item}</Text>
      <MaterialIcons name="north-west" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const renderCategoryFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedCategory === item.name && styles.selectedFilterChip
      ]}
      onPress={() => setSelectedCategory(selectedCategory === item.name ? '' : item.name)}
    >
      <Text style={[
        styles.filterChipText,
        selectedCategory === item.name && styles.selectedFilterChipText
      ]}>
        {item.name}
      </Text>
      {item.count > 0 && (
        <Text style={[
          styles.filterChipCount,
          selectedCategory === item.name && styles.selectedFilterChipCount
        ]}>
          {item.count}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderDifficultyFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedDifficulty === item && styles.selectedFilterChip
      ]}
      onPress={() => setSelectedDifficulty(selectedDifficulty === item ? '' : item)}
    >
      <Text style={[
        styles.filterChipText,
        selectedDifficulty === item && styles.selectedFilterChipText
      ]}>
        {item.charAt(0).toUpperCase() + item.slice(1)}
      </Text>
    </TouchableOpacity>
  );

  const hasActiveFilters = selectedCategory || selectedDifficulty;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search skills, topics, or creators..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={performSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.filterButton, hasActiveFilters && styles.activeFilterButton]}
          onPress={toggleFilters}
        >
          <MaterialIcons 
            name="tune" 
            size={20} 
            color={hasActiveFilters ? colors.white : colors.textSecondary} 
          />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      <Animated.View style={[
        styles.filtersPanel,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-200, 0],
            })
          }],
          opacity: slideAnim,
        }
      ]}>
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Categories</Text>
            {selectedCategory && (
              <TouchableOpacity onPress={() => setSelectedCategory('')}>
                <Text style={styles.clearFilter}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategoryFilter}
            keyExtractor={(item) => item.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterList}
          />
        </View>

        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Difficulty</Text>
            {selectedDifficulty && (
              <TouchableOpacity onPress={() => setSelectedDifficulty('')}>
                <Text style={styles.clearFilter}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={difficulties}
            renderItem={renderDifficultyFilter}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterList}
          />
        </View>

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearAllFilters} onPress={clearFilters}>
            <Text style={styles.clearAllFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        {!searchQuery && !hasActiveFilters ? (
          // Recent searches and suggestions
          <View style={styles.suggestions}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <FlatList
              data={recentSearches}
              renderItem={renderRecentSearch}
              keyExtractor={(item) => item}
              style={styles.recentSearchesList}
            />
            
            <Text style={styles.sectionTitle}>Popular Categories</Text>
            <FlatList
              data={categories.slice(0, 6)}
              renderItem={renderCategoryFilter}
              keyExtractor={(item) => item.name}
              numColumns={2}
              style={styles.categoriesGrid}
            />
          </View>
        ) : loading ? (
          // Loading state
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching skills...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          // Search results
          <FlatList
            data={searchResults}
            renderItem={renderSkillItem}
            keyExtractor={(item) => item._id || item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
          />
        ) : (
          // No results
          <View style={styles.noResults}>
            <MaterialIcons name="search-off" size={64} color={colors.textTertiary} />
            <Text style={styles.noResultsTitle}>No Skills Found</Text>
            <Text style={styles.noResultsText}>
              Try adjusting your search terms or filters to find what you're looking for.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight + 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  filtersPanel: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clearFilter: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  filterList: {
    flexGrow: 0,
  },
  filterChip: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedFilterChip: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  selectedFilterChipText: {
    color: colors.white,
    fontWeight: '600',
  },
  filterChipCount: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 6,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedFilterChipCount: {
    color: colors.primary,
    backgroundColor: colors.white,
  },
  clearAllFilters: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.error,
    borderRadius: 20,
  },
  clearAllFiltersText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  suggestions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  recentSearchesList: {
    marginBottom: 24,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    marginBottom: 8,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  categoriesGrid: {
    flexGrow: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  resultsList: {
    paddingBottom: 20,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default SearchScreen;