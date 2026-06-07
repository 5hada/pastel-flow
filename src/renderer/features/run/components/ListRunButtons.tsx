import { Button, PressEvent } from "@heroui/react"

export function ListRunButtons({
  canStop,
  isListMode,
  isRunning,
  isSelected,
  isStopping,
  onPressEdit,
  onPressRun,
  onPressStop
}: {
  canStop: boolean
  isListMode: boolean
  isRunning: boolean
  isSelected: boolean
  isStopping: boolean
  onPressEdit(event: PressEvent): void
  onPressRun(event: PressEvent): void
  onPressStop(event: PressEvent): void
}) {
  return(
                    <div className='grid grid-rows-2 space-y-4 justify-end-safe'>
                  <Button
                    className='px-6'
                    variant={isSelected ? 'secondary' : 'ghost'}
                    type="button"
                    onPress={onPressEdit}
                  >
                    수정
                  </Button>
                  {isListMode ? (
                    <Button
                      className='px-6'
                      type="button"
                      variant={canStop || isStopping ? 'danger' : 'primary'}
                      isDisabled={isRunning || isStopping}
                      onPress={(canStop ?onPressStop : onPressRun)}
                    >
                      {isStopping
                        ? '중지 중'
                        : canStop
                          ? '중지'
                          : isRunning
                            ? '실행 중'
                            : '실행'}
                    </Button>
                  ) : null}
                </div>
  )
}