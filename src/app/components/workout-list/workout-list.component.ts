import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { DatabaseService } from '../../services/database.service';
import { WorkoutTemplate, WorkoutCategory, DifficultyLevel, WorkoutStats } from '../../models/workout.models';

@Component({
  selector: 'app-workout-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
  ],
  templateUrl: './workout-list.component.html',
  styleUrls: ['./workout-list.component.scss']
})
export class WorkoutListComponent implements OnInit {
  private databaseService = inject(DatabaseService);
  private router = inject(Router);

  workoutTemplates = signal<WorkoutTemplate[]>([]);
  workoutStats = signal<WorkoutStats | null>(null);
  isLoading = signal(true);

  // Expose enums to template
  readonly WorkoutCategory = WorkoutCategory;
  readonly DifficultyLevel = DifficultyLevel;

  ngOnInit() {
    this.loadWorkouts();
    this.loadStats();
  }

  async loadWorkouts() {
    try {
      this.isLoading.set(true);
      const templates = await this.databaseService.getAllWorkoutTemplates();
      this.workoutTemplates.set(templates);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadStats() {
    try {
      const stats = await this.databaseService.getWorkoutStats();
      this.workoutStats.set(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  startWorkout(template: WorkoutTemplate) {
    this.router.navigate(['/workout', template.id]);
  }

  editWorkout(template: WorkoutTemplate) {
    this.router.navigate(['/create-workout'], { queryParams: { edit: template.id } });
  }

  createNewWorkout() {
    this.router.navigate(['/create-workout']);
  }

  viewHistory() {
    this.router.navigate(['/history']);
  }

  getDifficultyColor(difficulty: DifficultyLevel): string {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER:
        return 'success';
      case DifficultyLevel.INTERMEDIATE:
        return 'warning';
      case DifficultyLevel.ADVANCED:
        return 'error';
      default:
        return 'primary';
    }
  }

  getCategoryIcon(category: WorkoutCategory): string {
    switch (category) {
      case WorkoutCategory.STRENGTH:
        return 'fitness_center';
      case WorkoutCategory.CARDIO:
        return 'directions_run';
      case WorkoutCategory.HIIT:
        return 'whatshot';
      case WorkoutCategory.YOGA:
        return 'self_improvement';
      case WorkoutCategory.SPORTS:
        return 'sports_basketball';
      case WorkoutCategory.MIXED:
        return 'tune';
      default:
        return 'fitness_center';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  getProgressPercentage(): number {
    const stats = this.workoutStats();
    if (!stats || stats.weeklyGoal === 0) return 0;
    return Math.min((stats.weeklyProgress / stats.weeklyGoal) * 100, 100);
  }
}

