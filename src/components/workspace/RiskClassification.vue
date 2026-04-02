<template>
  <div class="risk-classification">
    <!-- 预警概览 - 科技风卡片 -->
    <div class="risk-overview">
      <div class="risk-gauge">
        <div class="gauge-ring" :class="currentWarning.level">
          <div class="gauge-inner">
            <span class="gauge-value">{{ currentWarning.score }}</span>
            <span class="gauge-unit">分</span>
          </div>
        </div>
        <div class="gauge-label">
          <span class="label-text">综合预警指数</span>
          <span class="label-badge">{{ warningLevelText }}</span>
        </div>
      </div>
      <div class="risk-breakdown">
        <div class="breakdown-item" v-for="factor in warningFactors" :key="factor.name">
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

    <!-- AI 预警预测 -->
    <div class="ai-prediction">
      <div class="section-header">
        <div class="header-left">
          <el-icon class="ai-icon"><Cpu /></el-icon>
          <h4>AI 预警推演引擎</h4>
        </div>
        <el-tag size="small" type="warning" effect="dark">
          {{ aiStore.modelVersion }}
        </el-tag>
      </div>
      
      <!-- AI 决策建议列表 -->
      <div class="ai-decisions" v-if="aiStore.decisions.length > 0">
        <div class="decision-list">
          <div 
            v-for="decision in aiStore.decisions" 
            :key="decision.id" 
            class="decision-item"
            :class="decision.level"
          >
            <div class="decision-header">
              <div class="decision-title">
                <el-icon><component :is="getLevelIcon(decision.level)" /></el-icon>
                <span>{{ decision.title }}</span>
              </div>
              <div class="decision-confidence">
                置信度: {{ decision.confidence }}%
                <el-progress 
                  :percentage="decision.confidence" 
                  :stroke-width="4"
                  :show-text="false"
                  :color="getConfidenceColor(decision.confidence)"
                />
              </div>
            </div>
            <div class="decision-action">
              <span class="label">行动建议：</span>
              <span>{{ decision.action }}</span>
            </div>
            <div class="decision-target">
              <span class="label">责任单位：</span>
              <span>{{ decision.target }}</span>
            </div>
            <div class="decision-time">
              <span class="label">时间窗口：</span>
              <span>{{ decision.window }}</span>
            </div>
            <div class="decision-status">
              <el-tag :type="getStatusType(decision.status)" size="small">
                {{ decision.status }}
              </el-tag>
              <div class="decision-actions">
                <el-button size="small" type="primary" link @click="markExecuted(decision.id)">标记执行</el-button>
                <el-button size="small" type="warning" link @click="markReview(decision.id)">转复核</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="prediction-timeline" v-if="predictions.length">
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
          <div class="timeline-trend" v-if="idx > 0 && predictions[idx-1]">
            <span :class="getTrendClass(pred.score, predictions[idx-1]?.score ?? 0)">
                {{ getTrendIcon(pred.score, predictions[idx-1]?.score ?? 0) }}
                {{ getTrendValue(pred.score, predictions[idx-1]?.score ?? 0) }}%
            </span>
          </div>
        </div>
      </div>
      
      <div class="ai-insight" v-if="aiInsight">
        <el-icon><ChatDotRound /></el-icon>
        <span>{{ aiInsight }}</span>
      </div>
      
      <p class="prediction-note">
        🤖 AI 模型基于 {{ modelFeatures.length }} 维特征进行预警推演 | 置信度: {{ aiConfidence }}%
      </p>
    </div>

    <!-- 周边设施影响分析 -->
    <div class="surrounding-impact">
      <div class="section-header">
        <div class="header-left">
          <el-icon><Location /></el-icon>
          <h4>周边设施影响评估</h4>
        </div>
        <el-tag size="small" type="info" effect="dark">动态加载中</el-tag>
      </div>
      
      <div class="impact-stats">
        <div class="impact-card" v-for="impact in surroundingImpact" :key="impact.type">
          <div class="impact-icon" :style="{ background: impact.gradient }">
            <el-icon><component :is="impact.icon" /></el-icon>
          </div>
          <div class="impact-info">
            <div class="impact-value">{{ impact.count }}</div>
            <div class="impact-label">{{ impact.label }}</div>
          </div>
          <div class="impact-weight" :class="impact.weightClass">
            {{ impact.weight }}%
          </div>
        </div>
      </div>
      
      <!-- 关键设施预警 -->
      <div class="critical-warning" v-if="criticalFacilities.length">
        <div class="warning-title">
          <el-icon><WarningFilled /></el-icon>
          关键设施预警
        </div>
        <div class="facility-list">
          <div v-for="facility in criticalFacilities" :key="facility.id" class="facility-warning">
            <div class="facility-type">
              <el-icon><component :is="facility.icon" /></el-icon>
              {{ facility.type }}
            </div>
            <div class="facility-detail">
              <span class="warning-level" :class="facility.warningLevel">{{ facility.warningLevel }}预警</span>
            </div>
            <div class="facility-action">{{ facility.action }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 承灾体信息 -->
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

    <!-- 建议措施（AI 生成） -->
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
import { computed, ref, watch, onMounted } from 'vue'
import { 
  Cpu, ChatDotRound, Location, Opportunity, Warning, 
  WarningFilled, View, Monitor, User, DataAnalysis, 
  TrendCharts, OfficeBuilding, Van, Train, Checked,
  CloseBold, Bell
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAiStore } from '@/stores/ai'
import type { DecisionRequest } from '@/services/aiService'
import { normalizeRiskLevel } from '@/utils/riskLevel'

// 定义类型
interface PointData {
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
    unit?: string
    code?: string
  }
}

