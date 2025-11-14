import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { DatabaseService } from '../../services/database.service';
import { WorkoutTemplate, WorkoutCategory, DifficultyLevel, WorkoutStats } from '../../models/workout.models';

@Component({
  selector: 'app-workout-list',
  standalone: true,
  imports: [
    CommonModule
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

  getCategoryIconPath(category: WorkoutCategory): string {
    const iconMap: Record<string, string> = {
      'strength': 'M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z',
      'cardio': 'M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z',
      'hiit': 'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',
      'yoga': 'M13 4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-7 9.48V22h2v-6h3v6h2v-6.17c-1.36-.03-2.31-.73-3.06-1.55L6 13.48zm-1.92 1.15l1.39-1.39c.38-.38.89-.59 1.42-.59H10c.19 0 .36.03.52.1L14.48 10H18v5h-3.25L12 17l-1-7-4 4.48zM22 11v2l-8.5 6v-2.8l6.55-4.7c.44-.32 1.08-.39 1.6-.11z',
      'sports': 'M17.09 11h4.86c-.16-1.61-.71-3.11-1.54-4.4l-3.43 3.43c.05.32.11.64.11.97zm-1.88 3.88c-.31.05-.61.09-.92.11v4.86c1.61-.16 3.11-.71 4.4-1.54l-3.48-3.43zm-2.03 0l-3.43 3.43c1.29.83 2.79 1.38 4.4 1.54V14.1c-.31-.02-.61-.05-.97-.12zm-2.84-2.09c-.05-.31-.09-.61-.1-.92H5.38c.16 1.61.71 3.11 1.54 4.4l3.42-3.48zm2.96-9.02c-.31 0-.62.04-.92.1L8.95 7.3C7.66 6.46 6.16 5.91 4.55 5.75v4.86c.31-.02.61-.06.97-.11zm6.21 1.52c-1.43.93-2.86 1.87-4.29 2.8L19 10.52c-.94-1.74-1.89-3.48-2.83-5.22-.46-.81-1.53-.81-2 0-.08.13-.15.26-.23.39zm-9.36 3.93l2.8-4.29C6.75 3.45 4.86 5.34 3.38 7.22c-.93 1.43-.93 3.15 0 4.58.13.2.26.39.41.59L7.18 9.7c.29-.45.73-.75 1.23-.86l-.36-.62z',
      'mixed': 'M3 5H1v16c0 1.1.9 2 2 2h16v-2H3V5zm18-4H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 16H7V3h14v14z'
    };
    return iconMap[category] || iconMap['strength'];
  }
}

