import { SimpleLinearRegression } from 'ml-regression';
import * as ss from 'simple-statistics';

export interface ForecastData {
  date: string;
  value: number;
}

export interface ForecastResult {
  historical: ForecastData[];
  forecast: ForecastData[];
  confidence: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

/**
 * Simple linear regression forecast
 * Predicts future values based on historical trend
 */
export function linearRegressionForecast(
  data: ForecastData[],
  periods: number = 7
): ForecastResult {
  if (data.length < 2) {
    return {
      historical: data,
      forecast: [],
      confidence: 'low',
      trend: 'stable',
      percentageChange: 0,
    };
  }

  // Convert dates to numeric indices
  const X = data.map((_, i) => i);
  const y = data.map(d => d.value);

  // Fit linear regression
  const regression = new SimpleLinearRegression(X, y);

  // Generate forecast
  const lastIndex = data.length - 1;
  const forecast: ForecastData[] = [];
  
  for (let i = 1; i <= periods; i++) {
    const futureIndex = lastIndex + i;
    const predictedValue = regression.predict(futureIndex);
    const futureDate = new Date(data[lastIndex].date);
    futureDate.setDate(futureDate.getDate() + i);
    
    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      value: Math.max(0, Math.round(predictedValue)), // Ensure non-negative
    });
  }

  // Calculate trend
  const firstHalf = y.slice(0, Math.floor(y.length / 2));
  const secondHalf = y.slice(Math.floor(y.length / 2));
  const firstAvg = ss.mean(firstHalf);
  const secondAvg = ss.mean(secondHalf);
  const percentageChange = firstAvg > 0 
    ? ((secondAvg - firstAvg) / firstAvg) * 100 
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percentageChange > 5) trend = 'up';
  else if (percentageChange < -5) trend = 'down';

  // Calculate confidence based on data quality (R-squared)
  // Use the score method from BaseRegression which returns R-squared
  const scoreResult = regression.score(X, y);
  const rSquared = scoreResult.r2 || 0;
  
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (rSquared > 0.7 && data.length >= 7) confidence = 'high';
  else if (rSquared > 0.4 && data.length >= 4) confidence = 'medium';

  return {
    historical: data,
    forecast,
    confidence,
    trend,
    percentageChange: Math.round(percentageChange * 10) / 10,
  };
}

/**
 * Moving average forecast
 * Simple average of last N periods
 */
export function movingAverageForecast(
  data: ForecastData[],
  periods: number = 7,
  windowSize: number = 7
): ForecastResult {
  if (data.length < windowSize) {
    return {
      historical: data,
      forecast: [],
      confidence: 'low',
      trend: 'stable',
      percentageChange: 0,
    };
  }

  // Calculate moving average
  const values = data.map(d => d.value);
  const recentValues = values.slice(-windowSize);
  const avg = ss.mean(recentValues);

  // Generate forecast (flat line at average)
  const forecast: ForecastData[] = [];
  const lastDate = new Date(data[data.length - 1].date);
  
  for (let i = 1; i <= periods; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    
    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      value: Math.max(0, Math.round(avg)),
    });
  }

  // Calculate trend
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = ss.mean(firstHalf);
  const secondAvg = ss.mean(secondHalf);
  const percentageChange = firstAvg > 0 
    ? ((secondAvg - firstAvg) / firstAvg) * 100 
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percentageChange > 5) trend = 'up';
  else if (percentageChange < -5) trend = 'down';

  return {
    historical: data,
    forecast,
    confidence: data.length >= 14 ? 'medium' : 'low',
    trend,
    percentageChange: Math.round(percentageChange * 10) / 10,
  };
}

/**
 * Exponential smoothing forecast (simple)
 * Weighted average with more weight on recent values
 */
export function exponentialSmoothingForecast(
  data: ForecastData[],
  periods: number = 7,
  alpha: number = 0.3
): ForecastResult {
  if (data.length < 2) {
    return {
      historical: data,
      forecast: [],
      confidence: 'low',
      trend: 'stable',
      percentageChange: 0,
    };
  }

  const values = data.map(d => d.value);
  
  // Calculate exponential smoothing
  let smoothed = values[0];
  const smoothedValues: number[] = [smoothed];
  
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    smoothedValues.push(smoothed);
  }

  // Generate forecast
  const forecast: ForecastData[] = [];
  const lastDate = new Date(data[data.length - 1].date);
  const lastSmoothed = smoothedValues[smoothedValues.length - 1];
  
  for (let i = 1; i <= periods; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    
    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      value: Math.max(0, Math.round(lastSmoothed)),
    });
  }

  // Calculate trend
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = ss.mean(firstHalf);
  const secondAvg = ss.mean(secondHalf);
  const percentageChange = firstAvg > 0 
    ? ((secondAvg - firstAvg) / firstAvg) * 100 
    : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percentageChange > 5) trend = 'up';
  else if (percentageChange < -5) trend = 'down';

  return {
    historical: data,
    forecast,
    confidence: data.length >= 7 ? 'medium' : 'low',
    trend,
    percentageChange: Math.round(percentageChange * 10) / 10,
  };
}

