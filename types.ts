
export enum HealthGoal {
  WeightLoss = 'Weight Loss',
  Maintenance = 'Maintenance',
  WeightGain = 'Weight Gain'
}

export interface UserStats {
  name: string;
  age: number;
  weight: number; 
  heightFeet: number;
  heightInches: number;
  gender: 'male' | 'female';
  goal: HealthGoal;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calcium: number;
  iron: number;
  timestamp: number;
}

export interface ExerciseEntry {
  id: string;
  type: string;
  caloriesBurned: number;
  durationMinutes: number;
  timestamp: number;
}

export interface DailyLog {
  date: string;
  food: FoodEntry[];
  exercise: ExerciseEntry[];
  hydration: number; 
  sleepHours: number;
  sedentaryHours: number;
}

export interface AppState {
  user: UserStats;
  logs: DailyLog[];
}
