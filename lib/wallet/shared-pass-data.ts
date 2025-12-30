/**
 * Shared Pass Data Utilities
 * 
 * Common logic used by both Apple Wallet and Google Wallet implementations.
 * This ensures consistency between both wallet types.
 */

const POINTS_FOR_COFFEE = 10;
const POINTS_FOR_MEAL = 25;

export interface RewardStatus {
  rewardEarned: boolean;
  rewardType: 'coffee' | 'meal' | null;
  earnedMeal: boolean;
  earnedCoffee: boolean;
  rewardMessage: string | null;
  rewardLabel: string | null;
}

/**
 * Calculates reward status based on points and redeemed rewards
 * @param points - Current points balance
 * @param redeemedRewards - Object with coffees and meals arrays
 * @returns Reward status object
 */
export function calculateRewards(
  points: number,
  redeemedRewards?: { coffees?: number[]; meals?: number[] } | null
): RewardStatus {
  const currentPoints = Number(points) || 0;
  const redeemed = redeemedRewards || { coffees: [], meals: [] };
  
  // Ensure arrays exist and convert to numbers
  const redeemedCoffees = Array.isArray(redeemed.coffees)
    ? redeemed.coffees.map(Number).filter((n: number) => !isNaN(n))
    : [];
  const redeemedMeals = Array.isArray(redeemed.meals)
    ? redeemed.meals.map(Number).filter((n: number) => !isNaN(n))
    : [];

  let rewardEarned = false;
  let rewardType: 'coffee' | 'meal' | null = null;
  let earnedMeal = false;
  let earnedCoffee = false;
  let rewardMessage: string | null = null;
  let rewardLabel: string | null = null;

  // Check meal first (higher value reward) - only show if not redeemed
  if (currentPoints >= POINTS_FOR_MEAL && currentPoints % POINTS_FOR_MEAL === 0 && !redeemedMeals.includes(currentPoints)) {
    earnedMeal = true;
    rewardEarned = true;
    rewardType = 'meal';
  }

  // Check coffee (can be earned simultaneously with meal at 50, 100, etc.)
  if (currentPoints >= POINTS_FOR_COFFEE && currentPoints % POINTS_FOR_COFFEE === 0 && !redeemedCoffees.includes(currentPoints)) {
    earnedCoffee = true;
    // Only set rewardEarned/rewardType if meal wasn't already earned
    if (!earnedMeal) {
      rewardEarned = true;
      rewardType = 'coffee';
    }
  }

  // Generate reward message
  if (earnedMeal && earnedCoffee) {
    rewardMessage = '🎉 You earned BOTH a FREE MEAL and FREE COFFEE! 🍽️☕️';
    rewardLabel = 'You just earned rewards!';
  } else if (earnedMeal) {
    rewardMessage = '🎉 You earned a FREE MEAL! 🍽️';
    rewardLabel = 'You just earned a reward!';
  } else if (earnedCoffee) {
    rewardMessage = '🎉 You earned a FREE COFFEE! ☕️';
    rewardLabel = 'You just earned a reward!';
  } else {
    rewardMessage = 'No reward yet! Keep shopping, you are almost there!';
    rewardLabel = 'KEEP GOING';
  }

  return {
    rewardEarned,
    rewardType,
    earnedMeal,
    earnedCoffee,
    rewardMessage,
    rewardLabel,
  };
}

/**
 * Gets reward message for a specific reward type
 * @param rewardType - 'coffee' or 'meal'
 * @returns Reward message string
 */
export function getRewardMessage(rewardType: 'coffee' | 'meal'): string {
  return rewardType === 'meal'
    ? '🎉 You earned a FREE MEAL! 🍽️'
    : '🎉 You earned a FREE COFFEE! ☕️';
}

/**
 * Gets tiger image configuration based on points
 * @param points - Current points balance
 * @returns Object with current points in cycle and remaining stamps
 */
export function getTigerImageData(points: number): {
  currentPoints: number;
  stampsRemaining: number;
} {
  const currentPoints = points % 10 === 0 && points > 0 ? 10 : points % 10;
  const stampsRemaining = 10 - currentPoints;

  return {
    currentPoints,
    stampsRemaining,
  };
}

/**
 * Gets the points required for coffee reward
 */
export function getPointsForCoffee(): number {
  return POINTS_FOR_COFFEE;
}

/**
 * Gets the points required for meal reward
 */
export function getPointsForMeal(): number {
  return POINTS_FOR_MEAL;
}

