import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getAllPlans, deleteHabit } from '../api/plans';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import CustomModal from '../components/CustomModal';

const { width } = Dimensions.get('window');

const AllHabitsScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchHabits = async () => {
    try {
      setError(null);
      const data = await getAllPlans(token);
      setHabits(data.habits || []);
    } catch (err) {
      console.error('Failed to fetch habits', err);
      setError('Failed to load habits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    fetchHabits();
  };

  useEffect(() => {
    if (token) {
      fetchHabits();
    }
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchHabits();
      }
    }, [token])
  );

  const handleDeleteHabit = (habit) => {
    setHabitToDelete(habit);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteHabit = async () => {
    if (!habitToDelete) return;
    
    try {
      setDeleting(true);
      await deleteHabit(habitToDelete._id, token);
      await fetchHabits();
      setShowDeleteConfirm(false);
      setHabitToDelete(null);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Failed to delete habit', err);
      setShowDeleteConfirm(false);
      
      if (err.response?.status === 401) {
        setErrorMessage('Please log in again to continue.');
      } else if (err.response?.status === 403) {
        setErrorMessage('You do not have permission to delete this habit.');
      } else if (err.response?.status === 404) {
        setErrorMessage('This habit no longer exists.');
      } else if (err.response?.status >= 500) {
        setErrorMessage('There was a server error. Please try again later.');
      } else {
        setErrorMessage('Failed to delete habit. Please check your connection and try again.');
      }
      setShowErrorModal(true);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text style={styles.loadingText}>Loading habits...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getHabitIcon = (title = '') => {
    const lower = title.toLowerCase();
    if (lower.includes('water')) return 'water-drop';
    if (lower.includes('read')) return 'menu-book';
    if (lower.includes('exercise') || lower.includes('workout')) return 'fitness-center';
    if (lower.includes('medit')) return 'self-improvement';
    if (lower.includes('gratitude')) return 'sentiment-satisfied';
    if (lower.includes('sleep')) return 'bedtime';
    if (lower.includes('clean')) return 'cleaning-services';
    return 'check-circle';
  };

  const renderHabitCard = ({ item, index }) => {
    const streak = item.streaks?.current_streak || 0;
    const totalCompletions = item.streaks?.total_completions || 0;
    const isActive = item.status === 'active';
    
    return (
      <View style={[styles.habitCard, { marginBottom: 20 }]}>
        <LinearGradient
          colors={isActive ? ['#14B8A6', '#06B6D4'] : ['#9CA3AF', '#6B7280']}
          style={styles.habitGradient}
        >
          <View style={styles.habitHeader}>
            <View style={styles.habitIconContainer}>
              <MaterialIcons 
                name={getHabitIcon(item.title)} 
                size={24} 
                color="white" 
              />
            </View>
            <View style={styles.habitInfo}>
              <Text style={styles.habitTitle}>{item.title}</Text>
              <Text style={styles.habitCategory}>
                {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'General'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => handleDeleteHabit(item)}
            >
              <MaterialIcons name="more-vert" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.habitStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="local-fire-department" size={20} color="white" />
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="check-circle" size={20} color="white" />
              <Text style={styles.statValue}>{totalCompletions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="trending-up" size={20} color="white" />
              <Text style={styles.statValue}>{item.streaks?.longest_streak || 0}</Text>
              <Text style={styles.statLabel}>Best</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#14B8A6', '#06B6D4']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Habits</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddHabit')}
          >
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{habits.length}</Text>
            <Text style={styles.statLabel}>Total Habits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{habits.filter(h => h.status === 'active').length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{habits.filter(h => h.streaks?.current_streak > 0).length}</Text>
            <Text style={styles.statLabel}>On Streak</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={habits}
        keyExtractor={(item) => item._id}
        renderItem={renderHabitCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#14B8A6', '#06B6D4']}
              style={styles.emptyIconContainer}
            >
              <MaterialIcons name="emoji-people" size={48} color="white" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Habits Yet</Text>
            <Text style={styles.emptyDescription}>
              Start building positive habits today. Create your first habit and begin your journey to a better you!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('AddHabit')}
            >
              <LinearGradient
                colors={['#14B8A6', '#06B6D4']}
                style={styles.emptyButtonGradient}
              >
                <MaterialIcons name="add" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.emptyButtonText}>Create Your First Habit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Beautiful Modal Components */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setHabitToDelete(null);
        }}
        onConfirm={confirmDeleteHabit}
        title="Delete Habit"
        message={`Are you sure you want to delete "${habitToDelete?.title}"? This action cannot be undone and all progress will be lost.`}
        confirmText={deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        destructive
        icon="delete"
      />

      <SuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Habit Deleted!"
        message={`"${habitToDelete?.title}" has been successfully removed from your habits.`}
        buttonText="Got it"
        icon="check-circle"
      />

      <CustomModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Delete Failed"
        message={errorMessage}
        type="error"
        icon="error-outline"
        primaryButton={{
          text: 'Try Again',
          onPress: () => setShowErrorModal(false),
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  habitCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  habitGradient: {
    padding: 20,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  habitIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  habitCategory: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginVertical: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AllHabitsScreen; 