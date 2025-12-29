import * as ss from 'simple-statistics';

export interface Transaction {
  customer_id: string;
  created_at: string;
  type: string;
}

export interface Customer {
  id: string;
  points_balance: number;
  total_purchases: number;
  created_at: string;
}

export interface NextPurchasePrediction {
  customer_id: string;
  predicted_date: string;
  confidence: 'high' | 'medium' | 'low';
  days_until: number;
}

export interface ChurnRisk {
  customer_id: string;
  risk_score: number; // 0-100
  probability: number; // 0-1
  days_inactive: number;
  reason: string;
}

export interface CustomerLifetimeValue {
  customer_id: string;
  clv: number;
  predicted_purchases: number;
  predicted_value: number;
}

/**
 * Predict next purchase date for customers
 * Based on historical purchase intervals
 */
export function predictNextPurchase(
  customers: Customer[],
  transactions: Transaction[]
): NextPurchasePrediction[] {
  const predictions: NextPurchasePrediction[] = [];
  const now = new Date();
  
  for (const customer of customers) {
    // Get customer's transactions
    const customerTransactions = transactions
      .filter(t => t.customer_id === customer.id && t.type === 'purchase')
      .map(t => new Date(t.created_at))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (customerTransactions.length < 2) {
      // Not enough data, use average for new customers
      const daysSinceCreated = Math.floor((now.getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const avgInterval = 14; // Default 2 weeks
      const predictedDate = new Date(now);
      predictedDate.setDate(predictedDate.getDate() + avgInterval);
      
      predictions.push({
        customer_id: customer.id,
        predicted_date: predictedDate.toISOString().split('T')[0],
        confidence: 'low',
        days_until: avgInterval,
      });
      continue;
    }
    
    // Calculate intervals between purchases
    const intervals: number[] = [];
    for (let i = 1; i < customerTransactions.length; i++) {
      const days = Math.floor(
        (customerTransactions[i].getTime() - customerTransactions[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      intervals.push(days);
    }
    
    // Predict next purchase based on average interval
    const avgInterval = ss.mean(intervals);
    const lastPurchase = customerTransactions[customerTransactions.length - 1];
    const daysSinceLastPurchase = Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
    
    // If already past average interval, predict soon
    const predictedInterval = daysSinceLastPurchase >= avgInterval ? 3 : avgInterval - daysSinceLastPurchase;
    const predictedDate = new Date(now);
    predictedDate.setDate(predictedDate.getDate() + predictedInterval);
    
    // Calculate confidence based on consistency
    const stdDev = intervals.length > 1 ? ss.standardDeviation(intervals) : avgInterval;
    const coefficientOfVariation = stdDev / avgInterval;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (coefficientOfVariation < 0.3 && intervals.length >= 3) confidence = 'high';
    else if (coefficientOfVariation < 0.5 && intervals.length >= 2) confidence = 'medium';
    
    predictions.push({
      customer_id: customer.id,
      predicted_date: predictedDate.toISOString().split('T')[0],
      confidence,
      days_until: Math.max(1, Math.round(predictedInterval)),
    });
  }
  
  return predictions;
}

/**
 * Calculate churn risk for customers
 * Rule-based + simple probability
 */
export function calculateChurnRisk(
  customers: Customer[],
  transactions: Transaction[]
): ChurnRisk[] {
  const risks: ChurnRisk[] = [];
  const now = new Date();
  
  for (const customer of customers) {
    // Get last transaction date
    const customerTransactions = transactions
      .filter(t => t.customer_id === customer.id)
      .map(t => new Date(t.created_at))
      .sort((a, b) => b.getTime() - a.getTime());
    
    const lastTransaction = customerTransactions.length > 0
      ? customerTransactions[0]
      : new Date(customer.created_at);
    
    const daysInactive = Math.floor((now.getTime() - lastTransaction.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate risk score (0-100)
    let riskScore = 0;
    let reason = '';
    
    if (daysInactive > 60) {
      riskScore = 90;
      reason = 'No activity in over 60 days';
    } else if (daysInactive > 30) {
      riskScore = 60;
      reason = 'No activity in 30-60 days';
    } else if (daysInactive > 14) {
      riskScore = 30;
      reason = 'No activity in 14-30 days';
    } else {
      riskScore = 10;
      reason = 'Recently active';
    }
    
    // Adjust based on purchase frequency
    const avgDaysBetweenPurchases = customerTransactions.length > 1
      ? ss.mean(
          Array.from({ length: customerTransactions.length - 1 }, (_, i) =>
            Math.floor((customerTransactions[i].getTime() - customerTransactions[i + 1].getTime()) / (1000 * 60 * 60 * 24))
          )
        )
      : 14;
    
    if (daysInactive > avgDaysBetweenPurchases * 2) {
      riskScore = Math.min(100, riskScore + 20);
      reason += ' (longer than usual interval)';
    }
    
    // Convert to probability (0-1)
    const probability = riskScore / 100;
    
    risks.push({
      customer_id: customer.id,
      risk_score: riskScore,
      probability,
      days_inactive: daysInactive,
      reason,
    });
  }
  
  return risks.sort((a, b) => b.risk_score - a.risk_score);
}

/**
 * Calculate Customer Lifetime Value (CLV)
 * Simple calculation based on purchase patterns
 */
export function calculateCustomerLifetimeValue(
  customers: Customer[],
  transactions: Transaction[],
  averagePurchaseValue: number = 1 // Default 1 point per purchase
): CustomerLifetimeValue[] {
  const clvs: CustomerLifetimeValue[] = [];
  const now = new Date();
  
  for (const customer of customers) {
    const customerTransactions = transactions
      .filter(t => t.customer_id === customer.id && t.type === 'purchase')
      .map(t => new Date(t.created_at))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const customerAge = Math.floor((now.getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const totalPurchases = customer.total_purchases || customerTransactions.length;
    
    // Calculate purchase frequency (purchases per month)
    const monthsActive = Math.max(1, customerAge / 30);
    const purchasesPerMonth = totalPurchases / monthsActive;
    
    // Predict future purchases (assume customer stays for 12 more months)
    const predictedMonths = 12;
    const predictedPurchases = purchasesPerMonth * predictedMonths;
    
    // Calculate predicted value
    const predictedValue = predictedPurchases * averagePurchaseValue;
    
    // CLV = current value + predicted future value
    const currentValue = customer.points_balance * averagePurchaseValue;
    const clv = currentValue + predictedValue;
    
    clvs.push({
      customer_id: customer.id,
      clv: Math.round(clv * 100) / 100,
      predicted_purchases: Math.round(predictedPurchases * 10) / 10,
      predicted_value: Math.round(predictedValue * 100) / 100,
    });
  }
  
  return clvs.sort((a, b) => b.clv - a.clv);
}


