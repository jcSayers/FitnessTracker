import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { TopAppBarComponent } from './components/top-app-bar/top-app-bar.component';
import { BottomNavigationComponent } from './components/bottom-navigation/bottom-navigation.component';
import { SyncManagerService } from './services/sync-manager.service';
import { ConnectivityService } from './services/connectivity.service';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopAppBarComponent, BottomNavigationComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private syncManager = inject(SyncManagerService);
  private connectivity = inject(ConnectivityService);
  private auth = inject(AuthService);
  router = inject(Router);
  isLoginPage = signal(false);

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(e => {
        this.isLoginPage.set((e as NavigationEnd).url.startsWith('/login'));
      });
    this.isLoginPage.set(this.router.url.startsWith('/login'));
    this.initializeAutoSync();
  }

  private async initializeAutoSync(): Promise<void> {
    console.log('[AppComponent] Initializing auto-sync...');

    this.syncManager.configure({
      userId: this.auth.userEmail() ?? this.auth.userId() ?? 'anonymous',
      serverUrl: environment.serverUrl,
      maxRetries: 3,
      retryDelay: 2000,
      syncTimeout: 30000
    });

    await this.delay(1000);

    if (this.connectivity.isOnline()) {
      console.log('[AppComponent] Online detected, starting sync session...');
      await this.syncManager.startSyncSession();
    } else {
      console.log('[AppComponent] Offline, skipping initial sync');
    }

    const status = this.syncManager.getStatus();
    console.log('[AppComponent] Auto-sync initialized:', status);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
