import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const SearchFilters = ({ 
  categories = [], 
  selectedCategory = 'all', 
  selectedDifficulty = 'all',
  onFilterChange 
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [tempCategory, setTempCategory] = useState(selectedCategory);
  const [tempDifficulty, setTempDifficulty] = useState(selectedDifficulty);

  const difficulties = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const allCategories = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(cat => ({ value: cat, label: cat }))
  ];

  const handleApplyFilters = () => {
    if (onFilterChange) {
      onFilterChange(tempCategory, tempDifficulty);
    }
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setTempCategory('all');
    setTempDifficulty('all');
    if (onFilterChange) {
      onFilterChange('all', 'all');
    }
    setShowFilters(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedDifficulty !== 'all') count++;
    return count;
  };

  const getFilterSummary = () => {
    const parts = [];
    if (selectedCategory !== 'all') {
      parts.push(selectedCategory);
    }
    if (selectedDifficulty !== 'all') {
      parts.push(selectedDifficulty);
    }
    return parts.length > 0 ? parts.join(' • ') : 'All Skills';
  };

  const renderFilterOption = (options, selectedValue, onSelect, title) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{title}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterOptions}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterOption,
              selectedValue === option.value && styles.selectedFilterOption
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.filterOptionText,
              selectedValue === option.value && styles.selectedFilterOptionText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Modern Filter Controls */}
      <View style={styles.filterControls}>
        <TouchableOpacity 
          style={[
            styles.filterButton,
            getActiveFilterCount() > 0 && styles.filterButtonActive
          ]} 
          onPress={() => setShowFilters(true)}
        >
          <View style={styles.filterIcon}>
            <MaterialIcons name="tune" size={18} color={
              getActiveFilterCount() > 0 ? colors.white : colors.primary
            } />
          </View>
          <Text style={[
            styles.filterButtonText,
            getActiveFilterCount() > 0 && styles.filterButtonTextActive
          ]}>
            Filters
          </Text>
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
            </View>
          )}
        </TouchableOpacity>

        {getActiveFilterCount() > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleResetFilters}
          >
            <MaterialIcons name="clear" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filters Summary */}
      {getActiveFilterCount() > 0 && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersLabel}>Active:</Text>
          <Text style={styles.filterSummary}>{getFilterSummary()}</Text>
        </View>
      )}

      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter Skills</Text>
            <TouchableOpacity onPress={handleResetFilters}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {renderFilterOption(
              allCategories,
              tempCategory,
              setTempCategory,
              'Category'
            )}

            {renderFilterOption(
              difficulties,
              tempDifficulty,
              setTempDifficulty,
              'Difficulty Level'
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  filterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  filterIcon: {
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterBadge: {
    marginLeft: 10,
    backgroundColor: colors.white,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  clearButton: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryUltraLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  activeFiltersLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 8,
  },
  filterSummary: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '500',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    backgroundColor: colors.white,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  modalContent: {
    flex: 1,
    paddingVertical: 24,
  },
  filterSection: {
    marginBottom: 32,
    backgroundColor: colors.white,
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 20,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    paddingHorizontal: 20,
    letterSpacing: -0.2,
  },
  filterOptions: {
    paddingHorizontal: 16,
  },
  filterOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginRight: 12,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedFilterOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectedFilterOptionText: {
    color: colors.white,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

export default SearchFilters;