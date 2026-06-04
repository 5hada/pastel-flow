import {
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
  TextArea,
} from '@heroui/react'
import type { CSSProperties } from 'react'
import type {
  AppSettings,
  ThemeColorKey,
  ThemeMode,
} from '../../../../shared/settings'
import { DetailItem } from '../../../shared/components/DetailItem'
import { createEmptyLinkedDevice } from '../../../shared/utils/taskFormTransforms'
import {
  formatDate,
  getBrowserProfileSourceLabel,
  getSyncModeLabel,
  getThemeModeLabel,
} from '../../../shared/utils/viewLabels'
import type { AppSettingsPanelProps } from '../AppSettingsPanel'
import { LinkedDeviceEditor } from './LinkedDeviceEditor'
import { ProfilePresetEditor } from './ProfilePresetEditor'

export type SettingsCategoryContentProps = Omit<
  AppSettingsPanelProps,
  'onClose' | 'onSubmit' | 'saveState' | 'settingsErrorMessage'
>

export function SettingsCategoryContent({
  currentDevice,
  form,
  pruneMessage,
  secretForm,
  secretStorageStatus,
  secrets,
  selectedCategory,
  syncMessage,
  syncResult,
  syncStatus,
  userDataPath,
  onChange,
  onCreateSecret,
  onDeleteSecret,
  onExportSyncSnapshot,
  onExportSyncSnapshotFile,
  onImportSyncSnapshot,
  onImportSyncSnapshotFile,
  onPruneWorkflowRunEvents,
  onRegisterToolModule,
  onSecretFormChange,
}: SettingsCategoryContentProps) {
  if (selectedCategory === 'general') {
    return (
      <>
        <Checkbox
          className="inline-check"
          isSelected={form.startAtLogin}
          onChange={(startAtLogin) =>
            onChange({
              ...form,
              startAtLogin,
            })
          }
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label>시작 프로그램으로 설정</Label>
          </Checkbox.Content>
        </Checkbox>

        <label>
          새 Action 기본 이름
          <Input
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
          <Input
            value={form.defaultWorkflowName}
            onChange={(event) =>
              onChange({
                ...form,
                defaultWorkflowName: event.target.value,
              })
            }
          />
        </label>

        <Card className="settings-subsection" aria-label="도구 폴더">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow">Tools</p>
              <h3>도구 폴더 등록</h3>
            </div>
            <Button
              variant="secondary"
              type="button"
              onPress={() => void onRegisterToolModule()}
            >
              폴더 등록
            </Button>
          </div>
        </Card>
      </>
    )
  }

  if (selectedCategory === 'appearance') {
    return (
      <div className="appearance-settings-layout">
        <div className="appearance-theme-grid">
          <fieldset className="settings-fieldset theme-mode-fieldset">
            <legend>테마</legend>
            <RadioGroup
              className="segmented-control"
              name="themeMode"
              value={form.themeMode}
              onChange={(themeMode) =>
                onChange({
                  ...form,
                  themeMode: themeMode as ThemeMode,
                })
              }
            >
              {(['system', 'light', 'dark', 'custom'] as ThemeMode[]).map(
                (themeMode) => (
                  <Radio key={themeMode} value={themeMode}>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    <Radio.Content>
                      <Label>{getThemeModeLabel(themeMode)}</Label>
                    </Radio.Content>
                  </Radio>
                ),
              )}
            </RadioGroup>
          </fieldset>

          <Card
            className="theme-preview"
            data-preview-theme={form.themeMode}
            style={getThemePreviewStyle(form)}
          >
            <span>{getThemeModeLabel(form.themeMode)}</span>
            <strong>Pastel Flow</strong>
            <p>설정 저장 전에는 이 미리보기만 변경됩니다.</p>
            <div className="theme-preview-swatches">
              {(Object.keys(form.customThemeColors) as ThemeColorKey[]).map(
                (key) => (
                  <i
                    aria-label={themeColorLabels[key]}
                    key={key}
                    style={{ backgroundColor: form.customThemeColors[key] }}
                  />
                ),
              )}
            </div>
          </Card>
        </div>

        {form.themeMode === 'custom' ? (
          <div className="theme-color-grid">
            {(Object.keys(form.customThemeColors) as ThemeColorKey[]).map(
              (key) => (
                <label key={key}>
                  {themeColorLabels[key]}
                  <span className="color-input-row">
                    <Input
                      className="color-input"
                      type="color"
                      value={form.customThemeColors[key]}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          customThemeColors: {
                            ...form.customThemeColors,
                            [key]: event.target.value,
                          },
                        })
                      }
                    />
                    <Input
                      value={form.customThemeColors[key]}
                      onChange={(event) =>
                        onChange({
                          ...form,
                          customThemeColors: {
                            ...form.customThemeColors,
                            [key]: event.target.value,
                          },
                        })
                      }
                    />
                  </span>
                </label>
              ),
            )}
          </div>
        ) : null}

        <div className="appearance-display-grid">
          <label>
            작업 목록 표시 형식
            <Select
              selectedKey={form.workflowListDisplayMode}
              onSelectionChange={(key) =>
                onChange({
                  ...form,
                  workflowListDisplayMode: String(
                    key,
                  ) as typeof form.workflowListDisplayMode,
                })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="grid" textValue="그리드">
                    그리드
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="list" textValue="목록">
                    목록
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </label>

          <label>
            실행 그리드 열 수
            <Input
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

          <label className="appearance-hierarchy-field">
            Workflow 실행 화면 계층 구조
            <TextArea
              rows={4}
              value={form.workflowHierarchy.join('\n')}
              onChange={(event) =>
                onChange({
                  ...form,
                  workflowHierarchy: event.target.value
                    .split(/\r?\n/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
      </div>
    )
  }

  if (selectedCategory === 'shortcuts') {
    return (
      <Card className="settings-subsection" aria-label="단축키">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Shortcuts</p>
            <h3>단축키 사용자 정의</h3>
          </div>
        </div>
        <div className="shortcut-list">
          {shortcutFields.map((field) => (
            <label key={field.key}>
              {field.label}
              <Input
                value={form.shortcuts[field.key]}
                onChange={(event) =>
                  onChange({
                    ...form,
                    shortcuts: {
                      ...form.shortcuts,
                      [field.key]: event.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </Card>
    )
  }

  if (selectedCategory === 'browser') {
    return (
      <Card className="settings-subsection" aria-label="브라우저 설정">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Browser</p>
            <h3>브라우저 실행 정책</h3>
          </div>
        </div>
        <label>
          기본 브라우저
          <Select
            selectedKey={form.defaultBrowserKind}
            onSelectionChange={(key) =>
              onChange({
                ...form,
                defaultBrowserKind: String(key) as typeof form.defaultBrowserKind,
              })
            }
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {(['chrome', 'edge', 'chromium'] as const).map(
                  (browserKind) => (
                    <ListBox.Item
                      id={browserKind}
                      key={browserKind}
                      textValue={browserKind}
                    >
                      {getBrowserKindLabel(browserKind)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ),
                )}
              </ListBox>
            </Select.Popover>
          </Select>
        </label>
        <div className="form-grid">
          <label>
            기본 실행 방식
            <Select
              selectedKey={form.defaultBrowserRunMode}
              onSelectionChange={(key) =>
                onChange({
                  ...form,
                  defaultBrowserRunMode: String(
                    key,
                  ) as typeof form.defaultBrowserRunMode,
                })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {[
                    ['dedicated_profile', '전용 프로필'],
                    ['extension_controlled', '확장 프로그램 제어'],
                    ['default_browser_deeplink', '기본 브라우저 연결'],
                  ].map(([value, label]) => (
                    <ListBox.Item id={value} key={value} textValue={label}>
                      {label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </label>
          <label>
            기본 프로필 소스
            <Select
              selectedKey={form.defaultBrowserProfileSource}
              onSelectionChange={(key) =>
                onChange({
                  ...form,
                  defaultBrowserProfileSource: String(
                    key,
                  ) as typeof form.defaultBrowserProfileSource,
                })
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(['action_profile', 'existing_profile'] as const).map(
                    (profileSource) => (
                      <ListBox.Item
                        id={profileSource}
                        key={profileSource}
                        textValue={getBrowserProfileSourceLabel(profileSource)}
                      >
                        {getBrowserProfileSourceLabel(profileSource)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ),
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
          </label>
        </div>

        <ProfilePresetEditor form={form} onChange={onChange} />

        {(['chrome', 'edge', 'chromium'] as const).map((browserKind) => (
          <label key={browserKind}>
            {getBrowserKindLabel(browserKind)} 실행 파일 경로
            <Input
              value={form.browserExecutablePaths[browserKind] ?? ''}
              onChange={(event) =>
                onChange({
                  ...form,
                  browserExecutablePaths: {
                    ...form.browserExecutablePaths,
                    [browserKind]: event.target.value,
                  },
                })
              }
              placeholder="비워두면 자동으로 찾습니다."
            />
          </label>
        ))}
      </Card>
    )
  }

  if (selectedCategory === 'devices') {
    return (
      <Card className="settings-subsection" aria-label="기기 권한">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Device policy</p>
            <h3>기기별 허용 수준</h3>
          </div>
          <Button
            className="ghost-button"
            variant="ghost"
            type="button"
            onPress={() =>
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
          </Button>
        </div>

        <Card className="device-current">
          <span>현재 기기</span>
          <strong>{currentDevice.name || '아직 불러오지 못했습니다.'}</strong>
          <code>{currentDevice.id || '기기 ID 없음'}</code>
        </Card>

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
      </Card>
    )
  }

  if (selectedCategory === 'secrets') {
    return (
      <Card className="settings-subsection" aria-label="로컬 Secret">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Secrets</p>
            <h3>로컬 Secret</h3>
          </div>
          <span>{secrets.length}개</span>
        </div>

        <Card
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
        </Card>

        <div className="secret-form">
          <label>
            이름
            <Input
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
            <Input
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
            <Input
              value={secretForm.description}
              onChange={(event) =>
                onSecretFormChange({
                  ...secretForm,
                  description: event.target.value,
                })
              }
            />
          </label>
          <Button
            variant="secondary"
            type="button"
            onPress={() => void onCreateSecret()}
          >
            추가
          </Button>
        </div>

        {secrets.length === 0 ? (
          <p className="muted-text">저장된 로컬 Secret이 없습니다.</p>
        ) : (
          <div className="secret-list">
            {secrets.map((secret) => (
              <Card className="secret-row" key={secret.id}>
                <div>
                  <strong>{secret.name}</strong>
                  <small>{secret.description ?? secret.id}</small>
                </div>
                <Button
                  className="danger-button"
                  variant="danger"
                  type="button"
                  onPress={() => void onDeleteSecret(secret.id)}
                >
                  삭제
                </Button>
              </Card>
            ))}
          </div>
        )}
      </Card>
    )
  }

  if (selectedCategory === 'sync') {
    return (
      <Card className="settings-subsection" aria-label="동기화">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Mock sync</p>
            <h3>로컬 동기화 스냅샷</h3>
          </div>
        </div>
        <dl className="detail-list">
          <DetailItem label="Sync mode" value={getSyncModeLabel(syncStatus.mode)} />
          <DetailItem
            label="Server DB"
            value={syncStatus.serverDbSyncEnabled ? '사용' : '미사용'}
          />
          <DetailItem label="내보내기 파일" value={syncStatus.exportPath || '아직 없음'} />
          <DetailItem label="마지막 내보내기" value={formatDate(syncStatus.lastExportedAt)} />
        </dl>
        {syncStatus.message ? (
          <p className="muted-text">{syncStatus.message}</p>
        ) : null}
        <div className="form-actions">
          <Button
            variant="secondary"
            type="button"
            onPress={() => void onExportSyncSnapshot()}
          >
            내보내기
          </Button>
          <Button
            className="ghost-button"
            variant="ghost"
            type="button"
            onPress={() => void onExportSyncSnapshotFile()}
          >
            파일로 내보내기
          </Button>
          <Button
            className="ghost-button"
            variant="ghost"
            type="button"
            onPress={() => void onImportSyncSnapshot()}
          >
            가져오기
          </Button>
          <Button
            className="ghost-button"
            variant="ghost"
            type="button"
            onPress={() => void onImportSyncSnapshotFile()}
          >
            파일에서 가져오기
          </Button>
        </div>
        {syncMessage ? <p className="panel-success">{syncMessage}</p> : null}
        {syncResult ? (
          <p className="panel-success">
            가져오기 완료: 이벤트 {syncResult.workflowRunEventsAdded}개, 기기{' '}
            {syncResult.linkedDevicesMerged}개 병합
          </p>
        ) : null}
      </Card>
    )
  }

  if (selectedCategory === 'events') {
    return (
      <Card className="settings-subsection" aria-label="실행 이벤트">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Run events</p>
            <h3>실행 이벤트 보존</h3>
          </div>
        </div>
        <label>
          실행 이벤트 보존 개수
          <Input
            max={2000}
            min={50}
            type="number"
            value={form.workflowRunEventRetentionLimit}
            onChange={(event) =>
              onChange({
                ...form,
                workflowRunEventRetentionLimit: Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          Sync export 이벤트 개수
          <Input
            max={2000}
            min={0}
            type="number"
            value={form.workflowRunEventExportLimit}
            onChange={(event) =>
              onChange({
                ...form,
                workflowRunEventExportLimit: Number(event.target.value),
              })
            }
          />
        </label>
        <div className="form-actions">
          <Button
            className="ghost-button"
            variant="ghost"
            type="button"
            onPress={() => void onPruneWorkflowRunEvents()}
          >
            보존 개수 적용
          </Button>
        </div>
        {pruneMessage ? <p className="panel-success">{pruneMessage}</p> : null}
      </Card>
    )
  }

  if (selectedCategory === 'data') {
    return (
      <Card className="settings-subsection" aria-label="데이터 관리">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Data</p>
            <h3>로컬 데이터 위치</h3>
          </div>
        </div>
        <label>
          userData 위치
          <Input value={userDataPath || '아직 불러오지 못했습니다.'} readOnly />
        </label>
        <dl className="detail-list">
          <DetailItem label="작업 저장" value="tasks.json" />
          <DetailItem label="도구 등록" value="toolModules.json" />
          <DetailItem label="도구 복사" value="tool-modules/" />
          <DetailItem label="Secret 저장" value="secrets.json" />
        </dl>
      </Card>
    )
  }

  return (
    <Card className="settings-subsection" aria-label="개발자 설정">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Developer</p>
          <h3>세부 정보 표시</h3>
        </div>
      </div>
      {[
        ['showIds', 'ID 표시'],
        ['showPaths', '세부 위치 경로 표시'],
        ['showToolMetadata', '도구 메타데이터 표시'],
      ].map(([key, label]) => (
        <Checkbox
          className="inline-check"
          isSelected={
            form.developerVisibility[
              key as keyof typeof form.developerVisibility
            ]
          }
          key={key}
          onChange={(isSelected) =>
            onChange({
              ...form,
              developerVisibility: {
                ...form.developerVisibility,
                [key]: isSelected,
              },
            })
          }
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Content>
            <Label>{label}</Label>
          </Checkbox.Content>
        </Checkbox>
      ))}
    </Card>
  )
}

const themeColorLabels: Record<ThemeColorKey, string> = {
  appBg: '앱 배경',
  surface: '표면',
  surfaceMuted: '보조 표면',
  surfaceRaised: '상단 표면',
  surfaceSelected: '선택 표면',
  border: '경계선',
  borderStrong: '강한 경계선',
  text: '본문',
  textMuted: '보조 본문',
  accent: '강조',
  accentHover: '강조 hover',
  accentSoft: '부드러운 강조',
  accentContrast: '강조 대비',
  danger: '위험',
  dangerHover: '위험 hover',
  dangerSoft: '부드러운 위험',
  info: '정보',
  infoSoft: '부드러운 정보',
  warning: '경고',
  warningText: '경고 본문',
  success: '성공',
  successSoft: '부드러운 성공',
  controlBg: '입력 배경',
  readonlyBg: '읽기 전용',
  railBg: '레일',
}

const shortcutFields: {
  key: keyof AppSettings['shortcuts']
  label: string
}[] = [
  { key: 'refresh', label: '새로고침' },
  { key: 'openRun', label: '실행 화면 열기' },
  { key: 'openActions', label: 'Action 화면 열기' },
  { key: 'openWorkflows', label: 'Workflow 화면 열기' },
  { key: 'openTools', label: '도구 화면 열기' },
  { key: 'openSettings', label: '설정 열기' },
  { key: 'runSelectedWorkflow', label: '선택 Workflow 실행' },
]

function getThemePreviewStyle(form: AppSettings): CSSProperties {
  if (form.themeMode !== 'custom') {
    return {}
  }

  return {
    color: form.customThemeColors.text,
    backgroundColor: form.customThemeColors.surface,
    borderColor: form.customThemeColors.border,
  }
}

function getBrowserKindLabel(browserKind: keyof AppSettings['browserExecutablePaths']) {
  if (browserKind === 'chrome') {
    return 'Chrome'
  }

  if (browserKind === 'edge') {
    return 'Edge'
  }

  return 'Chromium'
}
