import { Chip } from '@heroui/react'

export type InfoLabelsProps = {
  actionCount: number
  workflowCount: number
  toolCount: number
}

export function InfoLabels({
    actionCount,
    workflowCount,
    toolCount,
}: InfoLabelsProps) {
    return (
      <div className="app-header-meta" aria-label="작업 공간 요약">
        <Chip size="sm" variant="soft">Workflow {workflowCount}</Chip>
        <Chip size="sm" variant="soft">Action {actionCount}</Chip>
        <Chip size="sm" variant="soft">Tool {toolCount}</Chip>
      </div>
    );
}
