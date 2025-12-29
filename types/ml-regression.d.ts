declare module 'ml-regression' {
  export interface ScoreResult {
    r2: number;
  }

  export class SimpleLinearRegression {
    constructor(x: number[], y: number[]);
    predict(x: number): number;
    score(x: number[], y: number[]): ScoreResult;
  }
}