interface RainfallStatistics {
  avg_annual: number
  max_monthly: number
  min_monthly: number
  max_month?: { date: string; precip_mm: number }
  min_month?: { date: string; precip_mm: number }
}

interface RainfallData {
  status?: string
  data?: {
    statistics: RainfallStatistics
    timeseries?: Array<{ date: string; precip_mm: number }>
  }
}

const props = defineProps<{
  point: {
    id?: number
    name?: string
    type?: string
    lng?: number
    lat?: number
    elevation?: number
    slope?: number
    threat?: string
    level?: string
  } | null
}>()

// AI Store
const aiStore = useAiStore()

// 完整数据
const fullPointData = ref<PointData | null>(null)
const geologyLoading = ref(false)
const rainfallData = ref<RainfallData | null>(null)

// 周边设施数据
const surroundingData = ref({
  buildings: [],
  roads: [],
  railways: [],
  loading: false
})

// ========== 数据加载函数 ==========

const loadFullPointData = async () => {
  if (!props.point) return
  
  geologyLoading.value = true
  
  try {
    const response = await fetch('/data/geology_inferred_results.json')
    if (!response.ok) throw new Error('加载失败')
    
    const data = await response.json()
    
    const pointName = props.point.name
    const pointId = props.point.id
    
    let matchedPoint = null
    
    if (pointId !== undefined && pointId !== null) {
      matchedPoint = data.points?.find((p: any) => p.id === pointId)
    }
    
    if (!matchedPoint && pointName) {
      matchedPoint = data.points?.find((p: any) => p.name === pointName)
    }
    
    if (matchedPoint) {
      console.log('✅ 找到匹配的风险点:', matchedPoint.name)
      fullPointData.value = {
        ...matchedPoint,
        ...props.point,
        geology: matchedPoint.geology
      }
    } else {
      console.warn('⚠️ 未找到匹配点，使用传入数据')
      fullPointData.value = props.point as PointData
    }
  } catch (error) {
    console.error('加载地质数据失败:', error)
    fullPointData.value = props.point as PointData
  } finally {
    geologyLoading.value = false
  }
}

const fetchRainfallData = async () => {
  if (!props.point?.lng || !props.point?.lat) return
  
  try {
    const response = await fetch(`/api/rainfall/point?lon=${props.point.lng}&lat=${props.point.lat}`)
    const result = await response.json()
    
    if (result.status === 'success') {
      rainfallData.value = result.data
      console.log('✅ 降雨数据加载成功')
    }
  } catch (error) {
    console.error('获取降雨数据失败:', error)
  }
}

