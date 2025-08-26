import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { colors } from '../constants/colors';

const PlanCard = ({ plan, type, onPress, onDelete }) => {
  const handleDelete = () => {
    Alert.alert(
      `Delete ${type}`,
      `Are you sure you want to want to delete "${plan.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(plan._id, type) },
      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.typeLabel}>{type === 'skill' ? '30-Day Skill' : 'Habit'}</Text>
      </View>
      <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
        <Trash2 color={colors.error} size={24} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 14,
    color: colors.gray500,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 16,
  },
});

export default PlanCard; 