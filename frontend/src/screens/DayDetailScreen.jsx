import React from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { CheckCircle, Circle, BookOpen, ExternalLink } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { Linking } from 'react-native';

const DayDetailScreen = () => {
  const { params } = useRoute(); 
  const navigation = useNavigation();

  const dayData = params.day;
  const [taskStatus, setTaskStatus] = React.useState(() => dayData.tasks?.map(() => false) || []);

  const toggleTask = (idx) => {
    setTaskStatus((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const resources = React.useMemo(() => {
    if (!dayData?.tasks) return [];
    const list = [];
    dayData.tasks.forEach((t) => {
      if (t.resources && Array.isArray(t.resources)) {
        list.push(...t.resources);
      }
    });
    return list;
  }, [dayData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Day {dayData.day}: {dayData.title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tasks */}
        <Text style={styles.sectionTitle}>Tasks</Text>
        {dayData.tasks?.map((task, idx) => (
          <TouchableOpacity key={idx} style={styles.cardTask} onPress={() => toggleTask(idx)} activeOpacity={0.8}>
            {taskStatus[idx] ? (
              <CheckCircle size={20} color={colors.primary} style={styles.taskIcon} />
            ) : (
              <Circle size={20} color={colors.gray400} style={styles.taskIcon} />
            )}
            <Text style={[styles.cardText, taskStatus[idx] && { textDecorationLine: 'line-through', color: colors.gray500 }]}>{task.description || task}</Text>
          </TouchableOpacity>
        ))}

        {/* Resources */}
        {resources.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Resources</Text>
            {resources.map((res, idx) => (
              <TouchableOpacity key={idx} style={styles.cardResource} onPress={() => Linking.openURL(res)}>
                <BookOpen size={18} color={colors.indigo} style={styles.taskIcon} />
                <Text style={[styles.cardText, { color: colors.indigo }]} numberOfLines={1}>{res}</Text>
                <ExternalLink size={16} color={colors.gray400} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={params.onToggleComplete}>
          <Text style={styles.primaryButtonText}>Mark Day {params.isCompleted ? 'Incomplete' : 'Complete'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#1F2937', textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginVertical: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width:0, height:2 }, shadowRadius: 4 },
  cardText: { color: '#374151', flex: 1, flexWrap: 'wrap' },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  cardTask: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: colors.black, shadowOpacity: 0.05, shadowOffset: { width:0, height:2 }, shadowRadius: 4 },
  cardResource: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: colors.black, shadowOpacity: 0.05, shadowOffset: { width:0, height:2 }, shadowRadius: 4 },
  taskIcon: { marginRight: 12 },
  indigo: { color: '#6366F1' },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default DayDetailScreen; 