import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
function registerAppSettingsIpc(ipcMain2, appSettingsStore) {
  ipcMain2.handle("settings:get", () => appSettingsStore.getSnapshot());
  ipcMain2.handle(
    "settings:update",
    (_event, settings) => appSettingsStore.updateSettings(settings)
  );
}
const defaultAppSettings = {
  themeMode: "light",
  defaultBrowserKind: "chrome",
  defaultTaskName: "새 브라우저 작업",
  initialUrlInputMode: "line"
};
function normalizeAppSettings(settings) {
  return {
    themeMode: isThemeMode(settings == null ? void 0 : settings.themeMode) ? settings.themeMode : defaultAppSettings.themeMode,
    defaultBrowserKind: isBrowserKind$1(settings == null ? void 0 : settings.defaultBrowserKind) ? settings.defaultBrowserKind : defaultAppSettings.defaultBrowserKind,
    defaultTaskName: typeof (settings == null ? void 0 : settings.defaultTaskName) === "string" && settings.defaultTaskName.trim() ? settings.defaultTaskName.trim() : defaultAppSettings.defaultTaskName,
    initialUrlInputMode: (settings == null ? void 0 : settings.initialUrlInputMode) === "line" ? settings.initialUrlInputMode : defaultAppSettings.initialUrlInputMode
  };
}
function isThemeMode(value) {
  return value === "system" || value === "light" || value === "dark";
}
function isBrowserKind$1(value) {
  return value === "chrome" || value === "edge" || value === "chromium";
}
function createAppSettingsStore({
  dataDir
}) {
  const settingsFilePath = path.join(dataDir, "appSettings.json");
  async function readSettings() {
    try {
      const raw = await readFile(settingsFilePath, "utf8");
      const parsed = JSON.parse(raw);
      return normalizeAppSettings(parsed.settings);
    } catch (error) {
      if (isNodeError$1(error) && error.code === "ENOENT") {
        return defaultAppSettings;
      }
      throw error;
    }
  }
  async function writeSettings(settings) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      settingsFilePath,
      `${JSON.stringify({ settings: normalizeAppSettings(settings) }, null, 2)}
`,
      "utf8"
    );
  }
  return {
    async getSnapshot() {
      return {
        settings: await readSettings(),
        userDataPath: dataDir
      };
    },
    async updateSettings(settings) {
      const normalizedSettings = normalizeAppSettings(settings);
      await writeSettings(normalizedSettings);
      return {
        settings: normalizedSettings,
        userDataPath: dataDir
      };
    }
  };
}
function isNodeError$1(error) {
  return error instanceof Error && "code" in error;
}
const defaultDevicePolicy = {
  visibility: "local_only",
  execution: "local_only"
};
const defaultTaskState = {
  status: "idle"
};
const defaultBrowserRunMode = "dedicated_profile";
function normalizeBrowserTabGroupConfig(config) {
  return {
    profileId: config.profileId ?? "",
    initialUrls: Array.isArray(config.initialUrls) ? config.initialUrls : [],
    browserKind: isBrowserKind(config.browserKind) ? config.browserKind : "chrome",
    restorePolicy: isRestorePolicy(config.restorePolicy) ? config.restorePolicy : "browser_profile",
    runMode: isBrowserRunMode(config.runMode) ? config.runMode : defaultBrowserRunMode
  };
}
function isBrowserKind(value) {
  return value === "chrome" || value === "edge" || value === "chromium";
}
function isRestorePolicy(value) {
  return value === "browser_profile" || value === "initial_urls_only";
}
function isBrowserRunMode(value) {
  return value === "dedicated_profile" || value === "extension_controlled" || value === "default_browser_deeplink";
}
async function findBrowserExecutable(browserKind) {
  const displayName = getBrowserDisplayName(browserKind);
  const candidates = dedupe([
    ...getKnownBrowserPaths(browserKind),
    ...getPathBrowserCandidates(browserKind)
  ]);
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return {
        displayName,
        path: candidate
      };
    }
  }
  throw new Error(
    `${displayName} 실행 파일을 찾지 못했습니다. 브라우저가 설치되어 있는지 확인하거나 작업의 브라우저 종류를 변경해 주세요.`
  );
}
function getBrowserDisplayName(browserKind) {
  switch (browserKind) {
    case "chrome":
      return "Chrome";
    case "edge":
      return "Edge";
    case "chromium":
      return "Chromium";
  }
}
function getKnownBrowserPaths(browserKind) {
  if (process.platform === "win32") {
    return getWindowsBrowserPaths(browserKind);
  }
  if (process.platform === "darwin") {
    return getMacBrowserPaths(browserKind);
  }
  return getLinuxBrowserPaths(browserKind);
}
function getWindowsBrowserPaths(browserKind) {
  const localAppData = process.env["LOCALAPPDATA"];
  const programFiles = process.env["ProgramFiles"];
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  switch (browserKind) {
    case "chrome":
      return joinExistingRoots(
        [localAppData, programFiles, programFilesX86],
        "Google\\Chrome\\Application\\chrome.exe"
      );
    case "edge":
      return joinExistingRoots(
        [programFilesX86, programFiles, localAppData],
        "Microsoft\\Edge\\Application\\msedge.exe"
      );
    case "chromium":
      return joinExistingRoots(
        [localAppData, programFiles, programFilesX86],
        "Chromium\\Application\\chrome.exe"
      );
  }
}
function getMacBrowserPaths(browserKind) {
  switch (browserKind) {
    case "chrome":
      return [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        path.join(
          process.env["HOME"] ?? "",
          "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        )
      ];
    case "edge":
      return [
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        path.join(
          process.env["HOME"] ?? "",
          "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
        )
      ];
    case "chromium":
      return [
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        path.join(
          process.env["HOME"] ?? "",
          "Applications/Chromium.app/Contents/MacOS/Chromium"
        )
      ];
  }
}
function getLinuxBrowserPaths(browserKind) {
  switch (browserKind) {
    case "chrome":
      return [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/snap/bin/chromium"
      ];
    case "edge":
      return [
        "/usr/bin/microsoft-edge",
        "/usr/bin/microsoft-edge-stable"
      ];
    case "chromium":
      return [
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium"
      ];
  }
}
function getPathBrowserCandidates(browserKind) {
  const pathDirectories = (process.env["PATH"] ?? "").split(path.delimiter).filter(Boolean);
  const executableNames = getBrowserExecutableNames(browserKind);
  return pathDirectories.flatMap(
    (directory) => executableNames.map((executableName) => path.join(directory, executableName))
  );
}
function getBrowserExecutableNames(browserKind) {
  const extensionSuffixes = process.platform === "win32" ? (process.env["PATHEXT"] ?? ".EXE").split(";").filter(Boolean).map((extension) => extension.toLowerCase()) : [""];
  const baseNames = (() => {
    switch (browserKind) {
      case "chrome":
        return ["chrome", "google-chrome", "google-chrome-stable"];
      case "edge":
        return ["msedge", "microsoft-edge", "microsoft-edge-stable"];
      case "chromium":
        return ["chromium", "chromium-browser", "chrome"];
    }
  })();
  return baseNames.flatMap(
    (baseName) => extensionSuffixes.map(
      (extension) => baseName.toLowerCase().endsWith(extension) ? baseName : `${baseName}${extension}`
    )
  );
}
function joinExistingRoots(roots, leaf) {
  return roots.filter((root) => Boolean(root)).map((root) => path.join(root, leaf));
}
function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}
async function pathExists(value) {
  try {
    await access(value, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
const browserTabGroupAdapter = {
  type: "browser_tab_group",
  validateConfig(config) {
    const normalizedConfig = normalizeBrowserTabGroupConfig(config);
    if (!normalizedConfig.profileId.trim()) {
      throw new Error("Browser tab group tasks require a profileId.");
    }
  },
  async run({ dataDir, task, updateState }) {
    const config = normalizeBrowserTabGroupConfig(task.config);
    if (config.runMode !== "dedicated_profile") {
      throw new Error(
        `${config.runMode} 실행 방식은 아직 지원하지 않습니다.`
      );
    }
    const localProfilePath = path.join(
      dataDir,
      "browser-profiles",
      config.profileId
    );
    await mkdir(localProfilePath, { recursive: true });
    const browserExecutable = await findBrowserExecutable(config.browserKind);
    const browserProcess = await launchBrowser(browserExecutable.path, [
      `--user-data-dir=${localProfilePath}`,
      "--no-first-run",
      "--new-window",
      ...config.initialUrls
    ]);
    browserProcess.once("exit", (code, signal) => {
      void updateState(
        getBrowserExitState(browserExecutable.displayName, code, signal)
      );
    });
    return {
      state: {
        ...task.state,
        status: "running",
        lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: void 0,
        localProfilePath
      },
      message: `${browserExecutable.displayName}을 전용 프로필로 실행했습니다.`
    };
  }
};
async function launchBrowser(executablePath, args) {
  const browserProcess = spawn(executablePath, args, {
    detached: true,
    stdio: "ignore"
  });
  await new Promise((resolve, reject) => {
    browserProcess.once("error", reject);
    browserProcess.once("spawn", resolve);
  });
  browserProcess.unref();
  return browserProcess;
}
function getBrowserExitState(displayName, code, signal) {
  if (signal) {
    return {
      status: "failed",
      lastError: `${displayName} 프로세스가 ${signal} 신호로 종료되었습니다.`
    };
  }
  if (code === null || code === 0) {
    return {
      status: "idle",
      lastError: void 0
    };
  }
  return {
    status: "failed",
    lastError: `${displayName} 프로세스가 오류 코드 ${code}로 종료되었습니다.`
  };
}
function createTaskAdapterRegistry(adapters) {
  const adaptersByType = /* @__PURE__ */ new Map();
  for (const adapter of adapters) {
    adaptersByType.set(adapter.type, adapter);
  }
  return {
    getAdapter(type) {
      const adapter = adaptersByType.get(type);
      if (!adapter) {
        throw new Error(`No task adapter registered for type: ${type}`);
      }
      return adapter;
    }
  };
}
function registerTaskIpc(ipcMain2, taskStore, taskRunner) {
  ipcMain2.handle("tasks:list", () => taskStore.listTasks());
  ipcMain2.handle("tasks:create", (_event, input) => taskStore.createTask(input));
  ipcMain2.handle(
    "tasks:update",
    (_event, id, input) => taskStore.updateTask(id, input)
  );
  ipcMain2.handle("tasks:delete", (_event, id) => taskStore.deleteTask(id));
  ipcMain2.handle("tasks:run", (_event, id) => taskRunner.runTask(id));
}
function createTaskRunner({
  taskStore,
  adapterRegistry,
  dataDir,
  deviceId
}) {
  return {
    async runTask(id) {
      const task = await taskStore.getTask(id);
      const adapter = adapterRegistry.getAdapter(task.type);
      let resolveRunStateSaved = () => void 0;
      const runStateSaved = new Promise((resolve) => {
        resolveRunStateSaved = resolve;
      });
      try {
        await adapter.validateConfig(task.config);
        const result = await adapter.run({
          task,
          deviceId,
          dataDir,
          async updateState(state) {
            await runStateSaved;
            const currentTask = await taskStore.getTask(task.id);
            await taskStore.updateTask(task.id, {
              state: {
                ...currentTask.state,
                ...state
              }
            });
          }
        });
        const resultState = result.state;
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            ...resultState
          }
        });
        resolveRunStateSaved();
        return updatedTask;
      } catch (error) {
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: "failed",
            lastError: getErrorMessage(error)
          }
        });
        resolveRunStateSaved();
        return updatedTask;
      }
    }
  };
}
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return "알 수 없는 실행 오류가 발생했습니다.";
}
function createTaskStore({ dataDir }) {
  const tasksFilePath = path.join(dataDir, "tasks.json");
  async function readTaskFile() {
    try {
      const raw = await readFile(tasksFilePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : []
      };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { tasks: [] };
      }
      throw error;
    }
  }
  async function writeTaskFile(taskFile) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      tasksFilePath,
      `${JSON.stringify(taskFile, null, 2)}
`,
      "utf8"
    );
  }
  return {
    async getTask(id) {
      const taskFile = await readTaskFile();
      const task = taskFile.tasks.find((currentTask) => currentTask.id === id);
      if (!task) {
        throw new Error(`Task not found: ${id}`);
      }
      return task;
    },
    async listTasks() {
      const taskFile = await readTaskFile();
      return taskFile.tasks;
    },
    async createTask(input) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const task = {
        id: randomUUID(),
        name: input.name.trim(),
        type: input.type,
        config: input.config,
        state: input.state ?? defaultTaskState,
        permissions: input.permissions ?? defaultDevicePolicy,
        createdAt: now,
        updatedAt: now
      };
      const taskFile = await readTaskFile();
      await writeTaskFile({
        tasks: [...taskFile.tasks, task]
      });
      return task;
    },
    async updateTask(id, input) {
      var _a;
      const taskFile = await readTaskFile();
      const taskIndex = taskFile.tasks.findIndex((task) => task.id === id);
      if (taskIndex === -1) {
        throw new Error(`Task not found: ${id}`);
      }
      const currentTask = taskFile.tasks[taskIndex];
      const updatedTask = {
        ...currentTask,
        ...input,
        name: ((_a = input.name) == null ? void 0 : _a.trim()) ?? currentTask.name,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const tasks = [...taskFile.tasks];
      tasks[taskIndex] = updatedTask;
      await writeTaskFile({ tasks });
      return updatedTask;
    },
    async deleteTask(id) {
      const taskFile = await readTaskFile();
      await writeTaskFile({
        tasks: taskFile.tasks.filter((task) => task.id !== id)
      });
    }
  };
}
function isNodeError(error) {
  return error instanceof Error && "code" in error;
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  const dataDir = app.getPath("userData");
  const appSettingsStore = createAppSettingsStore({
    dataDir
  });
  const taskStore = createTaskStore({
    dataDir
  });
  const adapterRegistry = createTaskAdapterRegistry([browserTabGroupAdapter]);
  const taskRunner = createTaskRunner({
    taskStore,
    adapterRegistry,
    dataDir,
    deviceId: "local-device"
  });
  registerAppSettingsIpc(ipcMain, appSettingsStore);
  registerTaskIpc(ipcMain, taskStore, taskRunner);
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