// 加载周边设施数据
const loadSurroundingData = async () => {
  if (!props.point?.lng || !props.point?.lat) return
  
  surroundingData.value.loading = true
  
  try {
    const baseUrl = 'http://47.102.147.118:8080'
    const [buildings, roads, railways] = await Promise.all([
      fetch(`${baseUrl}/building.geojson`).then(res => res.json()).catch(() => ({ features: [] })),
      fetch(`${baseUrl}/roads.geojson`).then(res => res.json()).catch(() => ({ features: [] })),
      fetch(`${baseUrl}/railways.geojson`).then(res => res.json()).catch(() => ({ features: [] }))
    ])
    
    const radius = 0.01
    const center = { lng: props.point.lng, lat: props.point.lat }
    
    surroundingData.value = {
      buildings: filterFeaturesByDistance(buildings.features || [], center, radius),
      roads: filterFeaturesByDistance(roads.features || [], center, radius),
      railways: filterFeaturesByDistance(railways.features || [], center, radius),
      loading: false
    }
    
    console.log('周边设施加载完成:', {
      buildings: surroundingData.value.buildings.length,
      roads: surroundingData.value.roads.length,
      railways: surroundingData.value.railways.length
    })
  } catch (error) {
    console.error('加载周边设施失败:', error)
    surroundingData.value.loading = false
  }
}

const filterFeaturesByDistance = (features: any[], center: { lng: number; lat: number }, radius: number) => {
  return features.filter(feature => {
    let coords
    if (feature.geometry.type === 'Point') {
      coords = feature.geometry.coordinates
    } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon') {
      coords = feature.geometry.coordinates[0] || feature.geometry.coordinates
    } else {
      return false
    }
    
    const lng = coords[0]
    const lat = coords[1]
    const distance = Math.sqrt(Math.pow(lng - center.lng, 2) + Math.pow(lat - center.lat, 2))
    return distance <= radius
  })
}

// ========== 调用 AI 决策 ==========

const callAIDecision = async () => {
  if (!props.point) return
  
  // 构建现场信息
  const dutyNote = generateDutyNote()
  
  const request: DecisionRequest = {
    pointName: props.point.name || '未知点位',
    lng: props.point.lng,
    lat: props.point.lat,
    dutyNote: dutyNote,
    scene: '地质灾害预警',
    userRole: 'dispatcher',
    userRoleLevel: 2
  }
  
  console.log('🤖 调用 AI 决策服务...', request)
  await aiStore.refreshDecision(request)
}

const generateDutyNote = () => {
  const velocity = fullPointData.value?.velocity
  const slope = fullPointData.value?.slope
  const stability = fullPointData.value?.geology?.stability
  const population = fullPointData.value?.actual_population
  
  let note = ''
  if (velocity && velocity > 0) note += `形变速率${velocity}mm/d，`
  if (slope && slope > 0) note += `坡度${slope}°，`
  if (stability) note += `地质稳定性${stability}，`
  if (population && population > 0) note += `威胁人口${population}人，`
  
  const buildingCount = surroundingData.value.buildings.length
  const railwayCount = surroundingData.value.railways.length
  
  if (buildingCount > 0) note += `周边${buildingCount}栋建筑，`
  if (railwayCount > 0) note += `周边${railwayCount}条铁路，`
  
  return note || '常规监测点位，需持续关注'
}

// ========== 计算函数 ==========

const parseThreatNumber = (value?: string): number => {
  if (!value) return 0
  const matched = value.match(/-?\d+(\.\d+)?/)
  return matched ? Number(matched[0]) : 0
}

const computedDeformationFactor = (): number => {
  const velocity = Math.abs(Number(fullPointData.value?.velocity || 0))
  if (velocity <= 0) return 0
  if (velocity <= 0.1) return 5 + velocity * 50
  if (velocity <= 1) return 10 + velocity * 30
  if (velocity <= 5) return 40 + velocity * 8
  if (velocity <= 10) return 80 + velocity * 2
  return 100
}

