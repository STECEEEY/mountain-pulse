import axios from 'axios'
import { aliyunConfig } from '../config/aliyun'

export interface DecisionRequest {
  pointName: string
  lng?: number
  lat?: number
  dutyNote: string
  scene: string
}

export interface DecisionItem {
  id: number
  title: string
  window: string
  confidence: number
  level: 'danger' | 'warning' | 'info'
  action: string
  target: string
  explanation: {
    featureContributions: Array<{
      featureName: string
      currentValue: string | number
      contribution: number
    }>
    thresholdHits: Array<{
      ruleName: string
      currentValue: number
      threshold: number
      unit: string
      status: 'hit' | 'near' | 'normal'
    }>
    dataTimeWindow: {
      startAt: string
      endAt: string
      step: string
      source: string
    }
  }
  status: string
}

class AIService {
  private apiKey: string

  constructor() {
    this.apiKey = aliyunConfig.dashscope.apiKey
  }

  /**
   * 调用通义千问API进行决策分析
   */
 async generateDecision(request: DecisionRequest): Promise<DecisionItem[]> {
  console.log('🔧 AI服务调用开始')
  console.log('📝 API Key:', this.apiKey?.substring(0, 10) + '...')
  
  // 检查是否有有效的 API Key
  if (!this.apiKey || this.apiKey === 'YOUR_DASHSCOPE_API_KEY') {
    console.warn('⚠️ 未配置阿里云 API Key，使用模拟数据模式')
    return this.getMockDecisions(request)
  }

  console.log('✅ 使用真实阿里云 AI 服务')
  
  try {
    // 使用 POST 方法，路径使用代理
    const response = await axios.post(
      '/aliyun/api/v1/services/aigc/text-generation/generation',
      {
        model: aliyunConfig.dashscope.model,
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个地质灾害智能决策分析专家。请根据输入信息，输出JSON格式的决策建议数组。不要有任何其他文字说明。'
            },
            {
              role: 'user',
              content: this.buildPrompt(request)
            }
          ]
        },
        parameters: {
          result_format: 'message',
          temperature: 0.7,
          top_p: 0.9
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )
    
    console.log('✅ API 调用成功')
    console.log('响应状态:', response.status)
    
    const aiResponse = response.data.output.choices[0].message.content
    console.log('AI 响应:', aiResponse)
    
    return this.parseAIResponse(aiResponse, request)
  } catch (error: any) {
    console.error('❌ AI 调用失败:', error.message)
    if (error.response) {
      console.error('错误状态:', error.response.status)
      console.error('错误数据:', error.response.data)
    }
    return this.getMockDecisions(request)
  }
}

  /**
   * 构建提示词
   */
  private buildPrompt(request: DecisionRequest): string {
    return `
监测点名称: ${request.pointName}
坐标: 经度=${request.lng || '未知'}, 纬度=${request.lat || '未知'}
现场信息: ${request.dutyNote}
场景: ${request.scene}

请基于以上信息，生成地质灾害风险决策建议。考虑以下因素：
1. 降雨量异常（如果提及）
2. 裂缝发育情况
3. 地形地貌特征
4. 历史灾害记录
5. 人口分布情况

请输出3-5个决策建议，按风险等级排序。
    `
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(aiResponse: string, request: DecisionRequest): DecisionItem[] {
    try {
      // 尝试提取JSON数组
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const decisions = JSON.parse(jsonMatch[0])
        return decisions.map((d: any, index: number) => ({
          ...d,
          id: Date.now() + index,
          window: this.generateTimeWindow(),
          status: d.status || '待执行',
          explanation: {
            ...d.explanation,
            dataTimeWindow: {
              startAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              endAt: new Date().toISOString(),
              step: '1小时',
              source: '实时监测',
              ...d.explanation?.dataTimeWindow
            }
          }
        }))
      }
    } catch (error) {
      console.error('解析AI响应失败:', error)
    }
    
    return this.getMockDecisions(request)
  }

  /**
   * 生成时间窗口
   */
  private generateTimeWindow(): string {
    const end = new Date()
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
    return `${start.toLocaleString()} 至 ${end.toLocaleString()}`
  }

  /**
   * 模拟数据（降级方案）
   */
  private getMockDecisions(request: DecisionRequest): DecisionItem[] {
    const hasRainfall = request.dutyNote.includes('降雨') || request.dutyNote.includes('mm')
    const hasCrack = request.dutyNote.includes('裂缝')
    
    return [
      {
        id: Date.now(),
        title: hasRainfall ? '持续降雨引发滑坡风险' : '边坡稳定性监测',
        window: this.generateTimeWindow(),
        confidence: hasRainfall ? 85 : 65,
        level: hasRainfall ? 'danger' : 'warning',
        action: hasRainfall ? '立即组织受影响区域人员转移' : '加强巡查监测频率',
        target: hasRainfall ? '汤山街道应急办、周边社区' : '监测组、巡查员',
        explanation: {
          featureContributions: [
            {
              featureName: '降雨量',
              currentValue: hasRainfall ? '38mm' : '12mm',
              contribution: hasRainfall ? 0.45 : 0.25
            },
            {
              featureName: '裂缝变形速率',
              currentValue: hasCrack ? '3.2mm/天' : '0.5mm/天',
              contribution: hasCrack ? 0.35 : 0.15
            },
            {
              featureName: '土壤含水率',
              currentValue: hasRainfall ? '32%' : '18%',
              contribution: hasRainfall ? 0.2 : 0.1
            }
          ],
          thresholdHits: [
            {
              ruleName: '降雨量阈值',
              currentValue: hasRainfall ? 38 : 12,
              threshold: 25,
              unit: 'mm',
              status: hasRainfall ? 'hit' : 'normal'
            },
            {
              ruleName: '裂缝变形速率',
              currentValue: hasCrack ? 3.2 : 0.5,
              threshold: 2,
              unit: 'mm/天',
              status: hasCrack ? 'hit' : 'normal'
            }
          ],
          dataTimeWindow: {
            startAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date().toISOString(),
            step: '1小时',
            source: '模拟数据'
          }
        },
        status: '待执行'
      },
      {
        id: Date.now() + 1,
        title: '应急处置资源调度',
        window: this.generateTimeWindow(),
        confidence: 78,
        level: 'warning',
        action: '预置应急物资到关键位置',
        target: '应急物资储备中心',
        explanation: {
          featureContributions: [
            {
              featureName: '人口密度',
              currentValue: '高',
              contribution: 0.4
            },
            {
              featureName: '交通可达性',
              currentValue: '中等',
              contribution: 0.3
            }
          ],
          thresholdHits: [],
          dataTimeWindow: {
            startAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endAt: new Date().toISOString(),
            step: '1小时',
            source: '模拟数据'
          }
        },
        status: '待执行'
      }
    ]
  }

  /**
   * 验证API Key是否有效
   */
  async validateApiKey(): Promise<boolean> {
    if (this.apiKey === 'YOUR_DASHSCOPE_API_KEY') {
      return false
    }
    
    try {
      // 发送一个简单的测试请求
      const response = await axios.post(
        aliyunConfig.dashscope.endpoint,
        {
          model: aliyunConfig.dashscope.model,
          input: {
            messages: [
              {
                role: 'user',
                content: 'test'
              }
            ]
          },
          parameters: {
            result_format: 'message'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      )
      
      return response.status === 200
    } catch (error) {
      console.error('API Key验证失败:', error)
      return false
    }
  }
}

export default new AIService()