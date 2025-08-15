import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { filter, map } from 'rxjs/operators';
import { signal } from '@angular/core';

import { DatabaseService } from '../../services/database.service';
import { WorkoutStatus } from '../../models/workout.models';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatBadgeModule
  ],
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.scss']
})
export class BottomNavigationComponent {
  private router = inject(Router);
  private databaseService = inject(DatabaseService);

  activeIndex = signal(0);
  hasActiveWorkout = signal(false);

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard'
    },
    {
      label: 'Create',
      icon: 'add_circle',
      route: '/create-workout'
    },
    {
      label: 'History',
      icon: 'history',
      route: '/history'
    }
  ];

  constructor() {
    this.initializeNavigation();
    this.checkForActiveWorkout();
  }

  private initializeNavigation() {
    // Set initial active tab based on current route
    this.updateActiveIndex(this.router.url);

    // Listen to route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(event => (event as NavigationEnd).url)
      )
      .subscribe(url => {
        this.updateActiveIndex(url);
      });
  }

  private updateActiveIndex(url: string) {
    const index = this.navItems.findIndex(item => {
      if (item.route === '/dashboard') {
        return url === '/' || url === '/dashboard' || url.startsWith('/workout/');
      }
      return url.startsWith(item.route);
    });
    
    if (index !== -1) {
      this.activeIndex.set(index);
    }
  }

  private async checkForActiveWorkout() {
    try {
      const activeWorkout = await this.databaseService.getActiveWorkoutInstance();
      this.hasActiveWorkout.set(!!activeWorkout);
      
      // Update the dashboard nav item if there's an active workout
      if (activeWorkout) {
        this.navItems[0].badge = '1';
      } else {
        this.navItems[0].badge = undefined;
      }
    } catch (error) {
      console.error('Error checking for active workout:', error);
    }
  }

  onTabChanged(index: number) {
    const selectedItem = this.navItems[index];
    if (selectedItem) {
      this.router.navigate([selectedItem.route]);
    }
  }

  shouldShowNavigation(): boolean {
    const currentUrl = this.router.url;
    
    // Hide navigation on certain routes
    const hiddenRoutes = [
      '/sign-in',
      '/workout/' // Active workout pages
    ];

    return !hiddenRoutes.some(route => currentUrl.startsWith(route));
  }
}