const computedGeologicalFactor = (): number => {
  const slope = Number(fullPointData.value?.slope || 0)
  const slopeScore = Math.min(Math.round(slope * 2.12), 60)
  
  const stabilityMap: Record<string, number> = {
    '不稳定': 40,
    '较不稳定': 30,
    '基本稳定': 15,
    '稳定': 5
  }
  const stabilityScore = stabilityMap[fullPointData.value?.geology?.stability || '稳定'] || 0
  
  return Math.min(slopeScore + stabilityScore, 100)
}

const computedRainfallFactor = (): number => {
  const stats = rainfallData.value?.data?.statistics
  if (stats) {
    const avgMonthly = stats.avg_annual / 12
    let score = Math.min(Math.round(avgMonthly / 3), 70)
    const maxMonthly = stats.max_monthly || 0
    if (maxMonthly > 200) score += 20
    else if (maxMonthly > 150) score += 15
    else if (maxMonthly > 100) score += 10
    return Math.min(score, 100)
  }
  return 10
}

const computedPopulationExposure = (): number => {
  const population = fullPointData.value?.actual_population || parseThreatNumber(fullPointData.value?.threat)
  return Math.min(Math.round(population / 5), 100)
}

const computedSurroundingImpact = () => {
  const buildingCount = surroundingData.value.buildings.length
  const roadCount = surroundingData.value.roads.length
  const railwayCount = surroundingData.value.railways.length
  
  let buildingScore = 0
  let roadScore = 0
  let railwayScore = 0
  
  if (buildingCount >= 100) buildingScore = 20
  else if (buildingCount >= 50) buildingScore = 15
  else if (buildingCount >= 10) buildingScore = 10
  else if (buildingCount >= 1) buildingScore = 5
  
  if (roadCount >= 50) roadScore = 15
  else if (roadCount >= 20) roadScore = 10
  else if (roadCount >= 5) roadScore = 5
  else if (roadCount >= 1) roadScore = 3
  
  if (railwayCount >= 5) railwayScore = 25
  else if (railwayCount >= 3) railwayScore = 20
  else if (railwayCount >= 1) railwayScore = 15
  
  const totalScore = buildingScore + roadScore + railwayScore
  const maxPossible = 60
  
  return {
    score: Math.min(totalScore, maxPossible),
    percentage: Math.round((totalScore / maxPossible) * 100),
    details: {
      buildings: { count: buildingCount, score: buildingScore },
      roads: { count: roadCount, score: roadScore },
      railways: { count: railwayCount, score: railwayScore }
    }
  }
}

// ========== 预警因子（结合 AI 置信度）==========

const warningFactors = computed(() => {
  const velocityScore = computedDeformationFactor()
  const geoScore = computedGeologicalFactor()
  const rainScore = computedRainfallFactor()
  const popScore = computedPopulationExposure()
  const surroundingScore = computedSurroundingImpact().score
  
  // 如果有 AI 决策，使用 AI 的置信度调整权重
  const hasAI = aiStore.decisions.length > 0
  const aiConfidenceWeight = hasAI ? (aiStore.decisions[0]?.confidence || 70) / 100 : 0.7
  
  // 动态权重：AI 置信度高时，提高周边设施和人口暴露的权重
  const surroundingWeight = 0.08 + (aiConfidenceWeight * 0.04)
  const populationWeight = 0.08 + (aiConfidenceWeight * 0.03)
  const deformationWeight = 0.35
  const geologicalWeight = 0.25
  const rainfallWeight = 0.20 - (aiConfidenceWeight * 0.05)
  
  const totalWeight = deformationWeight + geologicalWeight + rainfallWeight + populationWeight + surroundingWeight
  const normalized = {
    deformation: (velocityScore * deformationWeight) / totalWeight,
    geological: (geoScore * geologicalWeight) / totalWeight,
    rainfall: (rainScore * rainfallWeight) / totalWeight,
    population: (popScore * populationWeight) / totalWeight,
    surrounding: (surroundingScore * surroundingWeight) / totalWeight
  }
  
  const velocity = fullPointData.value?.velocity ?? 0
  const slope = fullPointData.value?.slope ?? 0
  const avgMonthlyRainfall = rainfallData.value?.data?.statistics?.avg_annual 
    ? rainfallData.value.data.statistics.avg_annual / 12 
    : 0
  const population = fullPointData.value?.actual_population ?? parseThreatNumber(fullPointData.value?.threat)
  
  return [
    {
      name: '形变速率',
      icon: '📈',
      value: Math.min(Math.round(normalized.deformation), 100),
      color: '#f59e0b',
      original: velocity,
      unit: 'mm/d'
    },
    {
      name: '地质因素',
      icon: '⛰️',
      value: Math.min(Math.round(normalized.geological), 100),
      color: '#3b82f6',
      original: slope,
      unit: '°'
    },
    {
      name: '降雨影响',
      icon: '🌧️',
      value: Math.min(Math.round(normalized.rainfall), 100),
      color: '#22c55e',
      original: avgMonthlyRainfall,
      unit: 'mm/月'
    },
    {
      name: '人口暴露',
      icon: '👥',
      value: Math.min(Math.round(normalized.population), 100),
      color: '#8b5cf6',
      original: population,
      unit: '人'
    },
    {
      name: '周边设施',
      icon: '🏗️',
      value: Math.min(Math.round(normalized.surrounding), 100),
      color: '#ec489a',
      original: surroundingScore,
      unit: '影响分'
    }
  ]
})

