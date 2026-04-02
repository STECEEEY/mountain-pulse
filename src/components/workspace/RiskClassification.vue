<template>
  <div class="warning-module">
    <!-- 预警指数仪表 -->
    <div class="warning-gauge">
      <div class="gauge-container">
        <div class="gauge-ring" :class="warningLevel" :style="{'--score': warningScore}">
          <div class="gauge-inner">
            <span class="gauge-value">{{ warningScore }}</span>
            <span class="gauge-unit">分</span>
          </div>
        </div>
        <div class="gauge-title">综合预警指数</div>
        <div class="gauge-badge">{{ warningLevelText }}</div>
      </div>
      
      <!-- 影响因素（权重可视化） -->
      <div class="factors-list">
        <div class="factor-item">
          <div class="factor-header">
            <span class="factor-name">📊 滑坡概率 (40%)</span>
            <span class="factor-value">{{ probabilityScore }} / 40</span>
          </div>
          <el-progress :percentage="probabilityScore / 40 * 100" :stroke-width="4" color="#f59e0b" :show-text="false" />
        </div>
        <div class="factor-item">
          <div class="factor-header">
            <span class="factor-name">🌧️ 降雨影响 (25%)</span>
            <span class="factor-value">{{ rainfallScore }} / 25</span>
          </div>
          <el-progress :percentage="rainfallScore / 25 * 100" :stroke-width="4" color="#3b82f6" :show-text="false" />
        </div>
        <div class="factor-item">
          <div class="factor-header">
            <span class="factor-name">👥 威胁人口 (20%)</span>
            <span class="factor-value">{{ populationScore }} / 20</span>
          </div>
          <el-progress :percentage="populationScore / 20 * 100" :stroke-width="4" color="#ec489a" :show-text="false" />
        </div>
        <div class="factor-item">
          <div class="factor-header">
            <span class="factor-name">⛰️ 地形坡度 (10%)</span>
            <span class="factor-value">{{ slopeScoreValue }} / 10</span>
          </div>
          <el-progress :percentage="slopeScoreValue / 10 * 100" :stroke-width="4" color="#8b5cf6" :show-text="false" />
        </div>
        <div class="factor-item" v-if="hasSurroundingData">
          <div class="factor-header">
            <span class="factor-name">🏗️ 周边设施 (5%)</span>
            <span class="factor-value">{{ facilityScore }} / 5</span>
          </div>
          <el-progress :percentage="facilityScore / 5 * 100" :stroke-width="4" color="#06b6d4" :show-text="false" />
        </div>
      </div>
    </div>

    <!-- 周边设施统计 -->
    <div class="surrounding-stats" v-if="hasSurroundingData">
      <div class="stats-title">
        <el-icon><Location /></el-icon>
        周边设施统计
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-icon">🏗️</span>
          <span class="stat-value">{{ buildingCount }}</span>
          <span class="stat-label">栋建筑</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🛣️</span>
          <span class="stat-value">{{ roadCount }}</span>
          <span class="stat-label">条道路</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">🚂</span>
          <span class="stat-value">{{ railwayCount }}</span>
          <span class="stat-label">条铁路</span>
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
        置信度: {{ aiConfidence }}% | ML模型滑坡概率: {{ (riskProbability * 100).toFixed(1) }}%
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
          <span class="info-label">地形坡度</span>
          <span class="info-value">{{ slope }}°</span>
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
import { Cpu, Warning, Location } from '@element-plus/icons-vue'
import { useAiStore } from '@/stores/ai'
import type { DecisionRequest } from '@/services/aiService'
import axios from 'axios'

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
    risk_probability?: number  // ML模型输出的滑坡概率
  } | null
}>()

const aiStore = useAiStore()

// ========== 基础数据 ==========
const riskProbability = ref(0)      // ML滑坡概率 (0-1)
const population = ref(0)           // 威胁人口
const slope = ref(0)                // 地形坡度
const deformationRate = ref(0)      // 形变速率

// ========== 降雨数据 ==========
const monthlyRainfall = ref(0)       // 当月降水量
const historicalMean = ref(0)        // 历史同期均值
const historicalStd = ref(0)         // 历史同期标准差
const rainfallLoading = ref(false)

// ========== 周边设施数据 ==========
const buildingCount = ref(0)
const roadCount = ref(0)
const railwayCount = ref(0)
const surroundingLoading = ref(false)

const hasSurroundingData = computed(() => {
  return buildingCount.value > 0 || roadCount.value > 0 || railwayCount.value > 0
})

// ========== 各因子评分计算 ==========

// 1. 滑坡概率评分 (0-40分)
const probabilityScore = computed(() => {
  return Math.min(riskProbability.value * 40, 40)
})

// 2. 降雨影响评分 (0-25分) - 基于月降水异常度
const rainfallScore = computed(() => {
  if (historicalStd.value === 0 || monthlyRainfall.value === 0) return 0
  
  const anomaly = (monthlyRainfall.value - historicalMean.value) / historicalStd.value
  
  if (anomaly >= 2.0) return 25   // 显著偏多
  if (anomaly >= 1.5) return 20   // 明显偏多
  if (anomaly >= 1.0) return 15   // 偏多
  if (anomaly >= 0.5) return 10   // 略多
  if (anomaly >= 0) return 5      // 正常
  return 0                         // 偏少
})

