import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { colors } from '../../constants/colors';

const StatsBarChart = ({
  data,
  width = Dimensions.get('window').width - 40,
  height = 200,
  chartConfig = null,
  withHorizontalLabels = true,
  withVerticalLabels = true,
  fromZero = true,
  showValuesOnTopOfBars = false,
  style = {}
}) => {
  const defaultChartConfig = {
    backgroundColor: '#1e293b',
    backgroundGradientFrom: '#1e293b',
    backgroundGradientTo: '#1e293b',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green
    labelColor: (opacity = 1) => `rgba(203, 213, 225, ${opacity})`, // Light slate
    style: {
      borderRadius: 20,
    },
    propsForBackgroundLines: {
      strokeDasharray: '3,6',
      stroke: '#475569',
      strokeWidth: 1
    },
    barPercentage: 0.75,
  };

  const finalChartConfig = chartConfig || defaultChartConfig;

  return (
    <View style={[styles.container, style]}>
      <BarChart
        data={data}
        width={width}
        height={height}
        chartConfig={finalChartConfig}
        withHorizontalLabels={withHorizontalLabels}
        withVerticalLabels={withVerticalLabels}
        fromZero={fromZero}
        showValuesOnTopOfBars={showValuesOnTopOfBars}
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chart: {
    borderRadius: 16,
  },
});

export default StatsBarChart;