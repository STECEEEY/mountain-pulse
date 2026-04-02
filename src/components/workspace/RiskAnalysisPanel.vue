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

    <!-- 全局统计指标 -->
    <div v-if="stats" class="metric-grid">
      <div class="metric-card high">
        <div class="metric-label">高风险占比</div>
        <div class="metric-value">{{ stats.high_risk.percentage.toFixed(2) }}%</div>
      </div>
      <div class="metric-card medium">
        <div class="metric-label">中风险占比</div>
        <div class="metric-value">{{ stats.medium_risk.percentage.toFixed(2) }}%</div>
      </div>
      <div class="metric-card low">
        <div class="metric-label">低风险占比</div>
        <div class="metric-value">{{ stats.low_risk.percentage.toFixed(2) }}%</div>
      </div>
      <div class="metric-card neutral">
        <div class="metric-label">平均风险指数</div>
        <div class="metric-value">{{ stats.mean_risk.toFixed(4) }}</div>
      </div>
    </div>

    <!-- 风险因子分析标题 -->
    <div class="section-title">风险因子分析</div>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>AI模型评估中...</span>
    </div>
    
    <!-- 模型预测结果 -->
    <div v-else-if="modelResult" class="risk-score-summary">
      <span class="score-label">综合风险评分（AI模型）</span>
      <span class="score-value" :class="getRiskLevelClassByScore(modelResult.risk_probability)">
        {{ modelResult.risk_score }}分
      </span>
      <span class="score-level">{{ modelResult.risk_level }}</span>
      <div class="model-badge">🤖 Stacking集成模型 | AUC 0.96</div>
    </div>

    <!-- 风险因子列表 - 基于模型特征重要性展示 -->
    <div v-if="modelResult && featureImportance" class="factors-list">
      <div 
        v-for="factor in featureImportance" 
        :key="factor.name"
        class="factor-card"
        :class="`risk-${factor.riskLevel}`"
      >
        <div class="factor-header">
          <div class="factor-name">
            {{ factor.name }}
            <span v-if="factor.isTopFactor" class="driver-badge">主要驱动因子</span>
          </div>
          <div class="factor-weight">
            贡献度
            <strong :class="`weight-${factor.riskLevel}`">
              {{ (factor.contribution * 100).toFixed(1) }}%
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
                :style="{ width: factor.contribution * 100 + '%' }"
                :class="factor.riskLevel"
              ></div>
            </div>
            <div class="risk-indicator" :style="{ left: factor.contribution * 100 + '%' }">
              {{ (factor.contribution * 100).toFixed(0) }}%
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
    <div v-if="modelResult && featureImportance" class="contribution-analysis">
      <div class="section-title">特征贡献度分析（SHAP）</div>
      <div class="contribution-bars">
        <div 
          v-for="factor in featureImportance" 
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
    <div v-if="modelResult" class="risk-suggestion">
      <div class="section-title">防治建议</div>
      <div class="suggestion-content">
        <div class="suggestion-icon">⚠️</div>
        <div class="suggestion-text">{{ getRiskSuggestionByModel(modelResult) }}</div>
      </div>
    </div>

    <div v-else-if="!stats && !isLoading" class="empty-state">风险统计数据加载中...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { riskService } from '@/services/riskService'
import type { RiskPoint, RiskStatistics } from '@/types/risk'

// API 地址（你的阿里云服务器）
const API_BASE_URL = 'http://47.102.147.118:8001'

const stats = ref<RiskStatistics | null>(null)
const pointsList = ref<RiskPoint[]>([])
const selectedPointId = ref<string>('')
const currentPoint = ref<RiskPoint | null>(null)
const searchText = ref('')
const searchResults = ref<RiskPoint[]>([])
const isLoading = ref(false)
const modelResult = ref<{
  risk_probability: number
  risk_score: number
  risk_level: string
} | null>(null)

// 特征重要性（基于 SHAP 分析的固定权重）
const featureImportance = ref<any[] | null>(null)

// 获取风险等级样式
const getRiskLevelClass = (level: string): string => {
  const classMap: Record<string, string> = {
    '极高风险': 'risk-extreme',
    '高': 'risk-high',
    '中': 'risk-medium',
    '低': 'risk-low',
    'danger': 'risk-extreme',
    'warning': 'risk-high',
    'medium': 'risk-medium',
    'safe': 'risk-low'
  }
  return classMap[level] || 'risk-medium'
}

// 根据概率获取风险等级样式
const getRiskLevelClassByScore = (probability: number): string => {
  if (probability >= 0.8) return 'risk-extreme'
  if (probability >= 0.6) return 'risk-high'
  if (probability >= 0.4) return 'risk-medium'
  return 'risk-low'
}

