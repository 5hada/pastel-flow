import { Button, PressEvent } from "@heroui/react"
import { ReactNode } from "react"


export function GridRunButton({
  canStop,
  isRunning,
  isStopping,
  workflowId,
  workflowName,
  onPressRun,
  onPressStop,
}: { 
  canStop: boolean
  isRunning: boolean
  isStopping: boolean
  workflowId: string
  workflowName:string
  onPressRun(event: PressEvent): void
  onPressStop(event: PressEvent): void
}) {
  return(
                <WorkflowRunCard
                  key={workflowId}
                  subtitle={
                    canStop || isStopping || isRunning
                      ? isStopping
                        ? '중지 중'
                        : canStop
                          ? '실행 중'
                          : '실행 준비'
                      : undefined
                  }
                  title={workflowName}
                  actionLabel={
                    isStopping
                      ? '중지 중'
                      : canStop
                        ? '중지'
                        : isRunning
                          ? '실행 중'
                          : '실행'
                  }
                  actionVariant={canStop || isStopping ? 'danger' : 'primary'}
                  isActionDisabled={isRunning || isStopping}
                  onPress={(canStop ? onPressStop : onPressRun)}
                />
  )
}

function WorkflowRunCard({
  actionLabel,
  actionVariant,
  isActionDisabled,
  onPress,
  subtitle,
  title,
}: {
  actionLabel: ReactNode
  actionVariant: 'danger' | 'primary'
  isActionDisabled: boolean
  subtitle?: ReactNode
  title: ReactNode
  onPress?(event:PressEvent): void
}) {
  return (
        <Button fullWidth
          className = 'h-30'
          size = 'lg'
          isDisabled={isActionDisabled}
          type="button"
          variant={actionVariant}
          onPress={onPress}
        >
          {title}<br/>
          {subtitle ? <small>{subtitle}</small> : null}<br/>
          {actionLabel}
        </Button>
  )
}