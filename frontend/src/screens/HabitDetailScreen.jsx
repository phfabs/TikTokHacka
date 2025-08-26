import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, SafeAreaView, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Alert, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getHabitById, updateHabit, deleteHabit } from '../api/plans';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleHabitNotification, cancelNotification } from '../utils/notifications';

const weekdays = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const habitColors = {
  'red': '#F87171',
  'blue': '#60A5FA',
  'green': '#34D399',
  'yellow': '#FBBF24',
  'purple': '#A78BFA',
  'pink': '#F472B6',
};

const HabitDetailScreen = () => {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { token } = useAuth();
  const [habit, setHabit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('green');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [customDays, setCustomDays] = useState([]);
  const [reminderMessage, setReminderMessage] = useState('');

  const fetchHabit = async () => {
    try {
      const data = await getHabitById(params.habitId, token);
      setHabit(data);
      setTitle(data.title || '');
      setSelectedColor(Object.keys(habitColors).find(k => habitColors[k] === data.color) || 'green');
      setStartDate(data.start_date ? new Date(data.start_date) : null);
      setEndDate(data.end_date ? new Date(data.end_date) : null);
      setReminderEnabled(!!data.pattern?.reminder_time);
      setReminderTime(data.pattern?.reminder_time ? new Date(`1970-01-01T${data.pattern.reminder_time}`) : null);
      setCustomDays(data.pattern?.target_days || []);
      setReminderMessage(data.reminder_message || '');
    } catch (err) {
      console.error('Failed to fetch habit', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabit();
  }, [params.habitId]);

  const toggleDay = (day) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Cancel old notifications if any
      const notifKey = `habit_notifications_${habit._id}`;
      const oldNotifIdsStr = await AsyncStorage.getItem(notifKey);
      if (oldNotifIdsStr) {
        const oldNotifIds = JSON.parse(oldNotifIdsStr);
        for (const id of oldNotifIds) {
          try { await cancelNotification(id); } catch (e) { console.warn('Failed to cancel old notification', e); }
        }
      }
      await updateHabit(habit._id, {
        title,
        color: habitColors[selectedColor],
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
        reminder_time: reminderEnabled && reminderTime ? reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined,
        custom_days: customDays,
        reminder_message: reminderEnabled && reminderMessage ? reminderMessage : undefined
      }, token);
      // Schedule new notifications if enabled
      if (reminderEnabled && reminderTime && customDays && customDays.length > 0) {
        try {
          const notifIds = await scheduleHabitNotification({
            id: habit._id,
            title,
            message: reminderMessage || 'Time to build your habit!',
            time: reminderTime,
            days: customDays
          });
          await AsyncStorage.setItem(notifKey, JSON.stringify(notifIds));
        } catch (notifErr) {
          console.error('Failed to schedule notification:', notifErr);
          Alert.alert('Notification Error', 'Could not schedule local notifications.');
        }
      } else {
        // If reminders are disabled, clear stored notif IDs
        await AsyncStorage.removeItem(notifKey);
      }
      Alert.alert('Success', 'Habit updated successfully');
      fetchHabit();
    } catch (err) {
      console.error('Update failed', err);
      Alert.alert('Error', 'Failed to update habit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete Habit', 'Are you sure you want to delete this habit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            // Cancel all notifications for this habit
            const notifKey = `habit_notifications_${habit._id}`;
            const notifIdsStr = await AsyncStorage.getItem(notifKey);
            if (notifIdsStr) {
              const notifIds = JSON.parse(notifIdsStr);
              for (const id of notifIds) {
                try { await cancelNotification(id); } catch (e) { console.warn('Failed to cancel notification', e); }
              }
              await AsyncStorage.removeItem(notifKey);
            }
            await deleteHabit(habit._id, token);
            Alert.alert('Deleted', 'Habit deleted');
            navigation.goBack();
          } catch (err) {
            console.error('Delete failed', err);
            Alert.alert('Error', 'Failed to delete habit');
          } finally {
            setDeleting(false);
          }
        }
      }
    ]);
  };

  if (loading || !habit) {
    return (
      <SafeAreaView style={styles.safeAreaCenter}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={24} color="gray" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Habit</Text>
          <TouchableOpacity onPress={handleDelete} disabled={deleting}>
            <MaterialIcons name="delete" size={24} color={deleting ? '#ccc' : '#EF4444'} />
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Habit Title"
            style={styles.textInput}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Select Days</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {weekdays.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[styles.dayButton, customDays.includes(d.value) && styles.dayButtonSelected]}
                onPress={() => toggleDay(d.value)}
              >
                <Text style={customDays.includes(d.value) ? styles.dayButtonTextSelected : styles.dayButtonText}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Choose a Habit Color</Text>
          <View style={styles.colorContainer}>
            {Object.keys(habitColors).map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: habitColors[c] }, selectedColor === c && styles.colorSwatchSelected]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Start Date</Text>
          <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.datePickerButton}>
            <Text style={styles.datePickerText}>{startDate ? startDate.toDateString() : 'Select start date'}</Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowStartDatePicker(false);
                if (date) setStartDate(date);
              }}
            />
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>End Date</Text>
          <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.datePickerButton}>
            <Text style={styles.datePickerText}>{endDate ? endDate.toDateString() : 'Select end date'}</Text>
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowEndDatePicker(false);
                if (date) setEndDate(date);
              }}
            />
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Reminder Time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Switch value={reminderEnabled} onValueChange={setReminderEnabled} />
            <TouchableOpacity disabled={!reminderEnabled} onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}>
              <Text style={styles.datePickerText}>{reminderTime ? reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Select time'}</Text>
            </TouchableOpacity>
          </View>
          {showTimePicker && (
            <DateTimePicker
              value={reminderTime || new Date()}
              mode="time"
              display="default"
              onChange={(event, time) => {
                setShowTimePicker(false);
                if (time) setReminderTime(time);
              }}
            />
          )}
        </View>
        {reminderEnabled && (
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>Reminder Message</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your custom reminder message"
              value={reminderMessage}
              onChangeText={setReminderMessage}
            />
          </View>
        )}
      </ScrollView>
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
  safeAreaCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  textInput: { backgroundColor: 'white', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  dayButton: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, marginBottom: 8 },
  dayButtonSelected: { backgroundColor: '#14B8A6', borderColor: '#14B8A6' },
  dayButtonText: { color: '#374151' },
  dayButtonTextSelected: { color: 'white' },
  colorContainer: { flexDirection: 'row', marginTop: 8 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: '#14B8A6' },
  datePickerButton: { padding: 12, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8 },
  datePickerText: { color: '#374151' },
  bottomButtons: { position: 'absolute', bottom: 40, left: 16, right: 16 },
  primaryButton: { backgroundColor: '#14B8A6', paddingVertical: 14, borderRadius: 12 },
  primaryButtonText: { color: 'white', fontWeight: '600', textAlign: 'center' },
  input: { backgroundColor: 'white', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8 },
});

export default HabitDetailScreen; 