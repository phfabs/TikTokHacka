import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { createHabitPlan } from '../api/plans';
import HabitSuccessModal from '../components/HabitSuccessModel';
import DateTimePicker from '@react-native-community/datetimepicker';
import { requestNotificationPermission } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleHabitNotification } from '../utils/notifications';


const suggestionList = [
  { icon: 'water-drop', label: 'Drink water' },
  { icon: 'menu-book', label: 'Read a book' },
  { icon: 'fitness-center', label: 'Exercise' },
  { icon: 'restaurant-menu', label: 'Healthy meal' },
  { icon: 'sentiment-satisfied', label: 'Gratitude' },
];

const habitColors = {
  'red': '#F87171',
  'blue': '#60A5FA',
  'green': '#34D399',
  'yellow': '#FBBF24',
  'purple': '#A78BFA',
  'pink': '#F472B6',
};

export default function AddHabitScreen({ navigation }) {
  const { token } = useAuth();
  const [habit, setHabit] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [selectedColor, setSelectedColor] = useState('green');
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [reminderTime, setReminderTime] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [customDays, setCustomDays] = useState([]);

  const weekdays = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
  ];

  const toggleDay = (day) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleReminderToggle = async (value) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings to receive habit reminders.');
        return;
      }
    }
    setReminderEnabled(value);
  };

  const handleAddHabit = async () => {
    if (!habit.trim()) {
      Alert.alert('Validation', 'Please enter a habit title.');
      return;
    }
    try {
      setLoading(true);
      const response = await createHabitPlan(
        habit.trim(),
        'health',
        habitColors[selectedColor],
        token,
        startDate ? startDate.toISOString().split('T')[0] : undefined,
        endDate ? endDate.toISOString().split('T')[0] : undefined,
        reminderEnabled && reminderTime ? reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined,
        customDays,
        reminderEnabled && reminderMessage ? reminderMessage : undefined
      );
      // Schedule notifications if enabled and all fields are set
      if (
        reminderEnabled &&
        reminderTime &&
        customDays && customDays.length > 0 &&
        response?.habit?._id
      ) {
        try {
          const notificationIds = await scheduleHabitNotification({
            id: response.habit._id,
            title: habit.trim(),
            message: reminderMessage || 'Time to build your habit!',
            time: reminderTime,
            days: customDays
          });
          // Store notification IDs in AsyncStorage mapped to habit ID
          const key = `habit_notifications_${response.habit._id}`;
          await AsyncStorage.setItem(key, JSON.stringify(notificationIds));
        } catch (notifErr) {
          console.error('Failed to schedule notification:', notifErr);
          Alert.alert('Notification Error', 'Could not schedule local notifications.');
        }
      }
      setSuccessModalVisible(true);
    } catch (err) {
      console.error('Habit creation failed:', err);
      const msg = err.response?.data?.error || 'Could not create habit.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back-ios" size={24} color="#4B5563" style={{ marginLeft: 10 }}/>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Habit</Text>
          <Text style={styles.headerStep}>1/2</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What habit would you like to build?</Text>
            <Text style={styles.sectionSubtitle}>Describe your habit or pick from suggestions.</Text>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.textInputWrapper}>
              <TextInput
                value={habit}
                onChangeText={setHabit}
                placeholder="e.g., Daily Meditation"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
              />
              {habit !== '' && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setHabit('')}
                >
                  <MaterialIcons name="close" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions:</Text>
              <View style={styles.suggestionsGrid}>
                {suggestionList.map(s => (
                  <TouchableOpacity
                    key={s.label}
                    style={styles.suggestionChip}
                    onPress={() => setHabit(s.label)}
                  >
                    <MaterialIcons name={s.icon} size={16} color="#4B5563" style={{ marginRight: 4 }} />
                    <Text style={styles.suggestionLabel}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.charCount}>{habit.length}/50 characters</Text>
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

          <View style={styles.reminderContainer}>
            <View style={styles.reminderInfo}>
              <MaterialIcons name="notifications-active" size={24} color="#6366F1" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.reminderTitle}>Enable Reminder</Text>
                <Text style={styles.reminderSubtitle}>Get a gentle nudge at your chosen time.</Text>
              </View>
            </View>
            <Switch value={reminderEnabled} onValueChange={handleReminderToggle} trackColor={{ false: "#E5E7EB", true: "#8B5CF6" }} thumbColor={reminderEnabled ? "#FFFFFF" : "#F4F3F4"} />
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
            <TouchableOpacity disabled={!reminderEnabled} onPress={() => setShowTimePicker(true)} style={styles.datePickerButton}>
              <Text style={styles.datePickerText}>{reminderTime ? reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Select time'}</Text>
            </TouchableOpacity>
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
                value={reminderMessage}
                onChangeText={text => setReminderMessage(text.slice(0, 60))}
                placeholder="e.g., Time to build your habit!"
                placeholderTextColor="#9CA3AF"
                style={[styles.textInput, { backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, marginBottom: 4 }]}
                maxLength={60}
              />
              <Text style={{ textAlign: 'right', fontSize: 12, color: '#9CA3AF' }}>{reminderMessage.length}/60 characters</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity disabled={!habit.trim() || loading} onPress={handleAddHabit}>
            <LinearGradient
              colors={[habitColors[selectedColor], '#14B8A6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.primaryButton, (!habit.trim() || loading) && { opacity: 0.6 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Add Habit</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('AddSkill')}>
            <Text style={styles.secondaryButtonText}>Create Skill Instead</Text>
          </TouchableOpacity>
        </View>
        <HabitSuccessModal
          visible={successModalVisible}
          message={`"${habit}" added to your journey!`}
          buttonLabel="View My Habit"
          iconName="celebration"
          onClose={() => {
            setSuccessModalVisible(false);
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Repository');
            }
          }}
        />
      </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1F2937',
  },
  headerStep: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  inputContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 24,
  },
  textInputWrapper: {
    position: 'relative',
    padding: 12,
  },
  textInput: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 0,
    color: '#1F2937',
    fontSize: 14,
    borderRadius: 8,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -10, 
    padding: 4,
  },
  suggestionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  suggestionLabel: {
    color: '#374151',
    fontSize: 12,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  frequencyButtonSelected: {
    backgroundColor: '#6366F1',
  },
  frequencyButtonText: {
    textAlign: 'center',
    fontWeight: '500',
    color: '#374151',
  },
  frequencyButtonTextSelected: {
    color: 'white',
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  reminderSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  colorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: 'white',
    gap: 8,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  primaryButtonText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    textAlign: 'center',
  },
  datePickerButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  datePickerText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#374151',
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
  },
  dayButtonSelected: {
    backgroundColor: '#4F46E5',
  },
  dayButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
}); 