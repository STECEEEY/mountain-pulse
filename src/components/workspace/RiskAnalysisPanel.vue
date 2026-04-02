<template>
  <div class="risk-analysis">
    <div class="section-title">风险统计概览</div>

    <!-- 监测点选择器 -->
    <div class="point-selector">
      <label>监测点：</label>
      <input 
        type="text" 
        v-model="searchText" 
        @input="onSearch"
        placeholder="输入监测点名称搜索..."
        class="search-input"
      />
      <select v-if="searchResults.length > 0" v-model="selectedPointId" @change="onPointChange" class="result-select">
        <option v-for="point in searchResults" :key="point.name" :value="point.name">
          {{ point.name }} ({{ point.level }})
        </option>
      </select>
    </div>

    <!-- 当前监测点信息 -->
    <div v-if="currentPoint" class="point-summary">
      <div class="summary-item">
        <span class="summary-label">监测点</span>
        <span class="summary-value">{{ currentPoint.name }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">风险等级</span>
        <span class="summary-value" :class="getRiskLevelClass(currentPoint.level)">
          {{ currentPoint.level }}
        </span>
      </div>
      <div class="summary-item">
        <span class="summary-label">灾害类型</span>
        <span class="summary-value">{{ currentPoint.type }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">威胁对象</span>
        <span class="summary-value">{{ currentPoint.threat }}</span>
      </div>
    </div>

    <!-- 风险因子分析标题 -->
    <div class="section-title">风险因子分析</div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 综合风险评分 -->
    <div v-else-if="totalRiskScore !== null" class="risk-score-summary">
      <span class="score-label">综合风险评分</span>
      <span class="score-value" :class="getRiskLevelClassByScore(totalRiskScore)">
        {{ (totalRiskScore * 100).toFixed(1) }}分
      </span>
      <span class="score-level">{{ riskLevelText }}</span>
    </div>

    <!-- 风险因子列表 - 基于真实权重展示 -->
    <div v-if="dynamicFactors" class="factors-list">
      <div 
        v-for="factor in dynamicFactors" 
        :key="factor.name"
        class="factor-card"
        :class="{ 
          'primary-driver': factor.name === topRiskFactor,
          [`risk-${factor.riskLevel}`]: true
        }"
      >
        <div class="factor-header">
          <div class="factor-name">
            {{ factor.name }}
            <span v-if="factor.name === topRiskFactor" class="driver-badge">
              主要驱动因子
            </span>
          </div>
          <div class="factor-weight">
            风险权重
            <strong :class="`weight-${factor.riskLevel}`">
              {{ (factor.weight * 100).toFixed(1) }}%
            </strong>
          </div>
        </div>

        <div class="factor-body">
          <div class="actual-value" :class="`value-${factor.riskLevel}`">
            <div class="value-label">实际测量值</div>
            <div class="value-number">{{ factor.displayValue }}</div>
          </div>

          <div class="scale-container">
            <div class="scale-labels">
              <span>低风险</span>
              <span>中风险</span>
              <span>高风险</span>
            </div>
            <div class="scale-bar-bg">
              <div 
                class="scale-fill" 
                :style="{ width: factor.weight * 100 + '%' }"
                :class="factor.riskLevel"
              ></div>
            </div>
            <div class="risk-indicator" :style="{ left: factor.weight * 100 + '%' }">
              {{ (factor.weight * 100).toFixed(0) }}%
            </div>
          </div>
        </div>

        <div class="factor-desc">
          <span class="desc-icon">📊</span>
          {{ factor.description }}
        </div>
      </div>
    </div>

    <!-- 风险贡献度分析 -->
    <div v-if="dynamicFactors" class="contribution-analysis">
      <div class="section-title">风险贡献度分析</div>
      <div class="contribution-bars">
        <div 
          v-for="factor in dynamicFactors" 
          :key="factor.name"
          class="contribution-item"
        >
          <span class="contribution-name">{{ factor.name }}</span>
          <div class="contribution-bar-bg">
            <div 
              class="contribution-bar" 
              :style="{ width: factor.contribution * 100 + '%' }"
              :class="factor.riskLevel"
            ></div>
          </div>
          <span class="contribution-percent">{{ (factor.contribution * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <!-- 风险建议 -->
    <div v-if="totalRiskScore !== null" class="risk-suggestion">
      <div class="section-title">防治建议</div>
      <div class="suggestion-content">
        <div class="suggestion-icon">⚠️</div>
        <div class="suggestion-text">{{ getRiskSuggestion() }}</div>
      </div>
    </div>

    <div v-else-if="!isLoading" class="empty-state">请选择一个监测点</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { riskService } from '@/services/riskService'
import type { RiskPoint, RiskStatistics } from '@/types/risk'

// 真实特征权重（从你的RandomForest模型提取）
const FEATURE_WEIGHTS = {
  slope: 0.3540,      // 坡度 35.40%
  elevation: 0.2205,  // 高程 22.05%
  curvature: 0.1573,  // 曲率 15.73%
  aspect: 0.0913,     // 坡向 9.13%
  velocity: 0.0903,   // 形变速率 9.03%
  abs_velocity: 0.0866 // 绝对形变速率 8.66%
}

// 特征归一化函数（将实际值映射到0-1风险贡献）
const normalizeValue = (value: number, low: number, medium: number, high: number): number => {
  const absVal = Math.abs(value)
  if (absVal <= low) return 0.2
  if (absVal <= medium) return 0.5
  if (absVal <= high) return 0.8
  return 1.0
}

// 获取风险等级样式
const getRiskLevelClass = (level: string): string => {
  const classMap: Record<string, string> = {
    '极高风险': 'risk-extreme',
    '高': 'risk-high',
    '中': 'risk-medium',
    '低': 'risk-low'
  }
  return classMap[level] || 'risk-medium'
}

// 根据分数获取风险等级样式
const getRiskLevelClassByScore = (score: number): string => {
  if (score >= 0.8) return 'risk-extreme'
  if (score >= 0.6) return 'risk-high'
  if (score >= 0.4) return 'risk-medium'
  return 'risk-low'
}

// 获取风险等级文本
const getRiskLevelText = (score: number): string => {
  if (score >= 0.8) return '极高风险'
  if (score >= 0.6) return '高风险'
  if (score >= 0.4) return '中风险'
  return '低风险'
}

// 描述函数
const getSlopeDesc = (slope: number): string => {
  if (slope > 40) return `坡度为 ${slope.toFixed(1)}°，坡度极陡，下滑力巨大，是本次评估的最主要驱动因子`
  if (slope > 25) return `坡度为 ${slope.toFixed(1)}°，坡度较陡，下滑力较大，需重点关注`
  if (slope > 10) return `坡度为 ${slope.toFixed(1)}°，坡度适中，相对稳定`
  return `坡度为 ${slope.toFixed(1)}°，坡度平缓，稳定性较好`
}

const getElevationDesc = (elevation: number): string => {
  if (elevation >= 50 && elevation <= 200) return `高程 ${elevation.toFixed(0)}m，处于滑坡易发高程范围（50-200m），风险较高`
  if (elevation < 50) return `高程 ${elevation.toFixed(0)}m，高程较低，地形平坦，风险较低`
  return `高程 ${elevation.toFixed(0)}m，高程较高，地形复杂，需综合评估`
}

const getVelocityDesc = (velocity: number): string => {
  const absVal = Math.abs(velocity)
  if (absVal > 30) return `形变速率为 ${absVal.toFixed(2)}mm/年，形变剧烈，处于加速变形阶段，需立即采取措施`
  if (absVal > 15) return `形变速率为 ${absVal.toFixed(2)}mm/年，形变明显，处于活跃期，需加强监测`
  if (absVal > 5) return `形变速率为 ${absVal.toFixed(2)}mm/年，形变较缓，处于稳定变形阶段`
  return `形变速率为 ${absVal.toFixed(2)}mm/年，形变微弱，坡体基本稳定`
}

const getCurvatureDesc = (curvature: number): string => {
  const absVal = Math.abs(curvature)
  if (absVal > 0.5) return `曲率绝对值较大，地形起伏明显，易形成滑坡边界，贡献度较高`
  if (absVal > 0.1) return `曲率适中，地形有一定起伏`
  return `地形平缓，曲率较小`
}

const getAspectDesc = (aspect: number): string => {
  if (aspect >= 45 && aspect <= 135) return `坡向朝东，迎风坡，降雨较多，风险相对较高`
  if (aspect >= 225 && aspect <= 315) return `坡向朝西，背风坡，风险相对较低`
  return `坡向影响适中`
}

// 计算动态风险因子
const calculateDynamicFactors = (point: RiskPoint) => {
  // 计算各特征的风险权重（归一化值）
  const slopeRisk = normalizeValue(point.slope, 10, 25, 40)
  const elevationRisk = normalizeValue(point.elevation, 20, 200, 500)
  const velocityRisk = normalizeValue(point.velocity, 5, 15, 30)
  const curvatureRisk = normalizeValue(point.curvature || 0, 0.1, 0.5, 1.0)
  const aspectRisk = 0.5  // 坡向固定中等风险
  
  // 获取显示值
  const absVelocity = Math.abs(point.velocity)
  
  // 计算加权综合风险评分（使用真实权重）
  const weightedScore = 
    slopeRisk * FEATURE_WEIGHTS.slope +
    elevationRisk * FEATURE_WEIGHTS.elevation +
    velocityRisk * (FEATURE_WEIGHTS.velocity + FEATURE_WEIGHTS.abs_velocity) +
    curvatureRisk * FEATURE_WEIGHTS.curvature +
    aspectRisk * FEATURE_WEIGHTS.aspect
  
  // 总权重归一化（因为权重之和为1）
  const totalRiskScore = weightedScore
  
  // 计算每个因子的贡献度
  const rawContributions = {
    slope: slopeRisk * FEATURE_WEIGHTS.slope,
    elevation: elevationRisk * FEATURE_WEIGHTS.elevation,
    velocity: velocityRisk * (FEATURE_WEIGHTS.velocity + FEATURE_WEIGHTS.abs_velocity),
    curvature: curvatureRisk * FEATURE_WEIGHTS.curvature,
    aspect: aspectRisk * FEATURE_WEIGHTS.aspect
  }
  
  const totalContribution = Object.values(rawContributions).reduce((a, b) => a + b, 0)
  
  // 找出主要驱动因子
  let topFactorName = '坡度'
  let maxWeight = slopeRisk
  
  const factorsList = [
    { name: '坡度', risk: slopeRisk, contrib: rawContributions.slope, actual: point.slope, unit: '°', desc: getSlopeDesc(point.slope) },
    { name: '高程', risk: elevationRisk, contrib: rawContributions.elevation, actual: point.elevation, unit: 'm', desc: getElevationDesc(point.elevation) },
    { name: '形变速率', risk: velocityRisk, contrib: rawContributions.velocity, actual: absVelocity, unit: 'mm/年', desc: getVelocityDesc(point.velocity) },
    { name: '曲率', risk: curvatureRisk, contrib: rawContributions.curvature, actual: point.curvature || 0, unit: '', desc: getCurvatureDesc(point.curvature || 0) },
    { name: '坡向', risk: aspectRisk, contrib: rawContributions.aspect, actual: point.aspect || 0, unit: '°', desc: getAspectDesc(point.aspect || 0) }
  ]
  
  // 找出最大权重因子
  for (const f of factorsList) {
    if (f.risk > maxWeight) {
      maxWeight = f.risk
      topFactorName = f.name
    }
  }
  
  // 构建动态因子数组
  const dynamicFactors = factorsList.map(f => ({
    name: f.name,
    actualValue: f.actual,
    displayValue: f.name === '形变速率' ? `${f.actual.toFixed(2)}${f.unit}` : `${f.actual.toFixed(2)}${f.unit}`,
    weight: f.risk,
    riskLevel: f.risk >= 0.7 ? 'high' : (f.risk >= 0.4 ? 'medium' : 'low'),
    contribution: f.contrib / totalContribution,
    description: f.desc,
    unit: f.unit
  }))
  
  return {
    factors: dynamicFactors,
    totalRiskScore,
    topRiskFactor: topFactorName,
    riskLevel: getRiskLevelText(totalRiskScore)
  }
}

const stats = ref<RiskStatistics | null>(null)
const pointsList = ref<RiskPoint[]>([])
const selectedPointId = ref<string>('')
const currentPoint = ref<RiskPoint | null>(null)
const searchText = ref('')
const searchResults = ref<RiskPoint[]>([])
const isLoading = ref(false)
const dynamicFactors = ref<any[] | null>(null)
const totalRiskScore = ref<number | null>(null)
const topRiskFactor = ref<string>('')
const riskLevelText = ref<string>('')

// 获取风险建议
const getRiskSuggestion = () => {
  const score = totalRiskScore.value || 0
  
  if (score >= 0.8) {
    return `当前监测点综合风险极高（${(score * 100).toFixed(1)}分），主要驱动因子为"${topRiskFactor.value}"。建议立即启动应急预案，组织人员撤离，并加强监测频率至实时监测。`
  }
  
  if (score >= 0.6) {
    if (topRiskFactor.value === '形变速率') {
      return `当前监测点形变速率较高，坡体处于活跃期。建议加密监测频次，每周至少监测2-3次，并关注降雨等诱发因素。`
    }
    if (topRiskFactor.value === '坡度') {
      return `当前监测点坡度较陡，地形条件不利。建议进行坡面防护，设置截排水设施，并定期巡查。`
    }
    return `当前监测点风险较高（${(score * 100).toFixed(1)}分），主要受${topRiskFactor.value}影响。建议加强监测预警，制定防治方案。`
  }
  
  if (score >= 0.4) {
    return `当前监测点存在一定风险（${(score * 100).toFixed(1)}分），建议保持常规监测频率，定期巡查，关注形变速率变化趋势。`
  }
  
  return `当前监测点风险较低（${(score * 100).toFixed(1)}分），保持常规监测即可，建议每季度进行一次全面评估。`
}

// 监测点切换事件
const onPointChange = async () => {
  const point = pointsList.value.find(p => p.name === selectedPointId.value)
  if (point) {
    isLoading.value = true
    currentPoint.value = point
    
    // 模拟异步加载（实际可以去掉setTimeout）
    setTimeout(() => {
      const result = calculateDynamicFactors(point)
      dynamicFactors.value = result.factors
      totalRiskScore.value = result.totalRiskScore
      topRiskFactor.value = result.topRiskFactor
      riskLevelText.value = result.riskLevel
      isLoading.value = false
    }, 100)
    
    searchText.value = point.name
    searchResults.value = []
  }
}

// 加载数据
const loadData = async () => {
  try {
    const [statsRes, pointsRes] = await Promise.all([
      riskService.loadRiskStatistics(),
      riskService.loadRiskPoints()
    ])
    stats.value = statsRes
    pointsList.value = pointsRes.points
    
    if (pointsList.value && pointsList.value.length > 0 && pointsList.value[0]) {
      selectedPointId.value = pointsList.value[0].name
      await onPointChange()
    }
  } catch (error) {
    console.error('Risk analysis panel load failed:', error)
  }
}

// 搜索方法
const onSearch = () => {
  if (!searchText.value.trim()) {
    searchResults.value = []
    return
  }
  searchResults.value = pointsList.value.filter(point => 
    point.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.risk-analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
  border-left: 3px solid #00f0ff;
  padding-left: 10px;
  margin-bottom: 4px;
}

/* 监测点选择器 */
.point-selector {
  background: rgba(8, 27, 44, 0.75);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.point-selector label {
  color: #9ec0d8;
  font-size: 13px;
  font-weight: 500;
}

.search-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 200, 255, 0.3);
  color: #e8f5ff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.search-input:focus {
  outline: none;
  border-color: #00f0ff;
}

.result-select {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 200, 255, 0.3);
  color: #e8f5ff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

/* 监测点摘要 */
.point-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  background: rgba(8, 27, 44, 0.75);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 11px;
  color: #9ec0d8;
}

.summary-value {
  font-size: 14px;
  font-weight: 600;
  color: #e8f5ff;
}

.summary-value.risk-extreme {
  color: #ff4444;
}

.summary-value.risk-high {
  color: #ff8844;
}

.summary-value.risk-medium {
  color: #ffaa44;
}

.summary-value.risk-low {
  color: #44ff88;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  background: rgba(8, 27, 44, 0.75);
  border-radius: 12px;
  color: #00f0ff;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 240, 255, 0.3);
  border-top-color: #00f0ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 风险评分摘要 */
.risk-score-summary {
  background: linear-gradient(135deg, rgba(0, 200, 255, 0.1), rgba(0, 100, 150, 0.2));
  border: 1px solid rgba(0, 200, 255, 0.3);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.score-label {
  font-size: 13px;
  color: #9ec0d8;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
}

.score-value.risk-extreme {
  color: #ff4444;
}

.score-value.risk-high {
  color: #ff8844;
}

.score-value.risk-medium {
  color: #ffaa44;
}

.score-value.risk-low {
  color: #44ff88;
}

.score-level {
  font-size: 14px;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.4);
  color: #e8f5ff;
}

/* 因子列表 */
.factors-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 4px;
}

.factors-list::-webkit-scrollbar {
  width: 4px;
}

.factors-list::-webkit-scrollbar-track {
  background: rgba(0, 200, 255, 0.1);
  border-radius: 4px;
}

.factors-list::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 255, 0.4);
  border-radius: 4px;
}

.factor-card {
  background: rgba(8, 27, 44, 0.75);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 14px 16px;
  transition: all 0.2s ease;
}

.factor-card:hover {
  border-color: rgba(0, 200, 255, 0.5);
  background: rgba(10, 35, 55, 0.85);
}

.factor-card.primary-driver {
  border-left: 4px solid #ff7b2f;
  background: rgba(255, 123, 47, 0.08);
}

.factor-card.risk-high {
  border-left: 3px solid #ff4444;
}

.factor-card.risk-medium {
  border-left: 3px solid #ffaa44;
}

.factor-card.risk-low {
  border-left: 3px solid #44ff88;
}

.factor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.factor-name {
  font-size: 15px;
  font-weight: 600;
  color: #e8f5ff;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.driver-badge {
  background: rgba(255, 123, 47, 0.2);
  color: #ffb47b;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 500;
}

.factor-weight {
  font-size: 12px;
  color: #9ec0d8;
}

.factor-weight strong {
  font-size: 14px;
}

.factor-weight strong.weight-high {
  color: #ff4444;
}

.factor-weight strong.weight-medium {
  color: #ffaa44;
}

.factor-weight strong.weight-low {
  color: #44ff88;
}

.factor-body {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
}

.actual-value {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 100px;
  text-align: center;
}

.actual-value.value-high {
  border: 1px solid #ff4444;
}

.actual-value.value-medium {
  border: 1px solid #ffaa44;
}

.actual-value.value-low {
  border: 1px solid #44ff88;
}

.value-label {
  font-size: 10px;
  color: #88a0b0;
  margin-bottom: 4px;
}

.value-number {
  font-size: 16px;
  font-weight: 700;
  color: #ffb47b;
  font-family: monospace;
}

.scale-container {
  flex: 2;
  min-width: 160px;
  position: relative;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 10px;
  color: #88a0b0;
}

.scale-bar-bg {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  height: 8px;
  overflow: visible;
  position: relative;
}

.scale-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.scale-fill.low {
  background: linear-gradient(90deg, #3b8c5a, #6cb27c);
}

.scale-fill.medium {
  background: linear-gradient(90deg, #e0a23b, #e8b45a);
}

.scale-fill.high {
  background: linear-gradient(90deg, #e05a2a, #e87a4a);
}

.risk-indicator {
  position: absolute;
  top: 18px;
  transform: translateX(-50%);
  font-size: 9px;
  color: #ffb47b;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 4px;
  border-radius: 4px;
  white-space: nowrap;
}

.factor-desc {
  font-size: 11px;
  color: #9ec0d8;
  line-height: 1.5;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 200, 255, 0.15);
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.desc-icon {
  font-size: 12px;
}

/* 贡献度分析 */
.contribution-analysis {
  margin-top: 4px;
}

.contribution-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(8, 27, 44, 0.75);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
}

.contribution-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.contribution-name {
  width: 70px;
  color: #9ec0d8;
}

.contribution-bar-bg {
  flex: 1;
  height: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  overflow: hidden;
}

.contribution-bar {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.contribution-bar.low {
  background: linear-gradient(90deg, #3b8c5a, #6cb27c);
}

.contribution-bar.medium {
  background: linear-gradient(90deg, #e0a23b, #e8b45a);
}

.contribution-bar.high {
  background: linear-gradient(90deg, #e05a2a, #e87a4a);
}

.contribution-percent {
  width: 50px;
  color: #ffb47b;
  font-weight: 500;
  text-align: right;
}

/* 风险建议 */
.risk-suggestion {
  margin-top: 4px;
}

.suggestion-content {
  background: rgba(8, 27, 44, 0.75);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  gap: 12px;
}

.suggestion-icon {
  font-size: 20px;
}

.suggestion-text {
  flex: 1;
  font-size: 12px;
  line-height: 1.6;
  color: #e8f5ff;
}

.empty-state {
  color: #88a0b0;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

/* 响应式 */
@media (max-width: 600px) {
  .factor-body {
    flex-direction: column;
  }
  
  .actual-value {
    width: 100%;
  }
  
  .factor-name {
    font-size: 13px;
  }
  
  .point-summary {
    grid-template-columns: 1fr;
  }
  
  .contribution-item {
    flex-wrap: wrap;
  }
  
  .contribution-name {
    width: 100%;
  }
  
  .contribution-percent {
    width: auto;
  }
}
</style>
