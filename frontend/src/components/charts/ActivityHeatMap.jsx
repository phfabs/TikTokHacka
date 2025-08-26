import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

const ActivityHeatMap = ({
  data = [], // Array of { date, intensity, activity_count, completion_details }
  width = 300,
  cellSize = 12,
  gap = 2,
  onDatePress = null,
  showLabels = true,
  backgroundColor = 'transparent'
}) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  // Calculate dimensions
  const cols = 7; // 7 days per week
  const rows = Math.ceil(data.length / cols);
  const chartWidth = cols * (cellSize + gap) - gap;
  const chartHeight = rows * (cellSize + gap) - gap;

  // Color scale based on intensity (0-1)
  const getIntensityColor = (intensity) => {
    if (intensity === 0) return colors.gray200;
    if (intensity <= 0.25) return '#CCF7ED'; // Light teal
    if (intensity <= 0.5) return '#7DD3FC'; // Light blue
    if (intensity <= 0.75) return '#34D399'; // Green
    return colors.primary; // Full intensity
  };

  // Group data by weeks
  const weeks = [];
  for (let i = 0; i < data.length; i += cols) {
    weeks.push(data.slice(i, i + cols));
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayLabel = (index) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[index % 7];
  };

  const handleDatePress = (item) => {
    setSelectedDate(item);
    setShowTooltip(true);
    if (onDatePress) {
      onDatePress(item);
    }
  };

  const closeTooltip = () => {
    setShowTooltip(false);
    setSelectedDate(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: backgroundColor || 'transparent' }]}>
      {showLabels && (
        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: backgroundColor === colors.white ? colors.gray600 : colors.white }]}>Less</Text>
          <View style={styles.legendColors}>
            {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
              <View
                key={index}
                style={[
                  styles.legendColor,
                  { backgroundColor: getIntensityColor(intensity) }
                ]}
              />
            ))}
          </View>
          <Text style={[styles.legendText, { color: backgroundColor === colors.white ? colors.gray600 : colors.white }]}>More</Text>
        </View>
      )}

      <View style={styles.chartContainer}>
        {/* Day labels */}
        {showLabels && (
          <View style={styles.dayLabels}>
            {Array.from({ length: cols }, (_, i) => (
              <Text key={i} style={[
                styles.dayLabel, 
                { 
                  width: cellSize + gap,
                  color: backgroundColor === colors.white ? colors.gray600 : colors.white
                }
              ]}>
                {getDayLabel(i).charAt(0)}
              </Text>
            ))}
          </View>
        )}

        <Svg width={chartWidth} height={chartHeight} style={styles.heatmap}>
          {data.map((item, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const x = col * (cellSize + gap);
            const y = row * (cellSize + gap);

            return (
              <Rect
                key={index}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={getIntensityColor(item.intensity || 0)}
                rx={2}
                ry={2}
                onPress={() => handleDatePress(item)}
              />
            );
          })}
        </Svg>
      </View>

      {/* Date range indicator */}
      {showLabels && data.length > 0 && (
        <View style={styles.dateRange}>
          <Text style={[
            styles.dateText,
            { color: backgroundColor === colors.white ? colors.gray600 : colors.white }
          ]}>
            {formatDate(data[0]?.date)} - {formatDate(data[data.length - 1]?.date)}
          </Text>
        </View>
      )}

      {/* Tooltip Modal */}
      <Modal
        visible={showTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTooltip}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeTooltip}
        >
          <View style={styles.tooltip}>
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipTitle}>
                {selectedDate ? formatDate(selectedDate.date) : 'No Date'}
              </Text>
              <TouchableOpacity onPress={closeTooltip}>
                <MaterialIcons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tooltipContent}>
              <View style={styles.activitySummary}>
                <Text style={styles.activityCount}>
                  {selectedDate ? Math.ceil(selectedDate.total_activity || 0) : 0} Activities
                </Text>
                <Text style={styles.activityBreakdown}>
                  {selectedDate ? Math.ceil(selectedDate.skill_activity || 0) : 0} Skills • {selectedDate ? Math.ceil(selectedDate.habit_checkins || 0) : 0} Habits
                </Text>
              </View>
              
              {selectedDate?.completion_details && selectedDate.completion_details.length > 0 ? (
                <ScrollView style={styles.completionsList} showsVerticalScrollIndicator={false}>
                  {selectedDate.completion_details.map((completion, index) => (
                    <View key={index} style={styles.completionItem}>
                      <View style={styles.completionIcon}>
                        <MaterialIcons 
                          name={completion.type === 'skill' ? 'school' : 'check-circle'} 
                          size={16} 
                          color={completion.type === 'skill' ? '#a855f7' : '#22c55e'} 
                        />
                      </View>
                      <View style={styles.completionContent}>
                        <Text style={styles.completionTitle}>{completion.title}</Text>
                        {completion.day_title && (
                          <Text style={styles.completionSubtitle}>{completion.day_title}</Text>
                        )}
                        <Text style={styles.completionTime}>{completion.completed_at}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noActivity}>
                  <MaterialIcons name="event-busy" size={32} color="#6b7280" />
                  <Text style={styles.noActivityText}>No activities recorded</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendText: {
    fontSize: 12,
    color: colors.gray600,
    marginHorizontal: 8,
  },
  legendColors: {
    flexDirection: 'row',
    gap: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  chartContainer: {
    alignItems: 'center',
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 10,
    color: colors.gray600,
    textAlign: 'center',
  },
  heatmap: {
    // Additional styling if needed
  },
  dateRange: {
    marginTop: 12,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: colors.gray600,
  },
  // Tooltip styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    maxWidth: 320,
    width: '90%',
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  tooltipContent: {
    flex: 1,
  },
  activitySummary: {
    marginBottom: 16,
  },
  activityCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#a855f7',
    marginBottom: 4,
  },
  activityBreakdown: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  completionsList: {
    maxHeight: 200,
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
  completionIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#374151',
    borderRadius: 12,
  },
  completionContent: {
    flex: 1,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 2,
  },
  completionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  completionTime: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  noActivity: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  noActivityText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ActivityHeatMap;