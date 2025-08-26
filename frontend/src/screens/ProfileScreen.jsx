import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useIsFocused } from '@react-navigation/native';
import { getAllPlans } from '../api/plans';
import LogoutModal from '../components/LogoutModal';


const CircularProgress = ({ size, strokeWidth, progress, color, backgroundColor, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
};


export default function ProfileScreen() {
  const { logout, user, token } = useAuth();
  const isFocused = useIsFocused();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    activeSkills: 0,
    completedSkills: 0,
    percentComplete: 0,
    dailyHabits: 0,
    completedToday: 0,
    longestStreak: 0,
  });
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getAllPlans(token);
        const skills = data.skills || [];
        const habits = data.habits || [];

        const completedSkills = skills.filter((s) => s.status === 'completed').length;
        const percent = skills.length ? Math.round((completedSkills / skills.length) * 100) : 0;

        const completedToday = habits.filter((h) => h.checked_today).length;
        const longestStreak = habits.reduce((max, h) => Math.max(max, h.streaks?.longest_streak || 0), 0);

        setStats({
          activeSkills: skills.length - completedSkills,
          completedSkills,
          percentComplete: percent,
          dailyHabits: habits.length,
          completedToday,
          longestStreak,
        });
        setAchievements([]);
      } catch (err) {
        console.error('Profile stats fetch failed', err);
      } finally {
        setLoadingStats(false);
      }
    };
    if (token && isFocused) fetch();
  }, [token, isFocused]);

  const settingItems = [
    { icon: 'person-outline', label: 'Account Details' },
    { icon: 'notifications-none', label: 'Notifications', value: notifications, setter: setNotifications },
    { icon: 'calendar-today', label: 'Calendar Integration', status: 'Connected' },
    { icon: 'dark-mode', label: 'Dark Mode', value: darkMode, setter: setDarkMode },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Info */}
      <View style={styles.profileSection}>
        <LinearGradient
          colors={[ '#A7F3D0', '#34D399' ]}
          style={styles.avatarRing}
        >
          <Image
            style={styles.avatar}
            source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}&background=14B8A6&color=ffffff&size=128` }}
          />
        </LinearGradient>
        <Text style={styles.profileName}>{user?.username || 'Alex Chen'}</Text>
        <Text style={styles.profileHandle}>@{user?.username || 'alexplanner'}</Text>
        <TouchableOpacity style={styles.streakButton}>
          <MaterialIcons name="local-fire-department" size={16} color="#EA580C" />
          <Text style={styles.streakText}>58 days</Text>
        </TouchableOpacity>
      </View>

      {/* Overall Progress Card */}
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={['#34D399', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Overall Progress</Text>
            <Text style={styles.progressLevel}>{stats.completedSkills}/{stats.activeSkills + stats.completedSkills}</Text>
          </View>
          <View style={styles.progressBody}>
            <CircularProgress size={100} strokeWidth={8} progress={stats.percentComplete} color="white" backgroundColor="rgba(255,255,255,0.3)">
              <Text style={styles.progressPercentage}>{stats.percentComplete}%</Text>
            </CircularProgress>
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <MaterialIcons name="auto-awesome" size={18} color="white" />
                </View>
                <View>
                  <Text style={styles.statValue}>{stats.activeSkills} active skills</Text>
                  <Text style={styles.statLabel}>{stats.completedSkills} completed</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconContainer}>
                  <MaterialIcons name="check-circle-outline" size={18} color="white" />
                </View>
                <View>
                  <Text style={styles.statValue}>{stats.dailyHabits} daily habits</Text>
                  <Text style={styles.statLabel}>Completed today: {stats.completedToday}/{stats.dailyHabits}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.progressFooter}>
            <TouchableOpacity style={styles.progressButton}>
              <MaterialIcons name="add-circle-outline" size={16} color="white" />
              <Text style={styles.progressButtonText}>Set new goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.progressButton}>
              <MaterialIcons name="visibility" size={16} color="white" />
              <Text style={styles.progressButtonText}>View details</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Achievements */}
      <View style={styles.cardOuter}>
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <MaterialIcons name="chevron-right" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          {achievements.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.noAchieveText}>No achievements yet. Keep learning!</Text>
            </View>
          ) : (
            <View style={styles.achievementsGrid}>
              {achievements.map((achievement, index) => (
                <View key={index} style={[styles.achievementCard, { backgroundColor: index % 3 === 0 ? '#C4B5FD' : index % 3 === 1 ? '#F9A8D4' : '#86EFAC' }]}>
                  <MaterialIcons name="military-tech" size={28} color="white" />
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDate}>{achievement.date}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      
      {/* Stats */}
      <View style={styles.cardOuter}>
        <View style={styles.card}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statCardValueBlue}>204</Text>
              <Text style={styles.statCardLabel}>Completed Lessons</Text>
            </View>
            <View style={styles.statCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <MaterialIcons name="local-fire-department" size={16} color="#F97316" />
                <Text style={styles.statCardValueOrange}>58</Text>
                <Text style={styles.statCardUnit}>days</Text>
              </View>
              <Text style={styles.statCardLabel}>Longest Streak</Text>
            </View>
            <View style={styles.statCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Text style={styles.statCardValueGreen}>4.2</Text>
                <Text style={styles.statCardUnit}>hrs</Text>
              </View>
              <Text style={styles.statCardLabel}>Weekly Average</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={[styles.cardOuter, { marginBottom: 80 }]}>
        <View style={styles.card}>
          {settingItems.map(({ icon, label, value, setter, status }, i) => (
            <TouchableOpacity
              key={i}
              style={styles.settingItem}
              onPress={() => setter && setter(!value)}
              activeOpacity={setter ? 0.7 : 1}
            >
              <View style={styles.settingInfo}>
                <MaterialIcons name={icon} size={20} color="#4B5563" />
                <Text style={styles.settingLabel}>{label}</Text>
              </View>
              {typeof value === 'boolean' ? (
                <View style={[styles.toggleSwitch, value ? styles.toggleSwitchActive : styles.toggleSwitchInactive]}>
                  <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
                </View>
              ) : (
                <Text style={styles.settingStatus}>{status}</Text>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowLogoutModal(true)}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="logout" size={20} color="#EF4444" />
              <Text style={[styles.settingLabel, { color: "#EF4444" }]}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
    paddingTop: 20,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  profileSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  avatarRing: {
    padding: 4,
    borderRadius: 56,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '800',
  },
  profileHandle: {
    color: '#6B7280',
  },
  streakButton: {
    marginTop: 8,
    backgroundColor: '#FFEDD5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  streakText: {
    color: '#C2410C',
    fontSize: 14,
    fontWeight: '500',
  },
  cardContainer: {
    padding: 16,
  },
  progressCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  progressLevel: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    color: 'white',
  },
  progressBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  progressStats: {
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 8,
  },
  statValue: {
    fontWeight: '500',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  progressFooter: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  progressButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  achievementsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  achievementCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  achievementTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  achievementDate: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  statCardValueBlue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2563EB',
  },
  statCardValueOrange: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F97316',
  },
  statCardValueGreen: {
    fontSize: 24,
    fontWeight: '600',
    color: '#16A34A',
  },
  statCardUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    marginLeft: 2,
    paddingBottom: 2,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  settingItem: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    color: '#374151',
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 48,
    height: 24,
    borderRadius: 12,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#3B82F6',
    justifyContent: 'flex-end',
  },
  toggleSwitchInactive: {
    backgroundColor: '#D1D5DB',
    justifyContent: 'flex-start',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  settingStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#16A34A',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAchieveText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  cardOuter: { marginHorizontal:16, marginBottom:20 },
  card: { backgroundColor:'white', borderRadius:20, padding:16, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.05, shadowRadius:12, elevation:4 },
}); 