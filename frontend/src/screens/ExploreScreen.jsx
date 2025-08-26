import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ExploreScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <MaterialIcons name="emoji-people" size={64} color="#8B5CF6" style={{ marginBottom: 12 }} />
        <Text style={styles.title}>Discover Skills – Beta</Text>
        <Text style={styles.paragraph}>
          We're busy crafting an awesome discovery experience! Soon you'll be able to upload your own skills
          or browse popular learning paths from the community and instantly add them to your personal repository.
          Stay tuned – you're about to unlock a world of knowledge!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ExploreScreen; 