// 综合预警指数
const currentWarning = computed(() => {
  const factors = warningFactors.value
  const rawScore = (factors[0]?.value ?? 0) * 0.35 +
    (factors[1]?.value ?? 0) * 0.25 +
    (factors[2]?.value ?? 0) * 0.18 +
    (factors[3]?.value ?? 0) * 0.11 +
    (factors[4]?.value ?? 0) * 0.11
  
  const score = Math.min(Math.round(rawScore || 0), 100)
  
  let level = 'low'
  if (score >= 75) level = 'high'
  else if (score >= 50) level = 'medium'
  else level = 'low'
  
  return { score, level }
})

// 预警等级文本
const warningLevelText = computed(() => {
  const level = normalizeRiskLevel(fullPointData.value?.level)
  const map: Record<string, string> = {
    '极高': '红色预警',
    '高': '橙色预警', 
    '中': '黄色预警',
    '低': '蓝色预警'
  }
  return map[level] || '正常监测'
})

// AI 置信度（使用真实 AI 的置信度）
const aiConfidence = computed(() => {
  if (aiStore.decisions.length > 0) {
    const avgConfidence = aiStore.decisions.reduce((sum, d) => sum + d.confidence, 0) / aiStore.decisions.length
    return Math.round(avgConfidence)
  }
  
  // 降级：基于数据完整性计算
  let confidence = 60
  if (fullPointData.value?.velocity && fullPointData.value.velocity > 0) confidence += 10
  if (fullPointData.value?.slope && fullPointData.value.slope > 0) confidence += 10
  if (fullPointData.value?.geology?.confidence) confidence += fullPointData.value.geology.confidence * 10
  if (rainfallData.value?.data?.statistics) confidence += 10
  if (surroundingData.value.buildings.length) confidence += 5
  if (surroundingData.value.railways.length) confidence += 5
  return Math.min(confidence, 98)
})

// AI 洞察（使用真实 AI 的决策）
const aiInsight = computed(() => {
  if (aiStore.decisions.length > 0) {
    const topDecision = aiStore.decisions[0]
    const score = currentWarning.value.score
    
    if (score >= 75) {
      return `⚠️ ${topDecision.title} ${topDecision.action}`
    }
    if (score >= 50) {
      return `📊 ${topDecision.action}`
    }
    return `✅ ${topDecision.action}`
  }
  
  // 降级
  const score = currentWarning.value.score
  const deformationOriginal = warningFactors.value[0]?.original ?? 0
  
  if (score >= 75) {
    return `⚠️ 红色预警！形变速率 ${deformationOriginal}mm/d 持续活跃，建议立即启动应急响应`
  }
  if (score >= 50) {
    return `📊 橙色预警，主要风险源为形变速率偏高，需加强巡查和监测`
  }
  return `✅ 各指标平稳，形变速率 ${deformationOriginal}mm/d，保持常规监测`
})

