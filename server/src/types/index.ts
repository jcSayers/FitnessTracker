// Data models for Supabase sync

export enum ExerciseCategory {
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  FLEXIBILITY = 'flexibility',
  SPORTS = 'sports'
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

export enum WorkoutStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  notes?: string;
  category: ExerciseCategory;
}

export interface WorkoutTemplate {
  id: string; // Local ID (e.g., "workout-1") - stored in local_id column after sync
  cloudId?: string; // UUID from Supabase - server assigns this, stored in id column
  userId: string;
  name: string;
  description?: string;
  exercises: Exercise[];
  estimatedDuration: number;
  difficulty: DifficultyLevel;
  category: WorkoutCategory;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  localId?: string; // Original local ID stored in database
}

export interface WorkoutSet {
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export interface WorkoutInstance {
  id: string; // Local ID (e.g., "instance-xyz") - stored in local_id column after sync
  cloudId?: string; // UUID from Supabase - server assigns this, stored in id column
  userId: string;
  templateId: string;
  templateName: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  sets: WorkoutSet[];
  status: WorkoutStatus;
  notes?: string;
  location?: string;
  completedExercises: number;
  totalExercises: number;
  createdAt: Date;
  updatedAt: Date;
  localId?: string; // Original local ID stored in database
}

export interface ExerciseLog {
  id: string; // Local ID (e.g., "log-abc") - stored in local_id column after sync
  cloudId?: string; // UUID from Supabase - server assigns this, stored in id column
  userId: string;
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
  localId?: string; // Original local ID stored in database
}

export interface SyncRequest {
  userId: string;
  workoutTemplates?: WorkoutTemplate[];
  workoutInstances?: WorkoutInstance[];
  exerciseLogs?: ExerciseLog[];
  timestamp: Date;
}

export interface SyncResponse {
  success: boolean;
  message?: string;
  data?: {
    workoutTemplates?: Array<{id: string; localId: string}>;
    workoutInstances?: Array<{id: string; localId: string}>;
    exerciseLogs?: Array<{id: string; localId: string}>;
  };
  error?: string;
}

export interface SyncStatus {
  userId: string;
  lastSyncTime: Date;
  syncedTemplates: number;
  syncedInstances: number;
  syncedLogs: number;
  status: 'success' | 'error' | 'pending';
}
