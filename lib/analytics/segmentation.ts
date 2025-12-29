import { kmeans } from 'ml-kmeans';
import * as ss from 'simple-statistics';

export interface CustomerData {
  id: string;
  points_balance: number;
  total_purchases: number;
  created_at: string;
  last_transaction_date?: string;
}

export interface CustomerSegment {
  customer_id: string;
  segment: 'vip' | 'regular' | 'new' | 'at_risk' | 'churned';
  engagement_score: number;
  last_activity_days: number;
}

export interface SegmentDistribution {
  segment: string;
  count: number;
  percentage: number;
  description: string;
}

/**
 * Rule-based customer segmentation
 * Simple rules that business owners can understand
 */
export function ruleBasedSegmentation(
  customers: CustomerData[],
  now: Date = new Date()
): CustomerSegment[] {
  const segments: CustomerSegment[] = [];
  
  // Calculate thresholds
  const pointsValues = customers.map(c => c.points_balance);
  const purchaseValues = customers.map(c => c.total_purchases);
  // Use quantile if we have enough data, otherwise use a simple threshold
  const vipThreshold = pointsValues.length >= 10 
    ? ss.quantile(pointsValues, 0.9) 
    : Math.max(...pointsValues, 0) * 0.8; // Top 20% if less than 10 customers
  
  for (const customer of customers) {
    const createdDate = new Date(customer.created_at);
    const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const lastTransactionDate = customer.last_transaction_date 
      ? new Date(customer.last_transaction_date)
      : createdDate;
    const daysSinceLastActivity = Math.floor((now.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate engagement score (0-100)
    const pointsScore = Math.min(50, (customer.points_balance / 100) * 50);
    const purchaseScore = Math.min(30, (customer.total_purchases / 20) * 30);
    const recencyScore = Math.max(0, 20 - (daysSinceLastActivity / 30) * 20);
    const engagementScore = Math.round(pointsScore + purchaseScore + recencyScore);
    
    let segment: 'vip' | 'regular' | 'new' | 'at_risk' | 'churned';
    
    // Churned: No activity in over 60 days
    if (daysSinceLastActivity > 60) {
      segment = 'churned';
    }
    // At Risk: No activity in 30-60 days
    else if (daysSinceLastActivity > 30) {
      segment = 'at_risk';
    }
    // New: Registered in last 30 days
    else if (daysSinceCreated <= 30) {
      segment = 'new';
    }
    // VIP: Top 10% by points or purchases
    else {
      const purchaseThreshold = purchaseValues.length >= 10
        ? ss.quantile(purchaseValues, 0.9)
        : Math.max(...purchaseValues, 0) * 0.8;
      if (customer.points_balance >= vipThreshold || customer.total_purchases >= purchaseThreshold) {
        segment = 'vip';
      }
      // Regular: Active in last 30 days, >5 purchases
      else if (daysSinceLastActivity <= 30 && customer.total_purchases >= 5) {
        segment = 'regular';
      }
      // Default to regular
      else {
        segment = 'regular';
      }
    }
    
    segments.push({
      customer_id: customer.id,
      segment,
      engagement_score: engagementScore,
      last_activity_days: daysSinceLastActivity,
    });
  }
  
  return segments;
}

/**
 * K-means clustering segmentation
 * Groups customers by similar behavior patterns
 */
export function kmeansSegmentation(
  customers: CustomerData[],
  k: number = 3
): CustomerSegment[] {
  if (customers.length < k) {
    // Fallback to rule-based if not enough data
    return ruleBasedSegmentation(customers);
  }
  
  // Prepare features: [points_balance, total_purchases, days_since_created, days_since_last_activity]
  const now = new Date();
  const features = customers.map(customer => {
    const createdDate = new Date(customer.created_at);
    const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const lastTransactionDate = customer.last_transaction_date 
      ? new Date(customer.last_transaction_date)
      : createdDate;
    const daysSinceLastActivity = Math.floor((now.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return [
      customer.points_balance,
      customer.total_purchases,
      daysSinceCreated,
      daysSinceLastActivity,
    ];
  });
  
  // Normalize features (simple min-max normalization)
  const normalized = features.map((row, i) => {
    const maxPoints = Math.max(...features.map(f => f[0]), 1);
    const maxPurchases = Math.max(...features.map(f => f[1]), 1);
    const maxDaysCreated = Math.max(...features.map(f => f[2]), 1);
    const maxDaysActivity = Math.max(...features.map(f => f[3]), 1);
    
    return [
      row[0] / maxPoints,
      row[1] / maxPurchases,
      row[2] / maxDaysCreated,
      row[3] / maxDaysActivity,
    ];
  });
  
  // Run k-means
  const result = kmeans(normalized, k, {});
  
  // Map clusters to segments
  // Cluster 0 = highest values (VIP), Cluster k-1 = lowest values (Churned)
  const segments: CustomerSegment[] = customers.map((customer, i) => {
    const cluster = result.clusters[i];
    const daysSinceLastActivity = customer.last_transaction_date
      ? Math.floor((now.getTime() - new Date(customer.last_transaction_date).getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((now.getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    let segment: 'vip' | 'regular' | 'new' | 'at_risk' | 'churned';
    if (cluster === 0) segment = 'vip';
    else if (cluster === k - 1) segment = 'churned';
    else if (daysSinceLastActivity > 30) segment = 'at_risk';
    else segment = 'regular';
    
    // Calculate engagement score
    const pointsScore = Math.min(50, (customer.points_balance / 100) * 50);
    const purchaseScore = Math.min(30, (customer.total_purchases / 20) * 30);
    const recencyScore = Math.max(0, 20 - (daysSinceLastActivity / 30) * 20);
    const engagementScore = Math.round(pointsScore + purchaseScore + recencyScore);
    
    return {
      customer_id: customer.id,
      segment,
      engagement_score: engagementScore,
      last_activity_days: daysSinceLastActivity,
    };
  });
  
  return segments;
}

/**
 * RFM Analysis (Recency, Frequency, Monetary)
 * Scores customers on three dimensions
 */
export function rfmAnalysis(
  customers: CustomerData[]
): CustomerSegment[] {
  const now = new Date();
  
  // Calculate RFM scores
  const rfmScores = customers.map(customer => {
    const lastTransactionDate = customer.last_transaction_date 
      ? new Date(customer.last_transaction_date)
      : new Date(customer.created_at);
    const recency = Math.floor((now.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = customer.total_purchases;
    const monetary = customer.points_balance;
    
    // Score 1-5 (5 = best)
    const recencyScore = recency <= 7 ? 5 : recency <= 30 ? 4 : recency <= 60 ? 3 : recency <= 90 ? 2 : 1;
    const frequencyScore = frequency >= 20 ? 5 : frequency >= 10 ? 4 : frequency >= 5 ? 3 : frequency >= 2 ? 2 : 1;
    const monetaryScore = monetary >= 100 ? 5 : monetary >= 50 ? 4 : monetary >= 25 ? 3 : monetary >= 10 ? 2 : 1;
    
    return { customer, recencyScore, frequencyScore, monetaryScore, recency };
  });
  
  // Segment based on RFM scores
  const segments: CustomerSegment[] = rfmScores.map(({ customer, recencyScore, frequencyScore, monetaryScore, recency }) => {
    const totalScore = recencyScore + frequencyScore + monetaryScore;
    
    let segment: 'vip' | 'regular' | 'new' | 'at_risk' | 'churned';
    if (totalScore >= 13) segment = 'vip';
    else if (recency > 60) segment = 'churned';
    else if (recency > 30) segment = 'at_risk';
    else if (recency <= 30 && frequencyScore >= 3) segment = 'regular';
    else segment = 'new';
    
    const engagementScore = Math.round((totalScore / 15) * 100);
    
    return {
      customer_id: customer.id,
      segment,
      engagement_score: engagementScore,
      last_activity_days: recency,
    };
  });
  
  return segments;
}

/**
 * Get segment distribution
 */
export function getSegmentDistribution(segments: CustomerSegment[]): SegmentDistribution[] {
  const total = segments.length;
  const counts: Record<string, number> = {
    vip: 0,
    regular: 0,
    new: 0,
    at_risk: 0,
    churned: 0,
  };
  
  segments.forEach(s => {
    counts[s.segment] = (counts[s.segment] || 0) + 1;
  });
  
  const descriptions: Record<string, string> = {
    vip: 'Your top 10% most valuable customers',
    regular: 'Active customers who visit often',
    new: 'Recently joined in the last 30 days',
    at_risk: 'Haven\'t visited in 30-60 days',
    churned: 'Haven\'t visited in over 60 days',
  };
  
  return Object.entries(counts).map(([segment, count]) => ({
    segment,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    description: descriptions[segment] || '',
  }));
}