// AI 模型特征
const modelFeatures = computed(() => {
  const features: string[] = []
  if (fullPointData.value?.velocity !== undefined) features.push('形变速率')
  if (fullPointData.value?.slope !== undefined) features.push('地形坡度')
  if (fullPointData.value?.geology?.stability) features.push('地质稳定性')
  if (rainfallData.value?.data?.statistics) features.push('降雨影响')
  if (fullPointData.value?.actual_population) features.push('人口暴露')
  if (surroundingData.value.buildings.length) features.push('周边建筑')
  if (surroundingData.value.railways.length) features.push('铁路设施')
  if (aiStore.modelVersion) features.push(`AI模型:${aiStore.modelVersion}`)
  return features
})

// AI 预测
const predictions = computed(() => {
  const current = currentWarning.value.score
  const aiWeight = aiConfidence.value / 100
  const aiTrend = aiStore.decisions.length > 0 && aiStore.decisions[0]?.level === 'danger' ? 1.15 : 1.05
  
  const day1 = Math.min(Math.round(current * (1 + (0.1 * aiWeight)) * aiTrend), 99)
  const day2 = Math.min(Math.round(day1 * (1 + (0.08 * aiWeight))), 99)
  
  return [
    { label: '当前', score: current, level: currentWarning.value.level },
    { label: '+24h', score: day1, level: day1 >= 75 ? 'high' : day1 >= 50 ? 'medium' : 'low' },
    { label: '+48h', score: day2, level: day2 >= 75 ? 'high' : day2 >= 50 ? 'medium' : 'low' }
  ]
})

// 周边设施影响
const surroundingImpact = computed(() => {
  const impact = computedSurroundingImpact()
  
  return [
    {
      type: 'buildings',
      icon: 'OfficeBuilding',
      label: '周边建筑',
      count: surroundingData.value.buildings.length,
      weight: Math.round(impact.details.buildings.score),
      weightClass: getWeightClass(impact.details.buildings.score),
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      type: 'roads',
      icon: 'Van',
      label: '道路设施',
      count: surroundingData.value.roads.length,
      weight: Math.round(impact.details.roads.score),
      weightClass: getWeightClass(impact.details.roads.score),
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
    },
    {
      type: 'railways',
      icon: 'Train',
      label: '铁路设施',
      count: surroundingData.value.railways.length,
      weight: Math.round(impact.details.railways.score),
      weightClass: getWeightClass(impact.details.railways.score),
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)'
    }
  ]
})

// 关键设施预警
const criticalFacilities = computed(() => {
  const warningLevel = currentWarning.value.score
  const facilities = []
  
  if (surroundingData.value.railways.length > 0 && warningLevel >= 50) {
    facilities.push({
      id: 'railway',
      type: '铁路',
      icon: 'Train',
      warningLevel: warningLevel >= 75 ? '红色' : '橙色',
      action: warningLevel >= 75 ? '建议立即停运' : '建议限速运行'
    })
  }
  
  if (surroundingData.value.buildings.length >= 50 && warningLevel >= 50) {
    facilities.push({
      id: 'buildings',
      type: '密集建筑区',
      icon: 'OfficeBuilding',
      warningLevel: warningLevel >= 75 ? '红色' : '橙色',
      action: warningLevel >= 75 ? '建议组织疏散' : '建议人员撤离准备'
    })
  }
  
  if (surroundingData.value.roads.length >= 20 && warningLevel >= 60) {
    facilities.push({
      id: 'roads',
      type: '主要道路',
      icon: 'Van',
      warningLevel: '黄色',
      action: '建议交通管制'
    })
  }
  
  return facilities
})

