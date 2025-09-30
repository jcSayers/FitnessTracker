import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';

import { DatabaseService } from '../../services/database.service';
import { WorkoutInstance, WorkoutStats, WorkoutStatus } from '../../models/workout.models';
import { CalendarHeatmapComponent } from '../calendar-heatmap/calendar-heatmap.component';

interface WorkoutHistoryGroup {
  date: string;
  workouts: WorkoutInstance[];
}

@Component({
  selector: 'app-workout-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatExpansionModule,
    CalendarHeatmapComponent
  ],
  templateUrl: './workout-history.component.html',
  styleUrls: ['./workout-history.component.scss']
})
export class WorkoutHistoryComponent implements OnInit {
  private databaseService = inject(DatabaseService);
  private router = inject(Router);

  workoutHistory = signal<WorkoutHistoryGroup[]>([]);
  workoutStats = signal<WorkoutStats | null>(null);
  isLoading = signal(true);

  // Computed property for calendar workout dates
  workoutDates = computed(() => {
    const dates: Date[] = [];
    this.workoutHistory().forEach(group => {
      group.workouts.forEach(workout => {
        if (workout.startTime) {
          dates.push(new Date(workout.startTime));
        }
      });
    });
    return dates;
  });

  // Expose enum to template
  readonly WorkoutStatus = WorkoutStatus;

  ngOnInit() {
    this.loadWorkoutHistory();
    this.loadWorkoutStats();
  }

  private async loadWorkoutHistory() {
    try {
      this.isLoading.set(true);
      const history = await this.databaseService.getWorkoutHistory();
      const groupedHistory = this.groupWorkoutsByDate(history);
      this.workoutHistory.set(groupedHistory);
    } catch (error) {
      console.error('Error loading workout history:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadWorkoutStats() {
    try {
      const stats = await this.databaseService.getWorkoutStats();
      this.workoutStats.set(stats);
    } catch (error) {
      console.error('Error loading workout stats:', error);
    }
  }

  private groupWorkoutsByDate(workouts: WorkoutInstance[]): WorkoutHistoryGroup[] {
    const groups = new Map<string, WorkoutInstance[]>();

    workouts.forEach(workout => {
      const date = new Date(workout.startTime).toDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(workout);
    });

    return Array.from(groups.entries()).map(([date, workouts]) => ({
      date,
      workouts: workouts.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
    }));
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  getStatusColor(status: WorkoutStatus): string {
    switch (status) {
      case WorkoutStatus.COMPLETED:
        return 'success';
      case WorkoutStatus.IN_PROGRESS:
        return 'primary';
      case WorkoutStatus.PAUSED:
        return 'warning';
      case WorkoutStatus.CANCELLED:
        return 'error';
      default:
        return 'primary';
    }
  }

  getStatusIcon(status: WorkoutStatus): string {
    switch (status) {
      case WorkoutStatus.COMPLETED:
        return 'check_circle';
      case WorkoutStatus.IN_PROGRESS:
        return 'play_circle';
      case WorkoutStatus.PAUSED:
        return 'pause_circle';
      case WorkoutStatus.CANCELLED:
        return 'cancel';
      default:
        return 'help';
    }
  }

  getCompletionPercentage(workout: WorkoutInstance): number {
    if (workout.totalExercises === 0) return 0;
    return (workout.completedExercises / workout.totalExercises) * 100;
  }

  viewWorkoutDetails(workout: WorkoutInstance) {
    // Navigate to a detailed view or show in a dialog
    console.log('View workout details:', workout);
  }

  resumeWorkout(workout: WorkoutInstance) {
    if (workout.status === WorkoutStatus.IN_PROGRESS || workout.status === WorkoutStatus.PAUSED) {
      this.router.navigate(['/workout', workout.templateId]);
    }
  }

  getWeeklyProgress(): number {
    const stats = this.workoutStats();
    if (!stats || stats.weeklyGoal === 0) return 0;
    return Math.min((stats.weeklyProgress / stats.weeklyGoal) * 100, 100);
  }

  getTotalWorkoutsThisWeek(): number {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return this.workoutHistory()
      .flatMap(group => group.workouts)
      .filter(workout => {
        const workoutDate = new Date(workout.startTime);
        return workoutDate >= startOfWeek && workout.status === WorkoutStatus.COMPLETED;
      }).length;
  }

  getStreakDays(): number {
    return this.workoutStats()?.currentStreak || 0;
  }

  getLongestStreak(): number {
    return this.workoutStats()?.longestStreak || 0;
  }

  getAverageDuration(): string {
    const stats = this.workoutStats();
    return stats ? this.formatDuration(stats.averageDuration) : '0m';
  }
}

