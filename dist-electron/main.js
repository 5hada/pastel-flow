import { BrowserWindow, dialog, clipboard, app, Menu, safeStorage, ipcMain } from "electron";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile, mkdir, writeFile, stat, cp, readdir, access } from "node:fs/promises";
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
      if (isNodeError$6(error) && error.code === "ENOENT") {
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
function isNodeError$6(error) {
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
      if (isNodeError$5(error) && error.code === "ENOENT") {
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
function isNodeError$5(error) {
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
  defaultActionName: "새 Action",
  defaultWorkflowName: "새 Workflow",
  initialUrlInputMode: "line",
  taskListDisplayMode: "grid",
  workflowGridColumnCount: 5,
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
    defaultActionName: typeof (settings == null ? void 0 : settings.defaultActionName) === "string" && settings.defaultActionName.trim() ? settings.defaultActionName.trim() : defaultAppSettings.defaultActionName,
    defaultWorkflowName: typeof (settings == null ? void 0 : settings.defaultWorkflowName) === "string" && settings.defaultWorkflowName.trim() ? settings.defaultWorkflowName.trim() : defaultAppSettings.defaultWorkflowName,
    initialUrlInputMode: (settings == null ? void 0 : settings.initialUrlInputMode) === "line" ? settings.initialUrlInputMode : defaultAppSettings.initialUrlInputMode,
    taskListDisplayMode: isTaskListDisplayMode(settings == null ? void 0 : settings.taskListDisplayMode) ? settings.taskListDisplayMode : defaultAppSettings.taskListDisplayMode,
    workflowGridColumnCount: normalizeWorkflowGridColumnCount(
      settings == null ? void 0 : settings.workflowGridColumnCount
    ),
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
function normalizeWorkflowGridColumnCount(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultAppSettings.workflowGridColumnCount;
  }
  return Math.min(Math.max(Math.round(value), 2), 8);
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
      if (isNodeError$4(error) && error.code === "ENOENT") {
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
function isNodeError$4(error) {
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
  return {
    ...candidate,
    actions: Array.isArray(candidate.actions) ? candidate.actions : [],
    workflows: Array.isArray(candidate.workflows) ? candidate.workflows : []
  };
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
        mode: "mock_file",
        serverDbSyncEnabled: false,
        message: "실제 서버 DB 연동은 현재 구현 범위에서 제외되어 있으며 로컬 mock 파일 sync만 사용합니다.",
        exportPath,
        lastExportedAt: await getLastExportedAt(exportPath)
      };
    },
    async exportSnapshot() {
      const [currentDevice, settingsSnapshot, tasks, actions, workflows, taskRunEvents] = await Promise.all([
        deviceStore.getCurrentDevice(),
        appSettingsStore.getSnapshot(),
        taskStore.listTasks(),
        taskStore.listActions(),
        taskStore.listWorkflows(),
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
        actions,
        workflows: stripLocalWorkflowState(workflows),
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
      const [currentActions, currentWorkflows] = await Promise.all([
        taskStore.listActions(),
        taskStore.listWorkflows()
      ]);
      const mergedTasks = mergeTasks(currentTasks, normalizedSnapshot.tasks);
      const mergedActions = mergeDefinitions(
        currentActions,
        normalizedSnapshot.actions
      );
      const mergedWorkflows = mergeDefinitions(
        currentWorkflows,
        normalizedSnapshot.workflows
      );
      const taskRunEventsAdded = await taskRunEventStore.importEvents(
        normalizedSnapshot.taskRunEvents
      );
      const settingsSnapshot = await appSettingsStore.getSnapshot();
      const linkedDevices = mergeLinkedDevices(
        settingsSnapshot.settings.linkedDevices,
        normalizedSnapshot.linkedDevices
      );
      await Promise.all([
        taskStore.replaceTaskData({
          tasks: mergedTasks.tasks,
          actions: mergedActions,
          workflows: mergedWorkflows
        }),
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
    if (isNodeError$3(error) && error.code === "ENOENT") {
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
function stripLocalWorkflowState(workflows) {
  return workflows.map((workflow) => ({
    ...workflow,
    state: {
      ...workflow.state,
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
function mergeDefinitions(currentDefinitions, incomingDefinitions) {
  const definitionMap = new Map(
    currentDefinitions.map((definition) => [definition.id, definition])
  );
  for (const incomingDefinition of incomingDefinitions) {
    const currentDefinition = definitionMap.get(incomingDefinition.id);
    if (!currentDefinition || incomingDefinition.updatedAt > currentDefinition.updatedAt) {
      definitionMap.set(incomingDefinition.id, incomingDefinition);
    }
  }
  return [...definitionMap.values()].sort(
    (left, right) => left.createdAt.localeCompare(right.createdAt)
  );
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
function isNodeError$3(error) {
  return error instanceof Error && "code" in error;
}
function dedupe$2(values) {
  return [...new Set(values)];
}
function registerToolModuleIpc(ipcMain2, toolModuleStore, toolModuleRunner, taskStore) {
  ipcMain2.handle("tools:list", () => toolModuleStore.listTools());
  ipcMain2.handle("tools:register-folder", async (event) => {
    const browserWindow = BrowserWindow.fromWebContents(event.sender);
    const options = {
      properties: ["openDirectory"]
    };
    const result = browserWindow ? await dialog.showOpenDialog(browserWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) {
      return void 0;
    }
    return toolModuleStore.registerToolRootFromPath(result.filePaths[0]);
  });
  ipcMain2.handle(
    "tools:run",
    (_event, toolId, input) => toolModuleRunner.runTool(
      toolId,
      input && typeof input === "object" ? input : {}
    )
  );
  ipcMain2.handle("tools:create-action", async (_event, toolId) => {
    const tool = await toolModuleStore.getTool(toolId);
    return taskStore.createAction({
      name: tool.manifest.name,
      type: "tool_action",
      config: {
        toolId: tool.id,
        version: tool.manifest.version
      },
      inputSchema: tool.manifest.inputs.map((field) => ({
        id: field.key,
        name: field.key,
        type: field.type === "json" ? "json" : "string",
        required: field.required,
        description: field.description
      })),
      outputSchema: tool.manifest.outputs.map((field) => ({
        id: field.key,
        name: field.key,
        type: field.type === "json" ? "json" : "string",
        required: field.required,
        description: field.description
      }))
    });
  });
}
function createToolModuleRunner({
  toolModuleStore
}) {
  return {
    async runTool(toolId, input) {
      const tool = await toolModuleStore.getTool(toolId);
      const normalizedInput = normalizeRunInput(tool.manifest.inputs, input);
      const logicPath = pathToFileURL(await getToolLogicPath(tool.sourcePath)).href;
      const logicModule = await import(`${logicPath}?updatedAt=${encodeURIComponent(tool.updatedAt)}`);
      if (typeof logicModule.run !== "function") {
        throw new Error("logic.mjs는 run(input, context) 함수를 export해야 합니다.");
      }
      const output = await logicModule.run(
        normalizedInput,
        createToolContext(tool.sourcePath, tool.manifest)
      );
      if (!output || typeof output !== "object" || Array.isArray(output)) {
        throw new Error("도구 실행 결과는 객체여야 합니다.");
      }
      validateOutputKeys(
        output,
        tool.manifest.outputs
      );
      return {
        toolId,
        runAt: (/* @__PURE__ */ new Date()).toISOString(),
        output
      };
    }
  };
}
function normalizeRunInput(fields, input) {
  return fields.reduce((result, field) => {
    const rawValue = input[field.key] ?? field.default;
    if (field.required && isEmptyValue(rawValue)) {
      throw new Error(`${field.key} 입력값이 필요합니다.`);
    }
    if (isEmptyValue(rawValue)) {
      return result;
    }
    return {
      ...result,
      [field.key]: normalizeValue(field, rawValue)
    };
  }, {});
}
function normalizeValue(field, value) {
  switch (field.type) {
    case "string":
    case "file":
    case "image":
    case "color":
    case "url":
      return String(value);
    case "number": {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        throw new Error(`${field.key}는 숫자여야 합니다.`);
      }
      return numericValue;
    }
    case "boolean":
      return value === true || value === "true";
    case "boolean[]":
      return normalizeArray(value).map((item) => item === true || item === "true");
    case "string[]":
    case "file[]":
    case "image[]":
    case "color[]":
    case "url[]":
      return Array.isArray(value) ? value.map(String) : String(value).split("\n").map((item) => item.trim()).filter(Boolean);
    case "number[]": {
      const values = Array.isArray(value) ? value : String(value).split("\n");
      return values.map((item) => {
        const numericValue = Number(item);
        if (!Number.isFinite(numericValue)) {
          throw new Error(`${field.key}는 숫자 배열이어야 합니다.`);
        }
        return numericValue;
      });
    }
    case "json":
    case "record[]":
      if (typeof value === "string") {
        return JSON.parse(value);
      }
      return value;
  }
}
function createToolContext(toolPath, manifest) {
  const permissions = manifest.permissions;
  return {
    clipboard: permissions.includes("clipboard") ? {
      async readText() {
        return clipboard.readText();
      },
      async writeText(value) {
        clipboard.writeText(value);
      }
    } : void 0,
    files: permissions.includes("file.read") || permissions.includes("file.write") ? {
      async open(filePath) {
        assertPermission(permissions, "file.read");
        return readFile(filePath, "utf8");
      },
      async save(filePath, value) {
        assertPermission(permissions, "file.write");
        await writeFile(filePath, value, "utf8");
      }
    } : void 0,
    network: permissions.includes("network") ? {
      async fetch(input, init) {
        const response = await fetch(input, init);
        const contentType = response.headers.get("content-type") ?? "";
        return contentType.includes("application/json") ? response.json() : response.text();
      }
    } : void 0,
    assets: {
      getPath(key) {
        return getAssetPath(toolPath, manifest, key);
      },
      async readText(key) {
        return readFile(getAssetPath(toolPath, manifest, key), "utf8");
      },
      async readJson(key) {
        return JSON.parse(
          await readFile(getAssetPath(toolPath, manifest, key), "utf8")
        );
      }
    },
    dataSources: {
      async get(key) {
        const dataSource = manifest.dataSources.find(
          (currentDataSource) => currentDataSource.key === key
        );
        if (!dataSource) {
          throw new Error(`dataSource를 찾을 수 없습니다: ${key}`);
        }
        return dataSource;
      },
      async query(key) {
        const dataSource = manifest.dataSources.find(
          (currentDataSource) => currentDataSource.key === key
        );
        if (!dataSource) {
          throw new Error(`dataSource를 찾을 수 없습니다: ${key}`);
        }
        throw new Error("dataSource query는 아직 지원하지 않습니다.");
      }
    }
  };
}
function normalizeArray(value) {
  return Array.isArray(value) ? value : String(value).split("\n").map((item) => item.trim()).filter(Boolean);
}
function getAssetPath(toolPath, manifest, key) {
  const asset = manifest.assets.find((currentAsset) => currentAsset.key === key);
  if (!asset) {
    throw new Error(`asset을 찾을 수 없습니다: ${key}`);
  }
  return path.join(toolPath, asset.path);
}
function validateOutputKeys(output, fields) {
  for (const field of fields) {
    if (field.required && !(field.key in output)) {
      throw new Error(`${field.key} 출력값이 필요합니다.`);
    }
  }
}
function assertPermission(permissions, permission) {
  if (!permissions.includes(permission)) {
    throw new Error(`permission이 필요합니다: ${permission}`);
  }
}
function isEmptyValue(value) {
  return value === void 0 || value === null || value === "";
}
async function getToolLogicPath(toolPath) {
  const logicPath = path.join(toolPath, "logic.mjs");
  if (await pathExists$2(logicPath)) {
    return logicPath;
  }
  throw new Error("logic.mjs 파일을 찾을 수 없습니다.");
}
async function pathExists$2(value) {
  try {
    await stat(value);
    return true;
  } catch {
    return false;
  }
}
const supportedFieldTypes = [
  "string",
  "number",
  "boolean",
  "boolean[]",
  "string[]",
  "number[]",
  "json",
  "file",
  "file[]",
  "image",
  "image[]",
  "color",
  "color[]",
  "url",
  "url[]",
  "record[]"
];
const supportedPermissions = [
  "clipboard",
  "file.read",
  "file.write",
  "network"
];
function createToolModuleStore({
  dataDir
}) {
  const toolsFilePath = path.join(dataDir, "toolModules.json");
  const toolModulesDir = path.join(dataDir, "tool-modules");
  async function readToolModulesFile() {
    try {
      const raw = await readFile(toolsFilePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        tools: Array.isArray(parsed.tools) ? parsed.tools.map(normalizeRegisteredTool) : [],
        watchedRoots: Array.isArray(parsed.watchedRoots) ? parsed.watchedRoots.filter((root) => typeof root === "string") : []
      };
    } catch (error) {
      if (isNodeError$2(error) && error.code === "ENOENT") {
        return { tools: [], watchedRoots: [] };
      }
      throw error;
    }
  }
  async function writeToolModulesFile(toolModulesFile) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      toolsFilePath,
      `${JSON.stringify(toolModulesFile, null, 2)}
`,
      "utf8"
    );
  }
  async function validateToolPath(sourcePath) {
    const errors = [];
    const manifestPath = path.join(sourcePath, "manifest.json");
    const logicPath = path.join(sourcePath, "logic.mjs");
    if (!await pathExists$1(logicPath)) {
      errors.push("logic.mjs 파일이 필요합니다.");
    }
    let manifest;
    try {
      const rawManifest = await readFile(manifestPath, "utf8");
      manifest = normalizeManifest(JSON.parse(rawManifest), errors);
    } catch (error) {
      errors.push(
        error instanceof SyntaxError ? "manifest.json 형식이 올바르지 않습니다." : "manifest.json 파일이 필요합니다."
      );
    }
    return {
      ok: errors.length === 0,
      manifest,
      errors
    };
  }
  return {
    async listTools() {
      await refreshWatchedRoots();
      return (await readToolModulesFile()).tools.sort(
        (left, right) => left.manifest.name.localeCompare(right.manifest.name)
      );
    },
    async getTool(id) {
      const tool = (await readToolModulesFile()).tools.find(
        (currentTool) => currentTool.id === id
      );
      if (!tool) {
        throw new Error(`Tool module not found: ${id}`);
      }
      return tool;
    },
    async registerToolFromPath(sourcePath) {
      const validation = await validateToolPath(sourcePath);
      if (!validation.ok || !validation.manifest) {
        throw new Error(validation.errors.join("\n"));
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const toolId = validation.manifest.id;
      const destinationPath = path.join(
        toolModulesDir,
        `${toolId}-${validation.manifest.version}-${randomUUID()}`
      );
      await mkdir(toolModulesDir, { recursive: true });
      await cp(sourcePath, destinationPath, {
        recursive: true,
        force: true
      });
      const toolModulesFile = await readToolModulesFile();
      const existingTool = toolModulesFile.tools.find(
        (tool) => tool.id === toolId
      );
      const registeredTool = {
        id: toolId,
        manifest: validation.manifest,
        sourcePath: destinationPath,
        relativePath: path.basename(sourcePath),
        registeredAt: (existingTool == null ? void 0 : existingTool.registeredAt) ?? now,
        updatedAt: now,
        hasCustomView: await pathExists$1(path.join(destinationPath, "view.html")),
        hasCustomStyle: await pathExists$1(path.join(destinationPath, "style.css"))
      };
      await writeToolModulesFile({
        watchedRoots: toolModulesFile.watchedRoots,
        tools: [
          ...toolModulesFile.tools.filter((tool) => tool.id !== toolId),
          registeredTool
        ]
      });
      return registeredTool;
    },
    async registerToolRootFromPath(rootPath) {
      const watchedRootPath = path.resolve(rootPath);
      const modulePaths = await findToolModulePaths(watchedRootPath);
      if (modulePaths.length === 0) {
        throw new Error("등록 가능한 Tool Module을 찾지 못했습니다.");
      }
      const toolModulesFile = await readToolModulesFile();
      const registeredTools = await createRegisteredToolsFromRoot(
        watchedRootPath,
        modulePaths,
        toolModulesFile.tools
      );
      const registeredToolIds = new Set(registeredTools.map((tool) => tool.id));
      await writeToolModulesFile({
        watchedRoots: [
          .../* @__PURE__ */ new Set([...toolModulesFile.watchedRoots, watchedRootPath])
        ],
        tools: [
          ...toolModulesFile.tools.filter(
            (tool) => tool.watchedRootPath !== watchedRootPath && !registeredToolIds.has(tool.id)
          ),
          ...registeredTools
        ]
      });
      return registeredTools;
    },
    validateToolPath
  };
  async function refreshWatchedRoots() {
    const toolModulesFile = await readToolModulesFile();
    if (toolModulesFile.watchedRoots.length === 0) {
      return;
    }
    const watchedRootSet = new Set(toolModulesFile.watchedRoots);
    const retainedTools = toolModulesFile.tools.filter(
      (tool) => !tool.watchedRootPath || !watchedRootSet.has(tool.watchedRootPath)
    );
    const refreshedTools = [];
    const existingTools = toolModulesFile.tools;
    for (const watchedRootPath of watchedRootSet) {
      if (!await pathExists$1(watchedRootPath)) {
        continue;
      }
      const modulePaths = await findToolModulePaths(watchedRootPath);
      refreshedTools.push(
        ...await createRegisteredToolsFromRoot(
          watchedRootPath,
          modulePaths,
          existingTools
        )
      );
    }
    const refreshedToolIds = new Set(refreshedTools.map((tool) => tool.id));
    await writeToolModulesFile({
      watchedRoots: [...watchedRootSet],
      tools: [
        ...retainedTools.filter((tool) => !refreshedToolIds.has(tool.id)),
        ...refreshedTools
      ]
    });
  }
  async function createRegisteredToolsFromRoot(watchedRootPath, modulePaths, existingTools) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const registeredTools = [];
    for (const modulePath of modulePaths) {
      const validation = await validateToolPath(modulePath);
      if (!validation.ok || !validation.manifest) {
        continue;
      }
      const existingTool = existingTools.find(
        (tool) => {
          var _a;
          return tool.id === ((_a = validation.manifest) == null ? void 0 : _a.id);
        }
      );
      registeredTools.push({
        id: validation.manifest.id,
        manifest: validation.manifest,
        sourcePath: modulePath,
        watchedRootPath,
        relativePath: path.relative(watchedRootPath, modulePath) || ".",
        registeredAt: (existingTool == null ? void 0 : existingTool.registeredAt) ?? now,
        updatedAt: now,
        hasCustomView: await pathExists$1(path.join(modulePath, "view.html")),
        hasCustomStyle: await pathExists$1(path.join(modulePath, "style.css"))
      });
    }
    return registeredTools;
  }
}
function normalizeRegisteredTool(tool) {
  return {
    ...tool,
    manifest: normalizeStoredManifest(tool.manifest),
    watchedRootPath: typeof tool.watchedRootPath === "string" ? tool.watchedRootPath : void 0,
    hasCustomView: tool.hasCustomView === true,
    hasCustomStyle: tool.hasCustomStyle === true
  };
}
function normalizeStoredManifest(manifest) {
  return {
    ...manifest,
    schemaVersion: manifest.schemaVersion === "1.1" || manifest.schemaVersion === "1.0" ? manifest.schemaVersion : "1.0",
    assets: Array.isArray(manifest.assets) ? manifest.assets : [],
    dataSources: Array.isArray(manifest.dataSources) ? manifest.dataSources : [],
    datasets: Array.isArray(manifest.datasets) ? manifest.datasets : [],
    inputs: Array.isArray(manifest.inputs) ? manifest.inputs : [],
    outputs: Array.isArray(manifest.outputs) ? manifest.outputs : [],
    permissions: Array.isArray(manifest.permissions) ? manifest.permissions : []
  };
}
function normalizeManifest(value, errors) {
  if (!value || typeof value !== "object") {
    errors.push("manifest.json은 객체여야 합니다.");
    return void 0;
  }
  const candidate = value;
  if (candidate.schemaVersion !== "1.0" && candidate.schemaVersion !== "1.1") {
    errors.push('schemaVersion은 "1.0" 또는 "1.1"이어야 합니다.');
  }
  if (!isToolId(candidate.id)) {
    errors.push("id는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }
  if (!isNonEmptyString(candidate.name)) {
    errors.push("name이 필요합니다.");
  }
  if (!isNonEmptyString(candidate.version)) {
    errors.push("version이 필요합니다.");
  }
  const inputs = normalizeFields(candidate.inputs, "inputs", errors);
  const outputs = normalizeOutputFields(candidate.outputs, errors);
  const assets = normalizeAssets(candidate.assets, errors);
  const dataSources = normalizeDataSources(candidate.dataSources, errors);
  const datasets = normalizeDatasets(candidate.datasets, errors);
  const indexing = normalizeIndexing(candidate.indexing);
  const permissions = normalizePermissions(candidate.permissions, errors);
  if (errors.length > 0) {
    return void 0;
  }
  return {
    schemaVersion: candidate.schemaVersion ?? "1.1",
    id: candidate.id ?? "",
    name: candidate.name ?? "",
    version: candidate.version ?? "",
    description: typeof candidate.description === "string" ? candidate.description : void 0,
    assets,
    dataSources,
    datasets,
    inputs,
    outputs,
    indexing,
    permissions
  };
}
function normalizeOutputFields(value, errors) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.reduce((fields, field) => {
    const normalizedField = normalizeFields([field], "outputs", errors)[0];
    if (!normalizedField) {
      return fields;
    }
    const candidate = field;
    return [
      ...fields,
      {
        ...normalizedField,
        ui: normalizeOutputUi(candidate.ui)
      }
    ];
  }, []);
}
function normalizeFields(value, fieldName, errors) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.reduce((fields, field, index) => {
    if (!field || typeof field !== "object") {
      errors.push(`${fieldName}[${index}] 형식이 올바르지 않습니다.`);
      return fields;
    }
    const candidate = field;
    if (!isNonEmptyString(candidate.key)) {
      errors.push(`${fieldName}[${index}].key가 필요합니다.`);
      return fields;
    }
    if (!isFieldType(candidate.type)) {
      errors.push(`${fieldName}[${index}].type이 지원되지 않습니다.`);
      return fields;
    }
    return [
      ...fields,
      {
        key: candidate.key,
        type: candidate.type,
        required: candidate.required === true,
        default: candidate.default,
        description: typeof candidate.description === "string" ? candidate.description : void 0,
        ui: normalizeFieldUi(candidate.ui),
        fields: Array.isArray(candidate.fields) ? normalizeFields(candidate.fields, `${fieldName}[${index}].fields`, errors) : void 0,
        schema: candidate.schema
      }
    ];
  }, []);
}
function normalizeFieldUi(value) {
  if (!value || typeof value !== "object") {
    return void 0;
  }
  const candidate = value;
  return {
    control: isFieldControl(candidate.control) ? candidate.control : void 0,
    label: typeof candidate.label === "string" && candidate.label.trim() ? candidate.label : void 0,
    placeholder: typeof candidate.placeholder === "string" && candidate.placeholder.trim() ? candidate.placeholder : void 0,
    helpText: typeof candidate.helpText === "string" && candidate.helpText.trim() ? candidate.helpText : void 0,
    options: normalizeFieldOptions(candidate.options),
    min: normalizeOptionalNumber(candidate.min),
    max: normalizeOptionalNumber(candidate.max),
    step: normalizeOptionalNumber(candidate.step),
    rows: normalizeOptionalNumber(candidate.rows),
    accept: typeof candidate.accept === "string" && candidate.accept.trim() ? candidate.accept : void 0,
    multiple: candidate.multiple === true,
    fields: Array.isArray(candidate.fields) ? normalizeFields(candidate.fields, "ui.fields", []) : void 0
  };
}
function normalizeOutputUi(value) {
  if (!value || typeof value !== "object") {
    return void 0;
  }
  const candidate = value;
  return {
    view: isOutputView(candidate.view) ? candidate.view : void 0,
    label: typeof candidate.label === "string" ? candidate.label : void 0,
    helpText: typeof candidate.helpText === "string" ? candidate.helpText : void 0,
    emptyText: typeof candidate.emptyText === "string" ? candidate.emptyText : void 0,
    columns: Array.isArray(candidate.columns) ? candidate.columns.filter((column) => typeof column === "string") : void 0,
    thumbnail: candidate.thumbnail === true,
    maxItems: normalizeOptionalNumber(candidate.maxItems),
    actions: Array.isArray(candidate.actions) ? candidate.actions.filter((action) => typeof action === "string") : void 0
  };
}
function normalizeAssets(value, errors) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.reduce((assets, asset, index) => {
    if (!asset || typeof asset !== "object") {
      errors.push(`assets[${index}] 형식이 올바르지 않습니다.`);
      return assets;
    }
    const candidate = asset;
    if (!isNonEmptyString(candidate.key) || !isNonEmptyString(candidate.path)) {
      errors.push(`assets[${index}]에는 key와 path가 필요합니다.`);
      return assets;
    }
    if (!isAssetType(candidate.type)) {
      errors.push(`assets[${index}].type이 지원되지 않습니다.`);
      return assets;
    }
    return [
      ...assets,
      {
        key: candidate.key,
        path: candidate.path,
        type: candidate.type,
        description: candidate.description
      }
    ];
  }, []);
}
function normalizeDataSources(value, errors) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.reduce((result, dataSource, index) => {
    if (!dataSource || typeof dataSource !== "object") {
      errors.push(`dataSources[${index}] 형식이 올바르지 않습니다.`);
      return result;
    }
    const candidate = dataSource;
    if (!isNonEmptyString(candidate.key) || !isDataSourceType(candidate.type)) {
      errors.push(`dataSources[${index}]에는 key와 지원 type이 필요합니다.`);
      return result;
    }
    return [
      ...result,
      {
        key: candidate.key,
        type: candidate.type,
        required: candidate.required === true,
        description: candidate.description,
        permissions: normalizePermissions(candidate.permissions, errors),
        schema: candidate.schema
      }
    ];
  }, []);
}
function normalizeDatasets(value, errors) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.reduce((result, dataset, index) => {
    if (!dataset || typeof dataset !== "object") {
      errors.push(`datasets[${index}] 형식이 올바르지 않습니다.`);
      return result;
    }
    const candidate = dataset;
    if (!isNonEmptyString(candidate.key) || !isNonEmptyString(candidate.source) || !isFieldType(candidate.recordType)) {
      errors.push(`datasets[${index}]에는 key, source, recordType이 필요합니다.`);
      return result;
    }
    return [
      ...result,
      {
        key: candidate.key,
        source: candidate.source,
        recordType: candidate.recordType,
        schema: Array.isArray(candidate.schema) ? normalizeFields(candidate.schema, `datasets[${index}].schema`, errors) : void 0,
        index: candidate.index === true,
        description: candidate.description
      }
    ];
  }, []);
}
function normalizeIndexing(value) {
  if (!value || typeof value !== "object") {
    return void 0;
  }
  const candidate = value;
  return {
    enabled: candidate.enabled === true,
    fields: Array.isArray(candidate.fields) ? candidate.fields.filter((field) => typeof field === "string") : void 0,
    datasets: Array.isArray(candidate.datasets) ? candidate.datasets.filter((dataset) => typeof dataset === "string") : void 0
  };
}
function normalizeFieldOptions(value) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const options = value.reduce((result, option) => {
    if (!option || typeof option !== "object") {
      return result;
    }
    const candidate = option;
    if (typeof candidate.label !== "string" || !isOptionValue(candidate.value)) {
      return result;
    }
    return [
      ...result,
      {
        label: candidate.label,
        value: candidate.value,
        color: typeof candidate.color === "string" && candidate.color.trim() ? candidate.color : void 0
      }
    ];
  }, []);
  return options.length > 0 ? options : void 0;
}
function normalizePermissions(value, errors) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.reduce((permissions, permission) => {
    if (!isPermission(permission)) {
      errors.push(`지원하지 않는 permission입니다: ${String(permission)}`);
      return permissions;
    }
    return permissions.includes(permission) ? permissions : [...permissions, permission];
  }, []);
}
async function pathExists$1(value) {
  try {
    await stat(value);
    return true;
  } catch {
    return false;
  }
}
function isToolId(value) {
  return typeof value === "string" && /^[a-z0-9-]+$/.test(value);
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isFieldType(value) {
  return supportedFieldTypes.includes(value);
}
function isFieldControl(value) {
  return value === "text" || value === "textarea" || value === "number" || value === "toggle" || value === "checkbox" || value === "select" || value === "radio" || value === "color" || value === "json" || value === "list" || value === "file" || value === "files" || value === "image" || value === "images" || value === "url" || value === "table";
}
function isOutputView(value) {
  return value === "text" || value === "code" || value === "list" || value === "table" || value === "image" || value === "gallery" || value === "color" || value === "palette" || value === "link" || value === "links" || value === "file" || value === "files" || value === "download";
}
function isAssetType(value) {
  return value === "file" || value === "image" || value === "json" || value === "text";
}
function isDataSourceType(value) {
  return value === "file" || value === "folder" || value === "sqlite" || value === "json" || value === "csv" || value === "http" || value === "custom";
}
function isOptionValue(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function normalizeOptionalNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function isPermission(value) {
  return supportedPermissions.includes(value);
}
function isNodeError$2(error) {
  return error instanceof Error && "code" in error;
}
async function findToolModulePaths(rootPath) {
  const results = [];
  async function walk(currentPath) {
    if (path.basename(currentPath) === "node_modules") {
      return;
    }
    if (await pathExists$1(path.join(currentPath, "manifest.json")) && await pathExists$1(path.join(currentPath, "logic.mjs"))) {
      results.push(currentPath);
      return;
    }
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(path.join(currentPath, entry.name));
      }
    }
  }
  await walk(rootPath);
  return results;
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
    profileSource: isBrowserProfileSource(config.profileSource) ? config.profileSource : "task_profile",
    existingProfilePath: typeof config.existingProfilePath === "string" && config.existingProfilePath.trim() ? config.existingProfilePath.trim() : void 0,
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
function getActionTypeForLegacyTaskType(taskType) {
  switch (taskType) {
    case "browser_tab_group":
      return "browser_action";
    case "crawler":
      return "crawler_action";
    case "discord_bot":
      return "discord_dry_run_action";
    case "notion_sync":
      return "notion_dry_run_action";
    case "trading_bot":
      return "trading_dry_run_action";
  }
}
function getLegacyActionId(taskId) {
  return `action_${taskId}`;
}
function getLegacyWorkflowId(taskId) {
  return `workflow_${taskId}`;
}
function createActionFromLegacyTask(task) {
  return {
    id: getLegacyActionId(task.id),
    name: task.name,
    type: getActionTypeForLegacyTaskType(task.type),
    config: task.config,
    secretRefs: task.permissions.secretRefs,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  };
}
function createWorkflowFromLegacyTask(task) {
  const actionId = getLegacyActionId(task.id);
  return {
    id: getLegacyWorkflowId(task.id),
    name: task.name,
    actionRefs: [
      {
        id: `workflow_action_${task.id}`,
        actionId,
        order: 0,
        enabled: true
      }
    ],
    permissions: normalizeDevicePolicy(task.permissions),
    schedule: normalizeTaskSchedule(task.schedule),
    state: task.state,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
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
function isBrowserProfileSource(value) {
  return value === "task_profile" || value === "existing_profile";
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
function canViewWorkflowOnDevice(workflow, currentDevice, linkedDevices) {
  return canViewPolicyOnDevice(
    workflow.permissions,
    currentDevice,
    linkedDevices
  );
}
function canExecuteWorkflowOnDevice(workflow, currentDevice, linkedDevices) {
  return canExecutePolicyOnDevice(
    workflow.permissions,
    currentDevice,
    linkedDevices
  );
}
function createLocalOnlyDevicePolicy(currentDevice) {
  return {
    visibility: "local_only",
    execution: "local_only",
    allowedDeviceIds: [currentDevice.id]
  };
}
function canViewPolicyOnDevice(permissions, currentDevice, linkedDevices) {
  const accessLevel = getCurrentDeviceAccessLevel(currentDevice, linkedDevices);
  if (accessLevel === "blocked") {
    return false;
  }
  switch (permissions.visibility) {
    case "all_devices":
      return true;
    case "trusted_devices":
      return accessLevel === "trusted";
    case "specific_devices":
      return isDeviceAllowed(permissions, currentDevice.id);
    case "local_only":
      return isLocalDeviceAllowed(permissions, currentDevice.id);
  }
}
function canExecutePolicyOnDevice(permissions, currentDevice, linkedDevices) {
  const accessLevel = getCurrentDeviceAccessLevel(currentDevice, linkedDevices);
  if (accessLevel !== "executable" && accessLevel !== "trusted") {
    return false;
  }
  switch (permissions.execution) {
    case "anywhere":
      return true;
    case "trusted_only":
      return accessLevel === "trusted";
    case "specific_devices":
      return isDeviceAllowed(permissions, currentDevice.id);
    case "local_only":
      return isLocalDeviceAllowed(permissions, currentDevice.id);
  }
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
    if (normalizedConfig.runMode !== "extension_controlled" && normalizedConfig.profileSource === "existing_profile") {
      throw new Error("기존 브라우저 프로필은 확장 프로그램 제어 실행에서만 사용할 수 있습니다.");
    }
    if (normalizedConfig.profileSource === "existing_profile" && !normalizedConfig.existingProfilePath) {
      throw new Error("기존 브라우저 프로필 경로를 입력해야 합니다.");
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
    const isExistingProfile = config.runMode === "extension_controlled" && config.profileSource === "existing_profile" && config.existingProfilePath;
    const localProfilePath = getBrowserProfilePath(dataDir, config);
    if (!isExistingProfile) {
      await mkdir(localProfilePath, { recursive: true });
    }
    const browserExecutable = await findBrowserExecutable(
      config.browserKind,
      appSettings.browserExecutablePaths
    );
    const shouldLoadExtensionBridge = config.runMode === "extension_controlled";
    const extensionBridgePath = shouldLoadExtensionBridge ? await ensureBrowserExtensionBridge(dataDir) : null;
    const remoteDebuggingPort = config.dynamicTemplateUpdates || shouldLoadExtensionBridge ? getRemoteDebuggingPort(task.id) : null;
    const browserArgs = isExistingProfile ? [
      `--user-data-dir=${path.dirname(config.existingProfilePath)}`,
      `--profile-directory=${path.basename(config.existingProfilePath)}`
    ] : [`--user-data-dir=${localProfilePath}`];
    const browserProcess = await launchBrowser(browserExecutable.path, [
      ...browserArgs,
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
function getBrowserProfilePath(dataDir, config) {
  if (config.runMode === "extension_controlled" && config.profileSource === "existing_profile" && config.existingProfilePath) {
    return config.existingProfilePath;
  }
  return path.join(dataDir, "browser-profiles", config.profileId);
}
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
    const invalidUrl = config.urls.find((url) => !isHttpUrl(url));
    if (invalidUrl) {
      throw new Error(`Crawler URL 형식이 올바르지 않습니다: ${invalidUrl}`);
    }
    const outputDirectory = path.join(dataDir, "crawler-results");
    const outputPath = path.join(
      outputDirectory,
      `${task.id}-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`
    );
    const results = await Promise.all(
      config.urls.map((url) => fetchCrawlerUrl(url, config.maxBytes))
    );
    const capturedCount = results.filter(
      (result) => result.status === "captured"
    ).length;
    const failedCount = results.length - capturedCount;
    const message = failedCount > 0 ? `${capturedCount}개 URL 수집 성공, ${failedCount}개 실패했습니다.` : `${capturedCount}개 URL을 수집했습니다.`;
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(
        {
          taskId: task.id,
          capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
          capturedCount,
          failedCount,
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
        status: failedCount > 0 ? "failed" : "idle",
        lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: failedCount > 0 ? "일부 URL 수집에 실패했습니다." : void 0,
        lastMessage: message,
        outputPath
      },
      message
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
function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
const discordBotAdapter = {
  type: "discord_bot",
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error("Discord bot adapter는 현재 dry-run 실행만 지원합니다.");
    }
  },
  async run({ dataDir, task }) {
    return createDryRunResult(
      dataDir,
      task,
      task.state,
      `Discord bot dry-run을 완료했습니다. prefix=${task.config.commandPrefix ?? "없음"}`,
      "Discord API 연결과 메시지 전송은 실행하지 않았습니다."
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
  async run({ dataDir, task }) {
    return createDryRunResult(
      dataDir,
      task,
      task.state,
      `Notion sync dry-run을 완료했습니다. database=${task.config.databaseId ?? "없음"}`,
      "Notion API 연결과 페이지/DB 변경은 실행하지 않았습니다."
    );
  }
};
const tradingBotAdapter = {
  type: "trading_bot",
  validateConfig(config) {
    if (config.dryRun !== true) {
      throw new Error(
        "Trading bot adapter는 뼈대만 제공하며 실제 자동매매 실행을 지원하지 않습니다."
      );
    }
  },
  async run({ dataDir, task }) {
    return createDryRunResult(
      dataDir,
      task,
      task.state,
      `Trading bot skeleton dry-run을 완료했습니다. 실제 주문은 실행하지 않았습니다. ${task.config.exchange ?? "exchange 없음"} ${task.config.symbol ?? "symbol 없음"}`,
      "자동매매, 실거래 주문, 거래소 API 주문 실행은 구현 범위에서 제외되어 있습니다."
    );
  }
};
async function createDryRunResult(dataDir, task, state, message, skippedAction) {
  const outputPath = await writeDryRunArtifact(dataDir, task, message, skippedAction);
  return {
    state: {
      ...state,
      status: "idle",
      lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastError: void 0,
      lastMessage: message,
      outputPath
    },
    message
  };
}
async function writeDryRunArtifact(dataDir, task, message, skippedAction) {
  var _a, _b;
  const outputDirectory = path.join(dataDir, "dry-run-results");
  const outputPath = path.join(
    outputDirectory,
    `${task.type}-${task.id}-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`
  );
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        taskId: task.id,
        taskName: task.name,
        taskType: task.type,
        capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
        dryRun: true,
        skippedAction,
        message,
        config: task.config,
        secretRefCount: ((_a = task.permissions.secretRefs) == null ? void 0 : _a.length) ?? 0,
        secretRefIds: ((_b = task.permissions.secretRefs) == null ? void 0 : _b.map((secretRef) => secretRef.id)) ?? []
      },
      null,
      2
    )}
`,
    "utf8"
  );
  return outputPath;
}
function createTaskAdapterRegistry(adapters) {
  const adaptersByType = /* @__PURE__ */ new Map();
  for (const adapter of adapters) {
    adaptersByType.set(adapter.type, adapter);
    adaptersByType.set(getActionType(adapter.type), adapter);
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
function getActionType(taskType) {
  switch (taskType) {
    case "browser_tab_group":
      return "browser_action";
    case "crawler":
      return "crawler_action";
    case "discord_bot":
      return "discord_dry_run_action";
    case "notion_sync":
      return "notion_dry_run_action";
    case "trading_bot":
      return "trading_dry_run_action";
  }
}
function registerTaskIpc(ipcMain2, taskStore, workflowRunner, taskRunEventStore, appSettingsStore, deviceStore) {
  async function listWorkflowEvents(workflowId) {
    const [workflows, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.listWorkflows(),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    const visibleWorkflowIds = new Set(
      workflows.filter(
        (workflow) => canViewWorkflowOnDevice(
          workflow,
          currentDevice,
          appSettingsSnapshot.settings.linkedDevices
        )
      ).map((workflow) => workflow.id)
    );
    if (workflowId && !visibleWorkflowIds.has(workflowId)) {
      return [];
    }
    const events = await taskRunEventStore.listEvents(workflowId);
    return events.filter(
      (event) => event.workflowId && visibleWorkflowIds.has(event.workflowId)
    );
  }
  ipcMain2.handle("tasks:list", async () => []);
  ipcMain2.handle("actions:list", async () => {
    return taskStore.listActions();
  });
  ipcMain2.handle("actions:create", async (_event, input) => {
    return taskStore.createAction(input);
  });
  ipcMain2.handle("actions:update", async (_event, id, input) => {
    return taskStore.updateAction(id, input);
  });
  ipcMain2.handle("actions:delete", async (_event, id) => {
    return taskStore.deleteAction(id);
  });
  ipcMain2.handle("workflows:list", async () => {
    const [workflows, currentDevice, appSettingsSnapshot] = await Promise.all([
      taskStore.listWorkflows(),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    return workflows.filter(
      (workflow) => canViewWorkflowOnDevice(
        workflow,
        currentDevice,
        appSettingsSnapshot.settings.linkedDevices
      )
    );
  });
  ipcMain2.handle("workflows:create", async (_event, input) => {
    const currentDevice = await deviceStore.getCurrentDevice();
    return taskStore.createWorkflow({
      ...input,
      permissions: input.permissions ?? createLocalOnlyDevicePolicy(currentDevice)
    });
  });
  ipcMain2.handle("workflows:update", async (_event, id, input) => {
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    if (!canExecuteWorkflowOnDevice(
      workflow,
      currentDevice,
      appSettingsSnapshot.settings.linkedDevices
    )) {
      throw new Error("이 기기에서는 해당 Workflow를 수정할 수 없습니다.");
    }
    return taskStore.updateWorkflow(id, input);
  });
  ipcMain2.handle("workflows:delete", async (_event, id) => {
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    if (!canExecuteWorkflowOnDevice(
      workflow,
      currentDevice,
      appSettingsSnapshot.settings.linkedDevices
    )) {
      throw new Error("이 기기에서는 해당 Workflow를 삭제할 수 없습니다.");
    }
    return taskStore.deleteWorkflow(id);
  });
  ipcMain2.handle("workflows:run", async (_event, id) => {
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    if (!canExecuteWorkflowOnDevice(
      workflow,
      currentDevice,
      appSettingsSnapshot.settings.linkedDevices
    )) {
      throw new Error("이 기기에서는 해당 Workflow를 실행할 수 없습니다.");
    }
    return workflowRunner.runWorkflow(id);
  });
  ipcMain2.handle("workflows:stop", async (_event, id) => {
    const [workflow, currentDevice, appSettingsSnapshot] = await Promise.all([
      workflowRunner.getWorkflow(id),
      deviceStore.getCurrentDevice(),
      appSettingsStore.getSnapshot()
    ]);
    if (!canExecuteWorkflowOnDevice(
      workflow,
      currentDevice,
      appSettingsSnapshot.settings.linkedDevices
    )) {
      throw new Error("이 기기에서는 해당 Workflow를 중지할 수 없습니다.");
    }
    return workflowRunner.stopWorkflow(id);
  });
  ipcMain2.handle(
    "workflows:list-events",
    (_event, workflowId) => listWorkflowEvents(workflowId)
  );
  ipcMain2.handle(
    "tasks:list-events",
    (_event, workflowId) => listWorkflowEvents(workflowId)
  );
  ipcMain2.handle("tasks:prune-events", () => taskRunEventStore.pruneEvents());
}
function createTaskScheduler({
  appSettingsStore,
  deviceStore,
  taskStore,
  workflowRunner
}) {
  let interval = null;
  let isTicking = false;
  async function tick() {
    if (isTicking) {
      return;
    }
    isTicking = true;
    try {
      const [workflows, currentDevice, appSettingsSnapshot] = await Promise.all([
        taskStore.listWorkflows(),
        deviceStore.getCurrentDevice(),
        appSettingsStore.getSnapshot()
      ]);
      const now = /* @__PURE__ */ new Date();
      for (const workflow of workflows) {
        const schedule = normalizeTaskSchedule(workflow.schedule);
        if (!(schedule == null ? void 0 : schedule.enabled) || workflow.state.status === "running" || !canExecuteWorkflowOnDevice(
          workflow,
          currentDevice,
          appSettingsSnapshot.settings.linkedDevices
        )) {
          continue;
        }
        const nextRunAt = schedule.nextRunAt ? new Date(schedule.nextRunAt) : new Date(workflow.updatedAt);
        if (Number.isNaN(nextRunAt.getTime()) || nextRunAt > now) {
          continue;
        }
        await taskStore.updateWorkflow(workflow.id, {
          schedule: {
            ...schedule,
            lastTriggeredAt: now.toISOString(),
            nextRunAt: getNextRunAt(now, schedule)
          }
        });
        void workflowRunner.runWorkflow(workflow.id);
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
    async listEvents(workflowId, options) {
      const eventFile = await readEventFile();
      return eventFile.events.filter((event) => !workflowId || event.workflowId === workflowId).sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, (options == null ? void 0 : options.limit) ?? 50);
    },
    async appendEvent(input) {
      const event = {
        id: randomUUID(),
        taskId: input.taskId,
        workflowId: input.workflowId,
        actionRunId: input.actionRunId,
        legacyTaskId: input.legacyTaskId,
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
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        workflows: Array.isArray(parsed.workflows) ? parsed.workflows : []
      };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { tasks: [], actions: [], workflows: [] };
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
      return [];
    },
    async getAction(id) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile());
      const action = taskFile.actions.find((currentAction) => currentAction.id === id);
      if (!action) {
        throw new Error(`Action not found: ${id}`);
      }
      return action;
    },
    async listActions() {
      const taskFile = await readTaskFile();
      return ensureLegacyWorkflowData(taskFile).actions;
    },
    async listWorkflows() {
      const taskFile = await readTaskFile();
      return ensureLegacyWorkflowData(taskFile).workflows;
    },
    async createAction(input) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const action = {
        id: randomUUID(),
        name: input.name.trim(),
        type: input.type,
        config: input.config,
        secretRefs: input.secretRefs,
        inputSchema: input.inputSchema,
        outputSchema: input.outputSchema,
        createdAt: now,
        updatedAt: now
      };
      const taskFile = ensureLegacyWorkflowData(await readTaskFile());
      await writeTaskFile({
        ...taskFile,
        actions: [...taskFile.actions, action]
      });
      return action;
    },
    async updateAction(id, input) {
      var _a;
      const taskFile = ensureLegacyWorkflowData(await readTaskFile());
      const actionIndex = taskFile.actions.findIndex(
        (action) => action.id === id
      );
      if (actionIndex === -1) {
        throw new Error(`Action not found: ${id}`);
      }
      const currentAction = taskFile.actions[actionIndex];
      const updatedAction = {
        ...currentAction,
        ...input,
        name: ((_a = input.name) == null ? void 0 : _a.trim()) ?? currentAction.name,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const actions = [...taskFile.actions];
      actions[actionIndex] = updatedAction;
      await writeTaskFile({
        tasks: [],
        actions,
        workflows: taskFile.workflows
      });
      return updatedAction;
    },
    async deleteAction(id) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile());
      await writeTaskFile({
        tasks: [],
        actions: taskFile.actions.filter((action) => action.id !== id),
        workflows: taskFile.workflows.map((workflow) => ({
          ...workflow,
          actionRefs: workflow.actionRefs.filter(
            (actionRef) => actionRef.actionId !== id
          ),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }))
      });
    },
    async createWorkflow(input) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const workflow = {
        id: randomUUID(),
        name: input.name.trim(),
        actionRefs: normalizeWorkflowActionRefs(input.actionRefs ?? []),
        permissions: normalizeDevicePolicy(
          input.permissions ?? defaultDevicePolicy
        ),
        schedule: normalizeTaskSchedule(input.schedule),
        state: input.state ?? defaultTaskState,
        createdAt: now,
        updatedAt: now
      };
      const taskFile = ensureLegacyWorkflowData(await readTaskFile());
      await writeTaskFile({
        tasks: [],
        actions: taskFile.actions,
        workflows: [...taskFile.workflows, workflow]
      });
      return workflow;
    },
    async updateWorkflow(id, input) {
      var _a;
      const taskFile = ensureLegacyWorkflowData(await readTaskFile());
      const workflowIndex = taskFile.workflows.findIndex(
        (workflow) => workflow.id === id
      );
      if (workflowIndex === -1) {
        throw new Error(`Workflow not found: ${id}`);
      }
      const currentWorkflow = taskFile.workflows[workflowIndex];
      const updatedWorkflow = {
        ...currentWorkflow,
        ...input,
        name: ((_a = input.name) == null ? void 0 : _a.trim()) ?? currentWorkflow.name,
        actionRefs: input.actionRefs === void 0 ? currentWorkflow.actionRefs : normalizeWorkflowActionRefs(input.actionRefs),
        permissions: input.permissions ? normalizeDevicePolicy(input.permissions) : currentWorkflow.permissions,
        schedule: input.schedule === void 0 ? currentWorkflow.schedule : normalizeTaskSchedule(input.schedule),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const workflows = [...taskFile.workflows];
      workflows[workflowIndex] = updatedWorkflow;
      await writeTaskFile({
        ...taskFile,
        workflows
      });
      return updatedWorkflow;
    },
    async deleteWorkflow(id) {
      const taskFile = ensureLegacyWorkflowData(await readTaskFile());
      const workflow = taskFile.workflows.find(
        (currentWorkflow) => currentWorkflow.id === id
      );
      if (!workflow) {
        throw new Error(`Workflow not found: ${id}`);
      }
      await writeTaskFile({
        tasks: [],
        actions: taskFile.actions,
        workflows: taskFile.workflows.filter(
          (currentWorkflow) => currentWorkflow.id !== id
        )
      });
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
      await writeTaskFile(
        upsertLegacyTaskModel(
          {
            ...taskFile,
            tasks: [...taskFile.tasks, task]
          },
          task
        )
      );
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
      await writeTaskFile(upsertLegacyTaskModel({ ...taskFile, tasks }, updatedTask));
      return updatedTask;
    },
    async replaceTasks(tasks) {
      const normalizedTasks = tasks.map((task) => ({
        ...task,
        name: task.name.trim(),
        permissions: normalizeDevicePolicy(task.permissions),
        schedule: normalizeTaskSchedule(task.schedule)
      }));
      await writeTaskFile(
        ensureLegacyWorkflowData({
          tasks: normalizedTasks,
          actions: [],
          workflows: []
        })
      );
    },
    async replaceTaskData(input) {
      const normalizedTasks = input.tasks.map((task) => ({
        ...task,
        name: task.name.trim(),
        permissions: normalizeDevicePolicy(task.permissions),
        schedule: normalizeTaskSchedule(task.schedule)
      }));
      await writeTaskFile(
        ensureLegacyWorkflowData({
          tasks: normalizedTasks,
          actions: input.actions ?? [],
          workflows: input.workflows ?? []
        })
      );
    },
    async deleteTask(id) {
      const taskFile = await readTaskFile();
      await writeTaskFile({
        tasks: [],
        actions: ensureLegacyWorkflowData(taskFile).actions.filter(
          (action) => action.id !== getLegacyActionId(id)
        ),
        workflows: ensureLegacyWorkflowData(taskFile).workflows.filter(
          (workflow) => workflow.id !== getLegacyWorkflowId(id)
        )
      });
    }
  };
}
function ensureLegacyWorkflowData(taskFile) {
  const legacyActionIds = new Set(
    taskFile.tasks.map((task) => getLegacyActionId(task.id))
  );
  const legacyWorkflowIds = new Set(
    taskFile.tasks.map((task) => getLegacyWorkflowId(task.id))
  );
  const nonLegacyActions = taskFile.actions.filter(
    (action) => !legacyActionIds.has(action.id)
  );
  const nonLegacyWorkflows = taskFile.workflows.filter(
    (workflow) => !legacyWorkflowIds.has(workflow.id)
  );
  return {
    tasks: [],
    actions: [
      ...nonLegacyActions,
      ...taskFile.tasks.map((task) => createActionFromLegacyTask(task))
    ],
    workflows: [
      ...nonLegacyWorkflows,
      ...taskFile.tasks.map((task) => createWorkflowFromLegacyTask(task))
    ]
  };
}
function upsertLegacyTaskModel(taskFile, task) {
  const taskWithNormalizedModel = ensureLegacyWorkflowData(taskFile);
  const action = createActionFromLegacyTask(task);
  const workflow = createWorkflowFromLegacyTask(task);
  return {
    tasks: taskWithNormalizedModel.tasks,
    actions: [
      ...taskWithNormalizedModel.actions.filter(
        (currentAction) => currentAction.id !== action.id
      ),
      action
    ],
    workflows: [
      ...taskWithNormalizedModel.workflows.filter(
        (currentWorkflow) => currentWorkflow.id !== workflow.id
      ),
      workflow
    ]
  };
}
function normalizeWorkflowActionRefs(actionRefs) {
  return actionRefs.filter((actionRef) => typeof actionRef.actionId === "string" && actionRef.actionId).map((actionRef, index) => ({
    id: actionRef.id || randomUUID(),
    actionId: actionRef.actionId,
    order: Number.isFinite(actionRef.order) ? actionRef.order : index,
    inputMapping: actionRef.inputMapping,
    enabled: actionRef.enabled !== false
  })).sort((left, right) => left.order - right.order).map((actionRef, index) => ({
    ...actionRef,
    order: index
  }));
}
function isNodeError(error) {
  return error instanceof Error && "code" in error;
}
function createWorkflowRunner({
  adapterRegistry,
  appSettingsStore,
  dataDir,
  deviceId,
  taskRunEventStore,
  taskStore,
  toolModuleRunner
}) {
  async function getWorkflow(id) {
    const workflow = (await taskStore.listWorkflows()).find(
      (currentWorkflow) => currentWorkflow.id === id
    );
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }
    return workflow;
  }
  function getRunnableActionRefs(workflow) {
    const enabledActions = workflow.actionRefs.filter((actionRef) => actionRef.enabled).sort((left, right) => left.order - right.order);
    if (enabledActions.length === 0) {
      throw new Error("실행 가능한 Action이 없는 Workflow입니다.");
    }
    return enabledActions;
  }
  return {
    getWorkflow,
    async runWorkflow(id) {
      const workflow = await getWorkflow(id);
      getRunnableActionRefs(workflow);
      return runActionWorkflow(workflow, await taskStore.listActions(), {
        adapterRegistry,
        dataDir,
        deviceId,
        appSettingsStore,
        taskRunEventStore,
        taskStore,
        toolModuleRunner
      });
    },
    async stopWorkflow(id) {
      var _a;
      const workflow = await getWorkflow(id);
      const actions = await taskStore.listActions();
      const actionMap = new Map(actions.map((action) => [action.id, action]));
      for (const actionRef of getRunnableActionRefs(workflow)) {
        const action = actionMap.get(actionRef.actionId);
        if (!action || action.type === "tool_action") {
          continue;
        }
        const adapter = adapterRegistry.getAdapter(action.type);
        await ((_a = adapter.stop) == null ? void 0 : _a.call(adapter, action.id));
      }
      return taskStore.updateWorkflow(workflow.id, {
        state: {
          ...workflow.state,
          status: "idle",
          lastMessage: "Workflow 중지를 요청했습니다."
        }
      });
    }
  };
}
async function runActionWorkflow(workflow, actions, context) {
  const actionMap = new Map(actions.map((action) => [action.id, action]));
  const enabledActionRefs = workflow.actionRefs.filter((actionRef) => actionRef.enabled).sort((left, right) => left.order - right.order);
  let outputScope = {};
  await context.taskStore.updateWorkflow(workflow.id, {
    state: {
      ...workflow.state,
      status: "running",
      lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastMessage: "Workflow 실행을 시작했습니다.",
      lastError: void 0
    }
  });
  await context.taskRunEventStore.appendEvent({
    workflowId: workflow.id,
    deviceId: context.deviceId,
    status: "running",
    message: "Workflow 실행을 시작했습니다."
  });
  try {
    for (const actionRef of enabledActionRefs) {
      const action = actionMap.get(actionRef.actionId);
      if (!action) {
        throw new Error(`Action을 찾을 수 없습니다: ${actionRef.actionId}`);
      }
      if (action.type !== "tool_action") {
        const adapter = context.adapterRegistry.getAdapter(action.type);
        const actionRunId = randomUUID();
        await adapter.validateConfig(action.config);
        const appSettingsSnapshot = await context.appSettingsStore.getSnapshot();
        const result2 = await adapter.run({
          task: createRuntimeTask(action, workflow),
          deviceId: context.deviceId,
          dataDir: context.dataDir,
          appSettings: appSettingsSnapshot.settings,
          async updateConfig(config2) {
            await context.taskStore.updateAction(action.id, { config: config2 });
          },
          async updateState(state) {
            const currentWorkflow = await context.taskStore.listWorkflows().then(
              (workflows) => workflows.find(
                (current) => current.id === workflow.id
              )
            );
            await context.taskStore.updateWorkflow(workflow.id, {
              state: {
                ...(currentWorkflow == null ? void 0 : currentWorkflow.state) ?? workflow.state,
                ...state
              }
            });
          }
        });
        const resultState = result2.state;
        outputScope = {
          ...outputScope,
          [actionRef.id]: resultState
        };
        await context.taskRunEventStore.appendEvent({
          workflowId: workflow.id,
          actionRunId,
          deviceId: context.deviceId,
          status: resultState.status,
          message: result2.message ?? `${action.name} Action 실행을 처리했습니다.`
        });
        continue;
      }
      const config = action.config;
      if (!config.toolId) {
        throw new Error("tool_action config.toolId가 필요합니다.");
      }
      const result = await context.toolModuleRunner.runTool(config.toolId, {
        ...config.inputDefaults ?? {},
        ...resolveInputMapping(actionRef.inputMapping, outputScope)
      });
      outputScope = {
        ...outputScope,
        [actionRef.id]: result.output
      };
      await context.taskRunEventStore.appendEvent({
        workflowId: workflow.id,
        actionRunId: actionRef.id,
        deviceId: context.deviceId,
        status: "idle",
        message: `${action.name} Tool Action 실행을 완료했습니다.`
      });
    }
    const completedWorkflow = await context.taskStore.updateWorkflow(workflow.id, {
      state: {
        status: "idle",
        lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastMessage: `${enabledActionRefs.length}개 Action 실행을 완료했습니다.`
      }
    });
    await context.taskRunEventStore.appendEvent({
      workflowId: workflow.id,
      deviceId: context.deviceId,
      status: "idle",
      message: completedWorkflow.state.lastMessage
    });
    return completedWorkflow;
  } catch (error) {
    const failedWorkflow = await context.taskStore.updateWorkflow(workflow.id, {
      state: {
        status: "failed",
        lastRunAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastError: getErrorMessage(error)
      }
    });
    await context.taskRunEventStore.appendEvent({
      workflowId: workflow.id,
      deviceId: context.deviceId,
      status: "failed",
      message: failedWorkflow.state.lastError
    });
    return failedWorkflow;
  }
}
function createRuntimeTask(action, workflow) {
  return {
    id: action.id,
    name: action.name,
    type: getRuntimeTaskType(action),
    config: action.config,
    state: workflow.state,
    permissions: workflow.permissions,
    schedule: workflow.schedule,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt
  };
}
function getRuntimeTaskType(action) {
  switch (action.type) {
    case "browser_action":
      return "browser_tab_group";
    case "crawler_action":
      return "crawler";
    case "discord_dry_run_action":
      return "discord_bot";
    case "notion_dry_run_action":
      return "notion_sync";
    case "trading_dry_run_action":
      return "trading_bot";
    case "tool_action":
      throw new Error("tool_action은 Task 호환 런타임 타입이 없습니다.");
  }
}
function resolveInputMapping(inputMapping, outputScope) {
  if (!inputMapping) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(inputMapping).map(([inputKey, outputPath]) => [
      inputKey,
      outputScope[outputPath]
    ])
  );
}
function getErrorMessage(error) {
  return error instanceof Error ? error.message : "알 수 없는 Workflow 실행 오류가 발생했습니다.";
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
app.setPath("userData", path.join(app.getPath("appData"), "pastel-flow"));
app.setName("Pastel Flow");
app.setAppUserModelId("com.pastelflow.app");
let win;
const appIconPath = path.join(process.env.VITE_PUBLIC, "pastel-flow.png");
function createWindow() {
  win = new BrowserWindow({
    autoHideMenuBar: true,
    icon: appIconPath,
    title: "Pastel Flow",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.setIcon(appIconPath);
  win.setMenu(null);
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
  Menu.setApplicationMenu(null);
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
  const toolModuleStore = createToolModuleStore({
    dataDir
  });
  const toolModuleRunner = createToolModuleRunner({
    toolModuleStore
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
  const workflowRunner = createWorkflowRunner({
    adapterRegistry,
    appSettingsStore,
    dataDir,
    deviceId: currentDevice.id,
    taskRunEventStore,
    taskStore,
    toolModuleRunner
  });
  registerAppSettingsIpc(ipcMain, appSettingsStore, deviceStore);
  registerSecretIpc(ipcMain, secretStore, taskStore);
  registerSyncIpc(ipcMain, mockSyncStore);
  registerToolModuleIpc(
    ipcMain,
    toolModuleStore,
    toolModuleRunner,
    taskStore
  );
  registerTaskIpc(
    ipcMain,
    taskStore,
    workflowRunner,
    taskRunEventStore,
    appSettingsStore,
    deviceStore
  );
  createTaskScheduler({
    appSettingsStore,
    deviceStore,
    taskStore,
    workflowRunner
  }).start();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
