import { httpClient } from './httpClient'
import type { AIDecision, DecisionRequest, DecisionResponse, DecisionLevel } from '@/types/ai'

export type AiMode = 'mock' | 'real'

const aiMode = (import.meta.env.VITE_AI_MODE || 'mock').toLowerCase() as AiMode
const enableFallbackMock = (import.meta.env.VITE_AI_FALLBACK_MOCK || 'true').toLowerCase() !== 'false'

const nowISO = () => new Date().toISOString()

// 阿里云百炼 API 配置
const DASHSCOPE_API_KEY = 'sk-35342788c99143de9769dc63f0fb5bf4'

// 构建决策 prompt
const buildDecisionPrompt = (req: DecisionRequest): string => {
  // 使用可选链和默认值，避免类型错误
  const pointName = (req as any).pointName || req.pointName || '未知'
  const dutyNote = (req as any).dutyNote || req.dutyNote || '无'
  const affectedPopulation = (req as any).affectedPopulation || '待评估'
  
  return `你是一位地质灾害应急专家。请根据以下数据给出决策建议：

【风险点信息】
- 风险点名称：${pointName}
- 巡查员反馈：${dutyNote}
- 影响人口：${affectedPopulation}

请按以下 JSON 格式输出，只输出 JSON，不要有其他文字：
{
  "riskLevel": "高/中/低",
  "mainThreat": "主要威胁描述",
  "actions": ["行动1", "行动2", "行动3"],
  "warning": "预警建议",
  "confidence": 85
}`
}

// 直接调用阿里云百炼 API
const callQwenDirectly = async (prompt: string): Promise<any> => {
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen3.5-flash',
      input: {
        messages: [{ role: 'user', content: prompt }]
      },
      parameters: {
        result_format: 'message',
        temperature: 0.6
      }
    })
  })
  
  const data = await response.json()
  const content = data.output.choices[0].message.content
  
  // 尝试解析 JSON
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(content)
  } catch {
    return {
      riskLevel: "中",
      mainThreat: content,
      actions: ["加强监测", "加密巡查"],
      warning: "持续关注",
      confidence: 70
    }
  }
}

// Mock 数据
const buildMockDecisions = (req: DecisionRequest): AIDecision[] => {
  const titlePrefix = (req as any).pointName || req.pointName || '重点监测点'
  const dutyNote = (req as any).dutyNote || req.dutyNote || ''
  const rainFlag = dutyNote.includes('降雨') || dutyNote.includes('雨')

  return [
    {
      id: Date.now(),
      title: `${titlePrefix}应急处置`,
      level: (rainFlag ? 'danger' : 'warning') as DecisionLevel,
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
        ],
        dataTimeWindow: {
          startAt: '2026-03-13 00:00',
          endAt: '2026-03-20 08:00',
          step: '1h',
          source: 'InSAR + 雨量站 + 风险库',
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

// 转换风险等级为 DecisionLevel 类型
const mapRiskLevelToDecisionLevel = (riskLevel: string): DecisionLevel => {
  if (riskLevel === '高') return 'danger'
  if (riskLevel === '中') return 'warning'
  return 'info'  // info 是有效的 DecisionLevel
}

// 真实调用
const getRealDecision = async (req: DecisionRequest): Promise<DecisionResponse> => {
  const prompt = buildDecisionPrompt(req)
  const aiResult = await callQwenDirectly(prompt)
  
  const level = mapRiskLevelToDecisionLevel(aiResult.riskLevel || '中')
  
  return {
    modelVersion: 'qwen3.5-flash',
    generatedAt: nowISO(),
    summary: {
      highRiskCount: aiResult.riskLevel === '高' ? 1 : 0,
      actionCount: aiResult.actions?.length || 1,
      affectedPopulation: (req as any).affectedPopulation || '待评估'
    },
    decisions: [{
      id: Date.now(),
      title: `${(req as any).pointName || req.pointName || '风险点'}应急处置`,
      level: level,
      confidence: aiResult.confidence || 85,
      window: '建议时间窗：未来6小时',
      action: aiResult.actions?.join('；') || aiResult.mainThreat || '加强监测',
      target: '街道应急办',
      status: '待执行',
      explanation: {
        featureContributions: [],
        thresholdHits: [],
        dataTimeWindow: {
          startAt: nowISO(),
          endAt: nowISO(),
          step: '1h',
          source: 'AI 实时分析（通义千问）'
        }
      }
    }]
  }
}

export const aiService = {
  defaultMode: aiMode,
  async getDecision(req: DecisionRequest, mode: AiMode = aiMode): Promise<DecisionResponse> {
    if (mode !== 'real') {
      return buildMockResponse(req)
    }

    try {
      return await getRealDecision(req)
    } catch (error) {
      console.error('AI 调用失败，使用降级方案:', error)
      if (enableFallbackMock) {
        return buildMockResponse(req)
      }
      throw error
    }
  },
}