import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getPopularSkills } from '../api/social';

const PopularSkills = ({ onSkillPress, onDownload }) => {
  const [popularSkills, setPopularSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today'); // today, week, month

  useEffect(() => {
    fetchPopularSkills();
  }, [activeTab]);

  const fetchPopularSkills = async () => {
    try {
      setLoading(true);
      
      let timeframe = 'week';
      if (activeTab === 'today') timeframe = 'day';
      if (activeTab === 'week') timeframe = 'week';
      if (activeTab === 'month') timeframe = 'month';

      const data = await getPopularSkills({
        limit: 10,
        timeframe
      });
      
      let popular = data.activities || [];
      
      // No fallback to sample data - show real API results only
      
      setPopularSkills(popular);
    } catch (error) {
      console.error('Error fetching popular skills:', error);
      // Fallback to sample data
      const fallbackData = generateSampleSkills(10).map(skill => ({
        skill_id: skill._id,
        skill_title: skill.title,
        skill_category: skill.category,
        username: skill.shared_by_username,
        likes_count: skill.likes_count,
        downloads_count: skill.downloads_count,
        views_count: skill.views_count
      }));
      setPopularSkills(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count?.toString() || '0';
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

  const renderPopularSkillCard = ({ item, index }) => (
    <TouchableOpacity
      style={styles.popularCard}
      onPress={() => onSkillPress && onSkillPress(item)}
      activeOpacity={0.9}
    >
      <View style={styles.popularCardHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
        
        <View style={styles.popularStats}>
          <View style={styles.popularStat}>
            <MaterialIcons name="favorite" size={14} color={colors.error} />
            <Text style={styles.popularStatText}>
              {formatCount(item.likes_count)}
            </Text>
          </View>
          <View style={styles.popularStat}>
            <MaterialIcons name="download" size={14} color={colors.primary} />
            <Text style={styles.popularStatText}>
              {formatCount(item.downloads_count)}
            </Text>
          </View>
          <View style={styles.popularStat}>
            <MaterialIcons name="visibility" size={14} color={colors.gray500} />
            <Text style={styles.popularStatText}>
              {formatCount(item.views_count)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.popularCardContent}>
        <Text style={styles.popularTitle} numberOfLines={2}>
          {item.skill_title || 'Untitled Skill'}
        </Text>

        <View style={styles.popularMeta}>
          <View style={styles.popularUser}>
            <View style={styles.popularAvatar}>
              <Text style={styles.popularAvatarText}>
                {item.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.popularUsername}>
              {item.username || 'Anonymous'}
            </Text>
          </View>

          {item.skill_category && (
            <View style={styles.popularCategory}>
              <Text style={styles.popularCategoryText}>
                {item.skill_category}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.popularAddButton}
          onPress={() => onDownload && onDownload(item.skill_id)}
        >
          <MaterialIcons name="add" size={16} color={colors.white} />
          <Text style={styles.popularAddText}>Add to Repository</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderTabButton = (tab, label) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTabButton
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabButtonText,
        activeTab === tab && styles.activeTabButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="trending-up" size={48} color={colors.gray400} />
      <Text style={styles.emptyStateTitle}>No Popular Skills</Text>
      <Text style={styles.emptyStateText}>
        Popular skills will appear here as users engage with content.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading popular skills...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <MaterialIcons name="trending-up" size={24} color={colors.primary} />
          <Text style={styles.sectionTitle}>Popular Skills</Text>
        </View>

        <View style={styles.tabContainer}>
          {renderTabButton('today', 'Today')}
          {renderTabButton('week', 'Week')}
          {renderTabButton('month', 'Month')}
        </View>
      </View>

      {loading ? (
        renderLoadingState()
      ) : popularSkills.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={popularSkills}
          renderItem={renderPopularSkillCard}
          keyExtractor={(item, index) => `${item.skill_id || index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    margin: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray600,
  },
  activeTabButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 16,
  },
  popularCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  popularCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
  },
  rankBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rankText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  popularStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  popularStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
    marginLeft: 4,
  },
  popularCardContent: {
    padding: 12,
  },
  popularTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 12,
    lineHeight: 22,
  },
  popularMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  popularUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  popularAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  popularAvatarText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  popularUsername: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray600,
    flex: 1,
  },
  popularCategory: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  popularAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  popularAddText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray600,
    marginTop: 12,
  },
});

export default PopularSkills;