// 3. 人口评分 (0-20分)
const populationScore = computed(() => {
  const pop = population.value
  if (pop >= 1000) return 20
  if (pop >= 500) return 15
  if (pop >= 200) return 12
  if (pop >= 100) return 8
  if (pop >= 50) return 5
  if (pop >= 10) return 3
  return 0
})

// 4. 坡度评分 (0-10分)
const slopeScoreValue = computed(() => {
  const s = slope.value
  if (s >= 35) return 10
  if (s >= 25) return 8
  if (s >= 15) return 5
  if (s >= 8) return 3
  return 1
})

// 5. 设施评分 (0-5分)
const facilityScore = computed(() => {
  let score = 0
  score += Math.min(buildingCount.value / 20, 2)   // 建筑最多2分
  score += Math.min(roadCount.value / 10, 2)       // 道路最多2分
  score += Math.min(railwayCount.value * 1, 1)     // 铁路最多1分
  return Math.min(score, 5)
})

// ========== 综合预警指数计算 ==========
const warningScore = computed(() => {
  const rawScore = 
    probabilityScore.value * 0.40 +
    rainfallScore.value * 0.25 +
    populationScore.value * 0.20 +
    slopeScoreValue.value * 0.10 +
    facilityScore.value * 0.05
  
  return Math.min(Math.round(rawScore), 100)
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
  const map: Record<string, string> = {
    critical: '红色预警',
    high: '橙色预警',
    medium: '黄色预警',
    low: '蓝色预警'
  }
  return map[warningLevel.value] || '正常监测'
})

// ========== 数据加载函数 ==========

// 加载基础数据
const loadData = () => {
  if (!props.point) return
  
  riskProbability.value = props.point.risk_probability || 0
  slope.value = props.point.slope || 0
  deformationRate.value = props.point.velocity || 0
  
  if (props.point.actual_population) {
    population.value = props.point.actual_population
  } else if (props.point.threat) {
    const match = props.point.threat.match(/\d+/)
    population.value = match ? parseInt(match[0]) : 0
  }
  
  console.log('📊 数据加载:', {
    滑坡概率: riskProbability.value,
    坡度: slope.value,
    人口: population.value
  })
}

// 加载降雨数据（需要根据您的API调整）
const loadRainfallData = async () => {
  if (!props.point?.lng || !props.point?.lat) return
  
  rainfallLoading.value = true
  
  try {
    // 获取当前月份
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    
    // 调用您的降水数据API
    // 请根据您实际的API接口修改
    const response = await axios.get('/api/rainfall/statistics', {
      params: {
        lng: props.point.lng,
        lat: props.point.lat,
        month: currentMonth
      }
    })
    
    if (response.data) {
      monthlyRainfall.value = response.data.current_month_rainfall || 0
      historicalMean.value = response.data.historical_mean || 0
      historicalStd.value = response.data.historical_std || 1
    }
    
    console.log('🌧️ 降雨数据:', {
      当月降雨: monthlyRainfall.value,
      历史均值: historicalMean.value,
      异常度: ((monthlyRainfall.value - historicalMean.value) / historicalStd.value).toFixed(2)
    })
  } catch (error) {
    console.error('加载降雨数据失败:', error)
  } finally {
    rainfallLoading.value = false
  }
}

// 加载周边设施数据
const loadSurroundingData = async () => {
  if (!props.point?.lng || !props.point?.lat) return
  
  surroundingLoading.value = true
  
  try {
    const baseUrl = '/geodata'
    const center = { lng: props.point.lng, lat: props.point.lat }
    const radius = 0.01 // 约1km范围
    
    const [buildingsRes, roadsRes, railwaysRes] = await Promise.allSettled([
      fetch(`${baseUrl}/building.geojson`).then(res => res.json()).catch(() => ({ features: [] })),
      fetch(`${baseUrl}/roads.geojson`).then(res => res.json()).catch(() => ({ features: [] })),
      fetch(`${baseUrl}/railways.geojson`).then(res => res.json()).catch(() => ({ features: [] }))
    ])
    
    const getFeatures = (result: PromiseSettledResult<any>) => {
      if (result.status === 'fulfilled' && result.value?.features) {
        return result.value.features
      }
      return []
    }
    
    const countInRange = (features: any[]) => {
      return features.filter(feature => {
        try {
          let lng = 0, lat = 0
          const coords = feature?.geometry?.coordinates
          if (!coords) return false
          
          if (feature.geometry.type === 'Point') {
            lng = coords[0] || 0
            lat = coords[1] || 0
          } else if (feature.geometry.type === 'LineString' && coords[0]) {
            lng = coords[0][0] || 0
            lat = coords[0][1] || 0
          } else if (feature.geometry.type === 'Polygon' && coords[0] && coords[0][0]) {
            lng = coords[0][0][0] || 0
            lat = coords[0][0][1] || 0
          }
          
          const distance = Math.sqrt(Math.pow(lng - center.lng, 2) + Math.pow(lat - center.lat, 2))
          return distance <= radius
        } catch {
          return false
        }
      }).length
    }
    
    buildingCount.value = countInRange(getFeatures(buildingsRes))
    roadCount.value = countInRange(getFeatures(roadsRes))
    railwayCount.value = countInRange(getFeatures(railwaysRes))
    
    console.log('🏗️ 周边设施:', {
      建筑: buildingCount.value,
      道路: roadCount.value,
      铁路: railwayCount.value,
      设施分: facilityScore.value
    })
  } catch (error) {
    console.error('加载周边设施失败:', error)
  } finally {
    surroundingLoading.value = false
  }
}

