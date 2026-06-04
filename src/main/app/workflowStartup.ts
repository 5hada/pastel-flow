import type { WorkflowStore } from '../workflows/store/workflowStore'

export async function resetStaleRunningWorkflows(workflowStore: WorkflowStore): Promise<void> {
  const workflows = await workflowStore.listWorkflows()

  await Promise.all(
    workflows
      .filter((workflow) => workflow.state.status === 'running')
      .map((workflow) =>
        workflowStore.updateWorkflow(workflow.id, {
          state: {
            ...workflow.state,
            status: 'idle',
            lastMessage: '앱 시작 시 이전 실행 상태를 정리했습니다.',
          },
        }),
      ),
  )
}
