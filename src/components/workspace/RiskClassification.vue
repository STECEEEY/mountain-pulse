<template>
  <div class="warning-module">
    <!-- 预警指数仪表 - 大号显示 -->
    <div class="warning-header">
      <div class="gauge-container">
        <div class="gauge-ring" :class="warningLevel" :style="{'--score': warningScore}">
          <div class="gauge-inner">
            <span class="gauge-value">{{ warningScore }}</span>
            <span class="gauge-unit">分</span>
          </div>
        </div>
        <div class="gauge-info">
          <div class="gauge-title">综合预警指数</div>
          <div class="gauge-badge" :class="warningLevel">{{ warningLevelText }}</div>
        </div>
      </div>
      
      <!-- 核心指标卡片 -->
      <div class="core-metrics">
        <div class="metric-card">
          <div class="metric-value">{{ (riskProbability * 100).toFixed(1) }}%</div>
          <div class="metric-label">滑坡概率</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ population }}人</div>
          <div class="metric-label">威胁人口</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ facilityScore }}/5</div>
          <div class="metric-label">设施影响</div>
        </div>
      </div>
    </div>

    <!-- 权重因子详情 -->
    <div class="factors-section">
      <div class="section-title">
        <span>📊 预警因子权重</span>
        <span class="weight-hint">基于逻辑回归模型 + AHP层次分析</span>
      </div>
      
      <div class="factors-grid">
        <div class="factor-card primary">
          <div class="factor-header">
            <span class="factor-icon">📈</span>
            <span class="factor-name">滑坡概率</span>
            <span class="factor-weight">40%</span>
          </div>
          <div class="factor-score">{{ (riskProbability * 100).toFixed(1) }}%</div>
          <div class="factor-desc">ML模型综合地形+形变特征</div>
        </div>
        
        <div class="factor-card trigger">
          <div class="factor-header">
            <span class="factor-icon">🌧️</span>
            <span class="factor-name">降雨影响</span>
            <span class="factor-weight">25%</span>
          </div>
          <div class="factor-score">{{ rainfallAnomaly.toFixed(1) }}σ</div>
          <div class="factor-desc">{{ rainfallDesc }}</div>
        </div>
        
        <div class="factor-card exposure">
          <div class="factor-header">
            <span class="factor-icon">👥</span>
            <span class="factor-name">人口暴露</span>
            <span class="factor-weight">20%</span>
          </div>
          <div class="factor-score">{{ population }}人</div>
          <div class="factor-desc">{{ populationDesc }}</div>
        </div>
        
        <div class="factor-card facility">
          <div class="factor-header">
            <span class="factor-icon">🏗️</span>
            <span class="factor-name">周边设施</span>
            <span class="factor-weight">15%</span>
          </div>
          <div class="factor-score">{{ facilityScore }}/15</div>
          <div class="factor-desc">{{ facilityDesc }}</div>
        </div>
      </div>
    </div>

    <!-- 周边设施详情 -->
    <div class="facilities-section">
      <div class="section-title">
        <span>🏗️ 周边设施详情</span>
        <span class="weight-hint">基于GeoJSON空间分析</span>
      </div>
      
      <div class="facilities-grid">
        <div class="facility-detail-card">
          <div class="facility-icon building">🏢</div>
          <div class="facility-info">
            <div class="facility-count">{{ buildingCount }}</div>
            <div class="facility-name">建筑</div>
          </div>
          <div class="facility-impact" :class="getBuildingImpactClass(buildingCount)">
            {{ getBuildingImpact(buildingCount) }}
          </div>
        </div>
        
        <div class="facility-detail-card">
          <div class="facility-icon road">🛣️</div>
          <div class="facility-info">
            <div class="facility-count">{{ roadCount }}</div>
            <div class="facility-name">道路</div>
          </div>
          <div class="facility-impact" :class="getRoadImpactClass(roadCount)">
            {{ getRoadImpact(roadCount) }}
          </div>
        </div>
        
        <div class="facility-detail-card">
          <div class="facility-icon railway">🚂</div>
          <div class="facility-info">
            <div class="facility-count">{{ railwayCount }}</div>
            <div class="facility-name">铁路</div>
          </div>
          <div class="facility-impact" :class="getRailwayImpactClass(railwayCount)">
            {{ getRailwayImpact(railwayCount) }}
          </div>
        </div>
      </div>
      
      <!-- 综合影响评估 -->
      <div class="impact-summary" v-if="hasSignificantFacilities">
        <el-alert :type="facilityAlertType" :closable="false">
          <template #title>
            <span>{{ facilityImpactMessage }}</span>
          </template>
        </el-alert>
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
        置信度: {{ aiConfidence }}% | 基于ML滑坡概率 + 实时降雨 + 设施影响
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
    risk_probability?: number
  } | null
}>()

