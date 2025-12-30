import {
  calculateRewards,
  getRewardMessage,
  getTigerImageData,
  getPointsForCoffee,
  getPointsForMeal,
} from '@/lib/wallet/shared-pass-data';

describe('Shared Pass Data Utilities', () => {
  describe('calculateRewards', () => {
    it('should return no reward for 0 points', () => {
      const result = calculateRewards(0);

      expect(result.rewardEarned).toBe(false);
      expect(result.rewardType).toBeNull();
      expect(result.earnedMeal).toBe(false);
      expect(result.earnedCoffee).toBe(false);
    });

    it('should detect coffee reward at 10 points', () => {
      const result = calculateRewards(10);

      expect(result.rewardEarned).toBe(true);
      expect(result.rewardType).toBe('coffee');
      expect(result.earnedCoffee).toBe(true);
      expect(result.earnedMeal).toBe(false);
    });

    it('should detect meal reward at 25 points', () => {
      const result = calculateRewards(25);

      expect(result.rewardEarned).toBe(true);
      expect(result.rewardType).toBe('meal');
      expect(result.earnedMeal).toBe(true);
      expect(result.earnedCoffee).toBe(false);
    });

    it('should detect both rewards at 50 points', () => {
      const result = calculateRewards(50);

      expect(result.rewardEarned).toBe(true);
      expect(result.rewardType).toBe('meal'); // Meal takes priority
      expect(result.earnedMeal).toBe(true);
      expect(result.earnedCoffee).toBe(true);
    });

    it('should detect both rewards at 100 points', () => {
      const result = calculateRewards(100);

      expect(result.rewardEarned).toBe(true);
      expect(result.rewardType).toBe('meal');
      expect(result.earnedMeal).toBe(true);
      expect(result.earnedCoffee).toBe(true);
    });

    it('should not detect reward at 9 points', () => {
      const result = calculateRewards(9);

      expect(result.rewardEarned).toBe(false);
      expect(result.earnedCoffee).toBe(false);
      expect(result.earnedMeal).toBe(false);
    });

    it('should not detect reward at 24 points', () => {
      const result = calculateRewards(24);

      expect(result.rewardEarned).toBe(false);
      expect(result.earnedCoffee).toBe(false);
      expect(result.earnedMeal).toBe(false);
    });

    it('should not detect reward if already redeemed', () => {
      const result = calculateRewards(10, {
        coffees: [10],
        meals: [],
      });

      expect(result.rewardEarned).toBe(false);
      expect(result.earnedCoffee).toBe(false);
    });

    it('should not detect meal if already redeemed', () => {
      const result = calculateRewards(25, {
        coffees: [],
        meals: [25],
      });

      expect(result.rewardEarned).toBe(false);
      expect(result.earnedMeal).toBe(false);
    });

    it('should detect new reward even if previous ones were redeemed', () => {
      const result = calculateRewards(20, {
        coffees: [10], // 10 was redeemed
        meals: [],
      });

      expect(result.rewardEarned).toBe(true);
      expect(result.rewardType).toBe('coffee');
      expect(result.earnedCoffee).toBe(true);
    });

    it('should handle null redeemed rewards', () => {
      const result = calculateRewards(10, null);

      expect(result.rewardEarned).toBe(true);
      expect(result.earnedCoffee).toBe(true);
    });

    it('should handle undefined redeemed rewards', () => {
      const result = calculateRewards(10, undefined);

      expect(result.rewardEarned).toBe(true);
      expect(result.earnedCoffee).toBe(true);
    });

    it('should handle empty redeemed rewards object', () => {
      const result = calculateRewards(10, {});

      expect(result.rewardEarned).toBe(true);
      expect(result.earnedCoffee).toBe(true);
    });

    it('should handle missing arrays in redeemed rewards', () => {
      const result = calculateRewards(10, {
        coffees: undefined,
        meals: undefined,
      } as any);

      expect(result.rewardEarned).toBe(true);
      expect(result.earnedCoffee).toBe(true);
    });

    it('should filter out invalid numbers in redeemed arrays', () => {
      const result = calculateRewards(10, {
        coffees: [10, 'invalid' as any, NaN, null as any],
        meals: [],
      });

      expect(result.rewardEarned).toBe(false); // 10 is in array (even if mixed with invalid)
    });

    it('should generate correct reward messages', () => {
      const bothResult = calculateRewards(50);
      expect(bothResult.rewardMessage).toContain('BOTH');
      expect(bothResult.rewardMessage).toContain('MEAL');
      expect(bothResult.rewardMessage).toContain('COFFEE');

      const mealResult = calculateRewards(25);
      expect(mealResult.rewardMessage).toContain('MEAL');
      expect(mealResult.rewardMessage).not.toContain('COFFEE');

      const coffeeResult = calculateRewards(10);
      expect(coffeeResult.rewardMessage).toContain('COFFEE');
      expect(coffeeResult.rewardMessage).not.toContain('MEAL');

      const noRewardResult = calculateRewards(5);
      expect(noRewardResult.rewardMessage).toContain('No reward yet');
    });

    it('should handle string points (convert to number)', () => {
      const result = calculateRewards('10' as any);

      expect(result.rewardEarned).toBe(true);
      expect(result.earnedCoffee).toBe(true);
    });

    it('should handle invalid points (default to 0)', () => {
      const result = calculateRewards('invalid' as any);

      expect(result.rewardEarned).toBe(false);
    });
  });

  describe('getRewardMessage', () => {
    it('should return meal message for meal type', () => {
      const message = getRewardMessage('meal');
      expect(message).toContain('MEAL');
      expect(message).not.toContain('COFFEE');
    });

    it('should return coffee message for coffee type', () => {
      const message = getRewardMessage('coffee');
      expect(message).toContain('COFFEE');
      expect(message).not.toContain('MEAL');
    });
  });

  describe('getTigerImageData', () => {
    it('should return correct data for 0 points', () => {
      const result = getTigerImageData(0);
      expect(result.currentPoints).toBe(0);
      expect(result.stampsRemaining).toBe(10);
    });

    it('should return correct data for 5 points', () => {
      const result = getTigerImageData(5);
      expect(result.currentPoints).toBe(5);
      expect(result.stampsRemaining).toBe(5);
    });

    it('should return correct data for 10 points (full cycle)', () => {
      const result = getTigerImageData(10);
      expect(result.currentPoints).toBe(10);
      expect(result.stampsRemaining).toBe(0);
    });

    it('should return correct data for 15 points (new cycle)', () => {
      const result = getTigerImageData(15);
      expect(result.currentPoints).toBe(5);
      expect(result.stampsRemaining).toBe(5);
    });

    it('should return correct data for 20 points', () => {
      const result = getTigerImageData(20);
      expect(result.currentPoints).toBe(10);
      expect(result.stampsRemaining).toBe(0);
    });

    it('should handle large point values', () => {
      const result = getTigerImageData(125);
      expect(result.currentPoints).toBe(5);
      expect(result.stampsRemaining).toBe(5);
    });
  });

  describe('getPointsForCoffee', () => {
    it('should return 10', () => {
      expect(getPointsForCoffee()).toBe(10);
    });
  });

  describe('getPointsForMeal', () => {
    it('should return 25', () => {
      expect(getPointsForMeal()).toBe(25);
    });
  });
});

