import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavigationComponent } from './components/bottom-navigation/bottom-navigation.component';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { DesktopIntegrationService } from './services/desktop-integration.service';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    BottomNavigationComponent,
    CommonModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Fitness Tracker';
  private desktop = inject(DesktopIntegrationService);
  private snackBar = inject(MatSnackBar);
  private db = inject(DatabaseService);

  isDesktop = signal(this.desktop.isDesktop());
  envInfo = signal<any | null>(null);

  constructor() {
    if (this.isDesktop()) {
      this.desktop.getEnv().then(env => this.envInfo.set(env));
    }
  }

  async onExport() {
    try {
      const data = await this.db.getAllWorkoutTemplates();
      await this.desktop.exportWorkouts(data);
      this.snackBar.open('Export complete', 'Close', { duration: 2500 });
    } catch (e) {
      this.snackBar.open('Export failed', 'Close', { duration: 3000 });
    }
  }

  async onImport() {
    try {
      const imported = await this.desktop.importWorkouts();
      if (imported) {
        // Naive merge: Add templates that don't exist yet by id
        // If you want a more sophisticated merge, we can expand later.
        for (const tpl of imported) {
          if (!tpl.id) continue;
          // Attempt to add only if not existing
          const existing = await this.db.getWorkoutTemplate(tpl.id).catch(() => null);
          if (!existing) {
            await this.db.addWorkoutTemplate({ ...tpl, isActive: tpl.isActive ?? true });
          }
        }
        this.snackBar.open('Import complete', 'Close', { duration: 2500 });
      } else {
        this.snackBar.open('Import canceled', 'Close', { duration: 2000 });
      }
    } catch (e) {
      this.snackBar.open('Import failed', 'Close', { duration: 3000 });
    }
  }

  showAbout() {
    const env = this.envInfo();
    const msg = env ? `Desktop ${env.platform} (Electron) | Node ${env.versions.node}` : 'Web Version';
    this.snackBar.open(msg, 'Close', { duration: 4000 });
  }
}