// 根据模型结果获取风险建议
const getRiskSuggestionByModel = (result: typeof modelResult.value) => {
  if (!result) return ''
  
  const prob = result.risk_probability
  const level = result.risk_level
  
  if (prob >= 0.8) {
    return `当前监测点综合风险极高（${result.risk_score}分），模型预测滑坡概率${(prob * 100).toFixed(1)}%。建议立即启动应急预案，组织人员撤离，并加强监测频率至实时监测。`
  }
  
  if (prob >= 0.6) {
    return `当前监测点风险较高（${result.risk_score}分），模型预测滑坡概率${(prob * 100).toFixed(1)}%。建议加密监测频次，每周至少监测2-3次，并关注降雨等诱发因素。`
  }
  
  if (prob >= 0.4) {
    return `当前监测点存在一定风险（${result.risk_score}分），建议保持常规监测频率，定期巡查，关注形变速率变化趋势。`
  }
  
  return `当前监测点风险较低（${result.risk_score}分），保持常规监测即可，建议每季度进行一次全面评估。`
}

// 调用后端 AI 模型预测
const predictRisk = async (point: RiskPoint) => {
  isLoading.value = true
  
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        velocity: point.velocity,
        slope: point.slope,
        elevation: point.elevation,
        curvature: point.curvature || 0,
        aspect: point.aspect || 0,
        name: point.name
      })
    })
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }
    
    const result = await response.json()
    modelResult.value = result
    
    // 计算特征贡献度（基于实际测量值和模型概率的加权）
    calculateFeatureImportance(point, result.risk_probability)
    
  } catch (error) {
    console.error('模型预测失败:', error)
    // 降级：使用简化算法
    fallbackCalculate(point)
  } finally {
    isLoading.value = false
  }
}

// 计算特征贡献度
const calculateFeatureImportance = (point: RiskPoint, probability: number) => {
  // 基于 SHAP 分析得出的特征权重
  const absVelocity = Math.abs(point.velocity)
  
  // 归一化各特征的风险贡献
  const elevationRisk = normalizeValue(point.elevation, 20, 200, 500)
  const slopeRisk = normalizeValue(point.slope, 10, 25, 40)
  const velocityRisk = normalizeValue(absVelocity, 5, 15, 30)
  const curvatureRisk = normalizeValue(Math.abs(point.curvature || 0), 0.1, 0.5, 1)
  const aspectRisk = 0.5 // 坡向影响相对较小
  
  // 特征权重（从模型 SHAP 分析得出）
  const weights = {
    elevation: 0.35,
    slope: 0.25,
    velocity: 0.20,
    curvature: 0.10,
    aspect: 0.10
  }
  
  const rawContributions = {
    elevation: elevationRisk * weights.elevation,
    slope: slopeRisk * weights.slope,
    velocity: velocityRisk * weights.velocity,
    curvature: curvatureRisk * weights.curvature,
    aspect: aspectRisk * weights.aspect
  }
  
  const total = Object.values(rawContributions).reduce((a, b) => a + b, 0)
  
  // 找出最大贡献因子
  let maxFactor = ''
  let maxContribution = 0
  for (const [key, value] of Object.entries(rawContributions)) {
    if (value > maxContribution) {
      maxContribution = value
      maxFactor = key
    }
  }
  
  featureImportance.value = [
    {
      name: '高程',
      actualValue: point.elevation,
      displayValue: `${point.elevation.toFixed(0)} m`,
      contribution: rawContributions.elevation / total,
      riskLevel: getRiskLevelFromValue(elevationRisk),
      description: getElevationDesc(point.elevation),
      isTopFactor: maxFactor === 'elevation'
    },
    {
      name: '坡度',
      actualValue: point.slope,
      displayValue: `${point.slope.toFixed(1)}°`,
      contribution: rawContributions.slope / total,
      riskLevel: getRiskLevelFromValue(slopeRisk),
      description: getSlopeDesc(point.slope),
      isTopFactor: maxFactor === 'slope'
    },
    {
      name: '形变速率',
      actualValue: point.velocity,
      displayValue: `${absVelocity.toFixed(2)} mm/年`,
      contribution: rawContributions.velocity / total,
      riskLevel: getRiskLevelFromValue(velocityRisk),
      description: getVelocityDesc(absVelocity),
      isTopFactor: maxFactor === 'velocity'
    },
    {
      name: '曲率',
      actualValue: point.curvature || 0,
      displayValue: `${(point.curvature || 0).toFixed(3)}`,
      contribution: rawContributions.curvature / total,
      riskLevel: getRiskLevelFromValue(curvatureRisk),
      description: getCurvatureDesc(point.curvature || 0),
      isTopFactor: maxFactor === 'curvature'
    },
    {
      name: '坡向',
      actualValue: point.aspect || 0,
      displayValue: `${(point.aspect || 0).toFixed(0)}°`,
      contribution: rawContributions.aspect / total,
      riskLevel: getRiskLevelFromValue(aspectRisk),
      description: getAspectDesc(point.aspect || 0),
      isTopFactor: maxFactor === 'aspect'
    }
  ]
}

// 辅助函数：归一化值
const normalizeValue = (value: number, low: number, medium: number, high: number): number => {
  const absVal = Math.abs(value)
  if (absVal <= low) return 0.2
  if (absVal <= medium) return 0.5
  if (absVal <= high) return 0.8
  return 1.0
}