// 承灾体信息
const exposureItems = computed(() => {
  const population = fullPointData.value?.actual_population ?? parseThreatNumber(fullPointData.value?.threat)
  const velocity = fullPointData.value?.velocity ?? 0
  const buildingCount = surroundingData.value.buildings.length
  const currentScore = currentWarning.value.score
  const aiRiskCount = aiStore.summary.highRiskCount
  
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
      value: velocity !== undefined ? `${velocity.toFixed(2)} mm/d` : '暂无',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
      trend: velocity > 0.1 ? { type: 'warning', icon: '↑', value: '活跃中' } : { type: 'safe', icon: '→', value: '稳定' }
    },
    {
      icon: 'OfficeBuilding',
      label: '周边建筑',
      value: buildingCount > 0 ? `${buildingCount}栋` : '无',
      gradient: 'linear-gradient(135deg, #ec489a 0%, #f43f5e 100%)',
      trend: buildingCount > 50 ? { type: 'warning', icon: '⚠️', value: '密集区' } : null
    },
    {
      icon: 'TrendCharts',
      label: '预警趋势',
      value: currentScore >= 50 ? '上升中' : '平稳',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      trend: currentScore >= 50 ? { type: 'warning', icon: '↗', value: '+15%' } : { type: 'safe', icon: '→', value: '稳定' }
    }
  ]
})

// 建议措施（优先使用 AI 决策）
const recommendation = computed(() => {
  const score = currentWarning.value.score
  
  // 优先使用 AI 决策
  if (aiStore.decisions.length > 0) {
    const items = aiStore.decisions.map((decision, idx) => ({
      type: decision.level === 'danger' ? 'urgent' : (decision.level === 'warning' ? 'warning' : 'normal'),
      icon: decision.level === 'danger' ? 'Warning' : (decision.level === 'warning' ? 'Bell' : 'View'),
      text: decision.action,
      reason: decision.title,
      priority: idx === 0 ? (score >= 75 ? '紧急' : '高优') : '中优'
    }))
    
    let level = 'Ⅳ级响应'
    if (score >= 75) level = 'Ⅰ级响应'
    else if (score >= 50) level = 'Ⅱ级响应'
    else if (score >= 25) level = 'Ⅲ级响应'
    
    return { level, items: items.slice(0, 3) }
  }
  
  // 降级使用规则引擎
  if (score >= 75) {
    return {
      level: 'Ⅰ级响应',
      items: [
        { type: 'urgent', icon: 'Warning', text: '立即启动红色预警，组织人员疏散', reason: '预警指数已达阈值', priority: '紧急' },
        { type: 'urgent', icon: 'Location', text: '封控重点风险区，设置安全警戒线', reason: '预警区域需立即隔离', priority: '紧急' }
      ]
    }
  }
  
  if (score >= 50) {
    return {
      level: 'Ⅱ级响应',
      items: [
        { type: 'warning', icon: 'Warning', text: '启动橙色预警，做好转移准备', reason: '预警等级较高', priority: '高优' },
        { type: 'normal', icon: 'View', text: '加强现场巡查，限制人员聚集', reason: '需控制暴露风险', priority: '中优' }
      ]
    }
  }
  
  return {
    level: 'Ⅳ级响应',
    items: [
      { type: 'normal', icon: 'View', text: '维持常态化监测', reason: '预警等级较低', priority: '常规' },
      { type: 'normal', icon: 'Location', text: '定期排查重点区域', reason: '预防性维护', priority: '常规' }
    ]
  }
})

// ========== 辅助函数 ==========

const getWeightClass = (score: number) => {
  if (score >= 15) return 'high'
  if (score >= 8) return 'medium'
  return 'low'
}

const getLevelIcon = (level: string) => {
  if (level === 'danger') return 'Warning'
  if (level === 'warning') return 'Bell'
  return 'Info'
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return '#67C23A'
  if (confidence >= 60) return '#E6A23C'
  return '#F56C6C'
}

const getStatusType = (status: string) => {
  if (status === '已执行') return 'success'
  if (status === '待复核') return 'warning'
  return 'info'
}

const getTrendClass = (current: number, prev: number): string => {
  if (current > prev) return 'trend-up'
  if (current < prev) return 'trend-down'
  return 'trend-stable'
}

const getTrendIcon = (current: number, prev: number): string => {
  if (current > prev) return '📈'
  if (current < prev) return '📉'
  return '→'
}