// ========== AI 建议 ==========
const aiSuggestion = ref('')
const aiConfidence = ref(0)

const getFallbackSuggestion = () => {
  const score = warningScore.value
  const prob = riskProbability.value
  
  if (score >= 70) {
    let impact = ''
    if (railwayCount.value > 0) impact = `，影响范围内有${railwayCount.value}条铁路`
    if (buildingCount.value > 50) impact += `，${buildingCount.value}栋建筑需关注`
    return `⚠️ 红色预警：ML模型显示滑坡概率${(prob * 100).toFixed(1)}%，建议立即启动应急响应，组织受影响人员转移${impact}`
  }
  if (score >= 50) {
    if (railwayCount.value > 0) {
      return `📊 橙色预警：滑坡概率${(prob * 100).toFixed(1)}%，周边有${railwayCount.value}条铁路，建议通知铁路部门关注`
    }
    if (buildingCount.value > 30) {
      return `📊 橙色预警：滑坡概率${(prob * 100).toFixed(1)}%，周边建筑密集(${buildingCount.value}栋)，建议做好疏散准备`
    }
    return `📊 橙色预警：滑坡概率${(prob * 100).toFixed(1)}%，建议加强巡查监测`
  }
  if (score >= 30) {
    return `🔍 黄色预警：滑坡概率${(prob * 100).toFixed(1)}%，建议保持常规监测，重点关注降雨`
  }
  return `✅ 蓝色预警：滑坡概率${(prob * 100).toFixed(1)}%，各项指标正常，保持常规监测`
}

const callAI = async () => {
  if (!props.point) return
  
  // 构建提示词
  let dutyNote = `监测点: ${props.point.name}，ML模型预测滑坡概率${(riskProbability.value * 100).toFixed(1)}%，坡度${slope.value}°，威胁人口${population.value}人`
  
  if (rainfallScore.value > 0) {
    dutyNote += `，当前月降水异常度${((monthlyRainfall.value - historicalMean.value) / historicalStd.value).toFixed(2)}`
  }
  if (buildingCount.value > 0) dutyNote += `，周边${buildingCount.value}栋建筑`
  if (roadCount.value > 0) dutyNote += `，周边${roadCount.value}条道路`
  if (railwayCount.value > 0) dutyNote += `，周边${railwayCount.value}条铁路`
  
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
    aiSuggestion.value = firstDecision?.action || getFallbackSuggestion()
    aiConfidence.value = firstDecision?.confidence ?? 70
  } else {
    aiSuggestion.value = getFallbackSuggestion()
    aiConfidence.value = 70
  }
}

// ========== 监听点位变化 ==========
watch(() => props.point, async (newPoint) => {
  if (newPoint) {
    console.log('📡 监听到 point 变化:', newPoint.name)
    loadData()
    await loadRainfallData()
    await loadSurroundingData()
    await callAI()
  }
}, { immediate: true, deep: true })

onMounted(() => {
  console.log('🚀 预警模块已加载，权重分配: 滑坡概率40% + 降雨25% + 人口20% + 坡度10% + 设施5%')
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
  align-items: flex-start;
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
  background: conic-gradient(#ff3366 0deg, #ff3366 calc(360deg * var(--score, 0) / 100), #1a1f3a calc(360deg * var(--score, 0) / 100));
}
.gauge-ring.high {
  background: conic-gradient(#ff9933 0deg, #ff9933 calc(360deg * var(--score, 0) / 100), #1a1f3a calc(360deg * var(--score, 0) / 100));
}
.gauge-ring.medium {
  background: conic-gradient(#ffcc00 0deg, #ffcc00 calc(360deg * var(--score, 0) / 100), #1a1f3a calc(360deg * var(--score, 0) / 100));
}
.gauge-ring.low {
  background: conic-gradient(#33ff66 0deg, #33ff66 calc(360deg * var(--score, 0) / 100), #1a1f3a calc(360deg * var(--score, 0) / 100));
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
  gap: 10px;
  min-width: 180px;
}

.factor-item {
  width: 100%;
}

.factor-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 11px;
}

.factor-name {
  color: #a0a5c0;
}

.factor-value {
  color: #66ccff;
  font-family: monospace;
}

/* 周边设施统计 */
.surrounding-stats {
  background: rgba(6, 182, 212, 0.1);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.stats-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #06b6d4;
  margin-bottom: 10px;
}

.stats-grid {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 20px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.stat-label {
  font-size: 10px;
  color: #8a8fb0;
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
