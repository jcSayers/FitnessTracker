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
      const data = await this.db.exportData();
      await this.desktop.exportWorkouts(data);
      if (this.isDesktop()) {
        await this.desktop.writeBackup(data);
      }
      this.snackBar.open('Export complete', 'Close', { duration: 2500 });
    } catch (e) {
      this.snackBar.open('Export failed', 'Close', { duration: 3000 });
    }
  }

  async onImport() {
    try {
      // Safety backup before destructive import (desktop only)
      if (this.isDesktop()) {
        const current = await this.db.exportData();
        await this.desktop.writeBackup(current);
      }
      const importedRaw: any = await this.desktop.importWorkouts();
      if (importedRaw) {
        // Detect structure (full export vs just templates array)
        if (Array.isArray(importedRaw)) {
          // Legacy simple templates array
          for (const tpl of importedRaw) {
            if (!tpl?.id) continue;
            const existing = await this.db.getWorkoutTemplate(tpl.id).catch(() => null);
            if (!existing) {
              await this.db.addWorkoutTemplate({ ...tpl, isActive: tpl.isActive ?? true });
            }
          }
        } else if (importedRaw.workoutTemplates) {
          // Full data structure
            for (const tpl of importedRaw.workoutTemplates) {
              if (!tpl?.id) continue;
              const existing = await this.db.getWorkoutTemplate(tpl.id).catch(() => null);
              if (!existing) {
                await this.db.addWorkoutTemplate({ ...tpl, isActive: tpl.isActive ?? true });
              }
            }
            // Instances & logs potential future merge
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
