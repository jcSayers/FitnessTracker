import { Injectable, signal } from '@angular/core';
import { Exercise, WorkoutCategory, DifficultyLevel } from '../models/workout.models';

export interface WorkoutBuilderData {
  id?: string;
  name: string;
  description?: string;
  category: WorkoutCategory | null;
  difficulty: DifficultyLevel | null;
  estimatedDuration: number;
  exercises: Exercise[];
  isEditMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WorkoutBuilderService {
  private workoutData = signal<WorkoutBuilderData>({
    name: '',
    description: '',
    category: null,
    difficulty: null,
    estimatedDuration: 30,
    exercises: [],
    isEditMode: false
  });

  getWorkoutData() {
    return this.workoutData();
  }

  setWorkoutData(data: Partial<WorkoutBuilderData>) {
    this.workoutData.update(current => ({ ...current, ...data }));
  }

  addExercise(exercise: Exercise) {
    this.workoutData.update(current => ({
      ...current,
      exercises: [...current.exercises, exercise]
    }));
  }

  /**
   * Insert an exercise at a specific index (used for undo operations).
   * If the index is out of bounds it will append to the end gracefully.
   */
  insertExercise(index: number, exercise: Exercise) {
    this.workoutData.update(current => {
      const exercises = [...current.exercises];
      if (index < 0 || index > exercises.length) {
        exercises.push(exercise);
      } else {
        exercises.splice(index, 0, exercise);
      }
      return { ...current, exercises };
    });
  }

  updateExercise(index: number, exercise: Exercise) {
    this.workoutData.update(current => {
      const exercises = [...current.exercises];
      exercises[index] = exercise;
      return { ...current, exercises };
    });
  }

  removeExercise(index: number) {
    this.workoutData.update(current => ({
      ...current,
      exercises: current.exercises.filter((_, i) => i !== index)
    }));
  }

  moveExerciseUp(index: number) {
    if (index <= 0) return;
    this.workoutData.update(current => {
      const exercises = [...current.exercises];
      [exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]];
      return { ...current, exercises };
    });
  }

  moveExerciseDown(index: number) {
    const currentData = this.workoutData();
    if (index >= currentData.exercises.length - 1) return;
    this.workoutData.update(current => {
      const exercises = [...current.exercises];
      [exercises[index], exercises[index + 1]] = [exercises[index + 1], exercises[index]];
      return { ...current, exercises };
    });
  }

  clearWorkoutData() {
    this.workoutData.set({
      name: '',
      description: '',
      category: null,
      difficulty: null,
      estimatedDuration: 30,
      exercises: [],
      isEditMode: false
    });
  }
}
