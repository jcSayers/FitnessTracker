import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DatabaseService } from '../../services/database.service';
import { 
  WorkoutTemplate, 
  Exercise, 
  WorkoutCategory, 
  DifficultyLevel, 
  ExerciseCategory 
} from '../../models/workout.models';

@Component({
  selector: 'app-create-workout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-workout.component.html',
  styleUrls: ['./create-workout.component.scss']
})
export class CreateWorkoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private databaseService = inject(DatabaseService);
  private snackBar = inject(MatSnackBar);

  workoutForm!: FormGroup;
  isEditMode = signal(false);
  isSubmitting = signal(false);
  editWorkoutId = signal<string | null>(null);
  isFormReady = signal(false);

  // Expose enums to template
  readonly WorkoutCategory = WorkoutCategory;
  readonly DifficultyLevel = DifficultyLevel;
  readonly ExerciseCategory = ExerciseCategory;

  // Enum arrays for dropdowns
  readonly workoutCategories = Object.values(WorkoutCategory);
  readonly difficultyLevels = Object.values(DifficultyLevel);
  readonly exerciseCategories = Object.values(ExerciseCategory);

  ngOnInit() {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm() {
    this.workoutForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: ['', Validators.required],
      difficulty: ['', Validators.required],
      estimatedDuration: [30, [Validators.required, Validators.min(5), Validators.max(300)]],
      exercises: this.fb.array([])
    });

    // Add initial exercise
    this.addExercise();
    
    // Mark form as ready
    this.isFormReady.set(true);
  }

  private async checkEditMode() {
    const editId = this.route.snapshot.queryParams['edit'];
    if (editId) {
      this.isEditMode.set(true);
      this.editWorkoutId.set(editId);
      await this.loadWorkoutForEdit(editId);
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

        // Clear existing exercises and add the ones from the workout
        this.exercises.clear();
        workout.exercises.forEach(exercise => {
          this.addExercise(exercise);
        });
      }
    } catch (error) {
      console.error('Error loading workout for edit:', error);
      this.snackBar.open('Error loading workout', 'Close', { duration: 3000 });
    }
  }

  get exercises(): FormArray {
    if (!this.workoutForm) {
      return this.fb.array([]);
    }
    const exercisesArray = this.workoutForm.get('exercises');
    if (!exercisesArray) {
      return this.fb.array([]);
    }
    return exercisesArray as FormArray;
  }

  createExerciseFormGroup(exercise?: Exercise): FormGroup {
    return this.fb.group({
      id: [exercise?.id || this.generateId()],
      name: [exercise?.name || '', [Validators.required, Validators.minLength(2)]],
      sets: [exercise?.sets || 3, [Validators.required, Validators.min(1), Validators.max(20)]],
      reps: [exercise?.reps || null, [Validators.min(1), Validators.max(100)]],
      weight: [exercise?.weight || null, [Validators.min(0), Validators.max(1000)]],
      duration: [exercise?.duration || null, [Validators.min(1), Validators.max(3600)]],
      restTime: [exercise?.restTime || 60, [Validators.min(0), Validators.max(600)]],
      notes: [exercise?.notes || ''],
      category: [exercise?.category || ExerciseCategory.STRENGTH, Validators.required]
    });
  }

  addExercise(exercise?: Exercise) {
    const exerciseGroup = this.createExerciseFormGroup(exercise);
    this.exercises.push(exerciseGroup);
  }

  removeExercise(index: number) {
    if (this.exercises.length > 1) {
      this.exercises.removeAt(index);
    } else {
      this.snackBar.open('Workout must have at least one exercise', 'Close', { duration: 3000 });
    }
  }

  moveExerciseUp(index: number) {
    if (index > 0) {
      const exercise = this.exercises.at(index);
      this.exercises.removeAt(index);
      this.exercises.insert(index - 1, exercise);
    }
  }

  moveExerciseDown(index: number) {
    if (index < this.exercises.length - 1) {
      const exercise = this.exercises.at(index);
      this.exercises.removeAt(index);
      this.exercises.insert(index + 1, exercise);
    }
  }

  async onSubmit() {
    if (this.workoutForm.valid) {
      this.isSubmitting.set(true);

      try {
        const formValue = this.workoutForm.value;
        const workout: WorkoutTemplate = {
          id: this.isEditMode() ? this.editWorkoutId()! : this.generateId(),
          name: formValue.name,
          description: formValue.description,
          category: formValue.category,
          difficulty: formValue.difficulty,
          estimatedDuration: formValue.estimatedDuration,
          exercises: formValue.exercises,
          createdAt: this.isEditMode() ? 
            (await this.databaseService.getWorkoutTemplate(this.editWorkoutId()!))?.createdAt || new Date() : 
            new Date(),
          updatedAt: new Date(),
          isActive: true
        };

        if (this.isEditMode()) {
          await this.databaseService.updateWorkoutTemplate(workout);
          this.snackBar.open('Workout updated successfully!', 'Close', { duration: 3000 });
        } else {
          await this.databaseService.addWorkoutTemplate(workout);
          this.snackBar.open('Workout created successfully!', 'Close', { duration: 3000 });
        }

        this.router.navigate(['/dashboard']);
      } catch (error) {
        console.error('Error saving workout:', error);
        this.snackBar.open('Error saving workout', 'Close', { duration: 3000 });
      } finally {
        this.isSubmitting.set(false);
      }
    } else {
      this.markFormGroupTouched(this.workoutForm);
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
    }
  }

  onCancel() {
    this.router.navigate(['/dashboard']);
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(ctrl => {
          if (ctrl instanceof FormGroup) {
            this.markFormGroupTouched(ctrl);
          }
        });
      }
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getExerciseTypePlaceholder(category: ExerciseCategory): string {
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

  isFieldRequired(fieldName: string, exerciseIndex?: number): boolean {
    if (exerciseIndex !== undefined) {
      const exercise = this.exercises.at(exerciseIndex);
      return exercise.get(fieldName)?.hasError('required') && exercise.get(fieldName)?.touched || false;
    }
    return this.workoutForm.get(fieldName)?.hasError('required') && this.workoutForm.get(fieldName)?.touched || false;
  }

  getFieldError(fieldName: string, exerciseIndex?: number): string {
    let control;
    if (exerciseIndex !== undefined) {
      control = this.exercises.at(exerciseIndex).get(fieldName);
    } else {
      control = this.workoutForm.get(fieldName);
    }

    if (control?.hasError('required')) {
      return `${fieldName} is required`;
    }
    if (control?.hasError('minlength')) {
      return `${fieldName} is too short`;
    }
    if (control?.hasError('min')) {
      return `${fieldName} must be greater than ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `${fieldName} must be less than ${control.errors?.['max'].max}`;
    }
    return '';
  }
}

