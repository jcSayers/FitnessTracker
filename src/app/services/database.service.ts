import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { 
  WorkoutTemplate, 
  WorkoutInstance, 
  WorkoutStats, 
  ExerciseLog,
  WorkoutStatus,
  WorkoutCategory,
  DifficultyLevel 
} from '../models/workout.models';

export class FitnessDatabase extends Dexie {
  workoutTemplates!: Table<WorkoutTemplate>;
  workoutInstances!: Table<WorkoutInstance>;
  exerciseLogs!: Table<ExerciseLog>;

  constructor() {
    super('FitnessTrackerDB');
    this.version(1).stores({
      workoutTemplates: 'id, name, category, difficulty, createdAt',
      workoutInstances: 'id, templateId, startTime, endTime, status',
      exerciseLogs: 'exerciseId, exerciseName, date'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db = new FitnessDatabase();

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      await this.db.open();
      console.log('Database initialized successfully');
      
      // Add some sample data if database is empty
      const templateCount = await this.db.workoutTemplates.count();
      if (templateCount === 0) {
        await this.addSampleData();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private async addSampleData() {
    const sampleTemplates: WorkoutTemplate[] = [
      {
        id: 'workout-1',
        name: 'Push Day',
        description: 'Chest, shoulders, and triceps workout',
        exercises: [
          {
            id: 'ex-1',
            name: 'Bench Press',
            sets: 4,
            reps: 8,
            weight: 135,
            restTime: 120,
            category: 'strength' as any
          },
          {
            id: 'ex-2',
            name: 'Overhead Press',
            sets: 3,
            reps: 10,
            weight: 95,
            restTime: 90,
            category: 'strength' as any
          },
          {
            id: 'ex-3',
            name: 'Dips',
            sets: 3,
            reps: 12,
            restTime: 60,
            category: 'strength' as any
          }
        ],
        estimatedDuration: 60,
        difficulty: DifficultyLevel.INTERMEDIATE,
        category: WorkoutCategory.STRENGTH,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      },
      {
        id: 'workout-2',
        name: 'HIIT Cardio',
        description: 'High-intensity interval training session',
        exercises: [
          {
            id: 'ex-4',
            name: 'Burpees',
            sets: 4,
            duration: 30,
            restTime: 30,
            category: 'cardio' as any
          },
          {
            id: 'ex-5',
            name: 'Mountain Climbers',
            sets: 4,
            duration: 30,
            restTime: 30,
            category: 'cardio' as any
          },
          {
            id: 'ex-6',
            name: 'Jump Squats',
            sets: 4,
            duration: 30,
            restTime: 30,
            category: 'cardio' as any
          }
        ],
        estimatedDuration: 25,
        difficulty: DifficultyLevel.ADVANCED,
        category: WorkoutCategory.HIIT,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }
    ];

    await this.db.workoutTemplates.bulkAdd(sampleTemplates);
    console.log('Sample data added to database');
  }

  // Workout Template methods
  async getAllWorkoutTemplates(): Promise<WorkoutTemplate[]> {
    const templates = await this.db.workoutTemplates.toArray();

    // Filter for active workouts in memory
    const activeTemplates = templates.filter(t => t.isActive);

    return activeTemplates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getWorkoutTemplate(id: string): Promise<WorkoutTemplate | undefined> {
    return await this.db.workoutTemplates.get(id);
  }

  async addWorkoutTemplate(template: WorkoutTemplate): Promise<string> {
    return await this.db.workoutTemplates.add(template);
  }

  async updateWorkoutTemplate(template: WorkoutTemplate): Promise<number> {
    template.updatedAt = new Date();
    return await this.db.workoutTemplates.update(template.id, {
      name: template.name,
      description: template.description,
      exercises: template.exercises,
      estimatedDuration: template.estimatedDuration,
      difficulty: template.difficulty,
      category: template.category,
      updatedAt: template.updatedAt,
      isActive: template.isActive
    });
  }

  async deleteWorkoutTemplate(id: string): Promise<number> {
    return await this.db.workoutTemplates.update(id, { isActive: false });
  }

  async searchWorkoutTemplates(searchTerm: string): Promise<WorkoutTemplate[]> {
    return await this.db.workoutTemplates
      .where('isActive')
      .equals(1)
      .filter(template => {
        const nameMatch = template.name.toLowerCase().includes(searchTerm.toLowerCase());
        const descriptionMatch = template.description ? template.description.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        return nameMatch || descriptionMatch;
      })
      .toArray();
  }

  async getWorkoutTemplatesByCategory(category: WorkoutCategory): Promise<WorkoutTemplate[]> {
    return await this.db.workoutTemplates
      .where(['category', 'isActive'])
      .equals([category, 1])
      .toArray();
  }

  // Workout Instance methods
  async getAllWorkoutInstances(): Promise<WorkoutInstance[]> {
    const instances = await this.db.workoutInstances.toArray();
    return instances.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  async getWorkoutInstance(id: string): Promise<WorkoutInstance | undefined> {
    return await this.db.workoutInstances.get(id);
  }

  async getActiveWorkoutInstance(): Promise<WorkoutInstance | undefined> {
    return await this.db.workoutInstances
      .where('status')
      .anyOf([WorkoutStatus.IN_PROGRESS, WorkoutStatus.PAUSED])
      .first();
  }

  async addWorkoutInstance(instance: WorkoutInstance): Promise<string> {
    return await this.db.workoutInstances.add(instance);
  }

  async updateWorkoutInstance(instance: WorkoutInstance): Promise<number> {
    return await this.db.workoutInstances.update(instance.id, {
      templateId: instance.templateId,
      templateName: instance.templateName,
      startTime: instance.startTime,
      endTime: instance.endTime,
      totalDuration: instance.totalDuration,
      sets: instance.sets,
      status: instance.status,
      notes: instance.notes,
      location: instance.location,
      completedExercises: instance.completedExercises,
      totalExercises: instance.totalExercises
    });
  }

  async getWorkoutHistory(limit?: number): Promise<WorkoutInstance[]> {
    const instances = await this.db.workoutInstances
      .where('status')
      .equals(WorkoutStatus.COMPLETED)
      .toArray();
    
    const sortedInstances = instances.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    
    if (limit) {
      return sortedInstances.slice(0, limit);
    }
    
    return sortedInstances;
  }

  async getWorkoutsByDateRange(startDate: Date, endDate: Date): Promise<WorkoutInstance[]> {
    return await this.db.workoutInstances
      .where('startTime')
      .between(startDate, endDate)
      .toArray();
  }

  // Exercise Log methods
  async addExerciseLog(log: ExerciseLog): Promise<string> {
    return await this.db.exerciseLogs.add(log);
  }

  async getExerciseLogs(exerciseId: string): Promise<ExerciseLog[]> {
    const logs = await this.db.exerciseLogs
      .where('exerciseId')
      .equals(exerciseId)
      .toArray();
    
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Statistics methods
  async getWorkoutStats(): Promise<WorkoutStats> {
    const allWorkouts = await this.db.workoutInstances
      .where('status')
      .equals(WorkoutStatus.COMPLETED)
      .toArray();

    const totalWorkouts = allWorkouts.length;
    const totalDuration = allWorkouts.reduce((sum, workout) => sum + (workout.totalDuration || 0), 0);
    const averageDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;

    // Calculate favorite category
    const categoryCount = allWorkouts.reduce((acc, workout) => {
      // We'll need to get the template to find the category
      // For now, return a default
      acc[WorkoutCategory.STRENGTH] = (acc[WorkoutCategory.STRENGTH] || 0) + 1;
      return acc;
    }, {} as Record<WorkoutCategory, number>);

    const favoriteCategory = Object.entries(categoryCount).length > 0
      ? Object.entries(categoryCount).reduce((a, b) =>
          categoryCount[a[0] as WorkoutCategory] > categoryCount[b[0] as WorkoutCategory] ? a : b
        )[0] as WorkoutCategory
      : WorkoutCategory.STRENGTH;

    // Calculate current streak
    const currentStreak = await this.calculateCurrentStreak();
    const longestStreak = await this.calculateLongestStreak();

    // Calculate weekly progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklyWorkouts = await this.getWorkoutsByDateRange(weekStart, weekEnd);
    const weeklyProgress = weeklyWorkouts.filter(w => w.status === WorkoutStatus.COMPLETED).length;

    return {
      totalWorkouts,
      totalDuration,
      averageDuration,
      favoriteCategory,
      currentStreak,
      longestStreak,
      totalExercises: allWorkouts.reduce((sum, workout) => sum + workout.totalExercises, 0),
      weeklyGoal: 3, // Default goal
      weeklyProgress
    };
  }

  private async calculateCurrentStreak(): Promise<number> {
    const workouts = await this.db.workoutInstances
      .where('status')
      .equals(WorkoutStatus.COMPLETED)
      .toArray();

    const sortedWorkouts = workouts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (const workout of sortedWorkouts) {
      const workoutDate = new Date(workout.startTime);
      workoutDate.setHours(23, 59, 59, 999);
      
      const daysDiff = Math.floor((today.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak + 1) {
        break;
      }
    }

    return streak;
  }

  private async calculateLongestStreak(): Promise<number> {
    const workouts = await this.db.workoutInstances
      .where('status')
      .equals(WorkoutStatus.COMPLETED)
      .toArray();

    const sortedWorkouts = workouts.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    let longestStreak = 0;
    let currentStreak = 0;
    let lastWorkoutDate: Date | null = null;

    for (const workout of sortedWorkouts) {
      const workoutDate = new Date(workout.startTime);
      workoutDate.setHours(0, 0, 0, 0);

      if (lastWorkoutDate) {
        const daysDiff = Math.floor((workoutDate.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          currentStreak++;
        } else if (daysDiff > 1) {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      lastWorkoutDate = workoutDate;
    }

    return Math.max(longestStreak, currentStreak);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await this.db.workoutTemplates.clear();
    await this.db.workoutInstances.clear();
    await this.db.exerciseLogs.clear();
  }

  async exportData(): Promise<any> {
    return {
      workoutTemplates: await this.db.workoutTemplates.toArray(),
      workoutInstances: await this.db.workoutInstances.toArray(),
      exerciseLogs: await this.db.exerciseLogs.toArray()
    };
  }

  async importData(data: any): Promise<void> {
    if (data.workoutTemplates) {
      await this.db.workoutTemplates.bulkAdd(data.workoutTemplates);
    }
    if (data.workoutInstances) {
      await this.db.workoutInstances.bulkAdd(data.workoutInstances);
    }
    if (data.exerciseLogs) {
      await this.db.exerciseLogs.bulkAdd(data.exerciseLogs);
    }
  }
}

