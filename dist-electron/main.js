import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
function registerTaskIpc(ipcMain2, taskStore) {
  ipcMain2.handle("tasks:list", () => taskStore.listTasks());
  ipcMain2.handle("tasks:create", (_event, input) => taskStore.createTask(input));
  ipcMain2.handle(
    "tasks:update",
    (_event, id, input) => taskStore.updateTask(id, input)
  );
  ipcMain2.handle("tasks:delete", (_event, id) => taskStore.deleteTask(id));
}
const defaultDevicePolicy = {
  visibility: "local_only",
  execution: "local_only"
};
const defaultTaskState = {
  status: "idle"
};
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
  const taskStore = createTaskStore({
    dataDir: app.getPath("userData")
  });
  registerTaskIpc(ipcMain, taskStore);
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
