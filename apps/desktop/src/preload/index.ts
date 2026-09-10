import { contextBridge, ipcRenderer } from "electron";
import type { Command, Event } from "../../../../packages/protocol/index";
contextBridge.exposeInMainWorld(
  "apprentice",
  Object.freeze({
    credentials: (value: unknown) =>
      ipcRenderer.invoke("apprentice:credentials", value),
    command: (value: Command) =>
      ipcRenderer.invoke("apprentice:command", value),
    onEvent: (callback: (e: Event) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, value: Event) =>
        callback(value);
      ipcRenderer.on("apprentice:event", handler);
      return () => ipcRenderer.removeListener("apprentice:event", handler);
    },
  }),
);
