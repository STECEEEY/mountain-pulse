import { defineStore } from 'pinia'
import { ref } from 'vue'
import aiService, { type DecisionRequest, type DecisionItem } from '@/services/aiService'

export const useAiStore = defineStore('ai', () => {
  // State
  const mode = ref<'real' | 'mock'>('real')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const modelVersion = ref('qwen-plus')
  const lastUpdated = ref<string | null>(null)
  const summary = ref({
    highRiskCount: 0,
    actionCount: 0,
    affectedPopulation: 0
  })
  const decisions = ref<DecisionItem[]>([])
  const demoRunning = ref(false)
  const demoSteps = ref([
    { key: 'fetch', label: '数据获取', detail: '等待执行', status: 'pending' },
    { key: 'analyze', label: 'AI分析', detail: '等待执行', status: 'pending' },
    { key: 'decision', label: '决策生成', detail: '等待执行', status: 'pending' },
    { key: 'notify', label: '通知下发', detail: '等待执行', status: 'pending' }
  ])

  // Actions
  const refreshDecision = async (request: DecisionRequest) => {
    loading.value = true
    error.value = null
    
    try {
      let result: DecisionItem[]
      
      if (mode.value === 'real') {
        // 使用真实AI服务
        result = await aiService.generateDecision(request)
        modelVersion.value = 'qwen-plus'
      } else {
        // 使用模拟数据
        result = await aiService.generateDecision(request)
        modelVersion.value = '模拟模型'
      }
      
      decisions.value = result
      lastUpdated.value = new Date().toLocaleString()
      
      // 更新摘要信息
      summary.value = {
        highRiskCount: result.filter(d => d.level === 'danger').length,
        actionCount: result.length,
        affectedPopulation: result.reduce((sum, d) => {
          // 简单模拟影响人口
          if (d.title.includes('转移')) return sum + 1250
          if (d.title.includes('资源')) return sum + 800
          return sum + 500
        }, 0)
      }
      
    } catch (err: any) {
      error.value = err.message || '决策生成失败'
      console.error('刷新决策失败:', err)
    } finally {
      loading.value = false
    }
  }
  
  const toggleMode = () => {
    mode.value = mode.value === 'real' ? 'mock' : 'real'
  }
  
  const markExecuted = (id: number) => {
    const decision = decisions.value.find(d => d.id === id)
    if (decision) {
      decision.status = '已执行'
    }
  }
  
  const markReview = (id: number) => {
    const decision = decisions.value.find(d => d.id === id)
    if (decision) {
      decision.status = '待复核'
    }
  }
  
  const runDemoScript = async (request: DecisionRequest) => {
    demoRunning.value = true
    
    const updateStep = (key: string, status: string, detail: string) => {
      const step = demoSteps.value.find(s => s.key === key)
      if (step) {
        step.status = status
        step.detail = detail
      }
    }
    
    try {
      // 步骤1: 数据获取
      updateStep('fetch', 'running', '正在获取监测数据...')
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateStep('fetch', 'done', '获取完成: 降雨量38mm, 裂缝变形率3.2mm/天')
      
      // 步骤2: AI分析
      updateStep('analyze', 'running', '调用通义千问进行风险分析...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      updateStep('analyze', 'done', '分析完成: 识别出2个高风险点')
      
      // 步骤3: 决策生成
      updateStep('decision', 'running', '生成应急决策方案...')
      await refreshDecision(request)
      await new Promise(resolve => setTimeout(resolve, 1500))
      updateStep('decision', 'done', `生成${decisions.value.length}条决策建议`)
      
      // 步骤4: 通知下发
      updateStep('notify', 'running', '通过短信、APP推送通知...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      updateStep('notify', 'done', '已通知相关责任人')
      
    } catch (error) {
      updateStep('fetch', 'error', '执行失败')
    } finally {
      demoRunning.value = false
    }
  }
  
  return {
    mode,
    loading,
    error,
    modelVersion,
    lastUpdated,
    summary,
    decisions,
    demoRunning,
    demoSteps,
    refreshDecision,
    toggleMode,
    markExecuted,
    markReview,
    runDemoScript
  }
})