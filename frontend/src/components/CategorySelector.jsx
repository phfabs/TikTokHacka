import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 48) / 2; // 2 columns with margins

const CategorySelector = ({ 
  categories = [], 
  selectedCategory = 'all',
  onCategorySelect,
  showSkillCounts = false 
}) => {
  
  const getCategoryIcon = (category) => {
    const iconMap = {
      'Technology': 'computer',
      'Business': 'business',
      'Creative': 'palette',
      'Health': 'fitness-center',
      'Language': 'translate',
      'Music': 'music-note',
      'Sports': 'sports-soccer',
      'Cooking': 'restaurant',
      'Education': 'school',
      'Personal Development': 'psychology',
      'Science': 'science',
      'Art': 'brush',
      'Photography': 'photo-camera',
      'Writing': 'create',
      'Marketing': 'campaign',
      'Finance': 'account-balance',
      'Fitness': 'directions-run',
      'Design': 'design-services',
      'Programming': 'code',
      'Data Science': 'analytics',
    };
    
    return iconMap[category] || 'category';
  };

  const getCategoryColor = (category, index) => {
    const colors_list = [
      colors.primary,
      '#06B6D4', // Cyan
      '#10B981', // Emerald
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#84CC16', // Lime
      '#F97316', // Orange
      '#6366F1', // Indigo
    ];
    
    return colors_list[index % colors_list.length];
  };

  const renderCategoryCard = (category, index) => {
    const isSelected = selectedCategory === category;
    const categoryColor = getCategoryColor(category, index);
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryCard,
          isSelected && styles.selectedCategoryCard,
          isSelected && { borderColor: categoryColor }
        ]}
        onPress={() => onCategorySelect && onCategorySelect(category)}
        activeOpacity={0.8}
      >
        <View style={[
          styles.categoryIconContainer,
          { backgroundColor: isSelected ? categoryColor : `${categoryColor}20` }
        ]}>
          <MaterialIcons 
            name={getCategoryIcon(category)} 
            size={32} 
            color={isSelected ? colors.white : categoryColor}
          />
        </View>
        
        <Text style={[
          styles.categoryTitle,
          isSelected && styles.selectedCategoryTitle
        ]} numberOfLines={2}>
          {category}
        </Text>
        
        {showSkillCounts && (
          <Text style={styles.categoryCount}>
            {Math.floor(Math.random() * 50) + 5} skills
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderAllCategoriesCard = () => {
    const isSelected = selectedCategory === 'all';
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          styles.allCategoriesCard,
          isSelected && styles.selectedCategoryCard,
          isSelected && { borderColor: colors.primary }
        ]}
        onPress={() => onCategorySelect && onCategorySelect('all')}
        activeOpacity={0.8}
      >
        <View style={[
          styles.categoryIconContainer,
          styles.allCategoriesIconContainer,
          { backgroundColor: isSelected ? colors.primary : `${colors.primary}20` }
        ]}>
          <MaterialIcons 
            name="apps" 
            size={32} 
            color={isSelected ? colors.white : colors.primary}
          />
        </View>
        
        <Text style={[
          styles.categoryTitle,
          isSelected && styles.selectedCategoryTitle
        ]}>
          All Categories
        </Text>
        
        {showSkillCounts && (
          <Text style={styles.categoryCount}>
            {categories.length * Math.floor(Math.random() * 20) + 100} skills
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (!categories || categories.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="category" size={48} color={colors.gray400} />
        <Text style={styles.emptyStateTitle}>No Categories Available</Text>
        <Text style={styles.emptyStateText}>
          Categories will appear here once skills are added.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        {renderAllCategoriesCard()}
        {categories.map((category, index) => renderCategoryCard(category, index))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: cardWidth,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedCategoryCard: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    transform: [{ scale: 1.02 }],
  },
  allCategoriesCard: {
    borderWidth: 3,
    borderStyle: 'dashed',
  },
  categoryIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  allCategoriesIconContainer: {
    borderRadius: 36,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
    minHeight: 40,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  selectedCategoryTitle: {
    color: colors.primary,
    fontWeight: '800',
  },
  categoryCount: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
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

export default CategorySelector;