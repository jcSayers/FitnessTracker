import { Injectable } from '@angular/core';

interface DesktopApi {
    getEnv: () => Promise<{ isDev: boolean; platform: string; versions: Record<string, string>; }>;
    exportWorkouts: (suggestedName: string, data: any) => Promise<{ canceled: boolean; filePath?: string; error?: string }>;
    importWorkouts: () => Promise<{ canceled: boolean; filePath?: string; data?: any; error?: string }>;
    writeBackup: (data: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
}

@Injectable({ providedIn: 'root' })
export class DesktopIntegrationService {
    private get api(): DesktopApi | undefined {
        return (window as any).desktop as DesktopApi | undefined;
    }

    isDesktop(): boolean {
        return !!this.api;
    }

    async getEnv() {
        if (!this.api) return { isDev: false, platform: 'web', versions: {} };
        return this.api.getEnv();
    }

    async exportWorkouts(data: any) {
        if (!this.api) {
            // Fallback: trigger browser download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'workouts-export.json';
            a.click();
            URL.revokeObjectURL(url);
            return { canceled: false, filePath: undefined };
        }
        return this.api.exportWorkouts('workouts-export.json', data);
    }

    async importWorkouts(): Promise<any[] | null> {
        if (!this.api) {
            return this.importInBrowser();
        }
        const res = await this.api.importWorkouts();
        if (res.canceled || res.error) return null;
        return res.data;
    }

    async writeBackup(fullData: any) {
        if (!this.api) return { success: false, error: 'Not desktop environment' };
        return this.api.writeBackup(fullData);
    }

    private importInBrowser(): Promise<any[] | null> {
        return new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = () => {
                const file = input.files?.[0];
                if (!file) return resolve(null);
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const json = JSON.parse(reader.result as string);
                        resolve(json);
                    } catch {
                        resolve(null);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }
}
