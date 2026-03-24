import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DatabaseService } from '../../services/database.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-navigation.component.html',
  styleUrls: ['./bottom-navigation.component.scss'],
})
export class BottomNavigationComponent {
  private router = inject(Router);
  private db = inject(DatabaseService);

  activeWorkoutId = signal<string | null>(null);
  currentUrl = signal(this.router.url);

  navItems: NavItem[] = [
    { label: '~/dash', icon: 'dashboard',     route: '/dashboard' },
    { label: '~/tmpl', icon: 'description',    route: '/templates' },
    { label: '~/actv', icon: 'fitness_center', route: '/actv'      },
    { label: '~/hist', icon: 'history',        route: '/history'   },
    { label: '~/sync', icon: 'sync',           route: '/sync'      },
  ];

  isActive = computed(() => {
    const url = this.currentUrl();
    return this.navItems.map((item, i) => {
      if (i === 2) return url.startsWith('/workout/');
      return url === item.route || url.startsWith(item.route + '/');
    });
  });

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => this.currentUrl.set((e as NavigationEnd).url));
    this.checkActiveWorkout();
  }

  private async checkActiveWorkout() {
    try {
      const w = await this.db.getActiveWorkoutInstance();
      this.activeWorkoutId.set(w?.id ?? null);
    } catch {}
  }

  navigate(i: number) {
    if (i === 2) {
      const id = this.activeWorkoutId();
      this.router.navigate([id ? `/workout/${id}` : '/templates']);
    } else {
      this.router.navigate([this.navItems[i].route]);
    }
  }
}