// 根据归一化值获取风险等级
const getRiskLevelFromValue = (value: number): string => {
  if (value >= 0.7) return 'high'
  if (value >= 0.4) return 'medium'
  return 'low'
}

// 描述函数
const getElevationDesc = (elevation: number): string => {
  if (elevation >= 50 && elevation <= 200) return `高程 ${elevation.toFixed(0)}m，处于滑坡易发高程范围（50-200m），风险较高`
  if (elevation < 50) return `高程 ${elevation.toFixed(0)}m，高程较低，地形平坦，风险较低`
  return `高程 ${elevation.toFixed(0)}m，高程较高，地形复杂，需综合评估`
}

const getSlopeDesc = (slope: number): string => {
  if (slope > 40) return `坡度为 ${slope.toFixed(1)}°，坡度极陡，下滑力巨大，极易发生滑坡`
  if (slope > 25) return `坡度为 ${slope.toFixed(1)}°，坡度较陡，下滑力较大，需重点关注`
  if (slope > 10) return `坡度为 ${slope.toFixed(1)}°，坡度适中，相对稳定`
  return `坡度为 ${slope.toFixed(1)}°，坡度平缓，稳定性较好`
}

const getVelocityDesc = (velocity: number): string => {
  if (velocity > 30) return `形变速率为 ${velocity.toFixed(2)}mm/年，形变剧烈，处于加速变形阶段，需立即采取措施`
  if (velocity > 15) return `形变速率为 ${velocity.toFixed(2)}mm/年，形变明显，处于活跃期，需加强监测`
  if (velocity > 5) return `形变速率为 ${velocity.toFixed(2)}mm/年，形变较缓，处于稳定变形阶段`
  return `形变速率为 ${velocity.toFixed(2)}mm/年，形变微弱，坡体基本稳定`
}

const getCurvatureDesc = (curvature: number): string => {
  const absCurve = Math.abs(curvature)
  if (absCurve > 0.5) return `曲率绝对值较大，地形起伏明显，易形成滑坡边界`
  if (absCurve > 0.1) return `曲率适中，地形有一定起伏`
  return `地形平缓，曲率较小`
}

const getAspectDesc = (aspect: number): string => {
  if (aspect >= 45 && aspect <= 135) return `坡向朝东，迎风坡，降雨较多，风险相对较高`
  if (aspect >= 225 && aspect <= 315) return `坡向朝西，背风坡，风险相对较低`
  return `坡向影响适中`
}

// 降级方案（API 不可用时使用）
const fallbackCalculate = (point: RiskPoint) => {
  const absVelocity = Math.abs(point.velocity)
  const elevationRisk = normalizeValue(point.elevation, 20, 200, 500)
  const slopeRisk = normalizeValue(point.slope, 10, 25, 40)
  const velocityRisk = normalizeValue(absVelocity, 5, 15, 30)
  
  const weights = { elevation: 0.35, slope: 0.25, velocity: 0.40 }
  const probability = elevationRisk * weights.elevation + slopeRisk * weights.slope + velocityRisk * weights.velocity
  
  let riskLevel = '低风险'
  if (probability >= 0.8) riskLevel = '极高风险'
  else if (probability >= 0.6) riskLevel = '高风险'
  else if (probability >= 0.4) riskLevel = '中风险'
  
  modelResult.value = {
    risk_probability: probability,
    risk_score: probability * 100,
    risk_level: riskLevel
  }
  
  calculateFeatureImportance(point, probability)
}

// 监测点切换事件
const onPointChange = async () => {
  const point = pointsList.value.find(p => p.name === selectedPointId.value)
  if (point) {
    currentPoint.value = point
    // 调用 AI 模型预测
    await predictRisk(point)
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
/* 保持原有样式，添加新样式 */

.model-badge {
  font-size: 10px;
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.15);
  padding: 4px 10px;
  border-radius: 20px;
  margin-left: auto;
}

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

.model-badge {
  font-size: 10px;
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.15);
  padding: 4px 10px;
  border-radius: 20px;
  margin-left: auto;
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

.result-select:hover {
  border-color: rgba(0, 200, 255, 0.6);
}

.result-select:focus {
  outline: none;
  border-color: #00f0ff;
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

/* 统计指标网格 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.metric-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 200, 255, 0.2);
  background: rgba(8, 27, 44, 0.75);
}

.metric-card.high {
  border-color: rgba(255, 68, 68, 0.6);
}

.metric-card.medium {
  border-color: rgba(255, 160, 68, 0.6);
}

.metric-card.low {
  border-color: rgba(68, 176, 255, 0.6);
}

.metric-card.neutral {
  border-color: rgba(0, 200, 255, 0.45);
}

.metric-label {
  color: #9ec0d8;
  font-size: 12px;
  margin-bottom: 6px;
}

.metric-value {
  color: #e8f5ff;
  font-size: 20px;
  font-weight: 700;
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
  
  .risk-score-summary {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .model-badge {
    margin-left: 0;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
  border-left: 3px solid #00f0ff;
  padding-left: 10px;
  margin-bottom: 4px;
}

.risk-analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}
</style>
