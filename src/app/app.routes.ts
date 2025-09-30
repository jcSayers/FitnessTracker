import { Routes } from '@angular/router';
import { WorkoutListComponent } from './components/workout-list/workout-list.component';
import { CreateWorkoutComponent } from './components/create-workout/create-workout.component';
import { ManageExercisesComponent } from './components/manage-exercises/manage-exercises.component';
import { AddExerciseComponent } from './components/add-exercise/add-exercise.component';
import { ActiveWorkoutComponent } from './components/active-workout/active-workout.component';
import { WorkoutHistoryComponent } from './components/workout-history/workout-history.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: WorkoutListComponent,
    title: 'Dashboard - Fitness Tracker'
  },
  {
    path: 'create-workout',
    component: CreateWorkoutComponent,
    title: 'Create Workout - Fitness Tracker'
  },
  {
    path: 'manage-exercises',
    component: ManageExercisesComponent,
    title: 'Manage Exercises - Fitness Tracker'
  },
  {
    path: 'add-exercise',
    component: AddExerciseComponent,
    title: 'Add Exercise - Fitness Tracker'
  },
  {
    path: 'workout/:id',
    component: ActiveWorkoutComponent,
    title: 'Active Workout - Fitness Tracker'
  },
  {
    path: 'history',
    component: WorkoutHistoryComponent,
    title: 'Workout History - Fitness Tracker'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
]