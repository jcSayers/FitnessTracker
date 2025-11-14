import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { WorkoutBuilderService } from '../../services/workout-builder.service';
import { Exercise, ExerciseCategory } from '../../models/workout.models';

@Component({
  selector: 'app-add-exercise',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './add-exercise.component.html',
  styleUrls: ['./add-exercise.component.scss']
})
export class AddExerciseComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private workoutBuilder = inject(WorkoutBuilderService);

  exerciseForm!: FormGroup;
  isEditMode = false;
  editIndex: number | null = null;

  readonly ExerciseCategory = ExerciseCategory;
  readonly exerciseCategories = Object.values(ExerciseCategory);

  ngOnInit() {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm() {
    this.exerciseForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: [ExerciseCategory.STRENGTH, Validators.required],
      sets: [3, [Validators.required, Validators.min(1), Validators.max(20)]],
      reps: [null, [Validators.min(1), Validators.max(100)]],
      weight: [null, [Validators.min(0), Validators.max(1000)]],
      duration: [null, [Validators.min(1), Validators.max(3600)]],
      restTime: [60, [Validators.required, Validators.min(0), Validators.max(600)]],
      notes: ['']
    });

    // Watch category changes to provide hints
    this.exerciseForm.get('category')?.valueChanges.subscribe(category => {
      this.updateFormHints(category);
    });
  }

  private checkEditMode() {
    const indexParam = this.route.snapshot.queryParams['index'];
    if (indexParam !== undefined) {
      this.isEditMode = true;
      this.editIndex = parseInt(indexParam, 10);
      this.loadExerciseForEdit(this.editIndex);
    }
  }

  private loadExerciseForEdit(index: number) {
    const workoutData = this.workoutBuilder.getWorkoutData();
    const exercise = workoutData.exercises[index];

    if (exercise) {
      this.exerciseForm.patchValue({
        name: exercise.name,
        category: exercise.category,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
        duration: exercise.duration,
        restTime: exercise.restTime,
        notes: exercise.notes
      });
    }
  }

  private updateFormHints(category: ExerciseCategory) {
    // You can add logic here to suggest default values based on category
    // For example, cardio exercises might default to duration instead of reps
  }

  onSave() {
    if (!this.exerciseForm.valid) {
      this.exerciseForm.markAllAsTouched();
      return;
    }

    const formValue = this.exerciseForm.value;
    const exercise: Exercise = {
      id: this.generateId(),
      name: formValue.name,
      category: formValue.category,
      sets: formValue.sets,
      reps: formValue.reps || undefined,
      weight: formValue.weight || undefined,
      duration: formValue.duration || undefined,
      restTime: formValue.restTime,
      notes: formValue.notes || undefined
    };

    if (this.isEditMode && this.editIndex !== null) {
      this.workoutBuilder.updateExercise(this.editIndex, exercise);
    } else {
      this.workoutBuilder.addExercise(exercise);
    }

    this.router.navigate(['/manage-exercises']);
  }

  onCancel() {
    this.router.navigate(['/manage-exercises']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.exerciseForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const control = this.exerciseForm.get(fieldName);

    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldLabel(fieldName)} is too short`;
    }
    if (control?.hasError('min')) {
      return `Value must be at least ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `Value cannot exceed ${control.errors?.['max'].max}`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Exercise name',
      category: 'Category',
      sets: 'Sets',
      reps: 'Reps',
      weight: 'Weight',
      duration: 'Duration',
      restTime: 'Rest time'
    };
    return labels[fieldName] || fieldName;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getPlaceholder(category: ExerciseCategory): string {
    switch (category) {
      case ExerciseCategory.STRENGTH:
        return 'e.g., Bench Press, Squats';
      case ExerciseCategory.CARDIO:
        return 'e.g., Running, Cycling';
      case ExerciseCategory.FLEXIBILITY:
        return 'e.g., Stretching, Yoga';
      case ExerciseCategory.SPORTS:
        return 'e.g., Basketball, Soccer';
      default:
        return 'Enter exercise name';
    }
  }
}
