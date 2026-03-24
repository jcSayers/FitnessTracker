import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopAppBarComponent } from './components/top-app-bar/top-app-bar.component';
import { BottomNavigationComponent } from './components/bottom-navigation/bottom-navigation.component';
import { SyncManagerService } from './services/sync-manager.service';
import { ConnectivityService } from './services/connectivity.service';
import { inject } from '@angular/core';

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

  ngOnInit(): void {
    this.initializeAutoSync();
  }

  private async initializeAutoSync(): Promise<void> {
    console.log('[AppComponent] Initializing auto-sync...');

    this.syncManager.configure({
      userId: 'jc.sayers10@gmail.com',
      serverUrl: 'http://localhost:3000',
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
