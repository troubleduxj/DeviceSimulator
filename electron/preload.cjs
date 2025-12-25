const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getServerConfig: () => ipcRenderer.invoke('get-server-config'),
});
