const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const isDev = process.env.ELECTRON_START_URL || process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 1100,
        height: 800,
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            spellcheck: false,
        }
    });

    if (isDev) {
        const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:4200';
        win.loadURL(startUrl);
        win.webContents.openDevTools({ mode: 'detach' });
    } else {
        win.loadFile(path.join(__dirname, '..', 'dist', 'fitness-tracker', 'browser', 'index.html'));
    }

    win.webContents.setWindowOpenHandler(({ url }) => {
        // Open external links in default browser
        if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

// IPC channels
ipcMain.handle('app:get-env', () => ({
    isDev,
    platform: process.platform,
    versions: process.versions
}));

ipcMain.handle('workout:export', async (_evt, { suggestedName, data }) => {
    const result = await dialog.showSaveDialog({
        title: 'Export Workout Data',
        defaultPath: suggestedName || 'workouts-export.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    try {
        fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
        return { canceled: false, filePath: result.filePath };
    } catch (err) {
        return { canceled: false, error: err.message };
    }
});

ipcMain.handle('workout:import', async () => {
    const result = await dialog.showOpenDialog({
        title: 'Import Workout Data',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths?.length) return { canceled: true };
    try {
        const filePath = result.filePaths[0];
        const raw = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(raw);
        return { canceled: false, filePath, data: json };
    } catch (err) {
        return { canceled: false, error: err.message };
    }
});

ipcMain.handle('fit:import', async () => {
    const result = await dialog.showOpenDialog({
        title: 'Import Garmin FIT File',
        properties: ['openFile'],
        filters: [
            { name: 'FIT Files', extensions: ['fit'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (result.canceled || !result.filePaths?.length) return { canceled: true };
    try {
        const filePath = result.filePaths[0];
        const buffer = fs.readFileSync(filePath);
        return { canceled: false, filePath, buffer };
    } catch (err) {
        return { canceled: false, error: err.message };
    }
});

ipcMain.handle('data:write-backup', async (_evt, { data }) => {
    try {
        const userData = app.getPath('userData');
        const backupDir = path.join(userData, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = path.join(backupDir, `fitness-backup-${timestamp}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true, filePath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
