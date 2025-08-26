import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth * 0.8;

const TrendingSkills = ({ skills = [], onSkillPress, onDownload }) => {
  const flatListRef = useRef(null);

  const renderTrendingCard = ({ item, index }) => {
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

    const getGradientColors = (index) => {
      const gradients = [
        ['#8B5CF6', '#7C3AED'], // Purple
        ['#06B6D4', '#0891B2'], // Cyan
        ['#10B981', '#059669'], // Emerald
        ['#F59E0B', '#D97706'], // Amber
        ['#EF4444', '#DC2626'], // Red
      ];
      return gradients[index % gradients.length];
    };

    return (
      <TouchableOpacity
        style={styles.trendingCard}
        onPress={() => onSkillPress && onSkillPress(item)}
        activeOpacity={0.9}
      >
        <View 
          style={[
            styles.trendingCardHeader,
            { backgroundColor: getGradientColors(index)[0] }
          ]}
        >
          <View style={styles.trendingBadge}>
            <MaterialIcons name="trending-up" size={16} color={colors.white} />
            <Text style={styles.trendingText}>#{index + 1} Trending</Text>
          </View>
          
          <View style={styles.trendingStats}>
            <View style={styles.trendingStat}>
              <MaterialIcons name="favorite" size={14} color={colors.white} />
              <Text style={styles.trendingStatText}>
                {formatCount(item.likes_count)}
              </Text>
            </View>
            <View style={styles.trendingStat}>
              <MaterialIcons name="download" size={14} color={colors.white} />
              <Text style={styles.trendingStatText}>
                {formatCount(item.downloads_count)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.trendingCardContent}>
          <View style={styles.trendingCardBody}>
            <Text style={styles.trendingTitle} numberOfLines={2}>
              {item.title || 'Untitled Skill'}
            </Text>
            
            {item.description && (
              <Text style={styles.trendingDescription} numberOfLines={3}>
                {item.description}
              </Text>
            )}

            <View style={styles.trendingMeta}>
              <View style={styles.trendingUser}>
                <View style={styles.trendingAvatar}>
                  <Text style={styles.trendingAvatarText}>
                    {item.shared_by_username?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <Text style={styles.trendingUsername}>
                  {item.shared_by_username || 'Anonymous'}
                </Text>
              </View>

              <View style={[
                styles.trendingDifficulty,
                { backgroundColor: getDifficultyColor(item.difficulty) }
              ]}>
                <Text style={styles.trendingDifficultyText}>
                  {item.difficulty || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.trendingCardFooter}>
            {item.category && (
              <View style={styles.trendingCategory}>
                <MaterialIcons name="category" size={14} color={colors.primary} />
                <Text style={styles.trendingCategoryText}>{item.category}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.trendingDownloadButton}
              onPress={() => onDownload && onDownload(item._id)}
            >
              <MaterialIcons name="add" size={18} color={colors.white} />
              <Text style={styles.trendingDownloadText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="trending-up" size={48} color={colors.gray400} />
      <Text style={styles.emptyStateTitle}>No Trending Skills</Text>
      <Text style={styles.emptyStateText}>
        Check back later for trending content!
      </Text>
    </View>
  );

  if (!skills || skills.length === 0) {
    return renderEmptyState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={skills}
        renderItem={renderTrendingCard}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 16}
        decelerationRate="fast"
        contentContainerStyle={styles.trendingList}
        ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
      />
      
      {skills.length > 1 && (
        <View style={styles.pagination}>
          {skills.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={styles.paginationDot}
              onPress={() => {
                flatListRef.current?.scrollToIndex({
                  index,
                  animated: true,
                });
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  trendingList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  trendingCard: {
    width: cardWidth,
    backgroundColor: colors.white,
    borderRadius: 24,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  trendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trendingText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trendingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  trendingStatText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  trendingCardContent: {
    flex: 1,
  },
  trendingCardBody: {
    padding: 20,
    flex: 1,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  trendingDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 18,
  },
  trendingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendingUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trendingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  trendingAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  trendingUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  trendingDifficulty: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  trendingDifficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    backgroundColor: colors.surfaceSecondary,
  },
  trendingCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    flex: 1,
    marginRight: 12,
  },
  trendingCategoryText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  trendingDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  trendingDownloadText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: colors.white,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: colors.white,
    marginHorizontal: 20,
    borderRadius: 24,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
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

export default TrendingSkills;