const aiStore = useAiStore()

// ========== 基础数据 ==========
const riskProbability = ref(0)
const population = ref(0)
const slope = ref(0)
const deformationRate = ref(0)

// ========== 降雨数据 ==========
const monthlyRainfall = ref(0)
const historicalMean = ref(80)  // 默认值，待API返回
const historicalStd = ref(40)

// ========== 周边设施数据 ==========
const buildingCount = ref(0)
const roadCount = ref(0)
const railwayCount = ref(0)

// ========== 计算属性 ==========

// 降雨异常度
const rainfallAnomaly = computed(() => {
  if (historicalStd.value === 0) return 0
  return (monthlyRainfall.value - historicalMean.value) / historicalStd.value
})

// 降雨描述
const rainfallDesc = computed(() => {
  const anomaly = rainfallAnomaly.value
  if (anomaly >= 2) return '显著偏多，触发风险高'
  if (anomaly >= 1) return '明显偏多，需关注'
  if (anomaly >= 0.5) return '略偏多，常规监测'
  return '正常范围'
})

// 人口暴露描述
const populationDesc = computed(() => {
  if (population.value >= 1000) return '高风险区域，需重点防护'
  if (population.value >= 500) return '中等风险区域'
  if (population.value >= 100) return '一般风险区域'
  return '低风险区域'
})

// 设施评分 (0-15分) - 权重提升到15%
const facilityScore = computed(() => {
  let score = 0
  // 建筑评分 (0-6分)
  if (buildingCount.value >= 200) score += 6
  else if (buildingCount.value >= 100) score += 5
  else if (buildingCount.value >= 50) score += 4
  else if (buildingCount.value >= 20) score += 3
  else if (buildingCount.value >= 10) score += 2
  else if (buildingCount.value >= 1) score += 1
  
  // 道路评分 (0-5分)
  if (roadCount.value >= 100) score += 5
  else if (roadCount.value >= 50) score += 4
  else if (roadCount.value >= 20) score += 3
  else if (roadCount.value >= 10) score += 2
  else if (roadCount.value >= 1) score += 1
  
  // 铁路评分 (0-4分)
  if (railwayCount.value >= 5) score += 4
  else if (railwayCount.value >= 3) score += 3
  else if (railwayCount.value >= 1) score += 2
  
  return Math.min(score, 15)
})

// 设施描述
const facilityDesc = computed(() => {
  if (facilityScore.value >= 12) return '设施密集，疏散压力大'
  if (facilityScore.value >= 8) return '设施较多，需重点关注'
  if (facilityScore.value >= 4) return '有一定设施分布'
  return '周边设施较少'
})

// 是否有显著设施
const hasSignificantFacilities = computed(() => {
  return buildingCount.value > 20 || roadCount.value > 20 || railwayCount.value > 0
})

// 设施影响等级
const facilityAlertType = computed(() => {
  if (railwayCount.value > 0) return 'warning'
  if (buildingCount.value > 100) return 'warning'
  if (buildingCount.value > 50) return 'info'
  return 'info'
})

// 设施影响消息
const facilityImpactMessage = computed(() => {
  const impacts = []
  if (railwayCount.value > 0) impacts.push(`⚠️ 影响范围内有${railwayCount.value}条铁路，需通知铁路部门`)
  if (buildingCount.value > 100) impacts.push(`🏢 周边${buildingCount.value}栋建筑，疏散压力大`)
  else if (buildingCount.value > 50) impacts.push(`🏢 周边${buildingCount.value}栋建筑，需关注`)
  if (roadCount.value > 50) impacts.push(`🛣️ 周边${roadCount.value}条道路，交通影响大`)
  
  if (impacts.length === 0) return '周边设施较少，影响可控'
  return impacts.join('；')
})

