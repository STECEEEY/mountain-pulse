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
  console.log('环境:', import.meta.env.MODE)
  
  if (!this.apiKey || this.apiKey === 'YOUR_DASHSCOPE_API_KEY') {
    console.warn('⚠️ 未配置阿里云 API Key，使用模拟数据模式')
    return this.getMockDecisions(request)
  }

  console.log('✅ 使用真实阿里云 AI 服务')
  
  try {
    // 判断环境
    const isDev = import.meta.env.DEV
    let apiUrl, requestData, requestHeaders
    
    if (isDev) {
      // 开发环境：使用 Vite 代理
      apiUrl = '/aliyun/api/v1/services/aigc/text-generation/generation'
      requestData = {
        model: 'qwen-plus',
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个地质灾害智能决策分析专家。只输出 JSON 数组格式。'
            },
            {
              role: 'user',
              content: this.buildPrompt(request)
            }
          ]
        },
        parameters: {
          result_format: 'message',
          temperature: 0.7
        }
      }
      requestHeaders = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    } else {
      // 生产环境：使用 Vercel Serverless Function
      apiUrl = '/api/aliyun'  // ← 这里是关键！改为 /api/aliyun
      requestData = {
        apiKey: this.apiKey,
        payload: {
          model: 'qwen-plus',
          input: {
            messages: [
              {
                role: 'system',
                content: '你是一个地质灾害智能决策分析专家。只输出 JSON 数组格式。'
              },
              {
                role: 'user',
                content: this.buildPrompt(request)
              }
            ]
          },
          parameters: {
            result_format: 'message',
            temperature: 0.7
          }
        }
      }
      requestHeaders = {
        'Content-Type': 'application/json'
      }
    }
    
    console.log('API URL:', apiUrl)
    console.log('请求数据:', requestData)
    
    const response = await axios.post(apiUrl, requestData, {
      headers: requestHeaders,
      timeout: 30000
    })
    
    console.log('✅ API 调用成功')
    
    // 解析响应
    let aiResponse
    if (isDev) {
      aiResponse = response.data.output.choices[0].message.content
    } else {
      aiResponse = response.data.output.choices[0].message.content
    }
    
    console.log('AI 响应:', aiResponse)
    
    return this.parseAIResponse(aiResponse, request)
  } catch (error: any) {
    console.error('❌ AI 调用失败:', error.message)
    if (error.response) {
      console.error('状态码:', error.response.status)
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
    console.log('开始解析 AI 响应...')
    
    // 尝试提取 JSON 数组
    let jsonStr = aiResponse.trim()
    
    // 如果响应包含 markdown 代码块，提取其中的 JSON
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch && codeBlockMatch[1]) {
      jsonStr = codeBlockMatch[1]
    }
    
    // 查找 JSON 数组
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const rawDecisions = JSON.parse(jsonMatch[0])
      console.log('解析到的原始数据:', rawDecisions)
      
      if (Array.isArray(rawDecisions)) {
        // 将 AI 返回的格式转换为前端需要的格式
        const decisions = rawDecisions.map((d: any, index: number) => {
          // 根据 risk_level 映射 level
          let level: 'danger' | 'warning' | 'info' = 'info'
          if (d.risk_level === '高' || d.risk_level === '极高') {
            level = 'danger'
          } else if (d.risk_level === '中高' || d.risk_level === '中') {
            level = 'warning'
          }
          
          // 根据风险等级设置置信度
          let confidence = 70
          if (d.risk_level === '高') confidence = 85
          if (d.risk_level === '中高') confidence = 75
          if (d.risk_level === '中') confidence = 65
          
          // 提取建议中的关键信息
          const action = d.suggestion || '加强监测'
          const target = this.extractTarget(action)
          
          return {
            id: Date.now() + index,
            title: this.extractTitle(d.suggestion, d.risk_level),
            window: this.generateTimeWindow(),
            confidence: confidence,
            level: level,
            action: action,
            target: target,
            explanation: {
              featureContributions: this.extractFeatureContributionsFromAI(request.dutyNote, d.rationale),
              thresholdHits: this.extractThresholdHits(request.dutyNote, d.rationale),
              dataTimeWindow: {
                startAt: new Date(Date.now() - 24 * 3600000).toISOString(),
                endAt: new Date().toISOString(),
                step: '1小时',
                source: '实时监测 + 阿里云通义千问 AI 分析'
              }
            },
            status: '待执行'
          }
        })
        
        console.log('转换后的决策:', decisions)
        return decisions
      }
    }
  } catch (error) {
    console.error('解析 AI 响应失败:', error)
  }
  
  // 解析失败，返回模拟数据
  return this.getMockDecisions(request)
}

