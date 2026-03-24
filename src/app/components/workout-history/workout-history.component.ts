import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { DatabaseService } from '../../services/database.service';
import { WorkoutInstance, WorkoutStats, WorkoutStatus, WorkoutSet } from '../../models/workout.models';
interface WorkoutHistoryGroup {
  date: string;
  workouts: WorkoutInstance[];
}

interface ExerciseSeries {
  name: string;
  sessions: { date: Date; maxWeight: number }[];
}

interface SvgPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

interface SvgBar {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  count: number;
  isCurrent: boolean;
}

@Component({
  selector: 'app-workout-history',
  standalone: true,
  imports: [
    CommonModule,
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

  flatSessions = computed<any[]>(() =>
    this.workoutHistory().flatMap((g: WorkoutHistoryGroup) => g.workouts)
  );

  totalVolume = computed(() =>
    this.flatSessions().reduce((acc: number, s: any) => acc + (s.totalVolume ?? 0), 0)
  );

  currentStreak = computed(() => {
    const dates = new Set(
      this.flatSessions().map((s: any) => {
        const d = new Date(s.startTime);
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      })
    );
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (dates.has(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)) streak++;
      else if (i > 0) break;
    }
    return streak;
  });

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

  // Exercise progression charts
  exerciseProgressData = signal<ExerciseSeries[]>([]);
  selectedExerciseIdx = signal(0);

  volumeChartPoints = computed<SvgPoint[]>(() => {
    const sessions = [...this.flatSessions()]
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(-15);
    if (sessions.length === 0) return [];
    const values = sessions.map(session =>
      (session.sets as WorkoutSet[] || [])
        .filter(set => set.completed)
        .reduce((acc, set) => acc + (set.weight ?? 0) * (set.reps ?? 1), 0)
    );
    const max = Math.max(...values, 1);
    const W = 310, H = 55;
    return sessions.map((session, i) => ({
      x: sessions.length > 1 ? 5 + i * W / (sessions.length - 1) : 160,
      y: 5 + H - (values[i] / max) * H,
      value: Math.round(values[i]),
      label: new Date(session.startTime).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
    }));
  });

  volumeLinePath = computed(() =>
    this.volumeChartPoints().map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  );

  volumeAreaPath = computed(() => {
    const pts = this.volumeChartPoints();
    if (!pts.length) return '';
    return `${this.volumeLinePath()} L${pts[pts.length - 1].x.toFixed(1)},60 L${pts[0].x.toFixed(1)},60 Z`;
  });

  weeklyBarsData = computed<SvgBar[]>(() => {
    const sessions = this.flatSessions();
    const now = new Date();
    const weeks: { label: string; count: number; isCurrent: boolean }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(now);
      ws.setDate(now.getDate() - now.getDay() - 7 * i);
      ws.setHours(0, 0, 0, 0);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 7);
      const count = sessions.filter(s => { const d = new Date(s.startTime); return d >= ws && d < we; }).length;
      weeks.push({ label: `${ws.getMonth() + 1}/${ws.getDate()}`, count, isCurrent: i === 0 });
    }
    const maxCount = Math.max(...weeks.map(w => w.count), 1);
    const slotW = 310 / 8;
    const barW = slotW * 0.55;
    const padX = (slotW - barW) / 2;
    const H = 55;
    return weeks.map((w, i) => ({
      x: 5 + i * slotW + padX,
      y: 5 + H - (w.count / maxCount) * H,
      w: barW,
      h: w.count > 0 ? Math.max((w.count / maxCount) * H, 1) : 0,
      label: w.label,
      count: w.count,
      isCurrent: w.isCurrent
    }));
  });

  selectedExercise = computed(() => this.exerciseProgressData()[this.selectedExerciseIdx()] ?? null);

  exerciseChartPoints = computed<SvgPoint[]>(() => {
    const ex = this.selectedExercise();
    if (!ex) return [];
    const sessions = ex.sessions.slice(-15);
    const values = sessions.map(s => s.maxWeight);
    const max = Math.max(...values, 1);
    const W = 310, H = 55;
    return sessions.map((s, i) => ({
      x: sessions.length > 1 ? 5 + i * W / (sessions.length - 1) : 160,
      y: 5 + H - (values[i] / max) * H,
      value: values[i],
      label: new Date(s.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
    }));
  });

  exerciseLinePath = computed(() =>
    this.exerciseChartPoints().map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  );

  exerciseAreaPath = computed(() => {
    const pts = this.exerciseChartPoints();
    if (!pts.length) return '';
    return `${this.exerciseLinePath()} L${pts[pts.length - 1].x.toFixed(1)},60 L${pts[0].x.toFixed(1)},60 Z`;
  });

  exercisePrPoint = computed(() => {
    const pts = this.exerciseChartPoints();
    if (!pts.length) return null;
    return pts.reduce((max, p) => p.value > max.value ? p : max);
  });

  selectExercise(idx: number) { this.selectedExerciseIdx.set(idx); }

  // Expose enum to template
  readonly WorkoutStatus = WorkoutStatus;

  ngOnInit() {
    this.loadWorkoutHistory();
    this.loadWorkoutStats();
    this.loadExerciseProgression();
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

  private async loadExerciseProgression() {
    try {
      const data = await this.databaseService.getExerciseProgression();
      this.exerciseProgressData.set(data);
    } catch (error) {
      console.error('Error loading exercise progression:', error);
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

}

