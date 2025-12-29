import * as ss from 'simple-statistics';

export interface TimeSeriesData {
  date: string;
  value: number;
}

/**
 * Calculate correlation between two time series
 */
export function calculateCorrelation(
  series1: TimeSeriesData[],
  series2: TimeSeriesData[]
): number {
  if (series1.length !== series2.length || series1.length < 2) {
    return 0;
  }
  
  // Align data by date
  const dateMap = new Map<string, { v1: number; v2: number }>();
  series1.forEach(d => {
    dateMap.set(d.date, { v1: d.value, v2: 0 });
  });
  series2.forEach(d => {
    const existing = dateMap.get(d.date);
    if (existing) {
      existing.v2 = d.value;
    }
  });
  
  const aligned = Array.from(dateMap.values()).filter(d => d.v2 > 0);
  if (aligned.length < 2) return 0;
  
  const values1 = aligned.map(d => d.v1);
  const values2 = aligned.map(d => d.v2);
  
  return ss.sampleCorrelation(values1, values2);
}

/**
 * Detect trend direction
 */
export function detectTrend(data: TimeSeriesData[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable';
  
  const values = data.map(d => d.value);
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = ss.mean(firstHalf);
  const secondAvg = ss.mean(secondHalf);
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

/**
 * Detect anomalies using Z-score method
 */
export function detectAnomalies(
  data: TimeSeriesData[],
  threshold: number = 2.5
): TimeSeriesData[] {
  if (data.length < 3) return [];
  
  const values = data.map(d => d.value);
  const mean = ss.mean(values);
  const stdDev = ss.standardDeviation(values);
  
  if (stdDev === 0) return [];
  
  const anomalies: TimeSeriesData[] = [];
  
  data.forEach((point, i) => {
    const zScore = Math.abs((point.value - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push(point);
    }
  });
  
  return anomalies;
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(
  data: TimeSeriesData[],
  period: 'day' | 'week' | 'month' = 'month'
): number {
  if (data.length < 2) return 0;
  
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  
  if (first === 0) return last > 0 ? 100 : 0;
  
  return ((last - first) / first) * 100;
}


