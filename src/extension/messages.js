const commandTypes = new Set([
  'closeGroup',
  'ensureGroup',
  'ping',
  'snapshotGroup',
])

export function parseNativeRequest(message) {
  if (!message || typeof message !== 'object') {
    throw new Error('Native bridge request must be an object.')
  }

  if (typeof message.id !== 'string' || !message.id.trim()) {
    throw new Error('Native bridge request id is required.')
  }

  const command = message.command
  if (!command || typeof command !== 'object') {
    throw new Error('Native bridge command is required.')
  }

  if (!commandTypes.has(command.type)) {
    throw new Error(`Unsupported native bridge command: ${String(command.type)}`)
  }

  return {
    id: message.id,
    command,
  }
}

export function createSuccessResponse(id, result) {
  return {
    id,
    ok: true,
    result,
  }
}

export function createErrorResponse(id, error) {
  return {
    id,
    ok: false,
    error: error instanceof Error ? error.message : 'Unknown extension error.',
  }
}
