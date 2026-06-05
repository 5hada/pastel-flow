export const ipcRequestChannels = {
  settings: {
    get: 'settings:get',
    update: 'settings:update',
  },
  secrets: {
    status: 'secrets:status',
    list: 'secrets:list',
    create: 'secrets:create',
    delete: 'secrets:delete',
  },
  sync: {
    status: 'sync:status',
    export: 'sync:export',
    exportFile: 'sync:export-file',
    import: 'sync:import',
    importFile: 'sync:import-file',
  },
  tools: {
    list: 'tools:list',
    registerFolder: 'tools:register-folder',
    run: 'tools:run',
    createAction: 'tools:create-action',
  },
  actions: {
    list: 'actions:list',
    create: 'actions:create',
    update: 'actions:update',
    delete: 'actions:delete',
  },
  tasks: {
    list: 'tasks:list',
    create: 'tasks:create',
    update: 'tasks:update',
    delete: 'tasks:delete',
    run: 'tasks:run',
    stop: 'tasks:stop',
    listEvents: 'tasks:list-events',
    pruneEvents: 'tasks:prune-events',
  },
  workflows: {
    legacyList: 'Workflows:list',
    legacyCreate: 'Workflows:create',
    legacyUpdate: 'Workflows:update',
    legacyDelete: 'Workflows:delete',
    list: 'workflows:list',
    create: 'workflows:create',
    update: 'workflows:update',
    delete: 'workflows:delete',
    run: 'workflows:run',
    stop: 'workflows:stop',
    listRuns: 'workflows:list-runs',
    listActionRuns: 'workflows:list-action-runs',
    listEvents: 'workflows:list-events',
    pruneEvents: 'workflows:prune-events',
  },
} as const

export const ipcEventChannels = {
  actions: {
    changed: 'actions:changed',
    deleted: 'actions:deleted',
  },
  tasks: {
    changed: 'tasks:changed',
  },
  workflows: {
    changed: 'workflows:changed',
    deleted: 'workflows:deleted',
  },
} as const

type ValueOf<T> = T[keyof T]
type NestedValueOf<T> = T extends string
  ? T
  : ValueOf<{
      [Key in keyof T]: NestedValueOf<T[Key]>
    }>

export type IpcRequestChannel = NestedValueOf<typeof ipcRequestChannels>
export type IpcEventChannel = NestedValueOf<typeof ipcEventChannels>
