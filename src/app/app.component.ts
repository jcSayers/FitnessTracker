import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavigationComponent } from './components/bottom-navigation/bottom-navigation.component';
import { CommonModule } from '@angular/common';
import { DesktopIntegrationService } from './services/desktop-integration.service';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    BottomNavigationComponent,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Fitness Tracker';
  private desktop = inject(DesktopIntegrationService);
  private db = inject(DatabaseService);

  isDesktop = signal(this.desktop.isDesktop());
  envInfo = signal<any | null>(null);
  menuOpen = false;

  constructor() {
    if (this.isDesktop()) {
      this.desktop.getEnv().then(env => this.envInfo.set(env));
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  async onExport() {
    try {
      const data = await this.db.exportData();
      await this.desktop.exportWorkouts(data);
      if (this.isDesktop()) {
        await this.desktop.writeBackup(data);
      }
      this.showNotification('Export complete');
    } catch (e) {
      this.showNotification('Export failed');
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
        this.showNotification('Import complete');
      } else {
        this.showNotification('Import canceled');
      }
    } catch (e) {
      this.showNotification('Import failed');
    }
  }

  showAbout() {
    const env = this.envInfo();
    const msg = env ? `Desktop ${env.platform} (Electron) | Node ${env.versions.node}` : 'Web Version';
    this.showNotification(msg, 4000);
  }

  private showNotification(message: string, duration: number = 2500) {
    // Simple toast notification - can be enhanced with a custom component
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }
}
