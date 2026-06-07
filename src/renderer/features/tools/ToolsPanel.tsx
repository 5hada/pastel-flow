import {
  Button,
  Card,
  Chip,
} from '@heroui/react'
import type {
  RegisteredToolModule,
  ToolModuleRunResult,
} from '../../../shared/tools'
import type { WorkspaceFolder } from '../../../shared/settings'
import { DetailItem } from '../../shared/components/DetailItem'
import { CollectionListPanel } from '../../shared/components/CollectionListPanel'
import { getCommonIcon } from '../../shared/assets/icon'
import { getWorkspaceFolderPathLabel } from '../../shared/utils/workspaceFolderLabels'
import { filterByFolder } from '../../shared/utils/collectionFilters'
import { ToolInputField } from './components/ToolInputField'
import { ToolOutputRenderer } from './components/ToolOutputRenderer'

export type ToolsPanelProps = {
  selectedToolId: string | null
  selectedCollectionFolderId: string
  toolInputValues: Record<string, unknown>
  toolMessage: string | null
  toolModules: RegisteredToolModule[]
  toolRunResult: ToolModuleRunResult | null
  showToolMetadata: boolean
  workspaceFolderAssignments: Record<string, string>
  workspaceFolders: WorkspaceFolder[]
  onCreateToolAction(): Promise<void>
  onClearSelectedTool(): void
  onRegisterToolModule(): Promise<void>
  onRunToolModule(): Promise<void>
  onSelectTool(tool: RegisteredToolModule): void
  onToolInputChange(key: string, value: unknown): void
}

export function ToolsPanel({
  onCreateToolAction,
  onClearSelectedTool,
  onRegisterToolModule,
  onRunToolModule,
  onSelectTool,
  onToolInputChange,
  selectedCollectionFolderId,
  selectedToolId,
  showToolMetadata,
  toolInputValues,
  toolMessage,
  toolModules,
  toolRunResult,
  workspaceFolderAssignments,
  workspaceFolders,
}: ToolsPanelProps) {
  const selectedTool =
    toolModules.find((tool) => tool.id === selectedToolId) ?? null
  const visibleTools = filterByFolder(
    toolModules,
    selectedCollectionFolderId,
    workspaceFolderAssignments,
  )

  if (!selectedTool) {
    return (
      <CollectionListPanel
        emptyAction={
          <Button
            variant="primary"
            type="button"
            onClick={() => void onRegisterToolModule()}
          >
            Tool Module 폴더 선택
          </Button>
        }
        emptyText="표시할 Tool Module이 없습니다."
        eyebrow="TOOLS"
        folderLabel={getWorkspaceFolderPathLabel(
          selectedCollectionFolderId,
          workspaceFolders,
        )}
        headerAction={
          <Button
            aria-label="Tool Module 폴더 등록"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={() => void onRegisterToolModule()}
          >
            {getCommonIcon('add')}
          </Button>
        }
        items={visibleTools.map((tool) => ({
          id: tool.id,
          title: tool.manifest.name,
          meta: `v${tool.manifest.version}`,
          message: tool.manifest.description,
        }))}
        itemActionLabel="사용"
        title="Tool Module 목록"
        onEdit={(toolId) => {
          const tool = toolModules.find((currentTool) => currentTool.id === toolId)
          if (tool) {
            onSelectTool(tool)
          }
        }}
      />
    )
  }

  return (
    <Card className="mode-panel tool-panel" aria-label="도구">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Tool modules</p>
          <h2>{selectedTool?.manifest.name ?? '도구 모듈'}</h2>
        </div>
        {selectedTool ? (
          <Button
            aria-label="목록으로 돌아가기"
            isIconOnly
            variant="ghost"
            type="button"
            onClick={onClearSelectedTool}
          >
            {getCommonIcon('close')}
          </Button>
        ) : null}
      </div>
      <div className="tool-workspace-surface" aria-label="tool modules">
          <div className="tool-module-detail">
            <Card className="tool-summary-strip" variant="secondary">
              <div>
                <strong>{selectedTool.manifest.name}</strong>
                {selectedTool.manifest.description ? (
                  <span>{selectedTool.manifest.description}</span>
                ) : null}
              </div>
              <Chip size="sm" variant="secondary">
                <Chip.Label>v{selectedTool.manifest.version}</Chip.Label>
              </Chip>
            </Card>

            <Card className="tool-runner-card" variant="secondary">
              <div className="tool-input-grid">
                {selectedTool.manifest.inputs.length > 0 ? (
                  selectedTool.manifest.inputs.map((field) => (
                    <ToolInputField
                      field={field}
                      key={field.key}
                      value={toolInputValues[field.key]}
                      onChange={(value) => onToolInputChange(field.key, value)}
                    />
                  ))
                ) : (
                  <p className="empty-state">입력 없이 실행할 수 있습니다.</p>
                )}
              </div>
              <div className="form-actions">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => void onCreateToolAction()}
                >
                  Action 생성
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => void onRunToolModule()}
                >
                  실행
                </Button>
              </div>
            </Card>

            {toolMessage ? (
              <p className="panel-success">{toolMessage}</p>
            ) : null}
            {toolRunResult ? (
              <ToolOutputRenderer
                output={toolRunResult.output}
                outputs={selectedTool.manifest.outputs}
              />
            ) : null}
            {showToolMetadata ? (
              <section className="tool-metadata-panel" aria-label="도구 기타 정보">
                <dl className="detail-list compact-detail-list">
                  <DetailItem
                    label="입력"
                    value={`${selectedTool.manifest.inputs.length}개`}
                  />
                  <DetailItem
                    label="출력"
                    value={`${selectedTool.manifest.outputs.length}개`}
                  />
                  <DetailItem
                    label="권한"
                    value={
                      selectedTool.manifest.permissions.length > 0
                        ? selectedTool.manifest.permissions.join(', ')
                        : '없음'
                    }
                  />
                  <DetailItem label="등록 위치" value={selectedTool.sourcePath} />
                  <DetailItem
                    label="Assets"
                    value={`${selectedTool.manifest.assets.length}개`}
                  />
                  <DetailItem
                    label="Data sources"
                    value={`${selectedTool.manifest.dataSources.length}개`}
                  />
                  <DetailItem
                    label="Datasets"
                    value={`${selectedTool.manifest.datasets.length}개`}
                  />
                  <DetailItem
                    label="Indexing"
                    value={
                      selectedTool.manifest.indexing?.enabled ? '사용' : '미사용'
                    }
                  />
                </dl>
              </section>
            ) : null}
          </div>
      </div>
    </Card>
  )
}
