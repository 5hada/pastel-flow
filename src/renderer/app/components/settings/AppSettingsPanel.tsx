import type { FormEvent } from 'react'
import { getDeviceAccessLevelLabel, type CurrentDevice, type DeviceAccessLevel, type LinkedDevice } from '../../../../shared/devices'
import type { AppSettings, TaskListDisplayMode, ThemeMode } from '../../../../shared/settings'
import type { LocalSecretMetadata, SecretStorageStatus } from '../../../../shared/secrets'
import type { SyncImportResult, SyncStatus } from '../../../../shared/sync'
import type { BrowserKind } from '../../../../shared/tasks'
import type { SecretFormState, SettingsCategory, SettingsSaveState } from '../../taskFormState'
import { createEmptyLinkedDevice } from '../../utils/taskFormTransforms'
import { formatDate, getSyncModeLabel, getThemeModeLabel } from '../../utils/viewLabels'
import { DetailItem } from '../tasks/DetailItem'

export type AppSettingsPanelProps = {
  currentDevice: CurrentDevice
  form: AppSettings
  pruneMessage: string | null
  saveState: SettingsSaveState
  secretForm: SecretFormState
  secretStorageStatus: SecretStorageStatus
  secrets: LocalSecretMetadata[]
  selectedCategory: SettingsCategory
  settingsErrorMessage: string | null
  syncMessage: string | null
  syncResult: SyncImportResult | null
  syncStatus: SyncStatus
  userDataPath: string
  onChange(value: AppSettings): void
  onClose(): void
  onCreateSecret(): Promise<void>
  onDeleteSecret(secretId: string): Promise<void>
  onExportSyncSnapshot(): Promise<void>
  onExportSyncSnapshotFile(): Promise<void>
  onImportSyncSnapshot(): Promise<void>
  onImportSyncSnapshotFile(): Promise<void>
  onPruneTaskRunEvents(): Promise<void>
  onSecretFormChange(value: SecretFormState): void
  onSubmit(event: FormEvent<HTMLFormElement>): Promise<void>
}