const getTrendValue = (current: number, prev: number): string => {
  if (current > prev) return `+${(current - prev).toFixed(0)}`
  if (current < prev) return `-${(prev - current).toFixed(0)}`
  return '0'
}

const markExecuted = (id: number) => {
  aiStore.markExecuted(id)
  ElMessage.success('已标记为执行')
}

const markReview = (id: number) => {
  aiStore.markReview(id)
  ElMessage.info('已转人工复核')
}

// ========== 监听器 ==========

watch(() => props.point, async (newPoint) => {
  if (newPoint) {
    console.log('📡 监听到 point 变化:', newPoint.name)
    await loadFullPointData()
    await fetchRainfallData()
    await loadSurroundingData()
    await callAIDecision()  // 调用真实 AI
  }
}, { immediate: true, deep: true })

onMounted(() => {
  console.log('🚀 RiskClassification 组件已挂载')
})
</script>

<style scoped>
/* 保持原有样式，并添加 AI 决策列表样式 */

.risk-classification {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: linear-gradient(135deg, #0a0e27 0%, #0f122e 100%);
  border-radius: 20px;
  padding: 20px;
  position: relative;
  overflow-y: auto;
  max-height: calc(100vh - 100px);
}

/* AI 决策列表 */
.ai-decisions {
  margin-bottom: 20px;
}

.decision-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.decision-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 14px;
  border-left: 4px solid;
  transition: all 0.3s ease;
}

.decision-item.danger {
  border-left-color: #ff3366;
  background: rgba(255, 51, 102, 0.08);
}

.decision-item.warning {
  border-left-color: #ff9933;
  background: rgba(255, 153, 51, 0.08);
}

.decision-item.info {
  border-left-color: #33ff66;
  background: rgba(51, 255, 102, 0.05);
}

.decision-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.decision-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.decision-confidence {
  font-size: 11px;
  color: #8a8fb0;
  min-width: 120px;
}

.decision-action,
.decision-target,
.decision-time {
  font-size: 12px;
  margin-bottom: 6px;
  color: #c0c5e0;
}

.decision-action .label,
.decision-target .label,
.decision-time .label {
  color: #66ccff;
  margin-right: 8px;
}

.decision-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.decision-actions {
  display: flex;
  gap: 12px;
}

/* 周边设施影响区域 */
.surrounding-impact {
  background: rgba(10, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(236, 72, 153, 0.3);
}

.impact-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 16px 0;
}

.impact-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.impact-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.08);
}

.impact-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #fff;
}

.impact-info {
  flex: 1;
}

.impact-value {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.impact-label {
  font-size: 11px;
  color: #8a8fb0;
}

.impact-weight {
  font-size: 14px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
}

.impact-weight.high {
  background: rgba(255, 51, 102, 0.2);
  color: #ff3366;
}

.impact-weight.medium {
  background: rgba(255, 153, 51, 0.2);
  color: #ff9933;
}

.impact-weight.low {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.critical-warning {
  margin-top: 16px;
  background: rgba(255, 51, 102, 0.1);
  border-radius: 12px;
  padding: 12px;
  border-left: 3px solid #ff3366;
}

.warning-title {
  font-size: 12px;
  font-weight: 600;
  color: #ff6699;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.facility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.facility-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  font-size: 12px;
}

.facility-type {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
}

.warning-level {
  padding: 0 6px;
  border-radius: 4px;
}

.warning-level.红色 {
  background: rgba(255, 51, 102, 0.3);
  color: #ff6699;
}

.warning-level.橙色 {
  background: rgba(255, 153, 51, 0.3);
  color: #ffaa66;
}

.warning-level.黄色 {
  background: rgba(255, 204, 0, 0.3);
  color: #ffcc44;
}

.facility-action {
  color: #ffaa66;
  font-size: 11px;
}

/* 其他原有样式保持不变 */
.risk-overview {
  display: flex;
  gap: 24px;
  align-items: center;
  background: rgba(10, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(0, 255, 255, 0.2);
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

.ai-prediction {
  background: rgba(10, 20, 40, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(102, 204, 255, 0.3);
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
