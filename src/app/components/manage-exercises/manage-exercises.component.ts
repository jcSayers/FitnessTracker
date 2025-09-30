import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { WorkoutBuilderService } from '../../services/workout-builder.service';
import { DatabaseService } from '../../services/database.service';
import { WorkoutTemplate, Exercise } from '../../models/workout.models';

@Component({
  selector: 'app-manage-exercises',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './manage-exercises.component.html',
  styleUrls: ['./manage-exercises.component.scss']
})
export class ManageExercisesComponent implements OnInit {
  private router = inject(Router);
  private workoutBuilder = inject(WorkoutBuilderService);
  private databaseService = inject(DatabaseService);
  private snackBar = inject(MatSnackBar);

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

    this.snackBar.open('Exercise removed', 'Undo', { duration: 4000 })
      .onAction()
      .subscribe(() => {
        if (this.lastDeleted) {
          this.workoutBuilder.insertExercise(this.lastDeleted.index, this.lastDeleted.exercise);
          this.workoutData.set(this.workoutBuilder.getWorkoutData());
          this.lastDeleted = null;
          this.snackBar.open('Exercise restored', 'Close', { duration: 2500 });
        }
      });
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
      this.snackBar.open('Please fill in all workout details', 'Close', { duration: 3000 });
      this.router.navigate(['/create-workout']);
      return;
    }

    if (data.exercises.length === 0) {
      this.snackBar.open('Please add at least one exercise', 'Close', { duration: 3000 });
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
        this.snackBar.open('Workout updated successfully!', 'Close', { duration: 3000 });
      } else {
        await this.databaseService.addWorkoutTemplate(workout);
        this.snackBar.open('Workout created successfully!', 'Close', { duration: 3000 });
      }

      this.workoutBuilder.clearWorkoutData();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Error saving workout:', error);
      this.snackBar.open('Error saving workout', 'Close', { duration: 3000 });
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
