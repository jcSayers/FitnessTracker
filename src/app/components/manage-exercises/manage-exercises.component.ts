import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { WorkoutBuilderService } from '../../services/workout-builder.service';
import { DatabaseService } from '../../services/database.service';
import { SvgIconComponent, ToastService } from '../../shared';
import { WorkoutTemplate, Exercise } from '../../models/workout.models';

@Component({
  selector: 'app-manage-exercises',
  standalone: true,
  imports: [
    CommonModule,
    SvgIconComponent
  ],
  templateUrl: './manage-exercises.component.html',
  styleUrls: ['./manage-exercises.component.scss']
})
export class ManageExercisesComponent implements OnInit {
  private router = inject(Router);
  private workoutBuilder = inject(WorkoutBuilderService);
  private databaseService = inject(DatabaseService);
  private toastService = inject(ToastService);

  workoutData = signal(this.workoutBuilder.getWorkoutData());
  isSaving = signal(false);
  private lastDeleted: { exercise: Exercise; index: number } | null = null;

  ngOnInit() {
    const data = this.workoutBuilder.getWorkoutData();

    // If no workout name, redirect back to create workout
    if (!data.name) {
      this.router.navigate(['/create-workout']);
    }
  }

  onAddExercise() {
    this.router.navigate(['/add-exercise']);
  }

  onEditExercise(index: number) {
    this.router.navigate(['/add-exercise'], {
      queryParams: { index }
    });
  }

  onDeleteExercise(index: number) {
    const current = this.workoutBuilder.getWorkoutData();
    const exerciseToDelete = current.exercises[index];
    if (!exerciseToDelete) return;

    this.lastDeleted = { exercise: exerciseToDelete, index };
    this.workoutBuilder.removeExercise(index);
    this.workoutData.set(this.workoutBuilder.getWorkoutData());

    this.toastService.show('Exercise removed. Undo not yet available.', 'info', 4000);
  }

  onMoveUp(index: number) {
    this.workoutBuilder.moveExerciseUp(index);
    this.workoutData.set(this.workoutBuilder.getWorkoutData());
  }

  onMoveDown(index: number) {
    this.workoutBuilder.moveExerciseDown(index);
    this.workoutData.set(this.workoutBuilder.getWorkoutData());
  }

  onBack() {
    this.router.navigate(['/create-workout']);
  }

  async onSaveWorkout() {
    const data = this.workoutData();

    if (!data.name || !data.category || !data.difficulty) {
      this.toastService.warning('Please fill in all workout details', 3000);
      this.router.navigate(['/create-workout']);
      return;
    }

    if (data.exercises.length === 0) {
      this.toastService.warning('Please add at least one exercise', 3000);
      return;
    }

    this.isSaving.set(true);

    try {
      const workout: WorkoutTemplate = {
        id: data.id || this.generateId(),
        name: data.name,
        description: data.description,
        category: data.category!,
        difficulty: data.difficulty!,
        estimatedDuration: data.estimatedDuration,
        exercises: data.exercises,
        createdAt: data.isEditMode && data.id
          ? (await this.databaseService.getWorkoutTemplate(data.id))?.createdAt || new Date()
          : new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      if (data.isEditMode && data.id) {
        await this.databaseService.updateWorkoutTemplate(workout);
        this.toastService.success('Workout updated successfully!', 3000);
      } else {
        await this.databaseService.addWorkoutTemplate(workout);
        this.toastService.success('Workout created successfully!', 3000);
      }

      this.workoutBuilder.clearWorkoutData();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error saving workout:', error);
      this.toastService.error('Error saving workout', 3000);
    } finally {
      this.isSaving.set(false);
    }
  }

  getExerciseDescription(exercise: Exercise): string {
    const parts: string[] = [];

    if (exercise.sets) {
      parts.push(`${exercise.sets} sets`);
    }
    if (exercise.reps) {
      parts.push(`${exercise.reps} reps`);
    }
    if (exercise.weight) {
      parts.push(`${exercise.weight}lbs`);
    }
    if (exercise.duration) {
      parts.push(`${exercise.duration}s`);
    }
    if (exercise.restTime) {
      parts.push(`${exercise.restTime}s rest`);
    }

    return parts.join(' • ');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
