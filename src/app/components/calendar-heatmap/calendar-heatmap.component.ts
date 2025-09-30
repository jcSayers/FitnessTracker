import { Component, OnInit, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CalendarDay {
  date: Date;
  hasWorkout: boolean;
  workoutCount: number;
  isCurrentMonth: boolean;
}

interface CalendarMonth {
  month: string;
  year: number;
  weeks: CalendarDay[][];
}

@Component({
  selector: 'app-calendar-heatmap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-heatmap.component.html',
  styleUrls: ['./calendar-heatmap.component.scss']
})
export class CalendarHeatmapComponent implements OnInit {
  @Input() workoutDates: Date[] = [];

  months = signal<CalendarMonth[]>([]);
  currentYear = signal(new Date().getFullYear());

  ngOnInit() {
    this.generateCalendar();
  }

  ngOnChanges() {
    this.generateCalendar();
  }

  private generateCalendar() {
    if (this.workoutDates.length === 0) {
      // Show current year if no workouts
      this.generateYearCalendar(this.currentYear());
      return;
    }

    // Find the earliest workout date
    const sortedDates = [...this.workoutDates].sort((a, b) => a.getTime() - b.getTime());
    const firstWorkoutDate = sortedDates[0];
    const startYear = firstWorkoutDate.getFullYear();
    const startMonth = firstWorkoutDate.getMonth();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Generate calendars from first workout month to current month
    const allMonths: CalendarMonth[] = [];

    for (let year = startYear; year <= currentYear; year++) {
      const firstMonthOfYear = (year === startYear) ? startMonth : 0;
      const lastMonthOfYear = (year === currentYear) ? currentMonth : 11;

      for (let month = firstMonthOfYear; month <= lastMonthOfYear; month++) {
        const monthData = this.generateMonthCalendar(year, month);
        allMonths.push(monthData);
      }
    }

    this.months.set(allMonths);
  }

  private generateYearCalendar(year: number): CalendarMonth[] {
    const months: CalendarMonth[] = [];
    for (let month = 0; month < 12; month++) {
      months.push(this.generateMonthCalendar(year, month));
    }
    return months;
  }

  private generateMonthCalendar(year: number, month: number): CalendarMonth {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];

    // Add empty days for the first week
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDate = new Date(year, month, 1 - (firstDayOfWeek - i));
      currentWeek.push({
        date: emptyDate,
        hasWorkout: this.hasWorkoutOnDate(emptyDate),
        workoutCount: this.getWorkoutCountOnDate(emptyDate),
        isCurrentMonth: false
      });
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      currentWeek.push({
        date,
        hasWorkout: this.hasWorkoutOnDate(date),
        workoutCount: this.getWorkoutCountOnDate(date),
        isCurrentMonth: true
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill the last week
    if (currentWeek.length > 0) {
      const remainingDays = 7 - currentWeek.length;
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        currentWeek.push({
          date,
          hasWorkout: this.hasWorkoutOnDate(date),
          workoutCount: this.getWorkoutCountOnDate(date),
          isCurrentMonth: false
        });
      }
      weeks.push(currentWeek);
    }

    return {
      month: monthNames[month],
      year,
      weeks
    };
  }

  private hasWorkoutOnDate(date: Date): boolean {
    return this.workoutDates.some(workoutDate =>
      this.isSameDay(workoutDate, date)
    );
  }

  private getWorkoutCountOnDate(date: Date): number {
    return this.workoutDates.filter(workoutDate =>
      this.isSameDay(workoutDate, date)
    ).length;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  getIntensityClass(day: CalendarDay): string {
    if (!day.hasWorkout) return '';

    if (day.workoutCount >= 3) return 'intensity-high';
    if (day.workoutCount === 2) return 'intensity-medium';
    return 'intensity-low';
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDay(date, today);
  }
}
