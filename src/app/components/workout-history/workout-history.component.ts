import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
    CalendarHeatmapComponent
  ],
  templateUrl: './workout-history.component.html',
  styleUrls: ['./workout-history.component.scss']
})
export class WorkoutHistoryComponent implements OnInit {
  private databaseService = inject(DatabaseService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

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

  getIconPath(icon: string): SafeHtml {
    const icons: Record<string, string> = {
      'arrow_back': '<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>',
      'history': '<path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>',
      'check_circle': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
      'play_circle': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>',
      'pause_circle': '<path d="M9 16h2V8H9v8zm3-14C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-4h2V8h-2v8z"/>',
      'cancel': '<path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>',
      'help': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>',
      'fitness_center': '<path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>',
      'repeat': '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>',
      'note': '<path d="M22 10l-6-6H4c-1.1 0-2 .9-2 2v12.01c0 1.1.9 1.99 2 1.99l16-.01c1.1 0 2-.89 2-1.99v-8zm-7-4.5l5.5 5.5H15V5.5z"/>',
      'play_arrow': '<path d="M8 5v14l11-7z"/>',
      'visibility': '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>'
    };
    return this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${icons[icon] || ''}</svg>`);
  }
}

