import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import ProgressHeader from '../components/ProgressHeader';
import DayCard from '../components/DayCard';
import { colors } from '../constants/colors';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { getSkillById, markSkillDayComplete } from '../api/plans';

export default function PlanIndexScreen() {
  const { params } = useRoute(); 
  const navigation = useNavigation();
  const { token } = useAuth();
  const [plan, setPlan] = useState([]);
  const [skillName, setSkillName] = useState('');
  const [completedDays, setCompletedDays] = useState({});
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetch = async () => {
      try {
        const skill = await getSkillById(params.skillId, token);
        setPlan(skill.curriculum?.daily_tasks || []);
        setSkillName(skill.title);
        const completedObj = {};
        for (let i = 1; i <= skill.progress.completed_days; i++) {
          completedObj[i] = true;
        }
        setCompletedDays(completedObj);
      } catch (err) {
        console.error('Fetch skill error', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [params.skillId, token]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleToggleComplete = async (dayNumber) => {
    const already = completedDays[dayNumber];
    setCompletedDays(prev => ({ ...prev, [dayNumber]: !already }));
    try {
      if (!already) {
        await markSkillDayComplete(params.skillId, dayNumber, token);
      }
    } catch (err) {
      console.error('toggle complete failed', err);
      setCompletedDays(prev => ({ ...prev, [dayNumber]: already }));
    }
  };

  const navigateToDayDetail = (day) => {
    navigation.navigate('DayDetail', {
      day,
      skillName,
      isCompleted: completedDays[day.day],
      onToggleComplete: () => handleToggleComplete(day.day),
    });
  };

  const numCompleted = Object.values(completedDays).filter(Boolean).length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text>Loading plan...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <ArrowLeft size={24} color={colors.primary} />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <ProgressHeader skillName={skillName} completedDays={numCompleted} totalDays={plan.length} />

      <FlatList
        data={plan}
        keyExtractor={(item) => item.day.toString()}
        renderItem={({ item }) => (
          <DayCard
            day={item}
            onPress={() => navigateToDayDetail(item)}
            isCompleted={completedDays[item.day]}
            onToggleComplete={() => handleToggleComplete(item.day)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backButtonText: { marginLeft: 8, fontSize: 16, color: colors.primary, fontWeight: '500' },
  listContent: { paddingBottom: 40 },
}); 