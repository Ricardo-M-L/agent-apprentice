import { app, BrowserWindow, ipcMain, utilityProcess, dialog } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CommandSchema } from "../../../../packages/protocol/index";
let window: BrowserWindow | null = null;
let worker: Electron.UtilityProcess;
let quitting = false;
let next = 0;
const pending = new Map<
  number,
  { resolve: (v: any) => void; reject: (e: Error) => void }
>();
const entry = pathToFileURL(join(__dirname, "renderer/index.html")).href;
function request(command: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++next;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, command });
  });
}
if (process.env.APPRENTICE_DATA)
  app.setPath("userData", process.env.APPRENTICE_DATA);
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    window?.show();
    window?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      const data = app.getPath("userData");
      worker = utilityProcess.fork(join(__dirname, "worker.cjs"), [], {
        env: {
          ...process.env,
          APPRENTICE_DATA: data,
          APPRENTICE_ELECTRON: "1",
        },
        serviceName: "Apprentice coordinator",
      });
      worker.on("message", (m: any) => {
        if (m.event || m.refresh) {
          window?.webContents.send(
            "apprentice:event",
            m.event ?? { kind: "refresh" },
          );
          return;
        }
        if (m.fatal) {
          dialog.showErrorBox("Coordinator failed", m.fatal);
          app.quit();
          return;
        }
        if (m.ready) return;
        const p = pending.get(m.id);
        if (p) {
          pending.delete(m.id);
          if (m.error) p.reject(new Error(m.error));
          else p.resolve(m.result);
        }
      });
      worker.on("exit", (code) => {
        for (const p of pending.values())
          p.reject(new Error("Coordinator stopped"));
        pending.clear();
        if (!quitting) {
          dialog.showErrorBox(
            "Coordinator stopped",
            `Exit ${code}. Restart to recover interrupted sessions.`,
          );
          app.quit();
        }
      });
      ipcMain.handle("apprentice:command", async (event, input) => {
        if (
          !window ||
          event.sender !== window.webContents ||
          event.senderFrame !== window.webContents.mainFrame ||
          event.senderFrame.url !== entry
        )
          throw new Error("IPC sender denied");
        return request(CommandSchema.parse(input));
      });
      window = new BrowserWindow({
        width: 1320,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: "Agent Apprentice",
        backgroundColor: "#0d1017",
        webPreferences: {
          preload: join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        },
      });
      window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      window.webContents.on("will-navigate", (e, url) => {
        if (url !== entry) e.preventDefault();
      });
      window.webContents.session.setPermissionRequestHandler(
        (_web, _permission, cb) => cb(false),
      );
      await window.loadURL(entry);
      window.on("closed", () => {
        window = null;
      });
    })
    .catch((e) => {
      dialog.showErrorBox("Startup failed", String(e));
      app.exit(1);
    });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (e) => {
    if (quitting) return;
    e.preventDefault();
    quitting = true;
    if (!worker) {
      app.exit(0);
      return;
    }
    const fallback = setTimeout(() => {
      worker.kill();
      app.exit(1);
    }, 22000);
    request({ type: "shutdown" }).finally(() => {
      clearTimeout(fallback);
      app.exit(0);
    });
  });
}
