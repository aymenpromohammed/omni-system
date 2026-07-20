// preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  printSilent: (printerName) => import_electron.ipcRenderer.invoke("print-silent", printerName)
});
