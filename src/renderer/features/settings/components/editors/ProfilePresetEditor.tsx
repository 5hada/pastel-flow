import { Button } from '@heroui/react'
import type {
  AppSettings,
  BrowserProfilePreset,
} from '../../../../../shared/settings'
import {
  SelectField,
  TextInputField,
} from '../../../../shared/components/HeroForm'

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
    <section className="settings-nested-section" aria-label="사용자 지정 프로필">
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
            <div className="profile-preset-row" key={profile.id}>
              <TextInputField
                label="이름"
                name={`${profile.id}-name`}
                value={profile.name}
                onChange={(value) =>
                    updateProfile(index, {
                      ...profile,
                      name: value,
                    })
                }
              />
              <SelectField
                label="브라우저"
                selectedKey={profile.browserKind}
                options={(['chrome', 'edge', 'chromium'] as const).map(
                  (browserKind) => ({
                    value: browserKind,
                    label: getBrowserKindLabel(browserKind),
                    textValue: browserKind,
                  }),
                )}
                onChange={(browserKind) =>
                    updateProfile(index, {
                      ...profile,
                      browserKind,
                    })
                }
              />
              <TextInputField
                label="프로필 경로"
                name={`${profile.id}-path`}
                value={profile.profilePath}
                onChange={(value) =>
                    updateProfile(index, {
                      ...profile,
                      profilePath: value,
                    })
                }
              />
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
            </div>
          ))}
        </div>
      )}
    </section>
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
