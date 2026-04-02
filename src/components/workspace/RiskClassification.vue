<template>
  <div class="warning-module">
    <!-- 预警指数仪表 -->
    <div class="warning-gauge">
      <div class="gauge-container">
        <div class="gauge-ring" :class="warningLevel">
          <div class="gauge-inner">
            <span class="gauge-value">{{ warningScore }}</span>
            <span class="gauge-unit">分</span>
          </div>
        </div>
        <div class="gauge-title">综合预警指数</div>
        <div class="gauge-badge">{{ warningLevelText }}</div>
      </div>
      
      <!-- 影响因素 -->
      <div class="factors-list">
        <div v-for="factor in factors" :key="factor.name" class="factor-item">
          <div class="factor-header">
            <span class="factor-name">{{ factor.icon }} {{ factor.name }}</span>
            <span class="factor-value">{{ factor.value }}%</span>
          </div>
          <el-progress 
            :percentage="factor.value" 
            :stroke-width="4"
            :color="factor.color"
            :show-text="false"
          />
        </div>
      </div>
    </div>

    <!-- AI 预警建议 -->
    <div class="ai-suggestion" v-if="aiSuggestion">
      <div class="suggestion-header">
        <el-icon><Cpu /></el-icon>
        <span>AI 预警建议</span>
        <el-tag size="small" type="info">通义千问</el-tag>
      </div>
      <div class="suggestion-content">
        {{ aiSuggestion }}
      </div>
      <div class="suggestion-footer">
        置信度: {{ aiConfidence }}% | 基于 {{ factorCount }} 项监测数据
      </div>
    </div>

    <!-- 承灾体信息 -->
    <div class="exposure-info">
      <div class="info-title">
        <el-icon><Warning /></el-icon>
        影响范围
      </div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">威胁人口</span>
          <span class="info-value">{{ population }}人</span>
        </div>
        <div class="info-item">
          <span class="info-label">形变速率</span>
          <span class="info-value">{{ deformationRate }} mm/d</span>
        </div>
        <div class="info-item">
          <span class="info-label">地质稳定性</span>
          <span class="info-value">{{ stability }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">预警等级</span>
          <span class="info-value" :class="warningLevel">{{ warningLevelText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { Cpu, Warning } from '@element-plus/icons-vue'
import { useAiStore } from '@/stores/ai'
import type { DecisionRequest } from '@/services/aiService'

const props = defineProps<{
  point: {
    id?: number
    name?: string
    lng?: number
    lat?: number
    velocity?: number
    slope?: number
    threat?: string
    actual_population?: number
    level?: string
    geology?: {
      stability?: string
    }
  } | null
}>()

const aiStore = useAiStore()

// 基础数据
const deformationRate = ref(0)
const population = ref(0)
const stability = ref('稳定')
const slope = ref(0)

// 加载数据
const loadData = () => {
  if (!props.point) return
  
  deformationRate.value = props.point.velocity || 0
  slope.value = props.point.slope || 0
  stability.value = props.point.geology?.stability || '稳定'
  
  // 解析威胁人口
  if (props.point.actual_population) {
    population.value = props.point.actual_population
  } else if (props.point.threat) {
    const match = props.point.threat.match(/\d+/)
    population.value = match ? parseInt(match[0]) : 0
  }
}

// 计算预警分数
const warningScore = computed(() => {
  // 形变速率影响 (0-40分)
  let deformationScore = 0
  if (deformationRate.value > 10) deformationScore = 40
  else if (deformationRate.value > 5) deformationScore = 30
  else if (deformationRate.value > 1) deformationScore = 20
  else if (deformationRate.value > 0.1) deformationScore = 10
  
  // 坡度影响 (0-30分)
  let slopeScore = 0
  if (slope.value > 45) slopeScore = 30
  else if (slope.value > 30) slopeScore = 20
  else if (slope.value > 15) slopeScore = 10
  
  // 稳定性影响 (0-20分)
  let stabilityScore = 0
  if (stability.value === '不稳定') stabilityScore = 20
  else if (stability.value === '较不稳定') stabilityScore = 15
  else if (stability.value === '基本稳定') stabilityScore = 8
  
  // 人口影响 (0-10分)
  let populationScore = 0
  if (population.value > 500) populationScore = 10
  else if (population.value > 100) populationScore = 5
  
  return deformationScore + slopeScore + stabilityScore + populationScore
})

// 预警等级
const warningLevel = computed(() => {
  const score = warningScore.value
  if (score >= 70) return 'critical'
  if (score >= 50) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
})

const warningLevelText = computed(() => {
  const map = {
    critical: '红色预警',
    high: '橙色预警',
    medium: '黄色预警',
    low: '蓝色预警'
  }
  return map[warningLevel.value]
})

// 影响因素列表
const factors = computed(() => [
  { name: '形变速率', icon: '📈', value: Math.min(40, deformationRate.value * 4), color: '#f59e0b' },
  { name: '地形坡度', icon: '⛰️', value: Math.min(30, slope.value * 0.67), color: '#3b82f6' },
  { name: '地质条件', icon: '🪨', value: stability.value === '不稳定' ? 20 : stability.value === '较不稳定' ? 15 : 8, color: '#8b5cf6' },
  { name: '人口暴露', icon: '👥', value: Math.min(10, population.value / 50), color: '#ec489a' }
])

// AI 建议
const aiSuggestion = ref('')
const aiConfidence = ref(0)
const factorCount = computed(() => factors.value.length)

// 调用 AI 获取建议
const callAI = async () => {
  if (!props.point) return
  
  // 构建提示词
  const dutyNote = `监测点: ${props.point.name}，形变速率${deformationRate.value}mm/d，坡度${slope.value}°，地质${stability.value}，威胁人口${population.value}人`
  
  const request: DecisionRequest = {
    pointName: props.point.name || '未知点位',
    lng: props.point.lng,
    lat: props.point.lat,
    dutyNote: dutyNote,
    scene: '地质灾害预警评估',
    userRole: 'analyst',
    userRoleLevel: 3
  }
  
  await aiStore.refreshDecision(request)
  
  const decisions = aiStore.decisions
  if (decisions && Array.isArray(decisions) && decisions.length > 0) {
    const firstDecision = decisions[0]
    // 使用可选链和空值合并运算符
    aiSuggestion.value = firstDecision?.action || getFallbackSuggestion()
    aiConfidence.value = firstDecision?.confidence ?? 65
  } else {
    // 降级建议
    aiSuggestion.value = getFallbackSuggestion()
    aiConfidence.value = 65
  }
}
  
const getFallbackSuggestion = () => {
  const score = warningScore.value
  if (score >= 70) {
    return '⚠️ 红色预警：建议立即启动应急响应，组织受影响人员转移，加密监测频次至2小时/次'
  }
  if (score >= 50) {
    return '📊 橙色预警：建议加强巡查监测，做好应急准备，关注形变速率变化趋势'
  }
  if (score >= 30) {
    return '🔍 黄色预警：建议保持常规监测，重点关注降雨和形变数据'
  }
  return '✅ 蓝色预警：各项指标正常，保持常规监测即可'
}

// 监听点位变化
watch(() => props.point, async (newPoint) => {
  if (newPoint) {
    loadData()
    await callAI()
  }
}, { immediate: true })

onMounted(() => {
  console.log('预警模块已加载')
})
</script>

<style scoped>
.warning-module {
  background: linear-gradient(135deg, #0a0e27 0%, #0f122e 100%);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 预警仪表 */
.warning-gauge {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
}

.gauge-container {
  text-align: center;
  min-width: 120px;
}

.gauge-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  background: #1a1f3a;
  position: relative;
}

.gauge-ring.critical {
  background: conic-gradient(#ff3366 0deg, #ff3366 calc(360deg * var(--score, 0.7) / 100), #1a1f3a calc(360deg * var(--score, 0.7) / 100));
}

.gauge-ring.high {
  background: conic-gradient(#ff9933 0deg, #ff9933 calc(360deg * var(--score, 0.5) / 100), #1a1f3a calc(360deg * var(--score, 0.5) / 100));
}

.gauge-ring.medium {
  background: conic-gradient(#ffcc00 0deg, #ffcc00 calc(360deg * var(--score, 0.3) / 100), #1a1f3a calc(360deg * var(--score, 0.3) / 100));
}

.gauge-ring.low {
  background: conic-gradient(#33ff66 0deg, #33ff66 calc(360deg * var(--score, 0.1) / 100), #1a1f3a calc(360deg * var(--score, 0.1) / 100));
}

.gauge-ring::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: #0a0e27;
}

.gauge-inner {
  position: relative;
  z-index: 1;
}

.gauge-value {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff, #66ccff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.gauge-unit {
  font-size: 12px;
  color: #66ccff;
}

.gauge-title {
  font-size: 12px;
  color: #8a8fb0;
  margin-top: 8px;
}

.gauge-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(102, 204, 255, 0.2);
  color: #66ccff;
  display: inline-block;
  margin-top: 4px;
}

/* 影响因素列表 */
.factors-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.factor-item {
  width: 100%;
}

.factor-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
}

.factor-name {
  color: #a0a5c0;
}

.factor-value {
  color: #66ccff;
  font-family: monospace;
}

/* AI 建议区域 */
.ai-suggestion {
  background: rgba(102, 204, 255, 0.08);
  border-radius: 12px;
  padding: 14px;
  border-left: 3px solid #66ccff;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #66ccff;
}

.suggestion-content {
  font-size: 13px;
  line-height: 1.5;
  color: #e0e5ff;
  margin-bottom: 10px;
}

.suggestion-footer {
  font-size: 11px;
  color: #6a6f8f;
  padding-top: 8px;
  border-top: 1px solid rgba(102, 204, 255, 0.15);
}

/* 承灾体信息 */
.exposure-info {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 14px;
}

.info-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  color: #8a8fb0;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.info-value.critical {
  color: #ff6699;
}

.info-value.high {
  color: #ffaa66;
}

.info-value.medium {
  color: #ffcc44;
}

.info-value.low {
  color: #66ff99;
}
</style>
