import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getAllPlans, deleteHabit, recordHabitCheckin, updateHabit } from '../api/plans';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { colors } from '../constants/colors';

const MyHabitsScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [completedHabits, setCompletedHabits] = useState(new Set());
  const [editingHabit, setEditingHabit] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, completed, pending

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        console.log('🔄 [MyHabitsScreen] Fetching habits from backend...');
        const data = await getAllPlans(token);
        console.log('📊 [MyHabitsScreen] Backend response:', data);
        
        const fetchedHabits = data.habits || [];
        setHabits(fetchedHabits);
        
        // Update completed habits based on backend data (checked_today field)
        const completedSet = new Set();
        fetchedHabits.forEach(h => {
          if (h.checked_today) {
            completedSet.add(h._id);
          }
        });
        setCompletedHabits(completedSet);
      } catch (err) {
        console.error('Failed to fetch habits', err);
        setError('Failed to load habits');
      } finally {
        setLoading(false);
      }
    };
    if (token && isFocused) fetchHabits();
  }, [token, isFocused]);

  const getHabitIcon = (title = '') => {
    const lower = title.toLowerCase();
    
    // Health & Fitness
    if (lower.includes('water') || lower.includes('hydrate')) return 'water-drop';
    if (lower.includes('exercise') || lower.includes('workout') || lower.includes('gym') || lower.includes('run')) return 'fitness-center';
    if (lower.includes('walk') || lower.includes('steps')) return 'directions-walk';
    if (lower.includes('sleep') || lower.includes('bedtime')) return 'bedtime';
    if (lower.includes('stretch') || lower.includes('yoga')) return 'accessibility-new';
    
    // Mental & Learning
    if (lower.includes('read') || lower.includes('book')) return 'menu-book';
    if (lower.includes('medit') || lower.includes('mindful')) return 'self-improvement';
    if (lower.includes('gratitude') || lower.includes('grateful')) return 'sentiment-satisfied';
    if (lower.includes('journal') || lower.includes('write')) return 'edit-note';
    if (lower.includes('learn') || lower.includes('study')) return 'school';
    
    // Productivity & Work
    if (lower.includes('work') || lower.includes('task')) return 'work';
    if (lower.includes('email') || lower.includes('inbox')) return 'email';
    if (lower.includes('organize') || lower.includes('clean')) return 'cleaning-services';
    if (lower.includes('plan') || lower.includes('schedule')) return 'event';
    
    // Social & Personal
    if (lower.includes('call') || lower.includes('phone')) return 'phone';
    if (lower.includes('family') || lower.includes('friend')) return 'people';
    if (lower.includes('cook') || lower.includes('meal')) return 'restaurant';
    if (lower.includes('music') || lower.includes('listen')) return 'music-note';
    if (lower.includes('create') || lower.includes('art')) return 'palette';
    
    // Default
    return 'check-circle';
  };

  const handleHabitCheck = async (habitId) => {
    if (completedHabits.has(habitId)) return; // Already completed
    
    // Optimistic update
    const newSet = new Set(completedHabits);
    newSet.add(habitId);
    setCompletedHabits(newSet);
    
    // Update the habit in the list optimistically
    setHabits(prev => prev.map(h => 
      h._id === habitId ? { ...h, checked_today: true } : h
    ));
    
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const response = await recordHabitCheckin(habitId, todayIso, token);
      
      // Update with the actual habit data from backend (includes updated streaks and checked_today)
      if (response.habit) {
        setHabits(prev => prev.map(h => 
          h._id === habitId ? response.habit : h
        ));
        
        // Update completedHabits based on the backend response
        const updatedSet = new Set(completedHabits);
        if (response.habit.checked_today) {
          updatedSet.add(habitId);
        } else {
          updatedSet.delete(habitId);
        }
        setCompletedHabits(updatedSet);
      }
    } catch (err) {
      console.error('Failed to record checkin:', err);
      setError('Failed to check habit');
      
      // Rollback optimistic update on error
      const rollbackSet = new Set(completedHabits);
      rollbackSet.delete(habitId);
      setCompletedHabits(rollbackSet);
      
      setHabits(prev => prev.map(h => 
        h._id === habitId ? { ...h, checked_today: false } : h
      ));
    }
  };

  const handleDelete = async (habitId) => {
    setError(null);
    setDeletingId(habitId);
    try {
      await deleteHabit(habitId, token);
      setHabits((prev) => prev.filter((h) => h._id !== habitId));
      const newSet = new Set(completedHabits);
      newSet.delete(habitId);
      setCompletedHabits(newSet);
    } catch (err) {
      setError('Failed to delete habit.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (habit) => {
    setEditingHabit(habit);
    setEditTitle(habit.title);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingHabit || !editTitle.trim()) return;
    
    try {
      await updateHabit(editingHabit._id, { title: editTitle.trim() }, token);
      setHabits(prev => prev.map(h => 
        h._id === editingHabit._id ? { ...h, title: editTitle.trim() } : h
      ));
      setEditModalVisible(false);
      setEditingHabit(null);
      setEditTitle('');
    } catch (err) {
      console.error('Failed to update habit', err);
      setError('Failed to update habit');
    }
  };

  const filteredHabits = habits.filter(habit => {
    const matchesSearch = habit.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    switch (filterBy) {
      case 'completed':
        return completedHabits.has(habit._id);
      case 'pending':
        return !completedHabits.has(habit._id);
      default:
        return true;
    }
  });

  const confirmDelete = (habitId, title) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(habitId) },
      ]
    );
  };

  const getHabitStats = () => {
    const total = habits.length;
    const completed = habits.filter(h => completedHabits.has(h._id)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalStreak = habits.reduce((sum, h) => sum + (h.streaks?.current_streak || 0), 0);
    
    return { total, completed, completionRate, totalStreak };
  };

  const stats = getHabitStats();

  const renderHabitCard = ({ item }) => {
    const isCompleted = completedHabits.has(item._id);
    const habitColor = item.color || colors.primary;
    
    return (
      <TouchableOpacity 
        style={[
          styles.gridHabitCard,
          isCompleted && styles.completedGridHabitCard,
          { borderColor: habitColor }
        ]}
        onPress={() => handleHabitCheck(item._id)}
        activeOpacity={0.8}
      >
        <View style={styles.gridHabitContent}>
          <View style={[
            styles.gridHabitIconContainer, 
            { backgroundColor: habitColor + '15' }
          ]}>
            <MaterialIcons 
              name={getHabitIcon(item.title)} 
              size={24} 
              color={habitColor} 
            />
          </View>
          
          <Text style={[
            styles.gridHabitTitle,
            isCompleted && styles.completedGridHabitTitle
          ]} numberOfLines={2}>
            {item.title}
          </Text>
          
          <Text style={styles.gridHabitFrequency}>
            {item.pattern?.frequency || 'Daily'}
          </Text>
          
          {item.streaks?.current_streak > 0 && (
            <View style={styles.gridStreakContainer}>
              <MaterialIcons name="local-fire-department" size={12} color="#F97316" />
              <Text style={styles.gridStreakText}>
                {item.streaks.current_streak}d
              </Text>
            </View>
          )}
          
          <View style={[
            styles.gridHabitCheckbox,
            isCompleted 
              ? { backgroundColor: colors.success, borderColor: colors.success }
              : { backgroundColor: 'transparent', borderColor: habitColor }
          ]}>
            {isCompleted && (
              <MaterialIcons name="check" size={16} color="white" />
            )}
          </View>
        </View>
        
        <View style={styles.gridHabitCardActions}>
          <TouchableOpacity
            style={styles.gridActionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
          >
            <MaterialIcons name="edit" size={16} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.gridActionButton}
            onPress={(e) => {
              e.stopPropagation();
              confirmDelete(item._id, item.title);
            }}
            disabled={deletingId === item._id}
          >
            {deletingId === item._id ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <MaterialIcons name="delete" size={16} color={colors.error} />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Habits</Text>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your habits...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent={false} />
      
      <ScrollView style={styles.mainScrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Habits</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('AddHabit')}
            >
              <MaterialIcons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed Today</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.completionRate}%</Text>
              <Text style={styles.statLabel}>Completion Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalStreak}</Text>
              <Text style={styles.statLabel}>Total Streak Days</Text>
            </View>
          </View>
        </LinearGradient>
        
        {/* Content */}
        <View style={styles.contentContainer}>
        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search habits..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
        
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {[{ key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' }, { key: 'completed', label: 'Completed' }].map(filter => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                filterBy === filter.key && styles.activeFilterTab
              ]}
              onPress={() => setFilterBy(filter.key)}
            >
              <Text style={[
                styles.filterTabText,
                filterBy === filter.key && styles.activeFilterTabText
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Habits Grid */}
        {filteredHabits.length > 0 ? (
          <View style={styles.habitsGridContainer}>
            {filteredHabits.map((habit) => (
              <View key={habit._id} style={styles.habitGridItem}>
                {renderHabitCard({ item: habit })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="self-improvement" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {searchQuery || filterBy !== 'all' ? 'No habits match your filters' : 'No habits yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || filterBy !== 'all' 
                ? 'Try adjusting your search or filter settings'
                : 'Start building better habits today!'}
            </Text>
            {!searchQuery && filterBy === 'all' && (
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => navigation.navigate('AddHabit')}
              >
                <Text style={styles.emptyActionText}>Add Your First Habit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        </View>
      </ScrollView>
      
      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Habit</Text>
              <TouchableOpacity 
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Habit Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Enter habit name"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={handleSaveEdit}
                disabled={!editTitle.trim()}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 20 : 15,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Content Styles
  contentContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -10,
    paddingTop: 5,
    minHeight: '100%',
  },
  
  // Search Styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  
  // Filter Styles
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeFilterTabText: {
    color: colors.white,
  },
  
  // Error Styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },
  
  // Habits Container
  habitsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 100,
    justifyContent: 'space-between',
  },
  habitGridItem: {
    width: '48%',
  },
  
  // Grid Habit Card Styles
  gridHabitCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
  },
  completedGridHabitCard: {
    backgroundColor: '#F0FDF4',
  },
  gridHabitContent: {
    alignItems: 'center',
    flex: 1,
  },
  gridHabitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridHabitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  completedGridHabitTitle: {
    color: colors.success,
    textDecorationLine: 'line-through',
    opacity: 0.8,
  },
  gridHabitFrequency: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'center',
  },
  gridStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 6,
  },
  gridStreakText: {
    fontSize: 10,
    color: '#F97316',
    fontWeight: '600',
  },
  gridHabitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  
  // Grid Card Actions
  gridHabitCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  gridActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default MyHabitsScreen; 