import { Button, Card, Input, ListBox, Select } from '@heroui/react'
import type {
  AppSettings,
  BrowserProfilePreset,
} from '../../../../shared/settings'

export type ProfilePresetEditorProps = {
  form: AppSettings
  onChange(value: AppSettings): void
}

export function ProfilePresetEditor({
  form,
  onChange,
}: ProfilePresetEditorProps) {
  function updateProfile(index: number, profile: BrowserProfilePreset) {
    onChange({
      ...form,
      browserProfilePresets: form.browserProfilePresets.map(
        (currentProfile, currentIndex) =>
          currentIndex === index ? profile : currentProfile,
      ),
    })
  }

  return (
    <Card className="settings-subsection" aria-label="사용자 지정 프로필">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Profiles</p>
          <h3>사용자 지정 프로필</h3>
        </div>
        <Button
          className="ghost-button"
          variant="ghost"
          type="button"
          onPress={() =>
            onChange({
              ...form,
              browserProfilePresets: [
                ...form.browserProfilePresets,
                {
                  id: `profile_${crypto.randomUUID()}`,
                  name: '',
                  browserKind: form.defaultBrowserKind,
                  profilePath: '',
                },
              ],
            })
          }
        >
          프로필 추가
        </Button>
      </div>
      {form.browserProfilePresets.length === 0 ? (
        <p className="muted-text">등록된 사용자 지정 프로필이 없습니다.</p>
      ) : (
        <div className="profile-preset-list">
          {form.browserProfilePresets.map((profile, index) => (
            <Card className="profile-preset-row" key={profile.id}>
              <label>
                이름
                <Input
                  value={profile.name}
                  onChange={(event) =>
                    updateProfile(index, {
                      ...profile,
                      name: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                브라우저
                <Select
                  selectedKey={profile.browserKind}
                  onSelectionChange={(key) =>
                    updateProfile(index, {
                      ...profile,
                      browserKind: String(key) as typeof profile.browserKind,
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
              <label>
                프로필 경로
                <Input
                  value={profile.profilePath}
                  onChange={(event) =>
                    updateProfile(index, {
                      ...profile,
                      profilePath: event.target.value,
                    })
                  }
                />
              </label>
              <Button
                className="danger-button"
                variant="danger"
                type="button"
                onPress={() =>
                  onChange({
                    ...form,
                    browserProfilePresets: form.browserProfilePresets.filter(
                      (_profile, currentIndex) => currentIndex !== index,
                    ),
                  })
                }
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

function getBrowserKindLabel(browserKind: BrowserProfilePreset['browserKind']) {
  if (browserKind === 'chrome') {
    return 'Chrome'
  }

  if (browserKind === 'edge') {
    return 'Edge'
  }

  return 'Chromium'
}
