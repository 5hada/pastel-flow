export function SettingsDetailItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="detail-item settings-detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
