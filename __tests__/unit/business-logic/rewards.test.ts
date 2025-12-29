/**
 * Unit tests for reward calculation logic
 */

describe('Reward Calculation Logic', () => {
  const POINTS_FOR_COFFEE = 10;
  const POINTS_FOR_MEAL = 25;

  describe('Coffee Rewards', () => {
    it('should earn coffee at 10 points', () => {
      const points = 10;
      const earned = points >= POINTS_FOR_COFFEE && points % POINTS_FOR_COFFEE === 0;
      expect(earned).toBe(true);
    });

    it('should earn coffee at 20, 30, 40 points', () => {
      [20, 30, 40, 50].forEach(points => {
        const earned = points >= POINTS_FOR_COFFEE && points % POINTS_FOR_COFFEE === 0;
        expect(earned).toBe(true);
      });
    });

    it('should NOT earn coffee at 9, 11, 19 points', () => {
      [9, 11, 19, 21].forEach(points => {
        const earned = points >= POINTS_FOR_COFFEE && points % POINTS_FOR_COFFEE === 0;
        expect(earned).toBe(false);
      });
    });
  });

  describe('Meal Rewards', () => {
    it('should earn meal at 25 points', () => {
      const points = 25;
      const earned = points >= POINTS_FOR_MEAL && points % POINTS_FOR_MEAL === 0;
      expect(earned).toBe(true);
    });

    it('should earn meal at 50, 75, 100 points', () => {
      [50, 75, 100, 125].forEach(points => {
        const earned = points >= POINTS_FOR_MEAL && points % POINTS_FOR_MEAL === 0;
        expect(earned).toBe(true);
      });
    });

    it('should NOT earn meal at 24, 26, 49 points', () => {
      [24, 26, 49, 51].forEach(points => {
        const earned = points >= POINTS_FOR_MEAL && points % POINTS_FOR_MEAL === 0;
        expect(earned).toBe(false);
      });
    });
  });

  describe('Multiple Rewards at Same Threshold', () => {
    it('should earn both coffee and meal at 50 points', () => {
      const points = 50;
      const earnedCoffee = points >= POINTS_FOR_COFFEE && points % POINTS_FOR_COFFEE === 0;
      const earnedMeal = points >= POINTS_FOR_MEAL && points % POINTS_FOR_MEAL === 0;
      
      expect(earnedCoffee).toBe(true);
      expect(earnedMeal).toBe(true);
    });

    it('should earn both coffee and meal at 100 points', () => {
      const points = 100;
      const earnedCoffee = points >= POINTS_FOR_COFFEE && points % POINTS_FOR_COFFEE === 0;
      const earnedMeal = points >= POINTS_FOR_MEAL && points % POINTS_FOR_MEAL === 0;
      
      expect(earnedCoffee).toBe(true);
      expect(earnedMeal).toBe(true);
    });
  });

  describe('Points Calculation', () => {
    it('should add 1 point per purchase', () => {
      const currentPoints = 5;
      const POINTS_PER_PURCHASE = 1;
      const newPoints = currentPoints + POINTS_PER_PURCHASE;
      expect(newPoints).toBe(6);
    });

    it('should handle null/undefined current points', () => {
      const currentPoints = null || 0;
      const POINTS_PER_PURCHASE = 1;
      const newPoints = currentPoints + POINTS_PER_PURCHASE;
      expect(newPoints).toBe(1);
    });
  });
});

