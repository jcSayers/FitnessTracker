import { Routes } from '@angular/router';
import { WorkoutListComponent } from './components/workout-list/workout-list.component';
import { CreateWorkoutComponent } from './components/create-workout/create-workout.component';
import { ManageExercisesComponent } from './components/manage-exercises/manage-exercises.component';
import { AddExerciseComponent } from './components/add-exercise/add-exercise.component';
import { ActiveWorkoutComponent } from './components/active-workout/active-workout.component';
import { WorkoutHistoryComponent } from './components/workout-history/workout-history.component';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [noAuthGuard],
  },
  { path: 'dashboard',        component: WorkoutListComponent,      canActivate: [authGuard] },
  { path: 'templates',        loadComponent: () => import('./components/template-list/template-list.component').then(m => m.TemplateListComponent), canActivate: [authGuard] },
  { path: 'create-workout',   component: CreateWorkoutComponent,    canActivate: [authGuard] },
  { path: 'manage-exercises', component: ManageExercisesComponent,  canActivate: [authGuard] },
  { path: 'add-exercise',     component: AddExerciseComponent,      canActivate: [authGuard] },
  { path: 'workout/:id',      component: ActiveWorkoutComponent,    canActivate: [authGuard] },
  { path: 'history',          component: WorkoutHistoryComponent,   canActivate: [authGuard] },
  { path: 'sync',             loadComponent: () => import('./components/sync-status/sync-status.component').then(m => m.SyncStatusComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '/dashboard' },
];
