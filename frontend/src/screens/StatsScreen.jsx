import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getUserStats } from '../api/plans';
import { 
  ProgressRing, 
  StatsLineChart, 
  StatsBarChart, 
  ActivityHeatMap, 
  StatCard 
} from '../components/charts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const StatsScreen = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(1)).current; 
  const slideAnim = useRef(new Animated.Value(0)).current; 
  const scaleAnim = useRef(new Animated.Value(1)).current; 

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      console.log('Fetching stats...');
      const response = await getUserStats(token);
      console.log('Stats response:', response);
      setStats(response.stats);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  useFocusEffect(
    useCallback(() => {
      console.log('StatsScreen focused, fetching fresh data');
      if (token) {
        fetchStats();
      }
    }, [token, fetchStats])
  );
  
  useEffect(() => {
    console.log('StatsScreen mounted');
    if (token) {
      fetchStats();
    }
  }, [token, fetchStats]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStats}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasSkills = stats?.overview?.total_skills > 0;
  const hasHabits = stats?.overview?.total_habits > 0;
  const hasAnyData = hasSkills || hasHabits;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#a855f7"
            colors={['#a855f7']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#0f172a', '#1e293b', '#334155']}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>Your Progress</Text>
            <Text style={styles.headerSubtitle}>Track your journey ✨</Text>
          </LinearGradient>
        </View>

        {/* Quick Overview - Always Show */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Quick Overview</Text>
          <Text style={styles.sectionSubtitle}>Your journey at a glance</Text>
          
          <View style={styles.cardGrid}>
            <StatCard
              title="Total Progress"
              value={Math.ceil(stats?.overview?.total_progress_points || 0)}
              icon="trending-up"
              color="#a855f7"
              style={styles.card}
            />
            <StatCard
              title="Skills Active"
              value={Math.ceil(stats?.skills?.active_skills || 0)}
              subtitle={`${Math.ceil(stats?.skills?.total_skills || 0)} total`}
              icon="school"
              color="#22c55e"
              style={styles.card}
            />
            <StatCard
              title="Habits Active"
              value={Math.ceil(stats?.habits?.active_habits || 0)}
              subtitle={`${Math.ceil(stats?.habits?.total_habits || 0)} total`}
              icon="check-circle"
              color="#3b82f6"
              style={styles.card}
            />
            <StatCard
              title="Days Active"
              value={Math.ceil(stats?.overview?.days_active || 0)}
              subtitle="since you started"
              icon="calendar-today"
              color="#f59e0b"
              style={styles.card}
            />
          </View>
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Skills Progress</Text>
          
          {hasSkills ? (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Average Completion</Text>
              <View style={styles.progressContainer}>
                <ProgressRing
                  size={100}
                  progress={Math.ceil(stats?.skills?.average_completion || 0)}
                  gradientColors={['#a855f7', '#3b82f6']}
                  strokeWidth={8}
                  animate={true}
                />
                <View style={styles.progressInfo}>
                  <Text style={styles.progressTitle}>Skills Mastery</Text>
                  <Text style={styles.progressSubtitle}>
                    {Math.ceil(stats?.skills?.total_days_completed || 0)} days completed
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptySection}>
              <MaterialIcons name="school" size={40} color="#94a3b8" />
              <Text style={styles.emptySectionText}>
                Create your first skill to see progress analytics!
              </Text>
            </View>
          )}
        </View>

        {/* Habits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Habits Tracking</Text>
          
          {hasHabits ? (
            <View style={styles.habitsContainer}>
              <View style={styles.habitsStats}>
                <StatCard
                  title="Current Streaks"
                  value={Math.ceil(stats?.habits?.current_streaks || 0)}
                  icon="local-fire-department"
                  color="#f59e0b"
                  style={styles.halfCard}
                />
                <StatCard
                  title="Consistency"
                  value={`${Math.ceil(stats?.habits?.consistency_score || 0)}%`}
                  icon="assessment"
                  color="#22c55e"
                  style={styles.halfCard}
                />
              </View>
            </View>
          ) : (
            <View style={styles.emptySection}>
              <MaterialIcons name="check-circle" size={40} color="#94a3b8" />
              <Text style={styles.emptySectionText}>
                Create your first habit to track consistency!
              </Text>
            </View>
          )}
        </View>

        {/* Activity Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Activity Timeline</Text>
          
          <View style={styles.timelineContainer}>
            <LinearGradient
              colors={['#374151', '#4b5563', '#6b7280']}
              style={styles.timelineCard}
            >
              <Text style={styles.timelineTitle}>Daily Progress</Text>
              <Text style={styles.timelineSubtitle}>Your journey over time</Text>
              
              {stats?.activity_timeline && (
                <View style={styles.heatmapContainer}>
                  <ActivityHeatMap
                    data={stats.activity_timeline}
                    width={screenWidth - 80}
                    cellSize={12}
                    gap={2}
                    backgroundColor="transparent"
                  />
                </View>
              )}
              
              <View style={styles.timelineStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {Math.ceil(stats?.activity_timeline?.filter(d => d.total_activity > 0).length || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Active Days</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {Math.ceil(stats?.activity_timeline?.length || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Days Tracked</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Empty State Message */}
        {!hasAnyData && (
          <View style={styles.section}>
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name="insights" size={60} color="#94a3b8" />
              <Text style={styles.emptyStateTitle}>Start Your Journey</Text>
              <Text style={styles.emptyStateText}>
                Create your first skill or habit to see beautiful analytics and track your progress!
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>✨ You've reached the end ✨</Text>
          <Text style={styles.footerSubtext}>Pull down to refresh your stats</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 150,
    minHeight: screenHeight + 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 20,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: (screenWidth - 64) / 2,
    minHeight: 120,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: 6,
  },
  chartContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
    marginLeft: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  habitsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  habitsStats: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineContainer: {
    marginBottom: 20,
  },
  timelineCard: {
    borderRadius: 16,
    padding: 20,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  timelineSubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
  },
  heatmapContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timelineStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
  emptySection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptySectionText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  emptyStateContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  footer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default StatsScreen;