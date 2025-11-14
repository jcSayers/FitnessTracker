import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
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
    CommonModule
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

  getIconPath(icon: string): string {
    const iconMap: Record<string, string> = {
      'dashboard': 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
      'add_circle': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
      'history': 'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z'
    };
    return iconMap[icon] || '';
  }
}

