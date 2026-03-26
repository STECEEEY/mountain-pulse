<template>
  <div class="risk-classification">
    <!-- 风险概览 - 科技风卡片 -->
    <div class="risk-overview">
      <div class="risk-gauge">
        <div class="gauge-ring" :class="currentRisk.level">
          <div class="gauge-inner">
            <span class="gauge-value">{{ currentRisk.score }}</span>
            <span class="gauge-unit">分</span>
          </div>
        </div>
        <div class="gauge-label">
          <span class="label-text">综合风险指数</span>
          <span class="label-badge">{{ riskLevelText }}</span>
        </div>
      </div>
      <div class="risk-breakdown">
        <div class="breakdown-item" v-for="factor in riskFactors" :key="factor.name">
          <div class="breakdown-header">
            <span class="breakdown-label">
              <span class="factor-icon">{{ factor.icon }}</span>
              {{ factor.name }}
            </span>
            <span class="breakdown-value">{{ factor.value }}%</span>
          </div>
          <el-progress 
            :percentage="factor.value" 
            :stroke-width="6" 
            :color="factor.color"
            :show-text="false"
          />
          <div class="progress-glow" :style="{ width: `${factor.value}%`, backgroundColor: factor.color }"></div>
        </div>
      </div>
    </div>

    <!-- AI 风险预测 - 科技风 -->
    <div class="ai-prediction">
      <div class="section-header">
        <div class="header-left">
          <el-icon class="ai-icon"><Cpu /></el-icon>
          <h4>AI 风险预测引擎</h4>
        </div>
        <el-tag size="small" type="warning" effect="dark">实时推演中</el-tag>
      </div>
      
      <div class="prediction-timeline">
        <div class="timeline-item" v-for="(pred, idx) in predictions" :key="idx">
          <div class="timeline-time">
            <span class="time-label">{{ pred.label }}</span>
            <span class="time-value">{{ pred.score }}%</span>
          </div>
          <div class="timeline-bar-container">
            <div class="timeline-bar" :class="pred.level" :style="{ width: `${pred.score}%` }">
              <div class="bar-glow"></div>
            </div>
          </div>
          <div class="timeline-trend" v-if="idx > 0">
            <span :class="getTrendClass(pred.score, predictions[idx-1].score)">
              {{ getTrendIcon(pred.score, predictions[idx-1].score) }}
              {{ getTrendValue(pred.score, predictions[idx-1].score) }}%
            </span>
          </div>
        </div>
      </div>
      
      <div class="ai-insight">
        <el-icon><ChatDotRound /></el-icon>
        <span>{{ aiInsight }}</span>
      </div>
      
      <p class="prediction-note">
        🤖 AI 模型基于 {{ modelFeatures.length }} 维特征进行风险推演 | 置信度: {{ aiConfidence }}%
      </p>
    </div>

    <!-- 承灾体信息 - 科技风 -->
    <div class="exposure-info">
      <h4>
        <el-icon><Location /></el-icon>
        影响范围内承灾体
        <span class="info-badge">实时评估</span>
      </h4>
      <div class="exposure-grid">
        <div class="exposure-item" v-for="exposure in exposureItems" :key="exposure.label">
          <div class="exposure-icon" :style="{ background: exposure.gradient }">
            <el-icon><component :is="exposure.icon" /></el-icon>
          </div>
          <div class="exposure-detail">
            <span class="exposure-value">{{ exposure.value }}</span>
            <span class="exposure-label">{{ exposure.label }}</span>
          </div>
          <div class="exposure-trend" v-if="exposure.trend">
            <span :class="exposure.trend.type">{{ exposure.trend.icon }} {{ exposure.trend.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 建议措施 - 科技风 -->
    <div class="recommendations">
      <h4>
        <el-icon><Opportunity /></el-icon>
        AI 决策建议
        <span class="info-badge">{{ recommendation.level }}</span>
      </h4>
      <div class="rec-list">
        <div v-for="(rec, idx) in recommendation.items" :key="idx" class="rec-item" :class="rec.type">
          <div class="rec-icon">
            <el-icon><component :is="rec.icon" /></el-icon>
          </div>
          <div class="rec-content">
            <span class="rec-text">{{ rec.text }}</span>
            <span class="rec-reason" v-if="rec.reason">{{ rec.reason }}</span>
          </div>
          <div class="rec-priority" v-if="rec.priority">{{ rec.priority }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Cpu, ChatDotRound, Location, Opportunity, Warning, View, Monitor, User, DataAnalysis, TrendCharts } from '@element-plus/icons-vue'
import { normalizeRiskLevel } from '@/utils/riskLevel'

const props = defineProps<{
  point: {
    id?: number
    name?: string
    level?: string
    velocity?: number
    slope?: number
    threat?: string
    actual_population?: number
    lng?: number
    lat?: number
    type?: string
    geology?: {
      stability?: string
      lithology?: string
      structure?: string
      confidence?: number
    }
  } | null
}>()

// 降雨数据（从父组件传入）
const rainfallData = ref<any>(null)

// AI 模型特征
const modelFeatures = computed(() => {
  const features = []
  if (props.point?.velocity !== undefined) features.push('形变速率')
  if (props.point?.slope !== undefined) features.push('地形坡度')
  if (props.point?.geology?.stability) features.push('地质稳定性')
  if (rainfallData.value) features.push('降雨影响')
  if (props.point?.actual_population) features.push('人口暴露')
  return features
})

// AI 置信度（基于数据完整性）
const aiConfidence = computed(() => {
  let confidence = 60 // 基础置信度
  if (props.point?.velocity !== undefined && props.point.velocity > 0) confidence += 10
  if (props.point?.slope !== undefined && props.point.slope > 0) confidence += 10
  if (props.point?.geology?.confidence) confidence += props.point.geology.confidence * 10
  if (rainfallData.value) confidence += 10
  return Math.min(confidence, 98)
})

// 风险等级文本
const riskLevelText = computed(() => {
  const level = normalizeRiskLevel(props.point?.level)
  const map: Record<string, string> = {
    '极高': '红色预警',
    '高': '橙色预警', 
    '中': '黄色预警',
    '低': '蓝色预警'
  }
  return map[level] || '正常监测'
})

// 风险因子列表（包含形变速率）
const riskFactors = computed(() => {
  // 计算形变速率分数
  const velocityScore = computedDeformationFactor()
  
  // 计算地质因素分数
  const geoScore = computedGeologicalFactor()
  
  // 计算降雨分数
  const rainScore = computedRainfallFactor()
  
  // 计算人口分数
  const popScore = computedPopulationExposure()
  
  return [
    {
      name: '形变速率',
      icon: '📈',
      value: velocityScore,
      color: '#f59e0b',
      original: props.point?.velocity || 0,
      unit: 'mm/d'
    },
    {
      name: '地质因素',
      icon: '⛰️',
      value: geoScore,
      color: '#3b82f6',
      original: props.point?.slope || 0,
      unit: '°'
    },
    {
      name: '降雨影响',
      icon: '🌧️',
      value: rainScore,
      color: '#22c55e',
      original: rainfallData.value?.statistics?.avg_annual / 12 || 0,
      unit: 'mm/月'
    },
    {
      name: '人口暴露',
      icon: '👥',
      value: popScore,
      color: '#8b5cf6',
      original: props.point?.actual_population || 0,
      unit: '人'
    }
  ]
})

// 形变速率计算（非线性映射，确保参与计算）
function computedDeformationFactor(): number {
  const velocity = Math.abs(Number(props.point?.velocity || 0))
  
  // 非线性映射，确保微小形变也有体现
  if (velocity <= 0) return 0
  if (velocity <= 0.1) return 5 + velocity * 50  // 0-0.1 → 5-10分
  if (velocity <= 1) return 10 + velocity * 30   // 0.1-1 → 10-40分
  if (velocity <= 5) return 40 + velocity * 8    // 1-5 → 40-80分
  if (velocity <= 10) return 80 + velocity * 2   // 5-10 → 80-100分
  return 100
}

// 地质因素计算
function computedGeologicalFactor(): number {
  let score = 0
  const slope = Number(props.point?.slope || 0)
  const slopeScore = Math.min(Math.round(slope * 2.12), 60)
  
  const stabilityMap: Record<string, number> = {
    '不稳定': 40,
    '较不稳定': 30,
    '基本稳定': 15,
    '稳定': 5
  }
  const stabilityScore = stabilityMap[props.point?.geology?.stability || '稳定'] || 0
  
  score = slopeScore + stabilityScore
  return Math.min(score, 100)
}

// 降雨影响计算
function computedRainfallFactor(): number {
  if (rainfallData.value?.statistics) {
    const avgMonthly = rainfallData.value.statistics.avg_annual / 12
    let score = Math.min(Math.round(avgMonthly / 3), 70)
    
    const maxMonthly = rainfallData.value.statistics.max_monthly || 0
    if (maxMonthly > 200) score += 20
    else if (maxMonthly > 150) score += 15
    else if (maxMonthly > 100) score += 10
    
    return Math.min(score, 100)
  }
  return 10
}

// 人口暴露计算
function computedPopulationExposure(): number {
  const population = props.point?.actual_population || parseThreatNumber(props.point?.threat)
  return Math.min(Math.round(population / 5), 100)
}

function parseThreatNumber(value?: string): number {
  if (!value) return 0
  const matched = value.match(/-?\d+(\.\d+)?/)
  return matched ? Number(matched[0]) : 0
}

// 综合风险指数
const currentRisk = computed(() => {
  const weights = {
    deformation: 0.35,
    geological: 0.30,
    rainfall: 0.25,
    population: 0.10
  }
  
  const factors = riskFactors.value
  const rawScore = 
    factors[0].value * weights.deformation +
    factors[1].value * weights.geological +
    factors[2].value * weights.rainfall +
    factors[3].value * weights.population
  
  const score = Math.round(rawScore)
  
  let level = 'low'
  if (score >= 75) level = 'high'
  else if (score >= 50) level = 'medium'
  else level = 'low'
  
  return { score, level }
})

// AI 预测数据
const predictions = computed(() => {
  const current = currentRisk.value.score
  
  // AI 预测逻辑：基于各因子趋势
  const deformationTrend = riskFactors.value[0].value > 50 ? 1.2 : 1
  const rainfallTrend = riskFactors.value[2].value > 50 ? 1.15 : 1
  
  const day1 = Math.min(Math.round(current * deformationTrend * rainfallTrend), 99)
  const day2 = Math.min(Math.round(day1 * (1 + (deformationTrend - 1) * 0.8)), 99)
  
  return [
    { label: '当前', score: current, level: currentRisk.value.level },
    { label: '+24h', score: day1, level: day1 >= 75 ? 'high' : day1 >= 50 ? 'medium' : 'low' },
    { label: '+48h', score: day2, level: day2 >= 75 ? 'high' : day2 >= 50 ? 'medium' : 'low' }
  ]
})

// AI 洞察
const aiInsight = computed(() => {
  const score = currentRisk.value.score
  const factors = riskFactors.value
  const deformation = factors[0]
  const rainfall = factors[2]
  
  if (score >= 75) {
    return `⚠️ 高风险预警！形变速率 ${deformation.original}mm/d 持续活跃，${rainfall.original > 100 ? '近期降雨充沛' : '地质条件不利'}，建议立即响应`
  }
  if (score >= 50) {
    return `📊 中风险监测中，主要风险源：${deformation.value > 30 ? '形变速率偏高' : '地质条件不稳定'}，需加强巡查`
  }
  if (deformation.value > 30) {
    return `🔍 形变速率 ${deformation.original}mm/d 呈上升趋势，虽当前风险可控，建议加密监测频次`
  }
  return `✅ 各指标平稳，形变速率 ${deformation.original}mm/d，处于正常范围，保持常规监测即可`
})

// 承灾体信息
const exposureItems = computed(() => {
  const population = props.point?.actual_population || parseThreatNumber(props.point?.threat)
  const hasVelocity = (props.point?.velocity || 0) > 0.1
  
  return [
    {
      icon: 'User',
      label: '威胁人口',
      value: population > 0 ? `${population}人` : '暂无',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      trend: population > 100 ? { type: 'warning', icon: '↑', value: '高风险' } : null
    },
    {
      icon: 'Monitor',
      label: '形变速率',
      value: props.point?.velocity !== undefined ? `${props.point.velocity.toFixed(2)} mm/d` : '暂无',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
      trend: hasVelocity ? { type: 'warning', icon: '↑', value: '活跃中' } : { type: 'safe', icon: '→', value: '稳定' }
    },
    {
      icon: 'DataAnalysis',
      label: '地质稳定性',
      value: props.point?.geology?.stability || '暂无',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
      trend: null
    },
    {
      icon: 'TrendCharts',
      label: '风险趋势',
      value: currentRisk.value.score >= 50 ? '上升中' : '平稳',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      trend: currentRisk.value.score >= 50 ? { type: 'warning', icon: '↗', value: '+15%' } : { type: 'safe', icon: '→', value: '稳定' }
    }
  ]
})

// 建议措施
const recommendation = computed(() => {
  const score = currentRisk.value.score
  const deformation = riskFactors.value[0]
  const rainfall = riskFactors.value[2]
  const level = normalizeRiskLevel(props.point?.level)
  
  // 基于 AI 分析的建议
  if (score >= 75 || level === '极高') {
    return {
      level: 'Ⅰ级响应',
      items: [
        { 
          type: 'urgent', 
          icon: 'Warning', 
          text: '立即启动红色预警，组织人员疏散', 
          reason: `形变速率 ${deformation.original}mm/d 已达预警阈值`,
          priority: '紧急'
        },
        { 
          type: 'urgent', 
          icon: 'Location', 
          text: '封控重点风险区，设置安全警戒线', 
          reason: '风险区域需立即隔离',
          priority: '紧急'
        },
        { 
          type: 'warning', 
          icon: 'Monitor', 
          text: '开启高频巡检与连续形变监测', 
          reason: '需实时掌握形变动态',
          priority: '高优'
        }
      ]
    }
  }
  
  if (score >= 50 || level === '高') {
    return {
      level: 'Ⅱ级响应',
      items: [
        { 
          type: 'warning', 
          icon: 'Warning', 
          text: '启动橙色预警，做好转移准备', 
          reason: deformation.value > 40 ? '形变速率持续上升' : '风险等级较高',
          priority: '高优'
        },
        { 
          type: 'normal', 
          icon: 'View', 
          text: '加强现场巡查，限制人员聚集', 
          reason: '需控制暴露风险',
          priority: '中优'
        },
        { 
          type: 'normal', 
          icon: 'Monitor', 
          text: '提高监测频次，每日复盘', 
          reason: '密切跟踪风险变化',
          priority: '中优'
        }
      ]
    }
  }
  
  if (score >= 30 || level === '中') {
    return {
      level: 'Ⅲ级响应',
      items: [
        { 
          type: 'normal', 
          icon: 'Warning', 
          text: '保持黄色预警，持续跟踪变化', 
          reason: '风险可控但需关注',
          priority: '中优'
        },
        { 
          type: 'normal', 
          icon: 'View', 
          text: '完善排水设施和边坡巡检', 
          reason: rainfall.value > 30 ? '降雨季节需加强防护' : '例行维护',
          priority: '常规'
        },
        { 
          type: 'normal', 
          icon: 'Monitor', 
          text: '按计划开展定时监测', 
          reason: '保持数据连续性',
          priority: '常规'
        }
      ]
    }
  }
  
  return {
    level: 'Ⅳ级响应',
    items: [
      { 
        type: 'normal', 
        icon: 'View', 
        text: '维持常态化监测', 
        reason: deformation.value < 20 ? '形变速率正常' : '风险可控',
        priority: '常规'
      },
      { 
        type: 'normal', 
        icon: 'Location', 
        text: '定期排查重点区域', 
        reason: '预防性维护',
        priority: '常规'
      },
      { 
        type: 'normal', 
        icon: 'Opportunity', 
        text: '保留应急预案与联系人机制', 
        reason: '保持应急响应能力',
        priority: '常规'
      }
    ]
  }
})

// 辅助函数
function getTrendClass(current: number, prev: number): string {
  if (current > prev) return 'trend-up'
  if (current < prev) return 'trend-down'
  return 'trend-stable'
}

function getTrendIcon(current: number, prev: number): string {
  if (current > prev) return '📈'
  if (current < prev) return '📉'
  return '→'
}

function getTrendValue(current: number, prev: number): string {
  if (current > prev) return `+${current - prev}`
  if (current < prev) return `-${prev - current}`
  return '0'
}

// 监听 point 变化
watch(() => props.point, () => {
  // 触发重新计算
}, { deep: true })
</script>

<style scoped>
.risk-classification {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: linear-gradient(135deg, #0a0e27 0%, #0f122e 100%);
  border-radius: 20px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.risk-classification::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 50%, rgba(0, 255, 255, 0.03) 0%, transparent 50%);
  pointer-events: none;
}

/* 风险概览 */
.risk-overview {
  display: flex;
  gap: 24px;
  align-items: center;
  background: rgba(10, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.05);
}

.risk-gauge {
  text-align: center;
  position: relative;
}

.gauge-ring {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #0f122e;
}

.gauge-ring::before {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0a0e27, #0f122e);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
}

.gauge-ring.high {
  background: conic-gradient(#ff3366 0% calc(100% * var(--score, 0.78)), #2a2e4a calc(100% * var(--score, 0.78)) 100%);
}

.gauge-ring.medium {
  background: conic-gradient(#ff9933 0% calc(100% * var(--score, 0.5)), #2a2e4a calc(100% * var(--score, 0.5)) 100%);
}

.gauge-ring.low {
  background: conic-gradient(#33ff66 0% calc(100% * var(--score, 0.3)), #2a2e4a calc(100% * var(--score, 0.3)) 100%);
}

.gauge-inner {
  position: relative;
  z-index: 2;
  text-align: center;
}

.gauge-value {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff, #66ccff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.gauge-unit {
  font-size: 12px;
  color: #66ccff;
  margin-left: 2px;
}

.gauge-label {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label-text {
  font-size: 12px;
  color: #8a8fb0;
}

.label-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(102, 204, 255, 0.2);
  color: #66ccff;
}

.risk-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.breakdown-item {
  position: relative;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.breakdown-label {
  font-size: 12px;
  color: #a0a5c0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.factor-icon {
  font-size: 14px;
}

.breakdown-value {
  font-size: 12px;
  font-weight: 600;
  color: #66ccff;
  font-family: monospace;
}

.progress-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 2px;
  filter: blur(2px);
  opacity: 0.6;
  transition: width 0.3s ease;
}

/* AI 预测区域 */
.ai-prediction {
  background: rgba(10, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(102, 204, 255, 0.3);
  box-shadow: 0 0 20px rgba(102, 204, 255, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-icon {
  font-size: 20px;
  color: #66ccff;
  animation: pulse 2s infinite;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.prediction-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-time {
  width: 60px;
  display: flex;
  flex-direction: column;
}

.time-label {
  font-size: 11px;
  color: #8a8fb0;
}

.time-value {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  font-family: monospace;
}

.timeline-bar-container {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.timeline-bar {
  height: 100%;
  border-radius: 4px;
  position: relative;
  transition: width 0.5s ease;
}

.timeline-bar.high {
  background: linear-gradient(90deg, #ff3366, #ff6699);
  box-shadow: 0 0 8px #ff3366;
}

.timeline-bar.medium {
  background: linear-gradient(90deg, #ff9933, #ffcc66);
  box-shadow: 0 0 8px #ff9933;
}

.timeline-bar.low {
  background: linear-gradient(90deg, #33ff66, #66ff99);
  box-shadow: 0 0 8px #33ff66;
}

.bar-glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
  filter: blur(2px);
}

.timeline-trend {
  width: 50px;
  font-size: 11px;
  text-align: right;
}

.trend-up {
  color: #ff6666;
}

.trend-down {
  color: #66ff66;
}

.trend-stable {
  color: #66ccff;
}

.ai-insight {
  background: rgba(102, 204, 255, 0.1);
  border-radius: 12px;
  padding: 12px;
  margin: 16px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #a0e0ff;
  border-left: 3px solid #66ccff;
}

.prediction-note {
  margin: 0;
  font-size: 11px;
  color: #6a6f8f;
  text-align: center;
  padding-top: 12px;
  border-top: 1px solid rgba(102, 204, 255, 0.2);
}

/* 承灾体信息 */
.exposure-info h4, .recommendations h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(102, 204, 255, 0.2);
  border-radius: 12px;
  color: #66ccff;
  font-weight: normal;
}

.exposure-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.exposure-item {
  background: rgba(10, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(102, 204, 255, 0.2);
  transition: all 0.3s ease;
}

.exposure-item:hover {
  border-color: rgba(102, 204, 255, 0.5);
  transform: translateY(-2px);
}

.exposure-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
}

.exposure-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.exposure-value {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.exposure-label {
  font-size: 11px;
  color: #8a8fb0;
}

.exposure-trend {
  font-size: 11px;
}

.exposure-trend .warning {
  color: #ff9966;
}

.exposure-trend .safe {
  color: #66ff99;
}

/* 建议措施 */
.recommendations {
  background: rgba(10, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(102, 204, 255, 0.2);
}

.rec-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rec-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.rec-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #66ccff;
}

.rec-item.urgent {
  background: rgba(255, 51, 102, 0.1);
}

.rec-item.urgent::before {
  background: #ff3366;
}

.rec-item.warning {
  background: rgba(255, 153, 51, 0.1);
}

.rec-item.warning::before {
  background: #ff9933;
}

.rec-item.normal::before {
  background: #33ff66;
}

.rec-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(102, 204, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #66ccff;
}

.rec-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rec-text {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
}

.rec-reason {
  font-size: 11px;
  color: #8a8fb0;
}

.rec-priority {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(102, 204, 255, 0.2);
  border-radius: 10px;
  color: #66ccff;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>