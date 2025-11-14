import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { WorkoutBuilderService } from '../../services/workout-builder.service';
import { DatabaseService } from '../../services/database.service';
import { SvgIconComponent } from '../../shared';
import { WorkoutCategory, DifficultyLevel } from '../../models/workout.models';

@Component({
  selector: 'app-create-workout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SvgIconComponent
  ],
  templateUrl: './create-workout.component.html',
  styleUrls: ['./create-workout.component.scss']
})
export class CreateWorkoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private workoutBuilder = inject(WorkoutBuilderService);
  private databaseService = inject(DatabaseService);

  workoutForm!: FormGroup;

  // Expose enums to template
  readonly WorkoutCategory = WorkoutCategory;
  readonly DifficultyLevel = DifficultyLevel;

  // Enum arrays for dropdowns
  readonly workoutCategories = Object.values(WorkoutCategory);
  readonly difficultyLevels = Object.values(DifficultyLevel);

  ngOnInit() {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm() {
    const existingData = this.workoutBuilder.getWorkoutData();

    this.workoutForm = this.fb.group({
      name: [existingData.name || '', [Validators.required, Validators.minLength(3)]],
      description: [existingData.description || ''],
      category: [existingData.category || '', Validators.required],
      difficulty: [existingData.difficulty || '', Validators.required],
      estimatedDuration: [existingData.estimatedDuration || 30, [Validators.required, Validators.min(5), Validators.max(300)]]
    });
  }

  private async checkEditMode() {
    const editId = this.route.snapshot.queryParams['edit'];
    if (editId) {
      await this.loadWorkoutForEdit(editId);
    } else {
      // Clear any existing data when creating a new workout
      this.workoutBuilder.clearWorkoutData();
    }
  }

  private async loadWorkoutForEdit(workoutId: string) {
    try {
      const workout = await this.databaseService.getWorkoutTemplate(workoutId);
      if (workout) {
        this.workoutForm.patchValue({
          name: workout.name,
          description: workout.description,
          category: workout.category,
          difficulty: workout.difficulty,
          estimatedDuration: workout.estimatedDuration
        });

        this.workoutBuilder.setWorkoutData({
          id: workout.id,
          name: workout.name,
          description: workout.description,
          category: workout.category,
          difficulty: workout.difficulty,
          estimatedDuration: workout.estimatedDuration,
          exercises: workout.exercises,
          isEditMode: true
        });
      }
    } catch (error) {
      console.error('Error loading workout for edit:', error);
    }
  }

  onNext() {
    if (!this.workoutForm.valid) {
      this.workoutForm.markAllAsTouched();
      return;
    }

    const formValue = this.workoutForm.value;
    this.workoutBuilder.setWorkoutData({
      name: formValue.name,
      description: formValue.description,
      category: formValue.category,
      difficulty: formValue.difficulty,
      estimatedDuration: formValue.estimatedDuration
    });

    this.router.navigate(['/manage-exercises']);
  }

  onCancel() {
    this.workoutBuilder.clearWorkoutData();
    this.router.navigate(['/dashboard']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.workoutForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const control = this.workoutForm.get(fieldName);

    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldLabel(fieldName)} is too short`;
    }
    if (control?.hasError('min')) {
      return `${this.getFieldLabel(fieldName)} must be at least ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `${this.getFieldLabel(fieldName)} cannot exceed ${control.errors?.['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Workout name',
      category: 'Category',
      difficulty: 'Difficulty',
      estimatedDuration: 'Duration'
    };
    return labels[fieldName] || fieldName;
  }
}
