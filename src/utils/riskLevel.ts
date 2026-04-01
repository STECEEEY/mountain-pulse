export type CanonicalRiskLevel = '极高' | '高' | '中' | '低' | '未知'

export const RISK_LEVEL_CLASS_COLORS = {
  danger: '#F44336',
  warning: '#FF9800',
  medium: '#FFEE58',
  safe: '#81C784',
  unknown: '#9bb3c8',
} as const

export const normalizeRiskLevel = (level?: string): CanonicalRiskLevel => {
  if (!level) return '未知'
  const normalized = level.trim().toLowerCase()
  if (normalized.includes('极高') || normalized.includes('danger') || normalized.includes('critical')) return '极高'
  if (normalized === '高风险' || normalized === '高' || normalized.includes('warning') || normalized.includes('high')) return '高'
  if (normalized === '中风险' || normalized === '中' || normalized.includes('medium') || normalized.includes('moderate')) return '中'
  if (normalized === '低风险' || normalized === '低' || normalized.includes('safe') || normalized.includes('low')) return '低'
  return '未知'
}

export const getRiskLevelColor = (level?: string) => {
  const normalized = normalizeRiskLevel(level)
  if (normalized === '极高') return RISK_LEVEL_CLASS_COLORS.danger
  if (normalized === '高') return RISK_LEVEL_CLASS_COLORS.warning
  if (normalized === '中') return RISK_LEVEL_CLASS_COLORS.medium
  if (normalized === '低') return RISK_LEVEL_CLASS_COLORS.safe
  return RISK_LEVEL_CLASS_COLORS.unknown
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

export const getRiskLevelColorByClass = (levelClass?: string) => {
  if (levelClass === 'danger') return RISK_LEVEL_CLASS_COLORS.danger
  if (levelClass === 'warning') return RISK_LEVEL_CLASS_COLORS.warning
  if (levelClass === 'medium') return RISK_LEVEL_CLASS_COLORS.medium
  if (levelClass === 'safe') return RISK_LEVEL_CLASS_COLORS.safe
  return RISK_LEVEL_CLASS_COLORS.unknown
}

export const createMapboxRiskLevelColorExpression = (field = 'levelClass') => {
  return [
    'match',
    ['get', field],
    'danger', RISK_LEVEL_CLASS_COLORS.danger,
    'warning', RISK_LEVEL_CLASS_COLORS.warning,
    'medium', RISK_LEVEL_CLASS_COLORS.medium,
    'safe', RISK_LEVEL_CLASS_COLORS.safe,
    RISK_LEVEL_CLASS_COLORS.safe,
  ]
}
