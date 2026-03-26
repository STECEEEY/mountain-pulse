<template>
  <div class="risk-classification">
    <!-- 风险概览 -->
    <div class="risk-overview">
      <div class="risk-gauge">
        <div class="gauge-ring" :class="currentRisk.level">
          <span class="gauge-value">{{ currentRisk.score }}</span>
        </div>
        <div class="gauge-label">综合风险指数</div>
      </div>
      <div class="risk-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">地质因素</span>
          <el-progress :percentage="geologicalFactor" :stroke-width="8" color="#3b82f6" />
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">形变速率</span>
          <el-progress :percentage="deformationFactor" :stroke-width="8" color="#f59e0b" />
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">降雨影响</span>
          <el-progress :percentage="rainfallFactor" :stroke-width="8" color="#22c55e" />
          <el-tooltip v-if="rainfallLoading" content="加载中..." placement="top">
            <el-icon class="loading-icon"><Loading /></el-icon>
          </el-tooltip>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">人口暴露</span>
          <el-progress :percentage="populationExposure" :stroke-width="8" color="#8b5cf6" />
        </div>
      </div>
    </div>

    <!-- AI 风险预测 -->
    <div class="ai-prediction">
      <div class="section-header">
        <h4>模型风险预测</h4>
        <el-tag size="small" type="warning">趋势推演</el-tag>
      </div>
      <div class="prediction-content">
        <div class="prediction-item">
          <span class="time">今日</span>
          <div class="prediction-bar high" :style="{ width: `${currentRisk.score}%` }"></div>
          <span class="prob">{{ currentRisk.score }}%</span>
        </div>
        <div class="prediction-item">
          <span class="time">+24h</span>
          <div class="prediction-bar medium" :style="{ width: `${nextDayRisk}%` }"></div>
          <span class="prob">{{ nextDayRisk }}%</span>
        </div>
        <div class="prediction-item">
          <span class="time">+48h</span>
          <div class="prediction-bar medium" :style="{ width: `${twoDayRisk}%` }"></div>
          <span class="prob">{{ twoDayRisk }}%</span>
        </div>
      </div>
      <p class="prediction-note">
        {{ recommendation.note }}
      </p>
      <div v-if="rainfallData" class="rainfall-info">
        <el-tag size="small" type="info">
          🌧️ 月均降雨: {{ rainfallData.statistics.avg_annual / 12 }} mm
        </el-tag>
      </div>
    </div>

    <!-- 其他内容保持不变 -->
    <div class="exposure-info">
      <h4>影响范围内承灾体</h4>
      <div class="exposure-grid">
        <div class="exposure-item">
          <span class="exposure-icon">POP</span>
          <div class="exposure-detail">
            <span class="exposure-value">{{ point?.threat || '暂无' }}</span>
            <span class="exposure-label">威胁人口</span>
          </div>
        </div>
      </div>
    </div>

    <div class="recommendations">
      <h4>建议措施</h4>
      <div class="rec-list">
        <div class="rec-item urgent">
          <el-icon><WarningFilled /></el-icon>
          <span>{{ recommendation.primary }}</span>
        </div>
        <div class="rec-item">
          <el-icon><Location /></el-icon>
          <span>{{ recommendation.secondary }}</span>
        </div>
        <div class="rec-item">
          <el-icon><View /></el-icon>
          <span>{{ recommendation.tertiary }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { WarningFilled, Location, View, Loading } from '@element-plus/icons-vue'
import { normalizeRiskLevel } from '@/utils/riskLevel'
import { ElMessage } from 'element-plus'

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
    geology?: {
      stability?: string
    }
  } | null
}>()

// 降雨数据状态
const rainfallLoading = ref(false)
const rainfallData = ref<any>(null)

// API 配置
const RAINFALL_API = '/api/rainfall'

// 获取降雨数据
const fetchRainfallData = async () => {
  if (!props.point?.lng || !props.point?.lat) {
    console.warn('缺少经纬度，无法获取降雨数据')
    return
  }
  
  rainfallLoading.value = true
  
  try {
    const url = `${RAINFALL_API}/point?lon=${props.point.lng}&lat=${props.point.lat}`
    console.log('获取降雨数据:', url)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const result = await response.json()
    
    if (result.status === 'success') {
      rainfallData.value = result.data
      console.log('降雨数据加载成功:', rainfallData.value)
    } else {
      throw new Error(result.message || '数据加载失败')
    }
  } catch (error: any) {
    console.error('获取降雨数据失败:', error)
    // 降级：使用模拟数据
    rainfallData.value = {
      statistics: {
        avg_annual: 0,
        max_monthly: 0,
        min_monthly: 0
      }
    }
  } finally {
    rainfallLoading.value = false
  }
}

// 解析威胁人口
const parseThreatNumber = (value?: string) => {
  if (!value) return 0
  const matched = value.match(/-?\d+(\.\d+)?/)
  if (!matched) return 0
  return Number(matched[0])
}

