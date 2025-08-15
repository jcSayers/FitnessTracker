import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DatabaseService } from '../../services/database.service';
import {
  WorkoutTemplate,
  WorkoutInstance,
  WorkoutSet,
  WorkoutStatus,
  Exercise
} from '../../models/workout.models';

@Component({
  selector: 'app-active-workout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './active-workout.component.html',
  styleUrls: ['./active-workout.component.scss']
})
export class ActiveWorkoutComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private databaseService = inject(DatabaseService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  workoutTemplate = signal<WorkoutTemplate | null>(null);
  workoutInstance = signal<WorkoutInstance | null>(null);
  currentExerciseIndex = signal(0);
  currentSetIndex = signal(0);
  isWorkoutActive = signal(false);
  isPaused = signal(false);
  elapsedTime = signal(0);

  private timerInterval?: number;
  private restTimerInterval?: number;
  private workoutStartTime?: Date;

  // Current set tracking
  currentSet = signal<Partial<WorkoutSet>>({});
  isRestPeriod = signal(false);
  restTimeRemaining = signal(0);

  // Workout progress
  completedSets = signal(0);
  totalSets = signal(0);

  ngOnInit() {
    this.loadWorkout();
  }

  ngOnDestroy() {
    this.stopTimer();
    this.stopRestTimer();
  }

  private async loadWorkout() {
    try {
      const templateId = this.route.snapshot.paramMap.get('id');
      if (!templateId) {
        this.router.navigate(['/dashboard']);
        return;
      }

      // Check for existing active workout
      const existingWorkout = await this.databaseService.getActiveWorkoutInstance();
      if (existingWorkout && existingWorkout.templateId === templateId) {
        await this.resumeWorkout(existingWorkout);
        return;
      } else if (existingWorkout) {
        // Different workout is active, ask user what to do
        this.snackBar.open('Another workout is already active', 'OK', { duration: 3000 });
        this.router.navigate(['/dashboard']);
        return;
      }

      const template = await this.databaseService.getWorkoutTemplate(templateId);
      if (!template) {
        this.snackBar.open('Workout not found', 'OK', { duration: 3000 });
        this.router.navigate(['/dashboard']);
        return;
      }

      this.workoutTemplate.set(template);
      this.calculateTotalSets();
      this.initializeCurrentSet();
    } catch (error) {
      console.error('Error loading workout:', error);
      this.snackBar.open('Error loading workout', 'OK', { duration: 3000 });
    }
  }

  private async resumeWorkout(instance: WorkoutInstance) {
    try {
      const template = await this.databaseService.getWorkoutTemplate(instance.templateId);
      if (!template) {
        this.snackBar.open('Workout template not found', 'OK', { duration: 3000 });
        return;
      }

      this.workoutTemplate.set(template);
      this.workoutInstance.set(instance);
      this.isWorkoutActive.set(true);

      if (instance.status === WorkoutStatus.PAUSED) {
        this.isPaused.set(true);
      } else {
        this.startTimer();
      }

      this.calculateProgress();
      this.findCurrentPosition();
    } catch (error) {
      console.error('Error resuming workout:', error);
      this.snackBar.open('Error resuming workout', 'OK', { duration: 3000 });
    }
  }

  private calculateTotalSets() {
    const template = this.workoutTemplate();
    if (!template) return;

    const total = template.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
    this.totalSets.set(total);
  }

  private calculateProgress() {
    const instance = this.workoutInstance();
    if (!instance) return;

    const completed = instance.sets.filter(set => set.completed).length;
    this.completedSets.set(completed);
  }

  private findCurrentPosition() {
    const instance = this.workoutInstance();
    const template = this.workoutTemplate();
    if (!instance || !template) return;

    // Find the first incomplete set
    let exerciseIndex = 0;
    let setIndex = 0;
    let setCount = 0;

    for (const exercise of template.exercises) {
      for (let s = 0; s < exercise.sets; s++) {
        const existingSet = instance.sets.find(set =>
          set.exerciseId === exercise.id && set.setNumber === s + 1
        );

        if (!existingSet || !existingSet.completed) {
          this.currentExerciseIndex.set(exerciseIndex);
          this.currentSetIndex.set(s);
          this.initializeCurrentSet();
          return;
        }
        setCount++;
      }
      exerciseIndex++;
    }

    // All sets completed
    this.currentExerciseIndex.set(template.exercises.length);
  }

  private initializeCurrentSet() {
    const template = this.workoutTemplate();
    const exerciseIndex = this.currentExerciseIndex();
    const setIndex = this.currentSetIndex();

    if (!template || exerciseIndex >= template.exercises.length) return;

    const exercise = template.exercises[exerciseIndex];
    const instance = this.workoutInstance();

    // Check if this set already exists
    const existingSet = instance?.sets.find(set =>
      set.exerciseId === exercise.id && set.setNumber === setIndex + 1
    );

    if (existingSet) {
      this.currentSet.set({
        reps: existingSet.reps,
        weight: existingSet.weight,
        duration: existingSet.duration,
        notes: existingSet.notes
      });
    } else {
      this.currentSet.set({
        reps: exercise.reps || undefined,
        weight: exercise.weight || undefined,
        duration: exercise.duration || undefined,
        notes: ''
      });
    }
  }

  async startWorkout() {
    try {
      const template = this.workoutTemplate();
      if (!template) return;

      this.workoutStartTime = new Date();
      const instance: WorkoutInstance = {
        id: this.generateId(),
        templateId: template.id,
        templateName: template.name,
        startTime: this.workoutStartTime,
        sets: [],
        status: WorkoutStatus.IN_PROGRESS,
        completedExercises: 0,
        totalExercises: template.exercises.length
      };

      await this.databaseService.addWorkoutInstance(instance);
      this.workoutInstance.set(instance);
      this.isWorkoutActive.set(true);
      this.startTimer();

      this.snackBar.open('Workout started!', 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Error starting workout:', error);
      this.snackBar.open('Error starting workout', 'OK', { duration: 3000 });
    }
  }

  async completeSet() {
    try {
      const template = this.workoutTemplate();
      const instance = this.workoutInstance();
      const exerciseIndex = this.currentExerciseIndex();
      const setIndex = this.currentSetIndex();

      if (!template || !instance || exerciseIndex >= template.exercises.length) return;

      const exercise = template.exercises[exerciseIndex];
      const currentSetData = this.currentSet();

      const workoutSet: WorkoutSet = {
        exerciseId: exercise.id,
        setNumber: setIndex + 1,
        reps: currentSetData.reps,
        weight: currentSetData.weight,
        duration: currentSetData.duration,
        completed: true,
        completedAt: new Date(),
        notes: currentSetData.notes
      };

      // Update or add the set
      const existingSetIndex = instance.sets.findIndex(set =>
        set.exerciseId === exercise.id && set.setNumber === setIndex + 1
      );

      if (existingSetIndex >= 0) {
        instance.sets[existingSetIndex] = workoutSet;
      } else {
        instance.sets.push(workoutSet);
      }

      await this.databaseService.updateWorkoutInstance(instance);
      this.workoutInstance.set(instance);
      this.calculateProgress();

      // Start rest period if not the last set
      if (this.hasNextSet()) {
        this.startRestPeriod(exercise.restTime || 60);
      }

      this.moveToNextSet();
    } catch (error) {
      console.error('Error completing set:', error);
      this.snackBar.open('Error saving set', 'OK', { duration: 3000 });
    }
  }

  private moveToNextSet() {
    const template = this.workoutTemplate();
    if (!template) return;

    const currentExercise = template.exercises[this.currentExerciseIndex()];
    const nextSetIndex = this.currentSetIndex() + 1;

    if (nextSetIndex < currentExercise.sets) {
      // Move to next set of same exercise
      this.currentSetIndex.set(nextSetIndex);
    } else {
      // Move to first set of next exercise
      const nextExerciseIndex = this.currentExerciseIndex() + 1;
      if (nextExerciseIndex < template.exercises.length) {
        this.currentExerciseIndex.set(nextExerciseIndex);
        this.currentSetIndex.set(0);
      }
    }

    this.initializeCurrentSet();
  }

  private hasNextSet(): boolean {
    const template = this.workoutTemplate();
    if (!template) return false;

    const exerciseIndex = this.currentExerciseIndex();
    const setIndex = this.currentSetIndex();
    const currentExercise = template.exercises[exerciseIndex];

    return (setIndex + 1 < currentExercise.sets) ||
      (exerciseIndex + 1 < template.exercises.length);
  }

  private startRestPeriod(restTime: number) {
    this.isRestPeriod.set(true);
    this.restTimeRemaining.set(restTime);

    this.restTimerInterval = window.setInterval(() => {
      const remaining = this.restTimeRemaining() - 1;
      this.restTimeRemaining.set(remaining);

      if (remaining <= 0) {
        this.endRestPeriod();
      }
    }, 1000);
  }

  private endRestPeriod() {
    this.isRestPeriod.set(false);
    this.stopRestTimer();
    this.snackBar.open('Rest period finished!', 'OK', { duration: 2000 });
  }

  skipRest() {
    this.endRestPeriod();
  }

  async pauseWorkout() {
    try {
      const instance = this.workoutInstance();
      if (!instance) return;

      instance.status = WorkoutStatus.PAUSED;
      await this.databaseService.updateWorkoutInstance(instance);

      this.isPaused.set(true);
      this.stopTimer();
      this.stopRestTimer();

      this.snackBar.open('Workout paused', 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Error pausing workout:', error);
    }
  }

  async resumeWorkoutFromPause() {
    try {
      const instance = this.workoutInstance();
      if (!instance) return;

      instance.status = WorkoutStatus.IN_PROGRESS;
      await this.databaseService.updateWorkoutInstance(instance);

      this.isPaused.set(false);
      this.startTimer();

      this.snackBar.open('Workout resumed', 'OK', { duration: 2000 });
    } catch (error) {
      console.error('Error resuming workout:', error);
    }
  }

  async finishWorkout() {
    try {
      const instance = this.workoutInstance();
      if (!instance) return;

      instance.status = WorkoutStatus.COMPLETED;
      instance.endTime = new Date();
      instance.totalDuration = Math.floor(this.elapsedTime() / 60);

      await this.databaseService.updateWorkoutInstance(instance);

      this.stopTimer();
      this.stopRestTimer();

      this.snackBar.open('Workout completed! Great job!', 'OK', { duration: 3000 });
      this.router.navigate(['/history']);
    } catch (error) {
      console.error('Error finishing workout:', error);
    }
  }

  private startTimer() {
    this.timerInterval = window.setInterval(() => {
      this.elapsedTime.update(time => time + 1);
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private stopRestTimer() {
    if (this.restTimerInterval) {
      clearInterval(this.restTimerInterval);
      this.restTimerInterval = undefined;
    }
  }

  getCurrentExercise(): Exercise | null {
    const template = this.workoutTemplate();
    const index = this.currentExerciseIndex();
    return template && index < template.exercises.length ? template.exercises[index] : null;
  }

  getProgressPercentage(): number {
    const completed = this.completedSets();
    const total = this.totalSets();
    return total > 0 ? (completed / total) * 100 : 0;
  }

  isWorkoutComplete(): boolean {
    const template = this.workoutTemplate();
    const exerciseIndex = this.currentExerciseIndex();
    return template ? exerciseIndex >= template.exercises.length : false;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  goBack() {
    if (this.isWorkoutActive()) {
      // Show confirmation dialog
      const confirmed = confirm('Are you sure you want to exit? Your workout will be paused.');
      if (confirmed) {
        this.pauseWorkout();
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}