// 辅助方法：从建议中提取执行对象
private extractTarget(suggestion: string): string {
  if (suggestion.includes('疏散') || suggestion.includes('转移')) {
    return '应急办、社区居委会、抢险救援队'
  }
  if (suggestion.includes('监测') || suggestion.includes('布设')) {
    return '监测组、技术支撑单位'
  }
  if (suggestion.includes('气象') || suggestion.includes('预警')) {
    return '气象局、自然资源局'
  }
  if (suggestion.includes('核查') || suggestion.includes('台账')) {
    return '街道办事处、村委会'
  }
  if (suggestion.includes('专家') || suggestion.includes('勘查')) {
    return '地质调查院、专家团队'
  }
  return '相关责任单位'
}

// 辅助方法：提取标题
private extractTitle(suggestion: string, riskLevel: string): string {
  if (suggestion.length > 30) {
    return `${riskLevel}风险预警：${suggestion.substring(0, 30)}...`
  }
  return `${riskLevel}风险预警：${suggestion}`
}

// 辅助方法：从现场信息中提取特征贡献
private extractFeatureContributionsFromAI(dutyNote: string, rationale: string): Array<{
  featureName: string
  currentValue: string | number
  contribution: number
}> {
  const contributions: Array<{
    featureName: string
    currentValue: string | number
    contribution: number
  }> = []
  
  // 从 dutyNote 中提取实际数据
  if (dutyNote.includes('降雨') || dutyNote.includes('mm')) {
    const rainfallMatch = dutyNote.match(/(\d+(?:\.\d+)?)mm/)
    const rainfall = rainfallMatch && rainfallMatch[1] ? rainfallMatch[1] : '38'
    contributions.push({
      featureName: '降雨量',
      currentValue: `${rainfall}mm`,
      contribution: 0.55  // 提高权重
    })
  }
  
  if (dutyNote.includes('裂缝')) {
    const crackMatch = dutyNote.match(/裂缝[^\d]*(\d+(?:\.\d+)?)/)
    const crackRate = crackMatch && crackMatch[1] ? crackMatch[1] : '3.2'
    contributions.push({
      featureName: '裂缝变形速率',
      currentValue: `${crackRate}mm/天`,
      contribution: 0.45
    })
  }
  
  // 如果没有降雨数据，尝试从 rationale 中提取天气信息
  if (contributions.length === 0 && rationale.includes('雨')) {
    contributions.push({
      featureName: '降雨情况',
      currentValue: '持续降雨',
      contribution: 0.6
    })
  }
  
  return contributions
}

private extractThresholdHits(dutyNote: string, rationale: string): Array<{
  ruleName: string
  currentValue: number
  threshold: number
  unit: string
  status: 'hit' | 'near' | 'normal'
}> {
  const thresholdHits: Array<{
    ruleName: string
    currentValue: number
    threshold: number
    unit: string
    status: 'hit' | 'near' | 'normal'
  }> = []
  
  if (dutyNote.includes('降雨') || dutyNote.includes('mm')) {
    const rainfallMatch = dutyNote.match(/(\d+(?:\.\d+)?)mm/)
    const rainfall = rainfallMatch && rainfallMatch[1] ? parseFloat(rainfallMatch[1]) : 38
    
    thresholdHits.push({
      ruleName: '24小时降雨量阈值',
      currentValue: rainfall,
      threshold: 25,
      unit: 'mm',
      status: rainfall >= 25 ? 'hit' : 'normal'
    })
  }
  
  if (dutyNote.includes('裂缝')) {
    thresholdHits.push({
      ruleName: '裂缝变形速率阈值',
      currentValue: 3.2,
      threshold: 2,
      unit: 'mm/天',
      status: 'hit'
    })
  }
  
  return thresholdHits
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