export function AppSettingsPanel({
  currentDevice,
  form,
  pruneMessage,
  secretForm,
  secretStorageStatus,
  selectedCategory,
  onChange,
  onClose,
  onCreateSecret,
  onDeleteSecret,
  onExportSyncSnapshot,
  onExportSyncSnapshotFile,
  onImportSyncSnapshot,
  onImportSyncSnapshotFile,
  onPruneTaskRunEvents,
  onSecretFormChange,
  onSubmit,
  saveState,
  settingsErrorMessage,
  secrets,
  syncMessage,
  syncResult,
  syncStatus,
  userDataPath,
}: AppSettingsPanelProps) {
  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">App settings</p>
          <h2>앱 설정</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onClose}>
          닫기
        </button>
      </div>

      <form className="task-form" onSubmit={onSubmit}>
        {selectedCategory === 'general' ? (
          <>
            <fieldset className="settings-fieldset">
              <legend>테마</legend>
              <div className="segmented-control">
                {(['system', 'light', 'dark'] as ThemeMode[]).map((themeMode) => (
                  <label key={themeMode}>
                    <input
                      checked={form.themeMode === themeMode}
                      name="themeMode"
                      type="radio"
                      value={themeMode}
                      onChange={() =>
                        onChange({
                          ...form,
                          themeMode,
                        })
                      }
                    />
                    <span>{getThemeModeLabel(themeMode)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="theme-preview" data-preview-theme={form.themeMode}>
              <span>{getThemeModeLabel(form.themeMode)}</span>
              <strong>Pastel Flow</strong>
              <p>설정 저장 전에는 이 미리보기만 변경됩니다.</p>
            </div>

            <label>
              기본 브라우저
              <select
                value={form.defaultBrowserKind}
                onChange={(event) =>
                  onChange({
                    ...form,
                    defaultBrowserKind: event.target.value as BrowserKind,
                  })
                }
              >
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="chromium">Chromium</option>
              </select>
            </label>

            <label>
              새 Action 기본 이름
              <input
                value={form.defaultActionName}
                onChange={(event) =>
                  onChange({
                    ...form,
                    defaultActionName: event.target.value,
                  })
                }
              />
            </label>

            <label>
              새 Workflow 기본 이름
              <input
                value={form.defaultWorkflowName}
                onChange={(event) =>
                  onChange({
                    ...form,
                    defaultWorkflowName: event.target.value,
                  })
                }
              />
            </label>

            <label>
              작업 목록 표시 형식
              <select
                value={form.taskListDisplayMode}
                onChange={(event) =>
                  onChange({
                    ...form,
                    taskListDisplayMode: event.target.value as TaskListDisplayMode,
                  })
                }
              >
                <option value="grid">그리드</option>
                <option value="list">목록</option>
              </select>
            </label>

            <label>
              실행 그리드 열 수
              <input
                max={8}
                min={2}
                type="number"
                value={form.workflowGridColumnCount}
                onChange={(event) =>
                  onChange({
                    ...form,
                    workflowGridColumnCount: Number(event.target.value),
                  })
                }
              />
            </label>
          </>
        ) : null}

        {selectedCategory === 'shortcuts' ? (
          <section className="settings-subsection" aria-label="단축키">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Shortcuts</p>
                <h3>단축키 사용자 정의</h3>
              </div>
            </div>
            <div className="shortcut-list">
              {[
                ['실행 페이지 새로고침', 'Ctrl+R'],
                ['Action 화면 열기', 'Ctrl+1'],
                ['Workflow 화면 열기', 'Ctrl+2'],
                ['도구 페이지 열기', 'Ctrl+3'],
              ].map(([label, shortcut]) => (
                <label key={label}>
                  {label}
                  <input value={shortcut} readOnly />
                </label>
              ))}
            </div>
            <p className="muted-text">
              단축키 충돌 감지와 저장은 다음 단계에서 활성화합니다.
            </p>
          </section>
        ) : null}

        {selectedCategory === 'browser' ? (
          <section className="settings-subsection" aria-label="브라우저 설정">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Browser</p>
                <h3>브라우저 실행 정책</h3>
              </div>
            </div>
            <label>
              Chrome 실행 파일 경로
              <input
                value={form.browserExecutablePaths.chrome ?? ''}
                onChange={(event) =>
                  onChange({
                    ...form,
                    browserExecutablePaths: {
                      ...form.browserExecutablePaths,
                      chrome: event.target.value,
                    },
                  })
                }
                placeholder="비워두면 자동으로 찾습니다."
              />
            </label>

            <label>
              Edge 실행 파일 경로
              <input
                value={form.browserExecutablePaths.edge ?? ''}
                onChange={(event) =>
                  onChange({
                    ...form,
                    browserExecutablePaths: {
                      ...form.browserExecutablePaths,
                      edge: event.target.value,
                    },
                  })
                }
                placeholder="비워두면 자동으로 찾습니다."
              />
            </label>

            <label>
              Chromium 실행 파일 경로
              <input
                value={form.browserExecutablePaths.chromium ?? ''}
                onChange={(event) =>
                  onChange({
                    ...form,
                    browserExecutablePaths: {
                      ...form.browserExecutablePaths,
                      chromium: event.target.value,
                    },
                  })
                }
                placeholder="비워두면 자동으로 찾습니다."
              />
            </label>
            <dl className="detail-list">
              <DetailItem label="기본 실행 방식" value="전용 프로필" />
              <DetailItem
                label="기본 프로필 조작"
                value="자동 탐색/강제 조작 안 함"
              />
            </dl>
          </section>
        ) : null}

        {selectedCategory === 'devices' ? (
          <section className="settings-subsection" aria-label="기기 권한">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Device policy</p>
              <h3>기기별 허용 수준</h3>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() =>
                onChange({
                  ...form,
                  linkedDevices: [
                    ...form.linkedDevices,
                    createEmptyLinkedDevice(),
                  ],
                })
              }
            >
              기기 추가
            </button>
          </div>

          <div className="device-current">
            <span>현재 기기</span>
            <strong>{currentDevice.name || '아직 불러오지 못했습니다.'}</strong>
            <code>{currentDevice.id || '기기 ID 없음'}</code>
          </div>

          {form.linkedDevices.length === 0 ? (
            <p className="muted-text">아직 연동된 기기 설정이 없습니다.</p>
          ) : (
            <div className="linked-device-list">
              {form.linkedDevices.map((device, index) => (
                <LinkedDeviceEditor
                  device={device}
                  key={`${device.id}-${index}`}
                  onChange={(updatedDevice) =>
                    onChange({
                      ...form,
                      linkedDevices: form.linkedDevices.map(
                        (currentDeviceItem, currentIndex) =>
                          currentIndex === index
                            ? updatedDevice
                            : currentDeviceItem,
                      ),
                    })
                  }
                  onRemove={() =>
                    onChange({
                      ...form,
                      linkedDevices: form.linkedDevices.filter(
                        (_device, currentIndex) => currentIndex !== index,
                      ),
                    })
                  }
                />
              ))}
            </div>
          )}
          </section>
        ) : null}

        {selectedCategory === 'secrets' ? (
          <section className="settings-subsection" aria-label="로컬 Secret">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Secrets</p>
              <h3>로컬 Secret</h3>
            </div>
            <span>{secrets.length}개</span>
          </div>

          <div
            className={`secret-storage-status${
              secretStorageStatus.encryptionAvailable ? ' is-ok' : ' is-warning'
            }`}
          >
            <strong>
              {secretStorageStatus.encryptionAvailable
                ? '암호화 사용 가능'
                : '암호화 사용 불가'}
            </strong>
            <span>{secretStorageStatus.message}</span>
            <code>{secretStorageStatus.backend}</code>
          </div>

          <div className="secret-form">
            <label>
              이름
              <input
                value={secretForm.name}
                onChange={(event) =>
                  onSecretFormChange({
                    ...secretForm,
                    name: event.target.value,
                  })
                }
              />
            </label>
            <label>
              값
              <input
                type="password"
                value={secretForm.value}
                onChange={(event) =>
                  onSecretFormChange({
                    ...secretForm,
                    value: event.target.value,
                  })
                }
              />
            </label>
            <label>
              설명
              <input
                value={secretForm.description}
                onChange={(event) =>
                  onSecretFormChange({
                    ...secretForm,
                    description: event.target.value,
                  })
                }
              />
            </label>
            <button type="button" onClick={onCreateSecret}>
              추가
            </button>
          </div>

          {secrets.length === 0 ? (
            <p className="muted-text">저장된 로컬 Secret이 없습니다.</p>
          ) : (
            <div className="secret-list">
              {secrets.map((secret) => (
                <div className="secret-row" key={secret.id}>
                  <div>
                    <strong>{secret.name}</strong>
                    <small>{secret.description ?? secret.id}</small>
                  </div>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => onDeleteSecret(secret.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
          </section>
        ) : null}

        {selectedCategory === 'sync' ? (
          <section className="settings-subsection" aria-label="동기화">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Mock sync</p>
                <h3>로컬 동기화 스냅샷</h3>
              </div>
            </div>
            <dl className="detail-list">
              <DetailItem
                label="Sync mode"
                value={getSyncModeLabel(syncStatus.mode)}
              />
              <DetailItem
                label="Server DB"
                value={syncStatus.serverDbSyncEnabled ? '사용' : '미사용'}
              />
              <DetailItem
                label="내보내기 파일"
                value={syncStatus.exportPath || '아직 없음'}
              />
              <DetailItem
                label="마지막 내보내기"
                value={formatDate(syncStatus.lastExportedAt)}
              />
            </dl>
            {syncStatus.message ? (
              <p className="muted-text">{syncStatus.message}</p>
            ) : null}
            <div className="form-actions">
              <button type="button" onClick={() => void onExportSyncSnapshot()}>
                내보내기
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void onExportSyncSnapshotFile()}
              >
                파일로 내보내기
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void onImportSyncSnapshot()}
              >
                가져오기
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => void onImportSyncSnapshotFile()}
              >
                파일에서 가져오기
              </button>
            </div>
            {syncMessage ? <p className="panel-success">{syncMessage}</p> : null}
            {syncResult ? (
              <p className="panel-success">
                가져오기 완료: 생성 {syncResult.tasksCreated}개, 업데이트{' '}
                {syncResult.tasksUpdated}개, 이벤트{' '}
                {syncResult.taskRunEventsAdded}개
              </p>
            ) : null}
          </section>
        ) : null}

        {selectedCategory === 'events' ? (
          <section className="settings-subsection" aria-label="실행 이벤트">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Run events</p>
                <h3>실행 이벤트 보존</h3>
              </div>
            </div>
            <label>
              실행 이벤트 보존 개수
              <input
                max={2000}
                min={50}
                type="number"
                value={form.taskRunEventRetentionLimit}
                onChange={(event) =>
                  onChange({
                    ...form,
                    taskRunEventRetentionLimit: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Sync export 이벤트 개수
              <input
                max={2000}
                min={0}
                type="number"
                value={form.taskRunEventExportLimit}
                onChange={(event) =>
                  onChange({
                    ...form,
                    taskRunEventExportLimit: Number(event.target.value),
                  })
                }
              />
            </label>
            <div className="form-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => void onPruneTaskRunEvents()}
              >
                보존 개수 적용
              </button>
            </div>
            {pruneMessage ? (
              <p className="panel-success">{pruneMessage}</p>
            ) : null}
          </section>
        ) : null}

        {selectedCategory === 'data' ? (
          <section className="settings-subsection" aria-label="데이터 관리">
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Data</p>
                <h3>로컬 데이터 위치</h3>
              </div>
            </div>
            <label>
              userData 위치
              <input value={userDataPath || '아직 불러오지 못했습니다.'} readOnly />
            </label>
            <dl className="detail-list">
              <DetailItem label="작업 저장" value="tasks.json" />
              <DetailItem label="도구 등록" value="toolModules.json" />
              <DetailItem label="도구 복사" value="tool-modules/" />
              <DetailItem label="Secret 저장" value="secrets.json" />
            </dl>
          </section>
        ) : null}

        {settingsErrorMessage ? (
          <p className="panel-error">{settingsErrorMessage}</p>
        ) : null}
        {saveState === 'saved' ? (
          <p className="panel-success">설정을 저장했습니다.</p>
        ) : null}

        <div className="form-actions">
          <button type="submit">저장</button>
        </div>
      </form>
    </>
  )
}

export type LinkedDeviceEditorProps = {
  device: LinkedDevice
  onChange(device: LinkedDevice): void
  onRemove(): void
}

export function LinkedDeviceEditor({
  device,
  onChange,
  onRemove,
}: LinkedDeviceEditorProps) {
  return (
    <div className="linked-device-row">
      <label>
        기기 이름
        <input
          value={device.name}
          onChange={(event) =>
            onChange({
              ...device,
              name: event.target.value,
            })
          }
        />
      </label>
      <label>
        기기 ID
        <input
          value={device.id}
          onChange={(event) =>
            onChange({
              ...device,
              id: event.target.value,
            })
          }
        />
      </label>
      <label>
        허용 수준
        <select
          value={device.accessLevel}
          onChange={(event) =>
            onChange({
              ...device,
              accessLevel: event.target.value as DeviceAccessLevel,
            })
          }
        >
          {(['blocked', 'visible', 'executable', 'trusted'] as const).map(
            (accessLevel) => (
              <option key={accessLevel} value={accessLevel}>
                {getDeviceAccessLevelLabel(accessLevel)}
              </option>
            ),
          )}
        </select>
      </label>
      <button className="danger-button" type="button" onClick={onRemove}>
        제거
      </button>
    </div>
  )
}
