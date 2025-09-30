// Global typing for Electron preload exposed API
// Augments the Window interface so Angular/TS code can use window.desktop

export interface DesktopApi {
  getEnv: () => Promise<{ isDev: boolean; platform: string; versions: Record<string, string>; }>;
  exportWorkouts: (suggestedName: string, data: any) => Promise<{ canceled: boolean; filePath?: string; error?: string }>;
  importWorkouts: () => Promise<{ canceled: boolean; filePath?: string; data?: any; error?: string }>;
  writeBackup: (data: any) => Promise<{ success: boolean; filePath?: string; error?: string }>;
}

declare global {
  interface Window {
    desktop: DesktopApi;
  }
}

export { };