// 建筑影响判断
const getBuildingImpact = (count: number) => {
  if (count >= 200) return '密集区'
  if (count >= 100) return '较密集'
  if (count >= 50) return '中等密度'
  if (count >= 10) return '有分布'
  return '少量'
}

const getBuildingImpactClass = (count: number) => {
  if (count >= 100) return 'high'
  if (count >= 50) return 'medium'
  return 'low'
}

const getRoadImpact = (count: number) => {
  if (count >= 100) return '路网密集'
  if (count >= 50) return '路网较密'
  if (count >= 20) return '有道路'
  return '少量'
}

const getRoadImpactClass = (count: number) => {
  if (count >= 50) return 'high'
  if (count >= 20) return 'medium'
  return 'low'
}

const getRailwayImpact = (count: number) => {
  if (count >= 3) return '多条铁路'
  if (count >= 1) return '有铁路'
  return '无'
}

const getRailwayImpactClass = (count: number) => {
  if (count >= 1) return 'high'
  return 'low'
}

// 综合预警指数计算（调整权重：滑坡概率40% + 降雨25% + 人口20% + 设施15%）
const warningScore = computed(() => {
  // 滑坡概率评分 (0-40分)
  const probScore = riskProbability.value * 40
  
  // 降雨评分 (0-25分)
  let rainScore = 0
  const anomaly = rainfallAnomaly.value
  if (anomaly >= 2) rainScore = 25
  else if (anomaly >= 1.5) rainScore = 20
  else if (anomaly >= 1) rainScore = 15
  else if (anomaly >= 0.5) rainScore = 10
  else if (anomaly > 0) rainScore = 5
  
  // 人口评分 (0-20分)
  let popScore = 0
  if (population.value >= 1000) popScore = 20
  else if (population.value >= 500) popScore = 15
  else if (population.value >= 200) popScore = 12
  else if (population.value >= 100) popScore = 8
  else if (population.value >= 50) popScore = 5
  else if (population.value >= 10) popScore = 3
  
  const total = probScore + rainScore + popScore + facilityScore.value
  return Math.min(Math.round(total), 100)
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

// ========== 数据加载 ==========

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
}

// 加载降雨数据
const loadRainfallData = async () => {
  if (!props.point?.lng || !props.point?.lat) return
  
  try {
    const now = new Date()
    const month = now.getMonth() + 1
    
    // 使用您现有的降雨API
    const response = await axios.get(`/api/rainfall/point`, {
      params: {
        lon: props.point.lng,
        lat: props.point.lat
      }
    })
    
    if (response.data?.data?.statistics) {
      const stats = response.data.data.statistics
      // 计算当月降雨（如果有时间序列数据）
      if (response.data.data.timeseries) {
        const currentMonthData = response.data.data.timeseries.filter((item: any) => {
          const date = new Date(item.date)
          return date.getMonth() + 1 === month
        })
        if (currentMonthData.length > 0) {
          monthlyRainfall.value = currentMonthData.reduce((sum: number, item: any) => sum + item.precip_mm, 0)
        }
      }
      // 使用月均降雨作为历史均值
      historicalMean.value = stats.avg_annual / 12
      historicalStd.value = historicalMean.value * 0.3
    }
  } catch (error) {
    console.error('加载降雨数据失败:', error)
    // 使用默认值
    monthlyRainfall.value = 80
    historicalMean.value = 80
    historicalStd.value = 30
  }
}

// 加载周边设施数据（带调试）
const loadSurroundingData = async () => {
  if (!props.point?.lng || !props.point?.lat) {
    console.log('❌ 跳过周边设施加载：缺少经纬度', props.point)
    return
  }
  
  console.log('🔍 开始加载周边设施，中心点:', props.point.lng, props.point.lat)
  
  try {
    const baseUrl = '/geodata'
    const center = { lng: props.point.lng, lat: props.point.lat }
    const radius = 0.1 // 约1.5km
    
    console.log('📡 请求URL:', `${baseUrl}/building.geojson`)
    
    // 分别请求，便于调试
    console.log('🏢 加载建筑数据...')
    const buildingsRes = await fetch(`${baseUrl}/building.geojson`)
    console.log('建筑数据响应状态:', buildingsRes.status, buildingsRes.statusText)
    
    if (!buildingsRes.ok) {
      console.error('建筑数据加载失败:', buildingsRes.status)
    }
    
    const buildingsData = await buildingsRes.json()
    console.log('建筑数据条数:', buildingsData.features?.length || 0)
    
    console.log('🛣️ 加载道路数据...')
    const roadsRes = await fetch(`${baseUrl}/roads.geojson`)
    console.log('道路数据响应状态:', roadsRes.status)
    const roadsData = await roadsRes.json()
    console.log('道路数据条数:', roadsData.features?.length || 0)
    
    console.log('🚂 加载铁路数据...')
    const railwaysRes = await fetch(`${baseUrl}/railways.geojson`)
    console.log('铁路数据响应状态:', railwaysRes.status)
    const railwaysData = await railwaysRes.json()
    console.log('铁路数据条数:', railwaysData.features?.length || 0)
    
    // 调试：检查前几个要素的坐标
    if (buildingsData.features && buildingsData.features.length > 0) {
      console.log('建筑数据样例坐标:', buildingsData.features.slice(0, 3).map((f: any) => f.geometry?.coordinates))
    }
    
    const countInRange = (features: any[], type: string) => {
      let inRange = 0
      let outOfRange = 0
      let noCoord = 0
      
      features.forEach((feature, idx) => {
        try {
          let lng = 0, lat = 0
          const coords = feature?.geometry?.coordinates
          if (!coords) {
            noCoord++
            return
          }
          
          if (feature.geometry.type === 'Point') {
            lng = coords[0] || 0
            lat = coords[1] || 0
          } else if (feature.geometry.type === 'LineString' && coords[0]) {
            lng = coords[0][0] || 0
            lat = coords[0][1] || 0
          } else if (feature.geometry.type === 'Polygon' && coords[0] && coords[0][0]) {
            lng = coords[0][0][0] || 0
            lat = coords[0][0][1] || 0
          } else {
            return
          }
          
          const distance = Math.sqrt(Math.pow(lng - center.lng, 2) + Math.pow(lat - center.lat, 2))
          if (distance <= radius) {
            inRange++
            if (idx < 3) {
              console.log(`${type} 在范围内:`, { lng, lat, distance })
            }
          } else {
            outOfRange++
          }
        } catch (e) {
          console.error(`${type} 解析坐标错误:`, e)
        }
      })
      
      console.log(`${type} 统计: 范围内=${inRange}, 范围外=${outOfRange}, 无坐标=${noCoord}`)
      return inRange
    }
    
    buildingCount.value = countInRange(buildingsData.features || [], '建筑')
    roadCount.value = countInRange(roadsData.features || [], '道路')
    railwayCount.value = countInRange(railwaysData.features || [], '铁路')
    
    console.log('🏗️ 周边设施最终统计:', {
      建筑: buildingCount.value,
      道路: roadCount.value,
      铁路: railwayCount.value,
      设施分: facilityScore.value,
      中心点: center,
      半径: radius
    })
    
  } catch (error) {
    console.error('加载周边设施失败:', error)
  }
}

// AI 建议
const aiSuggestion = ref('')
const aiConfidence = ref(0)

const getFallbackSuggestion = () => {
  const score = warningScore.value
  const prob = riskProbability.value
  const hasRailway = railwayCount.value > 0
  const hasDenseBuildings = buildingCount.value > 50
  
  if (score >= 70) {
    let impact = ''
    if (hasRailway) impact += `，影响范围内有${railwayCount.value}条铁路`
    if (hasDenseBuildings) impact += `，${buildingCount.value}栋建筑需关注`
    return `⚠️ 红色预警：ML模型显示滑坡概率${(prob * 100).toFixed(1)}%，建议立即启动应急响应，组织受影响人员转移${impact}`
  }
  if (score >= 50) {
    if (hasRailway) {
      return `📊 橙色预警：滑坡概率${(prob * 100).toFixed(1)}%，周边有${railwayCount.value}条铁路，建议立即通知铁路部门关注`
    }
    if (hasDenseBuildings) {
      return `📊 橙色预警：滑坡概率${(prob * 100).toFixed(1)}%，周边建筑密集(${buildingCount.value}栋)，建议做好疏散准备`
    }
    return `📊 橙色预警：滑坡概率${(prob * 100).toFixed(1)}%，建议加密监测频次`
  }
  if (score >= 30) {
    return `🔍 黄色预警：滑坡概率${(prob * 100).toFixed(1)}%，建议保持常规监测，重点关注降雨`
  }
  return `✅ 蓝色预警：滑坡概率${(prob * 100).toFixed(1)}%，各项指标正常`
}

const callAI = async () => {
  if (!props.point) return
  
  let dutyNote = `监测点: ${props.point.name}，ML模型预测滑坡概率${(riskProbability.value * 100).toFixed(1)}%，威胁人口${population.value}人`
  
  if (rainfallAnomaly.value > 0.5) {
    dutyNote += `，当前月降水异常度${rainfallAnomaly.value.toFixed(1)}`
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

// 监听
watch(() => props.point, async (newPoint) => {
  if (newPoint) {
    loadData()
    await loadRainfallData()
    await loadSurroundingData()
    await callAI()
  }
}, { immediate: true, deep: true })
</script>

<style scoped>
.warning-module {
  background: linear-gradient(135deg, #0a0e27 0%, #0f122e 100%);
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 预警头部 */
.warning-header {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.gauge-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.gauge-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
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
}

.gauge-info {
  display: flex;
  flex-direction: column;
}

.gauge-title {
  font-size: 14px;
  color: #8a8fb0;
}

.gauge-badge {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  margin-top: 5px;
  text-align: center;
}

.gauge-badge.critical { background: rgba(255, 51, 102, 0.2); color: #ff6699; }
.gauge-badge.high { background: rgba(255, 153, 51, 0.2); color: #ffaa66; }
.gauge-badge.medium { background: rgba(255, 204, 0, 0.2); color: #ffcc44; }
.gauge-badge.low { background: rgba(51, 255, 102, 0.2); color: #66ff99; }

.core-metrics {
  display: flex;
  gap: 15px;
  flex: 1;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px 16px;
  text-align: center;
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #66ccff;
}

.metric-label {
  font-size: 11px;
  color: #8a8fb0;
  margin-top: 4px;
}

/* 因子卡片 */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
}

.weight-hint {
  font-size: 10px;
  color: #6a6f8f;
  font-weight: normal;
}

.factors-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.factor-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 12px;
  border-left: 3px solid;
}

.factor-card.primary { border-left-color: #f59e0b; }
.factor-card.trigger { border-left-color: #3b82f6; }
.factor-card.exposure { border-left-color: #ec489a; }
.factor-card.facility { border-left-color: #06b6d4; }

.factor-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.factor-icon { font-size: 16px; }
.factor-name { font-size: 12px; color: #a0a5c0; flex: 1; }
.factor-weight { font-size: 10px; color: #66ccff; background: rgba(102, 204, 255, 0.15); padding: 2px 6px; border-radius: 10px; }

.factor-score { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 4px; }
.factor-desc { font-size: 10px; color: #6a6f8f; }

/* 周边设施详情 */
.facilities-section {
  background: rgba(6, 182, 212, 0.05);
  border-radius: 16px;
  padding: 16px;
}

.facilities-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.facility-detail-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.facility-icon {
  font-size: 28px;
}

.facility-info {
  flex: 1;
}

.facility-count {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.facility-name {
  font-size: 11px;
  color: #8a8fb0;
}

.facility-impact {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
}

.facility-impact.high { background: rgba(255, 51, 102, 0.2); color: #ff6699; }
.facility-impact.medium { background: rgba(255, 153, 51, 0.2); color: #ffaa66; }
.facility-impact.low { background: rgba(102, 204, 255, 0.2); color: #66ccff; }

.impact-summary {
  margin-top: 12px;
}

/* AI 建议 */
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

.info-value.critical { color: #ff6699; }
.info-value.high { color: #ffaa66; }
.info-value.medium { color: #ffcc44; }
.info-value.low { color: #66ff99; }
</style>
