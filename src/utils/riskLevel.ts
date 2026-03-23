export type CanonicalRiskLevel = '极高' | '高' | '中' | '低' | '未知'

export const normalizeRiskLevel = (level?: string): CanonicalRiskLevel => {
  if (!level) return '未知'
  const normalized = level.trim().toLowerCase()
  if (normalized.includes('极高风险') || normalized.includes('danger')) return '极高'
  if (normalized === '高风险' || normalized.includes('warning')) return '高'
  if (normalized === '中风险' || normalized.includes('medium')) return '中'
  if (normalized === '低风险' || normalized.includes('safe')) return '低'
  return '未知'
}

export const getRiskLevelColor = (level?: string) => {
  const normalized = normalizeRiskLevel(level)
  if (normalized === '极高') return '#FF0000'
  if (normalized === '高') return '#FF4500'
  if (normalized === '中') return '#FFD700'
  if (normalized === '低') return '#00FF00'
  return '#9bb3c8'
}

export const getRiskLevelLabel = (level?: string) => {
  const normalized = normalizeRiskLevel(level)
  if (normalized === '未知') return '未知'
  return `${normalized}风险`
}

export const getRiskLevelClass = (level?: string) => {
  const normalized = normalizeRiskLevel(level)
  if (normalized === '极高') return 'danger'
  if (normalized === '高') return 'warning'
  if (normalized === '中') return 'medium'
  if (normalized === '低') return 'safe'
  return 'unknown'
}
