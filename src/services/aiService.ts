import { httpClient } from './httpClient'
import type { AIDecision, DecisionRequest, DecisionResponse } from '@/types/ai'

export type AiMode = 'mock' | 'real'

const aiMode = (import.meta.env.VITE_AI_MODE || 'mock').toLowerCase() as AiMode
const enableFallbackMock = (import.meta.env.VITE_AI_FALLBACK_MOCK || 'true').toLowerCase() !== 'false'

const nowISO = () => new Date().toISOString()

const buildMockDecisions = (req: DecisionRequest): AIDecision[] => {
  const titlePrefix = req.pointName || '重点监测点'
  const rainFlag = req.dutyNote.includes('降雨') || req.dutyNote.includes('雨')

  return [
    {
      id: 1,
      title: `${titlePrefix}应急处置`,
      level: 'danger',
      confidence: rainFlag ? 93 : 86,
      window: '建议时间窗：未来6小时',
      action: rainFlag
        ? '启动二级响应，先行转移脆弱人群并布设夜间值守'
        : '保持一级巡检，重点核查裂缝扩展趋势',
      target: '街道应急办、教育条线、交警中队',
      status: '待执行',
      explanation: {
        featureContributions: [
          { featureName: 'InSAR位移速率', currentValue: 25.6, contribution: 0.37, trend: 'up' },
          { featureName: '24h降雨量', currentValue: 38, contribution: 0.29, trend: 'up' },
          { featureName: '人口暴露指数', currentValue: 0.78, contribution: 0.21, trend: 'up' },
          { featureName: '坡体稳定系数', currentValue: 0.44, contribution: 0.13, trend: 'down' },
        ],
        thresholdHits: [
          { ruleName: '降雨触发阈值', currentValue: 38, threshold: 30, unit: 'mm', status: 'hit' },
          { ruleName: '形变黄色阈值', currentValue: 25.6, threshold: 20, unit: 'mm', status: 'hit' },
          { ruleName: '相干性下限', currentValue: 0.45, threshold: 0.4, unit: '', status: 'near' },
        ],
        dataTimeWindow: {
          startAt: '2026-03-13 00:00',
          endAt: '2026-03-20 08:00',
          step: '1h',
          source: 'InSAR + 雨量站 + 风险库',
        },
      },
    },
    {
      id: 2,
      title: '宝华山崩塌点巡检加密',
      level: 'warning',
      confidence: 84,
      window: '建议时间窗：未来24小时',
      action: '增加无人机巡检频次至每4小时一次',
      target: '区自然资源局监测组',
      status: '待执行',
      explanation: {
        featureContributions: [
          { featureName: '形变加速度', currentValue: 1.42, contribution: 0.41, trend: 'up' },
          { featureName: '历史灾害相似度', currentValue: 0.81, contribution: 0.33, trend: 'up' },
          { featureName: '道路暴露半径', currentValue: 1.2, contribution: 0.26, trend: 'up' },
        ],
        thresholdHits: [
          { ruleName: '风险提升阈值', currentValue: 0.81, threshold: 0.75, unit: '', status: 'hit' },
          { ruleName: '形变增速阈值', currentValue: 1.42, threshold: 1.2, unit: 'x', status: 'hit' },
        ],
        dataTimeWindow: {
          startAt: '2026-03-01 00:00',
          endAt: '2026-03-20 08:00',
          step: '12h',
          source: 'InSAR时序 + 历史事件库',
        },
      },
    },
  ]
}

const buildMockResponse = (req: DecisionRequest): DecisionResponse => {
  const decisions = buildMockDecisions(req)
  return {
    modelVersion: 'xgboost-lstm-1.3.2',
    generatedAt: nowISO(),
    summary: {
      highRiskCount: decisions.filter((item) => item.level === 'danger').length,
      actionCount: decisions.length,
      affectedPopulation: '2080人',
    },
    decisions,
  }
}

const normalizeResponse = (payload: any): DecisionResponse => {
  return {
    modelVersion: payload.modelVersion || payload.model_version || 'unknown',
    generatedAt: payload.generatedAt || payload.generated_at || nowISO(),
    summary: payload.summary,
    decisions: payload.decisions,
  }
}

export const aiService = {
  defaultMode: aiMode,
  async getDecision(req: DecisionRequest, mode: AiMode = aiMode): Promise<DecisionResponse> {
    if (mode !== 'real') {
      return buildMockResponse(req)
    }

    try {
      const res = await httpClient.post('/ai/decision', req)
      return normalizeResponse(res.data)
    } catch (error) {
      if (enableFallbackMock) {
        return buildMockResponse(req)
      }
      throw error
    }
  },
}
