import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { WorkoutTemplate, DifficultyLevel } from '../../models/workout.models';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-list.component.html',
})
export class TemplateListComponent implements OnInit {
  private db = inject(DatabaseService);
  router = inject(Router);

  templates = signal<WorkoutTemplate[]>([]);
  isLoading = signal(true);
  commandInput = signal('');

  ngOnInit() { this.load(); }

  async load() {
    try {
      this.templates.set(await this.db.getAllWorkoutTemplates());
    } catch (e) { console.error(e); }
    finally { this.isLoading.set(false); }
  }

  start(t: WorkoutTemplate) { this.router.navigate(['/workout', t.id]); }
  edit(t: WorkoutTemplate)  { this.router.navigate(['/create-workout'], { queryParams: { edit: t.id } }); }
  createNew()               { this.router.navigate(['/create-workout']); }

  statsLabel(t: WorkoutTemplate): string {
    return `[EX: ${t.exercises.length.toString().padStart(2,'0')}] [TM: ${t.estimatedDuration}M]`;
  }
}
