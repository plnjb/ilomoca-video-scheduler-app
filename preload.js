const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the frontend
contextBridge.exposeInMainWorld('api', {
  // Get the current playlist
  getPlaylist: () => ipcRenderer.invoke('get-playlist'),

  // Add a new song to the playlist
  addSong: (song) => ipcRenderer.invoke('add-song', song),

  // Remove a song by index
  removeSong: (index) => ipcRenderer.invoke('remove-song', index)
});
