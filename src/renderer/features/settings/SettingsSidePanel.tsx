import { Button } from "@heroui/react"
import { getSettingsIcon } from "../../shared/assets/icon"
import type { SettingsCategory } from "../../shared/state/taskFormState"

const settingsCategories: {
  id: SettingsCategory
  label: string
}[] = [
  { id: 'general', label: '일반' },
  { id: 'appearance', label: '모양' },
  { id: 'browser', label: '브라우저' },
  { id: 'shortcuts', label: '단축키' },
  { id: 'devices', label: '기기' },
  { id: 'secrets', label: 'Secret' },
  { id: 'sync', label: '동기화' },
  { id: 'events', label: '실행 이벤트' },
  { id: 'data', label: '데이터 관리' },
  { id: 'developer', label: '개발자' },
]

export function SettingsSidePanel({
    selectedCategory,
    onPress
}:{
    selectedCategory: SettingsCategory
    onPress(value: string): void
}) {
    return (
    <>
      {<div className='pt-14'></div>}
      {settingsCategories.map((category) => (
        <Button
        fullWidth
          className="sidebar-row"
          variant={
            selectedCategory === category.id ? 'secondary' : 'ghost'
          }
          key={category.id}
          type="button"
          onPress={() => onPress(category.id)}
        >
          <span aria-hidden="true">{getSettingsIcon(category.id)}</span>
          <strong>{category.label}</strong>
        </Button>
      ))}
    </>
    )
}