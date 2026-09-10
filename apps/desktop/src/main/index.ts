import {
  app,
  BrowserWindow,
  ipcMain,
  utilityProcess,
  dialog,
  safeStorage,
} from "electron";
import { z } from "zod";
import { CredentialVault } from "./credentials";
import {
  ProviderSchema,
  type Provider,
} from "../../../../packages/protocol/index";
import { validateEndpoint } from "../../../../packages/adapters/index";
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
      const vault = new CredentialVault(data, safeStorage);
      worker = utilityProcess.fork(join(__dirname, "worker.cjs"), [], {
        env: {
          ...process.env,
          APPRENTICE_DATA: data,
          APPRENTICE_ELECTRON: "1",
        },
        serviceName: "Apprentice coordinator",
      });
      worker.on("message", (m: any) => {
        if (m.secretRequest) {
          try {
            worker.postMessage({
              secretReply: m.secretRequest,
              key: vault.get(ProviderSchema.parse(m.provider)),
            });
          } catch {
            worker.postMessage({
              secretReply: m.secretRequest,
              error:
                "Saved credential is unavailable or does not match the endpoint",
            });
          }
          return;
        }
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
      let credentialQueue = Promise.resolve<unknown>(undefined);
      ipcMain.handle("apprentice:credentials", async (event, input) => {
        if (
          !window ||
          event.sender !== window.webContents ||
          event.senderFrame !== window.webContents.mainFrame ||
          event.senderFrame.url !== entry
        )
          throw new Error("IPC sender denied");
        const operation = z
          .discriminatedUnion("type", [
            z.object({ type: z.literal("status") }).strict(),
            z
              .object({
                type: z.literal("save"),
                provider: ProviderSchema,
                key: z.string().min(1).max(16384).optional(),
              })
              .strict(),
            z
              .object({ type: z.literal("remove"), id: z.string().max(80) })
              .strict(),
          ])
          .parse(input);
        const task = credentialQueue.then(async () => {
          const snapshot = await request({ type: "snapshot" });
          if (operation.type === "status")
            return {
              path: vault.path,
              available: vault.available(),
              saved: snapshot.providers
                .filter((p: Provider) => p.credentialRef && vault.has(p))
                .map((p: Provider) => p.id),
            };
          const old = snapshot.providers.find(
            (p: Provider) =>
              p.id ===
              (operation.type === "save"
                ? operation.provider.id
                : operation.id),
          ) as Provider | undefined;
          if (operation.type === "remove") {
            if (!old?.credentialRef) return true;
            const { credentialRef, ...provider } = old;
            await request({ type: "provider.save", value: provider });
            vault.remove(credentialRef);
            return true;
          }
          const provider = { ...operation.provider };
          validateEndpoint(provider);
          let fresh: string | undefined;
          if (operation.key !== undefined) {
            delete provider.keyEnv;
            fresh = vault.put(provider, operation.key);
            provider.credentialRef = fresh;
          } else if (
            provider.credentialRef &&
            (provider.credentialRef !== old?.credentialRef ||
              !vault.has(provider))
          )
            throw new Error("Save the API key again for this endpoint");
          try {
            await request({ type: "provider.save", value: provider });
          } catch {
            if (fresh) vault.remove(fresh);
            throw new Error(
              "Provider save failed; previous configuration retained",
            );
          }
          if (
            old?.credentialRef &&
            old.credentialRef !== provider.credentialRef
          )
            vault.remove(old.credentialRef);
          return true;
        });
        credentialQueue = task.catch(() => {});
        return task;
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
