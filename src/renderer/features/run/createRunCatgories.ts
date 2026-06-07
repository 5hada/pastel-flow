import type { ReactNode } from "react"
import { getCommonIcon } from "../../shared/assets/icon"
import { isRestrictedDevicePolicy } from "../../../shared/devices"
import type { WorkflowDefinition } from "../../../shared/workflows"
import type { NavigationCategory } from "../../shared/state/taskFormState"

export function createRunCategories(workflows: WorkflowDefinition[]): {
  id: NavigationCategory
  icon: ReactNode
  label: string
  count: number
}[] {
  return [
    {
      id: 'all',
      icon: getCommonIcon('list'),
      label: '전체',
      count: workflows.length,
    },
    { id: 'favorites', icon: getCommonIcon('starred'), label: '즐겨찾기', count: 0 },
    {
      id: 'running',
      icon: getCommonIcon('running'),
      label: '실행 중',
      count: workflows.filter((workflow) => workflow.state.status === 'running')
        .length,
    },
    {
      id: 'scheduled',
      icon: getCommonIcon('scheduled'),
      label: '예약됨',
      count: workflows.filter((workflow) => workflow.schedule?.enabled).length,
    },
    {
      id: 'failed',
      icon: getCommonIcon('warning'),
      label: '실패',
      count: workflows.filter((workflow) => workflow.state.status === 'failed')
        .length,
    },
    {
      id: 'restricted',
      icon: getCommonIcon('blocked'),
      label: '제한됨',
      count: workflows.filter((workflow) =>
        isRestrictedDevicePolicy(workflow.permissions),
      ).length,
    },
    {
      id: 'secret_required',
      icon: getCommonIcon('secret'),
      label: 'Secret 필요',
      count: workflows.filter(
        (workflow) => (workflow.permissions.secretRefs?.length ?? 0) > 0,
      ).length,
    },
  ]
}