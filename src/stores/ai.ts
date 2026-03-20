import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { aiService } from '@/services/aiService'
import type { AIDecision, DecisionRequest, DecisionSummary, DemoStep } from '@/types/ai'
import type { AiMode } from '@/services/aiService'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useAiStore = defineStore('ai', () => {
  const loading = ref(false)
  const error = ref('')
  const modelVersion = ref('-')
  const lastUpdated = ref('')
  const decisions = ref<AIDecision[]>([])
  const summary = ref<DecisionSummary>({
    highRiskCount: 0,
    actionCount: 0,
    affectedPopulation: '-',
  })

  const demoRunning = ref(false)
  const currentMode = ref<AiMode>(aiService.defaultMode)
  const demoSteps = ref<DemoStep[]>([
    { key: 'discover', label: '风险发现', detail: '识别异常点位与触发阈值', status: 'pending' },
    { key: 'generate', label: '决策生成', detail: '生成结构化行动建议', status: 'pending' },
    { key: 'feedback', label: '执行回填', detail: '更新执行状态并归档', status: 'pending' },
  ])

  const mode = computed(() => currentMode.value)

  const toggleMode = () => {
    currentMode.value = currentMode.value === 'mock' ? 'real' : 'mock'
  }

  const setDemoStep = (key: DemoStep['key'], status: DemoStep['status']) => {
    const target = demoSteps.value.find((step) => step.key === key)
    if (!target) return
    target.status = status
  }

  const resetDemoSteps = () => {
    demoSteps.value.forEach((step) => {
      step.status = 'pending'
    })
  }

  const refreshDecision = async (req: DecisionRequest) => {
    loading.value = true
    error.value = ''
    try {
      const data = await aiService.getDecision(req, currentMode.value)
      modelVersion.value = data.modelVersion
      lastUpdated.value = new Date(data.generatedAt).toLocaleString('zh-CN')
      summary.value = data.summary
      decisions.value = data.decisions
    } catch (err: any) {
      error.value = err?.message || '生成决策失败'
    } finally {
      loading.value = false
    }
  }

  const markExecuted = (id: number) => {
    const target = decisions.value.find((item) => item.id === id)
    if (!target) return
    target.status = '已执行'
  }

  const markReview = (id: number) => {
    const target = decisions.value.find((item) => item.id === id)
    if (!target) return
    target.status = '人工复核'
  }

  const runDemoScript = async (req: DecisionRequest) => {
    if (demoRunning.value) return
    demoRunning.value = true
    resetDemoSteps()

    setDemoStep('discover', 'running')
    await wait(650)
    setDemoStep('discover', 'done')

    setDemoStep('generate', 'running')
    await refreshDecision(req)
    await wait(500)
    setDemoStep('generate', 'done')

    setDemoStep('feedback', 'running')
    if (decisions.value[0]) {
      markExecuted(decisions.value[0].id)
    }
    await wait(550)
    setDemoStep('feedback', 'done')

    demoRunning.value = false
  }

  return {
    mode,
    toggleMode,
    loading,
    error,
    modelVersion,
    lastUpdated,
    summary,
    decisions,
    demoRunning,
    demoSteps,
    refreshDecision,
    markExecuted,
    markReview,
    runDemoScript,
  }
})