// 地质因素：结合坡度和地质稳定性
const geologicalFactor = computed(() => {
  let baseScore = 0
  
  // 1. 坡度因子（权重70%）
  const slope = Number(props.point?.slope || 0)
  const slopeScore = Math.min(Math.round(slope * 2.12), 70)
  
  // 2. 地质稳定性因子（权重30%）
  const stabilityMap: Record<string, number> = {
    '不稳定': 30,
    '较不稳定': 20,
    '基本稳定': 10,
    '稳定': 0
  }
  const stabilityScore = stabilityMap[props.point?.geology?.stability || '稳定'] || 0
  
  baseScore = slopeScore + stabilityScore
  
  return Math.min(baseScore, 100)
})

// 形变速率
const deformationFactor = computed(() => {
  const velocity = Math.abs(Number(props.point?.velocity || 0))
  // 形变速率映射：0mm/d=0%，10mm/d=100%
  return Math.min(Math.round(velocity * 10), 100)
})

// 降雨影响 - 使用真实数据
const rainfallFactor = computed(() => {
  if (rainfallData.value && rainfallData.value.statistics) {
    // 使用月均降雨量计算风险
    const avgMonthlyRainfall = rainfallData.value.statistics.avg_annual / 12
    
    // 降雨量映射：0mm=0%，300mm=100%
    let score = Math.min(Math.round(avgMonthlyRainfall / 3), 100)
    
    // 如果有极值月份，增加风险系数
    const maxMonthly = rainfallData.value.statistics.max_monthly || 0
    if (maxMonthly > 200) {
      score = Math.min(score + 15, 100)
    } else if (maxMonthly > 150) {
      score = Math.min(score + 10, 100)
    }
    
    return score
  }
  
  // 降级：使用默认值
  return 10
})

// 人口暴露
const populationExposure = computed(() => {
  const population = props.point?.actual_population || parseThreatNumber(props.point?.threat)
  // 人口映射：0人=0%，500人=100%
  return Math.min(Math.round(population / 5), 100)
})

// 综合风险指数
const currentRisk = computed(() => {
  const weights = {
    geological: 0.35,   // 地质因素 35%
    deformation: 0.35,  // 形变速率 35%
    rainfall: 0.20,     // 降雨影响 20%
    population: 0.10    // 人口暴露 10%
  }
  
  const rawScore = 
    geologicalFactor.value * weights.geological +
    deformationFactor.value * weights.deformation +
    rainfallFactor.value * weights.rainfall +
    populationExposure.value * weights.population
  
  const score = Math.round(rawScore)
  
  // 风险等级判定
  let level = 'low'
  if (score >= 75) level = 'high'
  else if (score >= 50) level = 'medium'
  else level = 'low'
  
  return { score, level }
})

// 风险预测
const nextDayRisk = computed(() => {
  let increase = 0
  
  // 根据降雨数据预测风险变化
  if (rainfallData.value?.statistics) {
    const avgMonthlyRainfall = rainfallData.value.statistics.avg_annual / 12
    // 如果月均降雨 > 100mm，预测风险上升
    if (avgMonthlyRainfall > 100) {
      increase = 5
    } else if (avgMonthlyRainfall > 50) {
      increase = 2
    }
  }
  
  return Math.min(currentRisk.value.score + increase, 99)
})

const twoDayRisk = computed(() => {
  let increase = 0
  
  if (rainfallData.value?.statistics) {
    const avgMonthlyRainfall = rainfallData.value.statistics.avg_annual / 12
    if (avgMonthlyRainfall > 100) {
      increase = 8
    } else if (avgMonthlyRainfall > 50) {
      increase = 4
    }
  }
  
  return Math.min(currentRisk.value.score + increase, 99)
})

// 建议措施
const recommendation = computed(() => {
  const level = normalizeRiskLevel(props.point?.level)
  
  // 结合降雨风险调整建议
  const hasHighRainfallRisk = rainfallFactor.value > 70
  
  if (level === '极高' || (level === '高' && hasHighRainfallRisk)) {
    return {
      primary: '建议立即启动红色预警与人员疏散',
      secondary: '建议封控重点风险区并设置安全警戒线',
      tertiary: '建议开启高频巡检与连续形变监测',
      note: hasHighRainfallRisk ? '当前风险等级较高，且降雨量较大，建议立即采取最高级别响应措施。' : '当前风险等级较高，建议立即采取最高级别响应措施。',
    }
  }
  
  if (level === '高') {
    return {
      primary: '建议启动橙色预警并做好转移准备',
      secondary: '建议加强现场巡查并限制人员聚集',
      tertiary: '建议提高监测频次并每日复盘',
      note: '风险处于高位，建议尽快落实预警和防护。',
    }
  }
  
  if (level === '中') {
    return {
      primary: '建议保持黄色预警并持续跟踪变化',
      secondary: '建议完善排水和边坡巡检',
      tertiary: '建议按计划开展定时监测',
      note: '当前风险可控，需持续观测避免快速演化。',
    }
  }
  
  return {
    primary: '建议维持常态化监测',
    secondary: '建议定期排查重点区域',
    tertiary: '建议保留应急预案与联系人机制',
    note: '当前风险较低，保持常规监测即可。',
  }
})

// 监听 point 变化，重新获取降雨数据
watch(() => props.point, (newPoint) => {
  if (newPoint && newPoint.lng && newPoint.lat) {
    fetchRainfallData()
  }
}, { immediate: true })
</script>

<style scoped>
/* 原有样式保持不变，添加加载图标样式 */
.loading-icon {
  margin-left: 8px;
  animation: spin 1s linear infinite;
}

.rainfall-info {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>