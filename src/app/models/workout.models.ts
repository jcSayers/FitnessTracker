// Data models for the Fitness Tracker app

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number; // in seconds for time-based exercises
  restTime?: number; // in seconds
  notes?: string;
  category: ExerciseCategory;
}

export enum ExerciseCategory {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  FLEXIBILITY = 'flexibility',
  SPORTS = 'sports'
}

export interface WorkoutTemplate {
  id: string; // Local ID
  cloudId?: string; // UUID from Supabase
  name: string;
  description?: string;
  exercises: Exercise[];
  estimatedDuration: number; // in minutes
  difficulty: DifficultyLevel;
  category: WorkoutCategory;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  synced?: boolean; // Whether this item has been synced to Supabase
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum WorkoutCategory {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  HIIT = 'hiit',
  YOGA = 'yoga',
  SPORTS = 'sports',
  MIXED = 'mixed'
}

export interface WorkoutSet {
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number; // in seconds
  restTime?: number; // in seconds
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export interface WorkoutInstance {
  id: string; // Local ID
  cloudId?: string; // UUID from Supabase
  templateId: string;
  templateName: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number; // in minutes
  sets: WorkoutSet[];
  status: WorkoutStatus;
  notes?: string;
  location?: string;
  completedExercises: number;
  totalExercises: number;
  createdAt?: Date;
  updatedAt?: Date;
  synced?: boolean; // Whether this item has been synced to Supabase
}

export enum WorkoutStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number; // in minutes
  averageDuration: number; // in minutes
  favoriteCategory: WorkoutCategory;
  currentStreak: number; // days
  longestStreak: number; // days
  totalExercises: number;
  weeklyGoal: number; // workouts per week
  weeklyProgress: number; // completed workouts this week
}

// Helper interfaces for UI components
export interface WorkoutFilter {
  category?: WorkoutCategory;
  difficulty?: DifficultyLevel;
  duration?: {
    min: number;
    max: number;
  };
  searchTerm?: string;
}

export interface ExerciseLog {
  id: string; // Local ID
  cloudId?: string; // UUID from Supabase
  exerciseId: string;
  exerciseName: string;
  date: Date;
  sets: WorkoutSet[];
  personalRecord?: {
    weight?: number;
    reps?: number;
    duration?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  synced?: boolean; // Whether this item has been synced to Supabase
}

