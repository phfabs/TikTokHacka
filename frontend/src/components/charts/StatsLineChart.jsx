import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../../constants/colors';

const StatsLineChart = ({
  data,
  width = Dimensions.get('window').width - 40,
  height = 200,
  chartConfig = null,
  bezier = true,
  withDots = true,
  withShadow = true,
  withScrollableDot = false,
  formatYLabel = null,
  style = {}
}) => {
  const defaultChartConfig = {
    backgroundColor: '#1e293b',
    backgroundGradientFrom: '#1e293b',
    backgroundGradientTo: '#1e293b',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`, // Purple
    labelColor: (opacity = 1) => `rgba(203, 213, 225, ${opacity})`, // Light slate
    style: {
      borderRadius: 20,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '3',
      stroke: '#a855f7',
      fill: '#1e293b'
    },
    propsForBackgroundLines: {
      strokeDasharray: '3,6',
      stroke: '#475569',
      strokeWidth: 1
    },
    formatYLabel: formatYLabel || ((value) => Math.ceil(value).toString()),
  };

  const finalChartConfig = chartConfig || defaultChartConfig;

  return (
    <View style={[styles.container, style]}>
      <LineChart
        data={data}
        width={width}
        height={height}
        chartConfig={finalChartConfig}
        bezier={bezier}
        withDots={withDots}
        withShadow={withShadow}
        withScrollableDot={withScrollableDot}
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  chart: {
    borderRadius: 20,
  },
});

export default StatsLineChart;