import { BrowserWindow, dialog, app, safeStorage, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile, mkdir, writeFile, stat, access } from "node:fs/promises";
import os from "node:os";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { constants } from "node:fs";
function createDeviceStore({ dataDir }) {
  const deviceFilePath = path.join(dataDir, "device.json");
  async function readCurrentDevice() {
    try {
      const raw = await readFile(deviceFilePath, "utf8");
      const parsed = JSON.parse(raw);
      if (typeof parsed.id === "string" && parsed.id.trim()) {
        return {
          id: parsed.id.trim(),
          name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : parsed.id.trim()
        };
      }
      return null;
    } catch (error) {
      if (isNodeError$5(error) && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  async function writeCurrentDevice(device) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      deviceFilePath,
      `${JSON.stringify(device, null, 2)}
`,
      "utf8"
    );
  }
  return {
    async getCurrentDevice() {
      const existingDevice = await readCurrentDevice();
      if (existingDevice) {
        return existingDevice;
      }
      const device = {
        id: randomUUID(),
        name: os.hostname() || "Local device"
      };
      await writeCurrentDevice(device);
      return device;
    }
  };
}
function isNodeError$5(error) {
  return error instanceof Error && "code" in error;
}
function registerSecretIpc(ipcMain2, secretStore, taskStore) {
  ipcMain2.handle("secrets:status", () => secretStore.getStorageStatus());
  ipcMain2.handle("secrets:list", () => secretStore.listSecrets());
  ipcMain2.handle(
    "secrets:create",
    (_event, input) => secretStore.createSecret(input)
  );
  ipcMain2.handle("secrets:delete", async (_event, id) => {
    await secretStore.deleteSecret(id);
    await removeSecretRefsFromTasks(taskStore, id);
  });
}
async function removeSecretRefsFromTasks(taskStore, secretId) {
  const tasks = await taskStore.listTasks();
  await Promise.all(
    tasks.map(async (task) => {
      var _a, _b;
      const secretRefs = (_a = task.permissions.secretRefs) == null ? void 0 : _a.filter(
        (secretRef) => secretRef.id !== secretId
      );
      if ((secretRefs == null ? void 0 : secretRefs.length) === ((_b = task.permissions.secretRefs) == null ? void 0 : _b.length)) {
        return;
      }
      await taskStore.updateTask(task.id, {
        permissions: {
          ...task.permissions,
          secretRefs
        }
      });
    })
  );
}
function normalizeLocalSecretName(value) {
  return value.trim();
}
function createSecretStore({
  dataDir,
  encrypt,
  encryptionBackend,
  encryptionAvailable
}) {
  const secretsFilePath = path.join(dataDir, "secrets.json");
  async function readSecretFile() {
    try {
      const raw = await readFile(secretsFilePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        secrets: Array.isArray(parsed.secrets) ? parsed.secrets : []
      };
    } catch (error) {
      if (isNodeError$4(error) && error.code === "ENOENT") {
        return { secrets: [] };
      }
      throw error;
    }
  }
  async function writeSecretFile(secretFile) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      secretsFilePath,
      `${JSON.stringify(secretFile, null, 2)}
`,
      "utf8"
    );
  }
  async function readMigratedSecretFile() {
    const secretFile = await readSecretFile();
    if (!encryptionAvailable) {
      return secretFile;
    }
    let didMigrate = false;
    const secrets = secretFile.secrets.map((secret) => {
      if (!secret.value || secret.encryptedValue) {
        return secret;
      }
      didMigrate = true;
      return {
        ...secret,
        value: void 0,
        encryptedValue: encrypt(secret.value),
        storage: "electron_safe_storage",
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    });
    if (didMigrate) {
      await writeSecretFile({ secrets });
    }
    return { secrets };
  }
  return {
    async getStorageStatus() {
      return {
        encryptionAvailable,
        backend: encryptionBackend,
        message: encryptionAvailable ? "Secret 암호화 저장을 사용할 수 있습니다." : "이 기기에서는 Electron safeStorage 암호화 저장을 사용할 수 없습니다."
      };
    },
    async listSecrets() {
      const secretFile = await readMigratedSecretFile();
      return secretFile.secrets.map(toMetadata);
    },
    async createSecret(input) {
      var _a;
      const name = normalizeLocalSecretName(input.name);
      const value = input.value.trim();
      if (!name || !value) {
        throw new Error("Secret 이름과 값이 필요합니다.");
      }
      if (!encryptionAvailable) {
        throw new Error(
          "이 기기에서는 Secret 암호화 저장을 사용할 수 없습니다."
        );
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const secret = {
        id: randomUUID(),
        name,
        encryptedValue: encrypt(value),
        storage: "electron_safe_storage",
        description: ((_a = input.description) == null ? void 0 : _a.trim()) || void 0,
        createdAt: now,
        updatedAt: now
      };
      const secretFile = await readMigratedSecretFile();
      await writeSecretFile({
        secrets: [...secretFile.secrets, secret]
      });
      return toMetadata(secret);
    },
    async deleteSecret(id) {
      const secretFile = await readMigratedSecretFile();
      await writeSecretFile({
        secrets: secretFile.secrets.filter((secret) => secret.id !== id)
      });
    }
  };
}
function toMetadata(secret) {
  return {
    id: secret.id,
    name: secret.name,
    description: secret.description,
    createdAt: secret.createdAt,
    updatedAt: secret.updatedAt
  };
}
function isNodeError$4(error) {
  return error instanceof Error && "code" in error;
}
function registerAppSettingsIpc(ipcMain2, appSettingsStore, deviceStore) {
  ipcMain2.handle("settings:get", async () => ({
    ...await appSettingsStore.getSnapshot(),
    currentDevice: await deviceStore.getCurrentDevice()
  }));
  ipcMain2.handle("settings:update", async (_event, settings) => ({
    ...await appSettingsStore.updateSettings(settings),
    currentDevice: await deviceStore.getCurrentDevice()
  }));
}
function normalizeLinkedDevices(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((device) => {
    if (!device || typeof device !== "object") {
      return null;
    }
    const candidate = device;
    if (typeof candidate.id !== "string" || !candidate.id.trim()) {
      return null;
    }
    return {
      id: candidate.id.trim(),
      name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : candidate.id.trim(),
      accessLevel: isDeviceAccessLevel(candidate.accessLevel) ? candidate.accessLevel : "visible"
    };
  }).filter((device) => Boolean(device));
}
function isDeviceAccessLevel(value) {
  return value === "blocked" || value === "visible" || value === "executable" || value === "trusted";
}
const defaultAppSettings = {
  themeMode: "light",
  defaultBrowserKind: "chrome",
  defaultTaskName: "새 브라우저 작업",
  initialUrlInputMode: "line",
  taskListDisplayMode: "grid",
  browserExecutablePaths: {},
  linkedDevices: [],
  taskRunEventRetentionLimit: 300,
  taskRunEventExportLimit: 50
};
function normalizeAppSettings(settings) {
  return {
    themeMode: isThemeMode(settings == null ? void 0 : settings.themeMode) ? settings.themeMode : defaultAppSettings.themeMode,
    defaultBrowserKind: isBrowserKind$1(settings == null ? void 0 : settings.defaultBrowserKind) ? settings.defaultBrowserKind : defaultAppSettings.defaultBrowserKind,
    defaultTaskName: typeof (settings == null ? void 0 : settings.defaultTaskName) === "string" && settings.defaultTaskName.trim() ? settings.defaultTaskName.trim() : defaultAppSettings.defaultTaskName,
    initialUrlInputMode: (settings == null ? void 0 : settings.initialUrlInputMode) === "line" ? settings.initialUrlInputMode : defaultAppSettings.initialUrlInputMode,
    taskListDisplayMode: isTaskListDisplayMode(settings == null ? void 0 : settings.taskListDisplayMode) ? settings.taskListDisplayMode : defaultAppSettings.taskListDisplayMode,
    browserExecutablePaths: normalizeBrowserExecutablePaths(
      settings == null ? void 0 : settings.browserExecutablePaths
    ),
    linkedDevices: normalizeLinkedDevices(settings == null ? void 0 : settings.linkedDevices),
    taskRunEventRetentionLimit: normalizeRetentionLimit(
      settings == null ? void 0 : settings.taskRunEventRetentionLimit
    ),
    taskRunEventExportLimit: normalizeEventExportLimit(
      settings == null ? void 0 : settings.taskRunEventExportLimit
    )
  };
}
function normalizeRetentionLimit(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultAppSettings.taskRunEventRetentionLimit;
  }
  return Math.min(Math.max(Math.round(value), 50), 2e3);
}
function normalizeEventExportLimit(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultAppSettings.taskRunEventExportLimit;
  }
  return Math.min(Math.max(Math.round(value), 0), 2e3);
}
function normalizeBrowserExecutablePaths(browserExecutablePaths) {
  if (!browserExecutablePaths || typeof browserExecutablePaths !== "object") {
    return defaultAppSettings.browserExecutablePaths;
  }
  return {
    chrome: normalizeOptionalPath(
      browserExecutablePaths.chrome
    ),
    edge: normalizeOptionalPath(
      browserExecutablePaths.edge
    ),
    chromium: normalizeOptionalPath(
      browserExecutablePaths.chromium
    )
  };
}
function normalizeOptionalPath(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmedValue = value.trim();
  return trimmedValue || void 0;
}
function isThemeMode(value) {
  return value === "system" || value === "light" || value === "dark";
}
function isBrowserKind$1(value) {
  return value === "chrome" || value === "edge" || value === "chromium";
}
function isTaskListDisplayMode(value) {
  return value === "grid" || value === "list";
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
      if (isNodeError$3(error) && error.code === "ENOENT") {
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
function isNodeError$3(error) {
  return error instanceof Error && "code" in error;
}
function registerSyncIpc(ipcMain2, mockSyncStore) {
  ipcMain2.handle("sync:status", () => mockSyncStore.getStatus());
  ipcMain2.handle("sync:export", () => mockSyncStore.exportSnapshot());
  ipcMain2.handle("sync:export-file", async (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    const options = {
      defaultPath: "pastel-flow-sync.json",
      filters: [{ name: "JSON", extensions: ["json"] }]
    };
    const result = browserWindow ? await dialog.showSaveDialog(browserWindow, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return void 0;
    }
    return mockSyncStore.exportSnapshotToPath(result.filePath);
  });
  ipcMain2.handle(
    "sync:import",
    (_event, snapshot) => mockSyncStore.importSnapshot(snapshot)
  );
  ipcMain2.handle("sync:import-file", async (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    const options = {
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"]
    };
    const result = browserWindow ? await dialog.showOpenDialog(browserWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) {
      return void 0;
    }
    return mockSyncStore.importSnapshotFromPath(result.filePaths[0]);
  });
}
function normalizeSyncExportSnapshot(value) {
  if (!value || typeof value !== "object") {
    throw new Error("동기화 스냅샷 형식이 올바르지 않습니다.");
  }
  const candidate = value;
  if (candidate.schemaVersion !== 1) {
    throw new Error("지원하지 않는 동기화 스냅샷 버전입니다.");
  }
  if (typeof candidate.exportedAt !== "string" || !candidate.sourceDevice || typeof candidate.sourceDevice.id !== "string" || typeof candidate.sourceDevice.name !== "string" || !Array.isArray(candidate.tasks) || !Array.isArray(candidate.taskRunEvents) || !Array.isArray(candidate.linkedDevices)) {
    throw new Error("동기화 스냅샷 필수 필드가 누락되었습니다.");
  }
  return candidate;
}
function createMockSyncStore({
  appSettingsStore,
  dataDir,
  deviceStore,
  taskRunEventStore,
  taskStore
}) {
  const exportPath = path.join(dataDir, "syncExport.json");
  return {
    async getStatus() {
      return {
        exportPath,
        lastExportedAt: await getLastExportedAt(exportPath)
      };
    },
    async exportSnapshot() {
      const [currentDevice, settingsSnapshot, tasks, taskRunEvents] = await Promise.all([
        deviceStore.getCurrentDevice(),
        appSettingsStore.getSnapshot(),
        taskStore.listTasks(),
        appSettingsStore.getSnapshot().then(
          (snapshot2) => taskRunEventStore.listEvents(void 0, {
            limit: snapshot2.settings.taskRunEventExportLimit
          })
        )
      ]);
      const snapshot = {
        schemaVersion: 1,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        sourceDevice: currentDevice,
        tasks: stripLocalTaskState(tasks),
        taskRunEvents,
        linkedDevices: settingsSnapshot.settings.linkedDevices
      };
      await mkdir(dataDir, { recursive: true });
      await writeFile(exportPath, `${JSON.stringify(snapshot, null, 2)}
`, "utf8");
      return snapshot;
    },
    async exportSnapshotToPath(filePath) {
      const snapshot = await this.exportSnapshot();
      await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}
`, "utf8");
      return snapshot;
    },
    async importSnapshot(snapshot) {
      const nextSnapshot = snapshot ?? await readSnapshot(exportPath);
      const normalizedSnapshot = normalizeSyncExportSnapshot(nextSnapshot);
      const currentTasks = await taskStore.listTasks();
      const mergedTasks = mergeTasks(currentTasks, normalizedSnapshot.tasks);
      const taskRunEventsAdded = await taskRunEventStore.importEvents(
        normalizedSnapshot.taskRunEvents
      );
      const settingsSnapshot = await appSettingsStore.getSnapshot();
      const linkedDevices = mergeLinkedDevices(
        settingsSnapshot.settings.linkedDevices,
        normalizedSnapshot.linkedDevices
      );
      await Promise.all([
        taskStore.replaceTasks(mergedTasks.tasks),
        appSettingsStore.updateSettings({
          ...settingsSnapshot.settings,
          linkedDevices
        })
      ]);
      return {
        importedAt: (/* @__PURE__ */ new Date()).toISOString(),
        tasksCreated: mergedTasks.created,
        tasksUpdated: mergedTasks.updated,
        taskRunEventsAdded,
        linkedDevicesMerged: linkedDevices.length - settingsSnapshot.settings.linkedDevices.length
      };
    },
    async importSnapshotFromPath(filePath) {
      return this.importSnapshot(await readSnapshot(filePath));
    }
  };
}
async function getLastExportedAt(exportPath) {
  try {
    const fileStat = await stat(exportPath);
    return fileStat.mtime.toISOString();
  } catch (error) {
    if (isNodeError$2(error) && error.code === "ENOENT") {
      return void 0;
    }
    throw error;
  }
}
async function readSnapshot(exportPath) {
  const raw = await readFile(exportPath, "utf8");
  return normalizeSyncExportSnapshot(JSON.parse(raw));
}
function stripLocalTaskState(tasks) {
  return tasks.map((task) => ({
    ...task,
    state: {
      ...task.state,
      localProfilePath: void 0
    }
  }));
}
function mergeTasks(currentTasks, incomingTasks) {
  const taskMap = new Map(currentTasks.map((task) => [task.id, task]));
  let created = 0;
  let updated = 0;
  for (const incomingTask of incomingTasks) {
    const currentTask = taskMap.get(incomingTask.id);
    if (!currentTask) {
      taskMap.set(incomingTask.id, incomingTask);
      created += 1;
      continue;
    }
    if (incomingTask.updatedAt > currentTask.updatedAt) {
      taskMap.set(incomingTask.id, mergeTaskFields(currentTask, incomingTask));
      updated += 1;
    } else {
      const mergedTask = mergeTaskFields(incomingTask, currentTask);
      if (JSON.stringify(mergedTask) !== JSON.stringify(currentTask)) {
        taskMap.set(incomingTask.id, mergedTask);
        updated += 1;
      }
    }
  }
  return {
    tasks: [...taskMap.values()].sort(
      (left, right) => left.createdAt.localeCompare(right.createdAt)
    ),
    created,
    updated
  };
}
function mergeTaskFields(olderTask, newerTask) {
  return {
    ...newerTask,
    config: {
      ...olderTask.config,
      ...newerTask.config
    },
    permissions: {
      ...newerTask.permissions,
      allowedDeviceIds: dedupe$2([
        ...olderTask.permissions.allowedDeviceIds ?? [],
        ...newerTask.permissions.allowedDeviceIds ?? []
      ]),
      secretRefs: [
        ...new Map(
          [
            ...olderTask.permissions.secretRefs ?? [],
            ...newerTask.permissions.secretRefs ?? []
          ].map((secretRef) => [secretRef.id, secretRef])
        ).values()
      ]
    },
    schedule: newerTask.schedule ?? olderTask.schedule,
    state: {
      ...newerTask.state,
      localProfilePath: olderTask.state.localProfilePath,
      status: olderTask.state.status === "running" ? olderTask.state.status : newerTask.state.status
    }
  };
}
function mergeLinkedDevices(currentDevices, incomingDevices) {
  const deviceMap = new Map(
    normalizeLinkedDevices(currentDevices).map((device) => [device.id, device])
  );
  for (const device of normalizeLinkedDevices(incomingDevices)) {
    deviceMap.set(device.id, device);
  }
  return [...deviceMap.values()];
}
function isNodeError$2(error) {
  return error instanceof Error && "code" in error;
}
function dedupe$2(values) {
  return [...new Set(values)];
}
const defaultDevicePolicy = {
  visibility: "local_only",
  execution: "local_only"
};
const defaultTaskState = {
  status: "idle"
};
const defaultTaskSchedule = {
  intervalMinutes: 60
};
const defaultBrowserRunMode = "dedicated_profile";
const defaultDynamicTemplateUpdates = false;
function normalizeBrowserTabGroupConfig(config) {
  return {
    profileId: config.profileId ?? "",
    initialUrls: Array.isArray(config.initialUrls) ? config.initialUrls : [],
    browserKind: isBrowserKind(config.browserKind) ? config.browserKind : "chrome",
    restorePolicy: isRestorePolicy(config.restorePolicy) ? config.restorePolicy : "browser_profile",
    runMode: isBrowserRunMode(config.runMode) ? config.runMode : defaultBrowserRunMode,
    dynamicTemplateUpdates: typeof config.dynamicTemplateUpdates === "boolean" ? config.dynamicTemplateUpdates : defaultDynamicTemplateUpdates,
    tabGroupSnapshot: normalizeBrowserTabGroupStateSnapshot(
      config.tabGroupSnapshot
    )
  };
}
function normalizeDevicePolicy(policy) {
  return {
    visibility: isDeviceVisibilityPolicy(policy == null ? void 0 : policy.visibility) ? policy.visibility : defaultDevicePolicy.visibility,
    execution: isDeviceExecutionPolicy(policy == null ? void 0 : policy.execution) ? policy.execution : defaultDevicePolicy.execution,
    allowedDeviceIds: Array.isArray(policy == null ? void 0 : policy.allowedDeviceIds) ? policy.allowedDeviceIds.map(
      (deviceId) => typeof deviceId === "string" ? deviceId.trim() : ""
    ).filter(Boolean) : void 0,
    secretRefs: Array.isArray(policy == null ? void 0 : policy.secretRefs) ? policy.secretRefs.filter(
      (secretRef) => typeof secretRef.id === "string" && secretRef.id.trim() && (secretRef.scope === "local_device" || secretRef.scope === "trusted_devices")
    ) : void 0
  };
}
function normalizeTaskSchedule(schedule) {
  if (!schedule) {
    return void 0;
  }
  return {
    enabled: schedule.enabled === true,
    mode: isTaskScheduleMode(schedule.mode) ? schedule.mode : "interval",
    intervalMinutes: normalizeScheduleInterval(schedule.intervalMinutes),
    timeOfDay: normalizeTimeOfDay(schedule.timeOfDay),
    daysOfWeek: normalizeDaysOfWeek(schedule.daysOfWeek),
    nextRunAt: typeof schedule.nextRunAt === "string" && schedule.nextRunAt.trim() ? schedule.nextRunAt : void 0,
    lastTriggeredAt: typeof schedule.lastTriggeredAt === "string" && schedule.lastTriggeredAt.trim() ? schedule.lastTriggeredAt : void 0
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
function normalizeScheduleInterval(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultTaskSchedule.intervalMinutes;
  }
  return Math.min(Math.max(Math.round(value), 1), 10080);
}
function normalizeTimeOfDay(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmedValue = value.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmedValue) ? trimmedValue : void 0;
}
function normalizeDaysOfWeek(value) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const days = value.map((day) => typeof day === "number" ? Math.round(day) : -1).filter((day) => day >= 0 && day <= 6);
  return days.length > 0 ? [...new Set(days)] : void 0;
}
function isTaskScheduleMode(value) {
  return value === "interval" || value === "daily" || value === "weekly";
}
function isDeviceVisibilityPolicy(value) {
  return value === "all_devices" || value === "trusted_devices" || value === "specific_devices" || value === "local_only";
}
function normalizeBrowserTabGroupStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return void 0;
  }
  const candidate = snapshot;
  if (typeof candidate.capturedAt !== "string" || !Array.isArray(candidate.tabs) || !Array.isArray(candidate.groups)) {
    return void 0;
  }
  const tabs = candidate.tabs.reduce((result, tab) => {
    if (!tab || typeof tab !== "object") {
      return result;
    }
    const normalizedTab = {
      id: typeof tab.id === "number" && Number.isFinite(tab.id) ? tab.id : void 0,
      windowId: typeof tab.windowId === "number" && Number.isFinite(tab.windowId) ? tab.windowId : 0,
      index: typeof tab.index === "number" && Number.isFinite(tab.index) ? tab.index : 0,
      url: typeof tab.url === "string" ? tab.url : "",
      title: typeof tab.title === "string" ? tab.title : void 0,
      groupId: typeof tab.groupId === "number" && Number.isFinite(tab.groupId) ? tab.groupId : void 0,
      active: tab.active === true,
      pinned: tab.pinned === true
    };
    return normalizedTab.url ? [...result, normalizedTab] : result;
  }, []);
  const groups = candidate.groups.reduce(
    (result, group) => {
      if (!group || typeof group !== "object") {
        return result;
      }
      return [
        ...result,
        {
          id: typeof group.id === "number" && Number.isFinite(group.id) ? group.id : 0,
          windowId: typeof group.windowId === "number" && Number.isFinite(group.windowId) ? group.windowId : 0,
          title: typeof group.title === "string" && group.title.trim() ? group.title : void 0,
          color: isBrowserTabGroupColor(group.color) ? group.color : "grey",
          collapsed: group.collapsed === true
        }
      ];
    },
    []
  );
  return {
    capturedAt: candidate.capturedAt,
    tabs,
    groups
  };
}
function isBrowserTabGroupColor(value) {
  return value === "grey" || value === "blue" || value === "red" || value === "yellow" || value === "green" || value === "pink" || value === "purple" || value === "cyan" || value === "orange";
}
function isDeviceExecutionPolicy(value) {
  return value === "anywhere" || value === "trusted_only" || value === "specific_devices" || value === "local_only";
}
function canViewTaskOnDevice(task, currentDevice, linkedDevices) {
  const accessLevel = getCurrentDeviceAccessLevel(currentDevice, linkedDevices);
  if (accessLevel === "blocked") {
    return false;
  }
  switch (task.permissions.visibility) {
    case "all_devices":
      return true;
    case "trusted_devices":
      return accessLevel === "trusted";
    case "specific_devices":
      return isDeviceAllowed(task.permissions, currentDevice.id);
    case "local_only":
      return isLocalDeviceAllowed(task.permissions, currentDevice.id);
  }
}
function canExecuteTaskOnDevice(task, currentDevice, linkedDevices) {
  const accessLevel = getCurrentDeviceAccessLevel(currentDevice, linkedDevices);
  if (accessLevel !== "executable" && accessLevel !== "trusted") {
    return false;
  }
  switch (task.permissions.execution) {
    case "anywhere":
      return true;
    case "trusted_only":
      return accessLevel === "trusted";
    case "specific_devices":
      return isDeviceAllowed(task.permissions, currentDevice.id);
    case "local_only":
      return isLocalDeviceAllowed(task.permissions, currentDevice.id);
  }
}
function createLocalOnlyDevicePolicy(currentDevice) {
  return {
    visibility: "local_only",
    execution: "local_only",
    allowedDeviceIds: [currentDevice.id]
  };
}
function getCurrentDeviceAccessLevel(currentDevice, linkedDevices) {
  var _a;
  return ((_a = linkedDevices.find((device) => device.id === currentDevice.id)) == null ? void 0 : _a.accessLevel) ?? "trusted";
}
function isDeviceAllowed(permissions, deviceId) {
  var _a;
  return Boolean((_a = permissions.allowedDeviceIds) == null ? void 0 : _a.includes(deviceId));
}
function isLocalDeviceAllowed(permissions, deviceId) {
  if (!permissions.allowedDeviceIds || permissions.allowedDeviceIds.length === 0) {
    return true;
  }
  return permissions.allowedDeviceIds.includes(deviceId);
}
async function findBrowserExecutable(browserKind, executablePaths = {}) {
  var _a;
  const displayName = getBrowserDisplayName(browserKind);
  const configuredPath = (_a = executablePaths[browserKind]) == null ? void 0 : _a.trim();
  if (configuredPath) {
    if (await pathExists(configuredPath)) {
      return {
        displayName,
        path: configuredPath
      };
    }
    throw new Error(
      `${displayName} 실행 파일 경로가 올바르지 않습니다: ${configuredPath}`
    );
  }
  const candidates = dedupe$1([
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
function dedupe$1(values) {
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
const runningBrowserProcesses = /* @__PURE__ */ new Map();
const browserTabGroupAdapter = {
  type: "browser_tab_group",
  validateConfig(config) {
    const normalizedConfig = normalizeBrowserTabGroupConfig(config);
    if (!normalizedConfig.profileId.trim()) {
      throw new Error("Browser tab group tasks require a profileId.");
    }
  },
  async run({ appSettings, dataDir, task, updateConfig, updateState }) {
    const config = normalizeBrowserTabGroupConfig(task.config);
    if (config.runMode === "default_browser_deeplink") {
      await openDefaultBrowserUrls(config.initialUrls);
      return {
        state: {
          ...task.state,
          status: "idle",
          lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastError: void 0
        },
        message: "기본 브라우저로 초기 URL을 열었습니다."
      };
    }
    const localProfilePath = path.join(
      dataDir,
      "browser-profiles",
      config.profileId
    );
    await mkdir(localProfilePath, { recursive: true });
    const browserExecutable = await findBrowserExecutable(
      config.browserKind,
      appSettings.browserExecutablePaths
    );
    const shouldLoadExtensionBridge = config.runMode === "extension_controlled";
    const extensionBridgePath = shouldLoadExtensionBridge ? await ensureBrowserExtensionBridge(dataDir) : null;
    const remoteDebuggingPort = config.dynamicTemplateUpdates || shouldLoadExtensionBridge ? getRemoteDebuggingPort(task.id) : null;
    const browserProcess = await launchBrowser(browserExecutable.path, [
      `--user-data-dir=${localProfilePath}`,
      "--no-first-run",
      "--new-window",
      ...remoteDebuggingPort ? [`--remote-debugging-port=${remoteDebuggingPort}`] : [],
      ...extensionBridgePath ? [
        `--disable-extensions-except=${extensionBridgePath}`,
        `--load-extension=${extensionBridgePath}`
      ] : [],
      ...config.initialUrls
    ]);
    runningBrowserProcesses.set(task.id, browserProcess);
    const browserStateSnapshotter = remoteDebuggingPort ? startBrowserStateSnapshotter(
      remoteDebuggingPort,
      shouldLoadExtensionBridge
    ) : null;
    browserProcess.once("exit", (code, signal) => {
      void (async () => {
        runningBrowserProcesses.delete(task.id);
        const snapshot = browserStateSnapshotter == null ? void 0 : browserStateSnapshotter.stop();
        const openUrls = (snapshot == null ? void 0 : snapshot.urls) ?? [];
        const nextState = getBrowserExitState(
          browserExecutable.displayName,
          code,
          signal
        );
        if ((openUrls.length > 0 || (snapshot == null ? void 0 : snapshot.tabGroupSnapshot)) && nextState.status !== "failed") {
          await updateConfig({
            ...config,
            initialUrls: openUrls.length > 0 ? openUrls : config.initialUrls,
            tabGroupSnapshot: snapshot == null ? void 0 : snapshot.tabGroupSnapshot
          });
        }
        await updateState(nextState);
      })();
    });
    return {
      state: {
        ...task.state,
        status: "running",
        lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: void 0,
        localProfilePath
      },
      message: `${browserExecutable.displayName}을 ${getRunModeLabel(
        config.runMode
      )}로 실행했습니다.`
    };
  },
  async stop(taskId) {
    const browserProcess = runningBrowserProcesses.get(taskId);
    if (!browserProcess || browserProcess.killed) {
      throw new Error("실행 중인 브라우저 프로세스를 찾지 못했습니다.");
    }
    browserProcess.kill();
    runningBrowserProcesses.delete(taskId);
  }
};
const extensionManifest = {
  manifest_version: 3,
  name: "Pastel Flow Tab Group Bridge",
  version: "0.1.0",
  description: "Captures browser tab and tab group metadata for Pastel Flow.",
  permissions: ["tabs", "tabGroups"],
  background: {
    service_worker: "background.js"
  }
};
const extensionBackground = `
chrome.runtime.onInstalled.addListener(() => undefined)
chrome.runtime.onStartup.addListener(() => undefined)
chrome.tabs.onCreated.addListener(() => undefined)
chrome.tabs.onUpdated.addListener(() => undefined)
chrome.tabs.onRemoved.addListener(() => undefined)
chrome.tabGroups.onCreated.addListener(() => undefined)
chrome.tabGroups.onUpdated.addListener(() => undefined)
chrome.tabGroups.onRemoved.addListener(() => undefined)
`;
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
async function openDefaultBrowserUrls(urls) {
  const targetUrls = urls.filter(isTemplateUrl);
  if (targetUrls.length === 0) {
    throw new Error("기본 브라우저 연결 실행에는 하나 이상의 URL이 필요합니다.");
  }
  await Promise.all(targetUrls.map(openDefaultBrowserUrl));
}
async function openDefaultBrowserUrl(url) {
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const browserProcess = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  await new Promise((resolve, reject) => {
    browserProcess.once("error", reject);
    browserProcess.once("spawn", resolve);
  });
  browserProcess.unref();
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
function getRunModeLabel(runMode) {
  switch (runMode) {
    case "dedicated_profile":
      return "전용 프로필";
    case "extension_controlled":
      return "확장 프로그램 제어";
    case "default_browser_deeplink":
      return "기본 브라우저 연결";
  }
}
function getRemoteDebuggingPort(taskId) {
  const hash = [...taskId].reduce(
    (currentHash, character) => (currentHash * 31 + character.charCodeAt(0)) % 1e3,
    0
  );
  return 9200 + hash;
}
async function ensureBrowserExtensionBridge(dataDir) {
  const extensionDirectory = path.join(dataDir, "browser-extension-bridge");
  await mkdir(extensionDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(extensionDirectory, "manifest.json"),
      `${JSON.stringify(extensionManifest, null, 2)}
`,
      "utf8"
    ),
    writeFile(
      path.join(extensionDirectory, "background.js"),
      extensionBackground.trimStart(),
      "utf8"
    )
  ]);
  return extensionDirectory;
}
function startBrowserStateSnapshotter(port, shouldReadTabGroups) {
  let latestSnapshot = { urls: [] };
  const interval = setInterval(() => {
    void readBrowserStateSnapshot(port, shouldReadTabGroups).then((snapshot) => {
      if (snapshot.urls.length > 0 || snapshot.tabGroupSnapshot) {
        latestSnapshot = snapshot;
      }
    });
  }, 2e3);
  return {
    stop() {
      clearInterval(interval);
      return latestSnapshot;
    }
  };
}
async function readBrowserStateSnapshot(port, shouldReadTabGroups) {
  const urls = await readOpenTabUrls(port);
  const tabGroupSnapshot = shouldReadTabGroups ? await readExtensionTabGroupSnapshot(port) : void 0;
  return {
    urls: tabGroupSnapshot ? dedupe(tabGroupSnapshot.tabs.map((tab) => tab.url).filter(isTemplateUrl)) : urls,
    tabGroupSnapshot
  };
}
async function readOpenTabUrls(port) {
  const targets = await readDevToolsTargets(port);
  return dedupe(
    targets.filter((target) => target.type === "page").map((target) => {
      var _a;
      return ((_a = target.url) == null ? void 0 : _a.trim()) ?? "";
    }).filter(isTemplateUrl)
  );
}
async function readExtensionTabGroupSnapshot(port) {
  const targets = await readDevToolsTargets(port);
  const extensionTarget = targets.find(
    (target) => {
      var _a;
      return target.type === "service_worker" && ((_a = target.url) == null ? void 0 : _a.endsWith("/background.js")) && target.webSocketDebuggerUrl;
    }
  );
  if (!(extensionTarget == null ? void 0 : extensionTarget.webSocketDebuggerUrl)) {
    return void 0;
  }
  const value = await evaluateDevToolsExpression(
    extensionTarget.webSocketDebuggerUrl,
    tabGroupSnapshotExpression
  );
  return isBrowserTabGroupStateSnapshot(value) ? value : void 0;
}
async function readDevToolsTargets(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch {
    return [];
  }
}
const tabGroupSnapshotExpression = `
new Promise((resolve) => {
  chrome.tabs.query({}, (tabs) => {
    chrome.tabGroups.query({}, (groups) => {
      resolve({
        capturedAt: new Date().toISOString(),
        tabs: tabs.map((tab) => ({
          id: tab.id,
          windowId: tab.windowId,
          index: tab.index,
          url: tab.url || '',
          title: tab.title || undefined,
          groupId: tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE ? undefined : tab.groupId,
          active: Boolean(tab.active),
          pinned: Boolean(tab.pinned),
        })),
        groups: groups.map((group) => ({
          id: group.id,
          windowId: group.windowId,
          title: group.title || undefined,
          color: group.color,
          collapsed: Boolean(group.collapsed),
        })),
      })
    })
  })
})
`;
async function evaluateDevToolsExpression(webSocketUrl, expression) {
  var _a, _b;
  const client = await connectDevToolsWebSocket(webSocketUrl);
  try {
    const response = await client.request({
      id: 1,
      method: "Runtime.evaluate",
      params: {
        awaitPromise: true,
        expression,
        returnByValue: true
      }
    });
    return (_b = (_a = response.result) == null ? void 0 : _a.result) == null ? void 0 : _b.value;
  } finally {
    client.close();
  }
}
async function connectDevToolsWebSocket(webSocketUrl) {
  const url = new URL(webSocketUrl);
  const socket = createConnection({
    host: url.hostname,
    port: Number(url.port)
  });
  const acceptKey = cryptoRandomBase64(16);
  let readBuffer = Buffer.alloc(0);
  await new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write(
        [
          `GET ${url.pathname}${url.search} HTTP/1.1`,
          `Host: ${url.host}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Key: ${acceptKey}`,
          "Sec-WebSocket-Version: 13",
          "\r\n"
        ].join("\r\n")
      );
    });
    socket.once("data", (chunk) => {
      readBuffer = Buffer.concat([readBuffer, chunk]);
      const headerEnd = readBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        reject(new Error("DevTools WebSocket handshake failed."));
        return;
      }
      const header = readBuffer.subarray(0, headerEnd).toString("utf8");
      if (!header.includes(" 101 ")) {
        reject(new Error("DevTools WebSocket upgrade was rejected."));
        return;
      }
      readBuffer = readBuffer.subarray(headerEnd + 4);
      resolve();
    });
  });
  return {
    request(message) {
      socket.write(encodeWebSocketFrame(JSON.stringify(message)));
      return new Promise((resolve, reject) => {
        const handleData = (chunk) => {
          readBuffer = Buffer.concat([readBuffer, chunk]);
          const decodedFrame = decodeWebSocketFrame(readBuffer);
          if (!decodedFrame) {
            return;
          }
          readBuffer = decodedFrame.remaining;
          socket.off("error", reject);
          socket.off("data", handleData);
          resolve(JSON.parse(decodedFrame.payload.toString("utf8")));
        };
        socket.on("data", handleData);
        socket.once("error", reject);
      });
    },
    close() {
      socket.end();
    }
  };
}
function encodeWebSocketFrame(payloadText) {
  const payload = Buffer.from(payloadText);
  const mask = randomBytes(4);
  const headerLength = payload.length < 126 ? 6 : 8;
  const frame = Buffer.alloc(headerLength + payload.length);
  frame[0] = 129;
  if (payload.length < 126) {
    frame[1] = 128 | payload.length;
    mask.copy(frame, 2);
  } else {
    frame[1] = 128 | 126;
    frame.writeUInt16BE(payload.length, 2);
    mask.copy(frame, 4);
  }
  const payloadOffset = headerLength;
  for (let index = 0; index < payload.length; index += 1) {
    frame[payloadOffset + index] = payload[index] ^ mask[index % 4];
  }
  return frame;
}
function decodeWebSocketFrame(buffer) {
  if (buffer.length < 2) {
    return null;
  }
  const payloadLengthIndicator = buffer[1] & 127;
  const payloadOffset = payloadLengthIndicator === 126 ? 4 : 2;
  const payloadLength = payloadLengthIndicator === 126 ? buffer.readUInt16BE(2) : payloadLengthIndicator;
  if (buffer.length < payloadOffset + payloadLength) {
    return null;
  }
  return {
    payload: buffer.subarray(payloadOffset, payloadOffset + payloadLength),
    remaining: buffer.subarray(payloadOffset + payloadLength)
  };
}
function cryptoRandomBase64(byteLength) {
  return randomBytes(byteLength).toString("base64");
}
function isBrowserTabGroupStateSnapshot(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const snapshot = value;
  return typeof snapshot.capturedAt === "string" && Array.isArray(snapshot.tabs) && Array.isArray(snapshot.groups) && snapshot.tabs.every(
    (tab) => typeof tab === "object" && typeof tab.windowId === "number" && typeof tab.index === "number" && typeof tab.url === "string" && typeof tab.active === "boolean" && typeof tab.pinned === "boolean"
  ) && snapshot.groups.every(
    (group) => typeof group === "object" && typeof group.id === "number" && typeof group.windowId === "number" && typeof group.color === "string" && typeof group.collapsed === "boolean"
  );
}
function isTemplateUrl(value) {
  return Boolean(value) && !value.startsWith("devtools://") && !value.startsWith("chrome://") && !value.startsWith("edge://") && value !== "about:blank";
}
function dedupe(values) {
  return [...new Set(values)];
}
const crawlerAdapter = {
  type: "crawler",
  validateConfig(config) {
    const normalizedConfig = normalizeCrawlerConfig(config);
    if (normalizedConfig.urls.length === 0) {
      throw new Error("Crawler tasks require at least one URL.");
    }
  },
  async run({ dataDir, task }) {
    const config = normalizeCrawlerConfig(task.config);
    const outputDirectory = path.join(dataDir, "crawler-results");
    const outputPath = path.join(
      outputDirectory,
      `${task.id}-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`
    );
    const results = await Promise.all(
      config.urls.map((url) => fetchCrawlerUrl(url, config.maxBytes))
    );
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(
        {
          taskId: task.id,
          capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
          results
        },
        null,
        2
      )}
`,
      "utf8"
    );
    return {
      state: {
        ...task.state,
        status: results.some((result) => result.status === "failed") ? "failed" : "idle",
        lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: results.some((result) => result.status === "failed") ? "일부 URL 수집에 실패했습니다." : void 0,
        lastMessage: `${results.length}개 URL을 수집했습니다.`,
        outputPath
      },
      message: `${results.length}개 URL을 수집했습니다.`
    };
  }
};
function normalizeCrawlerConfig(config) {
  return {
    urls: Array.isArray(config.urls) ? config.urls.map((url) => typeof url === "string" ? url.trim() : "").filter(Boolean) : [],
    maxBytes: typeof config.maxBytes === "number" && Number.isFinite(config.maxBytes) ? Math.min(Math.max(Math.round(config.maxBytes), 1024), 5e5) : 5e4
  };
}
async function fetchCrawlerUrl(url, maxBytes) {
  try {
    const response = await fetch(url);
    const text = (await response.text()).slice(0, maxBytes);
    return {
      url,
      status: response.ok ? "captured" : "failed",
      statusCode: response.status,
      title: getTitle(text),
      bodyPreview: stripHtml(text).slice(0, 1e3),
      error: response.ok ? void 0 : response.statusText
    };
  } catch (error) {
    return {
      url,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown crawler error"
    };
  }
}
function getTitle(html) {
  var _a;
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return ((_a = match == null ? void 0 : match[1]) == null ? void 0 : _a.trim()) || void 0;
}
function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
const discordBotAdapter = {
  type: "discord_bot",
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error("Discord bot adapter는 현재 dry-run 실행만 지원합니다.");
    }
  },
  async run({ task }) {
    return createDryRunResult(
      task.state,
      `Discord bot dry-run을 완료했습니다. prefix=${task.config.commandPrefix ?? "없음"}`
    );
  }
};
const notionSyncAdapter = {
  type: "notion_sync",
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error("Notion sync adapter는 현재 dry-run 실행만 지원합니다.");
    }
  },
  async run({ task }) {
    return createDryRunResult(
      task.state,
      `Notion sync dry-run을 완료했습니다. database=${task.config.databaseId ?? "없음"}`
    );
  }
};
const tradingBotAdapter = {
  type: "trading_bot",
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error("Trading bot adapter는 dry-run=false 실행을 거부합니다.");
    }
  },
  async run({ task }) {
    return createDryRunResult(
      task.state,
      `Trading bot dry-run을 완료했습니다. ${task.config.exchange ?? "exchange 없음"} ${task.config.symbol ?? "symbol 없음"}`
    );
  }
};
function createDryRunResult(state, message) {
  return {
    state: {
      ...state,
      status: "idle",
      lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastError: void 0,
      lastMessage: message
    },
    message
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
function registerTaskIpc(ipcMain2, taskStore, taskRunner, taskRunEventStore, appSettingsStore, deviceStore) {
  ipcMain2.handle("tasks:list", async () => {
    const [tasks, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.listTasks(),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    return tasks.filter(
      (task) => canViewTaskOnDevice(
        task,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices
      )
    );
  });
  ipcMain2.handle("tasks:list-events", async (_event, taskId) => {
    const [tasks, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.listTasks(),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    const visibleTaskIds = new Set(
      tasks.filter(
        (task) => canViewTaskOnDevice(
          task,
          currentDevice,
          appSettingsSnapshot.settings.linkedDevices
        )
      ).map((task) => task.id)
    );
    if (taskId && !visibleTaskIds.has(taskId)) {
      return [];
    }
    const events = await taskRunEventStore.listEvents(taskId);
    return events.filter((event) => visibleTaskIds.has(event.taskId));
  });
  ipcMain2.handle("tasks:prune-events", () => taskRunEventStore.pruneEvents());
  ipcMain2.handle("tasks:create", async (_event, input) => {
    const currentDevice = await deviceStore.getCurrentDevice();
    return taskStore.createTask({
      ...input,
      permissions: input.permissions ?? createLocalOnlyDevicePolicy(currentDevice)
    });
  });
  ipcMain2.handle("tasks:update", async (_event, id, input) => {
    const [task, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.getTask(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    if (!canExecuteTaskOnDevice(
      task,
      currentDevice,
      appSettingsSnapshot.settings.linkedDevices
    )) {
      throw new Error("이 기기에서는 해당 작업을 수정할 수 없습니다.");
    }
    return taskStore.updateTask(id, input);
  });
  ipcMain2.handle("tasks:delete", async (_event, id) => {
    const [task, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.getTask(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    if (!canExecuteTaskOnDevice(
      task,
      currentDevice,
      appSettingsSnapshot.settings.linkedDevices
    )) {
      throw new Error("이 기기에서는 해당 작업을 삭제할 수 없습니다.");
    }
    return taskStore.deleteTask(id);
  });
  ipcMain2.handle("tasks:run", async (_event, id) => {
    const [task, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.getTask(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    if (!canExecuteTaskOnDevice(
      task,
      currentDevice,
      appSettingsSnapshot.settings.linkedDevices
    )) {
      throw new Error("이 기기에서는 해당 작업을 실행할 수 없습니다.");
    }
    return taskRunner.runTask(id);
  });
  ipcMain2.handle("tasks:stop", async (_event, id) => {
    const [task, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.getTask(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    if (!canExecuteTaskOnDevice(
      task,
      currentDevice,
      appSettingsSnapshot.settings.linkedDevices
    )) {
      throw new Error("이 기기에서는 해당 작업을 중지할 수 없습니다.");
    }
    return taskRunner.stopTask(id);
  });
}
function createTaskRunner({
  taskStore,
  taskRunEventStore,
  appSettingsStore,
  adapterRegistry,
  dataDir,
  deviceId,
  onTaskUpdated
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
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          deviceId,
          status: "running",
          message: "작업 실행을 시작했습니다."
        });
        await adapter.validateConfig(task.config);
        const appSettingsSnapshot = await appSettingsStore.getSnapshot();
        const result = await adapter.run({
          task,
          deviceId,
          dataDir,
          appSettings: appSettingsSnapshot.settings,
          async updateConfig(config) {
            await runStateSaved;
            const updatedTask2 = await taskStore.updateTask(task.id, {
              config
            });
            await taskRunEventStore.appendEvent({
              taskId: task.id,
              deviceId,
              status: updatedTask2.state.status,
              message: "브라우저 탭 변경사항을 템플릿에 반영했습니다."
            });
            onTaskUpdated == null ? void 0 : onTaskUpdated(updatedTask2);
          },
          async updateState(state) {
            await runStateSaved;
            const currentTask = await taskStore.getTask(task.id);
            const updatedTask2 = await taskStore.updateTask(task.id, {
              state: {
                ...currentTask.state,
                ...state
              }
            });
            await taskRunEventStore.appendEvent({
              taskId: task.id,
              deviceId,
              status: updatedTask2.state.status,
              message: updatedTask2.state.lastError ?? "작업 상태가 변경되었습니다."
            });
            onTaskUpdated == null ? void 0 : onTaskUpdated(updatedTask2);
          }
        });
        const resultState = result.state;
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            ...resultState
          }
        });
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          deviceId,
          status: updatedTask.state.status,
          message: result.message ?? "작업 실행 요청을 처리했습니다."
        });
        resolveRunStateSaved();
        onTaskUpdated == null ? void 0 : onTaskUpdated(updatedTask);
        return updatedTask;
      } catch (error) {
        const message = getErrorMessage(error);
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: "failed",
            lastError: message
          }
        });
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          deviceId,
          status: "failed",
          message
        });
        resolveRunStateSaved();
        onTaskUpdated == null ? void 0 : onTaskUpdated(updatedTask);
        return updatedTask;
      }
    },
    async stopTask(id) {
      const task = await taskStore.getTask(id);
      const adapter = adapterRegistry.getAdapter(task.type);
      if (!adapter.stop) {
        throw new Error("이 작업 타입은 중지를 지원하지 않습니다.");
      }
      try {
        await adapter.stop(task.id);
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: "idle",
            lastError: void 0
          }
        });
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          deviceId,
          status: "idle",
          message: "작업 중지를 요청했습니다."
        });
        onTaskUpdated == null ? void 0 : onTaskUpdated(updatedTask);
        return updatedTask;
      } catch (error) {
        const message = getErrorMessage(error);
        const updatedTask = await taskStore.updateTask(task.id, {
          state: {
            ...task.state,
            status: "failed",
            lastError: message
          }
        });
        await taskRunEventStore.appendEvent({
          taskId: task.id,
          deviceId,
          status: "failed",
          message
        });
        onTaskUpdated == null ? void 0 : onTaskUpdated(updatedTask);
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
function createTaskScheduler({
  appSettingsStore,
  deviceStore,
  taskRunner,
  taskStore
}) {
  let interval = null;
  let isTicking = false;
  async function tick() {
    if (isTicking) {
      return;
    }
    isTicking = true;
    try {
      const [tasks, currentDevice, appSettingsSnapshot] = await Promise.all([
        taskStore.listTasks(),
        deviceStore.getCurrentDevice(),
        appSettingsStore.getSnapshot()
      ]);
      const now = /* @__PURE__ */ new Date();
      for (const task of tasks) {
        const schedule = normalizeTaskSchedule(task.schedule);
        if (!(schedule == null ? void 0 : schedule.enabled) || task.state.status === "running" || !canExecuteTaskOnDevice(
          task,
          currentDevice,
          appSettingsSnapshot.settings.linkedDevices
        )) {
          continue;
        }
        const nextRunAt = schedule.nextRunAt ? new Date(schedule.nextRunAt) : new Date(task.updatedAt);
        if (Number.isNaN(nextRunAt.getTime()) || nextRunAt > now) {
          continue;
        }
        await taskStore.updateTask(task.id, {
          schedule: {
            ...schedule,
            lastTriggeredAt: now.toISOString(),
            nextRunAt: getNextRunAt(now, schedule)
          }
        });
        void taskRunner.runTask(task.id);
      }
    } finally {
      isTicking = false;
    }
  }
  return {
    start() {
      if (interval) {
        return;
      }
      interval = setInterval(() => {
        void tick();
      }, 6e4);
      void tick();
    },
    stop() {
      if (!interval) {
        return;
      }
      clearInterval(interval);
      interval = null;
    }
  };
}
function getNextRunAt(date, schedule) {
  switch (schedule.mode) {
    case "daily":
      return getNextWallClockRunAt(date, schedule.timeOfDay, [0, 1, 2, 3, 4, 5, 6]);
    case "weekly":
      return getNextWallClockRunAt(date, schedule.timeOfDay, schedule.daysOfWeek);
    case "interval":
      return new Date(
        date.getTime() + schedule.intervalMinutes * 6e4
      ).toISOString();
  }
}
function getNextWallClockRunAt(date, timeOfDay = "09:00", daysOfWeek) {
  const allowedDays = daysOfWeek && daysOfWeek.length > 0 ? new Set(daysOfWeek) : /* @__PURE__ */ new Set([date.getDay()]);
  const [hour, minute] = timeOfDay.split(":").map(Number);
  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() + dayOffset);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate <= date || !allowedDays.has(candidate.getDay())) {
      continue;
    }
    return candidate.toISOString();
  }
  return new Date(date.getTime() + 24 * 60 * 6e4).toISOString();
}
function createTaskRunEventStore({
  dataDir,
  getRetentionLimit
}) {
  const eventsFilePath = path.join(dataDir, "taskRunEvents.json");
  async function readEventFile() {
    try {
      const raw = await readFile(eventsFilePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        events: Array.isArray(parsed.events) ? parsed.events : []
      };
    } catch (error) {
      if (isNodeError$1(error) && error.code === "ENOENT") {
        return { events: [] };
      }
      throw error;
    }
  }
  async function writeEventFile(eventFile) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      eventsFilePath,
      `${JSON.stringify(eventFile, null, 2)}
`,
      "utf8"
    );
  }
  return {
    async listEvents(taskId, options) {
      const eventFile = await readEventFile();
      return eventFile.events.filter((event) => !taskId || event.taskId === taskId).sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, (options == null ? void 0 : options.limit) ?? 50);
    },
    async appendEvent(input) {
      const event = {
        id: randomUUID(),
        taskId: input.taskId,
        deviceId: input.deviceId,
        status: input.status,
        message: input.message,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const eventFile = await readEventFile();
      const retentionLimit = await getRetentionLimit();
      await writeEventFile({
        events: [...eventFile.events, event].slice(-retentionLimit)
      });
      return event;
    },
    async importEvents(events) {
      const eventFile = await readEventFile();
      const existingIds = new Set(eventFile.events.map((event) => event.id));
      const incomingEvents = events.filter((event) => !existingIds.has(event.id));
      const retentionLimit = await getRetentionLimit();
      if (incomingEvents.length === 0) {
        return 0;
      }
      await writeEventFile({
        events: [...eventFile.events, ...incomingEvents].sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(-retentionLimit)
      });
      return incomingEvents.length;
    },
    async pruneEvents() {
      const eventFile = await readEventFile();
      const retentionLimit = await getRetentionLimit();
      const prunedEvents = eventFile.events.sort((left, right) => left.createdAt.localeCompare(right.createdAt)).slice(-retentionLimit);
      if (prunedEvents.length === eventFile.events.length) {
        return 0;
      }
      await writeEventFile({
        events: prunedEvents
      });
      return eventFile.events.length - prunedEvents.length;
    }
  };
}
function isNodeError$1(error) {
  return error instanceof Error && "code" in error;
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
        permissions: normalizeDevicePolicy(
          input.permissions ?? defaultDevicePolicy
        ),
        schedule: normalizeTaskSchedule(input.schedule),
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
        permissions: input.permissions ? normalizeDevicePolicy(input.permissions) : currentTask.permissions,
        schedule: input.schedule === void 0 ? currentTask.schedule : normalizeTaskSchedule(input.schedule),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const tasks = [...taskFile.tasks];
      tasks[taskIndex] = updatedTask;
      await writeTaskFile({ tasks });
      return updatedTask;
    },
    async replaceTasks(tasks) {
      await writeTaskFile({
        tasks: tasks.map((task) => ({
          ...task,
          name: task.name.trim(),
          permissions: normalizeDevicePolicy(task.permissions),
          schedule: normalizeTaskSchedule(task.schedule)
        }))
      });
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
app.whenReady().then(async () => {
  const dataDir = app.getPath("userData");
  const appSettingsStore = createAppSettingsStore({
    dataDir
  });
  const deviceStore = createDeviceStore({
    dataDir
  });
  const currentDevice = await deviceStore.getCurrentDevice();
  const taskStore = createTaskStore({
    dataDir
  });
  const taskRunEventStore = createTaskRunEventStore({
    dataDir,
    async getRetentionLimit() {
      const snapshot = await appSettingsStore.getSnapshot();
      return snapshot.settings.taskRunEventRetentionLimit;
    }
  });
  const secretStore = createSecretStore({
    dataDir,
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    encryptionBackend: typeof safeStorage.getSelectedStorageBackend === "function" ? safeStorage.getSelectedStorageBackend() : "unknown",
    encrypt(value) {
      return safeStorage.encryptString(value).toString("base64");
    }
  });
  const adapterRegistry = createTaskAdapterRegistry([
    browserTabGroupAdapter,
    crawlerAdapter,
    discordBotAdapter,
    notionSyncAdapter,
    tradingBotAdapter
  ]);
  const mockSyncStore = createMockSyncStore({
    dataDir,
    appSettingsStore,
    deviceStore,
    taskRunEventStore,
    taskStore
  });
  const taskRunner = createTaskRunner({
    taskStore,
    taskRunEventStore,
    appSettingsStore,
    adapterRegistry,
    dataDir,
    deviceId: currentDevice.id,
    async onTaskUpdated(task) {
      const [currentDevice2, appSettingsSnapshot] = await Promise.all([
        deviceStore.getCurrentDevice(),
        appSettingsStore.getSnapshot()
      ]);
      if (!canViewTaskOnDevice(
        task,
        currentDevice2,
        appSettingsSnapshot.settings.linkedDevices
      )) {
        return;
      }
      for (const browserWindow of BrowserWindow.getAllWindows()) {
        browserWindow.webContents.send("tasks:changed", task);
      }
    }
  });
  registerAppSettingsIpc(ipcMain, appSettingsStore, deviceStore);
  registerSecretIpc(ipcMain, secretStore, taskStore);
  registerSyncIpc(ipcMain, mockSyncStore);
  registerTaskIpc(
    ipcMain,
    taskStore,
    taskRunner,
    taskRunEventStore,
    appSettingsStore,
    deviceStore
  );
  createTaskScheduler({
    appSettingsStore,
    deviceStore,
    taskRunner,
    taskStore
  }).start();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
