export type DecisionLevel = 'danger' | 'warning' | 'medium' | 'safe'
export type DecisionStatus = '待执行' | '已执行' | '人工复核'

export interface FeatureContribution {
  featureName: string
  currentValue: number
  contribution: number
  trend: 'up' | 'down' | 'neutral'
}

export interface ThresholdHit {
  ruleName: string
  currentValue: number
  threshold: number
  unit: string
  status: 'hit' | 'near' | 'normal'
}

export interface DataTimeWindow {
  startAt: string
  endAt: string
  step: string
  source: string
}

export interface ModelExplanation {
  featureContributions: FeatureContribution[]
  thresholdHits: ThresholdHit[]
  dataTimeWindow: DataTimeWindow
}

export interface AIDecision {
  id: number
  title: string
  level: DecisionLevel
  confidence: number
  window: string
  action: string
  target: string
  status: DecisionStatus
  explanation: ModelExplanation
}

export interface DecisionSummary {
  highRiskCount: number
  actionCount: number
  affectedPopulation: string
}

export interface DecisionRequest {
  pointName?: string
  lng?: number
  lat?: number
  dutyNote: string
  scene?: 'dashboard' | 'workspace'
}

export interface DecisionResponse {
  modelVersion: string
  generatedAt: string
  summary: DecisionSummary
  decisions: AIDecision[]
}

export interface DemoStep {
  key: 'discover' | 'generate' | 'feedback'
  label: string
  detail: string
  status: 'pending' | 'running' | 'done'
}
