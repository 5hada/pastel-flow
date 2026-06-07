import { AlertDialog, Button, PressEvent } from "@heroui/react"


export function AlertDialogButton({
  cancelText,
  confirmText,
  buttonText,
  dialogDescription,
  dialogHead,
  isDisabled,
  status,
  variant,
  onPress,
}: {
  buttonText?: string
  cancelText?: string
  confirmText?: string
  dialogDescription?: string
  dialogHead?: string
  isDisabled?: boolean
  status?:  "accent" | "success" | "warning" | "danger" 
  variant?:'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger'
  onPress?(event: PressEvent): void
}) {
  return(
    <AlertDialog>
      <Button variant={(variant) ? variant : 'danger'} isDisabled={isDisabled}>{(buttonText) ? buttonText : '삭제'}</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status={status} />
              <AlertDialog.Heading>{(dialogHead) ? dialogHead : '정말로 삭제하시겠습니까?'}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                {(dialogDescription) ? dialogDescription : '이 작업은 되돌릴 수 없습니다.'}
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                {(cancelText) ? cancelText : '취소'}
              </Button>
              <Button
                slot="close"
                variant={(status === "danger" || status === undefined) ? "danger" : "primary"}
                onPress={onPress}
              >
                {(confirmText) ? confirmText : '삭제'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}