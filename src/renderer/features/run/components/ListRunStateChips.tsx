import { Chip } from "@heroui/react"
import { RunStatus } from "../../../../shared/runStatus"
import { getTaskStatusLabel } from "../../../shared/utils/viewLabels"

const statusChipColor = {
  failed: 'danger',
  idle: 'default',
  running: 'warning',
  succeeded: 'success',
} as const


export function ListRunStateChips({
  currentStatus,
  isListMode,
  isRestricted,
}: {
  currentStatus:RunStatus
  isListMode:boolean
  isRestricted:boolean
}) {
  return(
    <div className=''>
      {isListMode && isRestricted ? (
        <Chip className='px-2' color="warning" size="sm" variant="soft">제한됨</Chip>
      ) : null}
      {isListMode ? (
        <Chip
          className='items-center'
          color={statusChipColor[currentStatus]}
          size="sm"
          variant="soft"
        >
          {getTaskStatusLabel(currentStatus)}
         </Chip>
      ) : null}
    </div>  
    )
}