const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
	getEnv: () => ipcRenderer.invoke('app:get-env'),
	exportWorkouts: (suggestedName, data) => ipcRenderer.invoke('workout:export', { suggestedName, data }),
	importWorkouts: () => ipcRenderer.invoke('workout:import')
});

// TypeScript declaration hint (d.ts) will be added in src/types.
