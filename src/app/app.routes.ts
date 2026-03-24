import { Routes } from '@angular/router';
import { WorkoutListComponent } from './components/workout-list/workout-list.component';
import { CreateWorkoutComponent } from './components/create-workout/create-workout.component';
import { ManageExercisesComponent } from './components/manage-exercises/manage-exercises.component';
import { AddExerciseComponent } from './components/add-exercise/add-exercise.component';
import { ActiveWorkoutComponent } from './components/active-workout/active-workout.component';
import { WorkoutHistoryComponent } from './components/workout-history/workout-history.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard',        component: WorkoutListComponent },
  { path: 'templates',        loadComponent: () => import('./components/template-list/template-list.component').then(m => m.TemplateListComponent) },
  { path: 'create-workout',   component: CreateWorkoutComponent },
  { path: 'manage-exercises', component: ManageExercisesComponent },
  { path: 'add-exercise',     component: AddExerciseComponent },
  { path: 'workout/:id',      component: ActiveWorkoutComponent },
  { path: 'history',          component: WorkoutHistoryComponent },
  { path: 'sync',             loadComponent: () => import('./components/sync-status/sync-status.component').then(m => m.SyncStatusComponent) },
  { path: '**', redirectTo: '/dashboard' },
];
