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
    <div v-if="dynamicFactors" class="risk-score-summary">
      <span class="score-label">综合风险评分</span>
      <span class="score-value" :class="getRiskLevelClassByScore(dynamicFactors.totalRiskScore)">
        {{ (dynamicFactors.totalRiskScore * 100).toFixed(1) }}分
      </span>
      <span class="score-level">{{ dynamicFactors.riskLevel }}</span>
    </div>

    <!-- 风险因子列表 - 基于实际数据动态展示 -->
    <div v-if="dynamicFactors" class="factors-list">
      <div 
        v-for="factor in dynamicFactors.factors" 
        :key="factor.name"
        class="factor-card"
        :class="{ 
          'primary-driver': factor.name === dynamicFactors.topRiskFactor,
          [`risk-${factor.riskLevel}`]: true
        }"
      >
        <div class="factor-header">
          <div class="factor-name">
            {{ factor.name }}
            <span v-if="factor.name === dynamicFactors.topRiskFactor" class="driver-badge">
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
          <!-- 实际测量值展示 -->
          <div class="actual-value" :class="`value-${factor.riskLevel}`">
            <div class="value-label">实际测量值</div>
            <div class="value-number">{{ formatFactorValue(factor) }}</div>
          </div>

          <!-- 风险刻度条 -->
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

        <!-- 因子动态说明 -->
        <div class="factor-desc">
          <span class="desc-icon">📊</span>
          {{ getDynamicFactorDescription(factor) }}
        </div>
      </div>
    </div>

    <!-- 风险贡献度分析 -->
    <div v-if="dynamicFactors" class="contribution-analysis">
      <div class="section-title">风险贡献度分析</div>
      <div class="contribution-bars">
        <div 
          v-for="factor in dynamicFactors.factors" 
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
    <div v-if="dynamicFactors" class="risk-suggestion">
      <div class="section-title">防治建议</div>
      <div class="suggestion-content">
        <div class="suggestion-icon">⚠️</div>
        <div class="suggestion-text">{{ getRiskSuggestion(dynamicFactors) }}</div>
      </div>
    </div>

    <div v-else-if="!stats" class="empty-state">风险统计数据加载中...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { riskService } from '@/services/riskService'
import { 
  calculateDynamicRiskFactors, 
  getDynamicFactorDescription as getDesc,
  formatFactorValue as formatValue
} from '@/utils/riskCalculator'
import type { RiskPoint, RiskStatistics, DynamicRiskFactors } from '@/types/risk'

const stats = ref<RiskStatistics | null>(null)
const pointsList = ref<RiskPoint[]>([])
const selectedPointId = ref<string>('')
const currentPoint = ref<RiskPoint | null>(null)
const dynamicFactors = ref<DynamicRiskFactors | null>(null)
const searchText = ref('')
const searchResults = ref<RiskPoint[]>([])

// 格式化因子值
const formatFactorValue = (factor: any): string => {
  return formatValue(factor)
}

// 获取因子动态说明
const getDynamicFactorDescription = (factor: any): string => {
  return getDesc(factor)
}

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

// 根据分数获取风险等级样式
const getRiskLevelClassByScore = (score: number): string => {
  if (score >= 0.8) return 'risk-extreme'
  if (score >= 0.6) return 'risk-high'
  if (score >= 0.4) return 'risk-medium'
  return 'risk-low'
}

// 获取风险建议
const getRiskSuggestion = (factors: DynamicRiskFactors): string => {
  const topFactor = factors.factors.find(f => f.name === factors.topRiskFactor)
  
  if (factors.totalRiskScore >= 0.8) {
    return `当前监测点综合风险极高，主要驱动因子为"${factors.topRiskFactor}"。建议立即启动应急预案，组织人员撤离，并加强监测频率至实时监测。`
  }
  
  if (factors.totalRiskScore >= 0.6) {
    if (topFactor?.name === '形变速率') {
      return `当前监测点形变速率较高，坡体处于活跃期。建议加密监测频次，每周至少监测2-3次，并关注降雨等诱发因素。`
    }
    if (topFactor?.name === '坡度') {
      return `当前监测点坡度较陡，地形条件不利。建议进行坡面防护，设置截排水设施，并定期巡查。`
    }
    return `当前监测点风险较高，主要受${factors.topRiskFactor}影响。建议加强监测预警，制定防治方案。`
  }
  
  if (factors.totalRiskScore >= 0.4) {
    return `当前监测点存在一定风险，建议保持常规监测频率，定期巡查，关注形变速率变化趋势。`
  }
  
  return `当前监测点风险较低，保持常规监测即可，建议每季度进行一次全面评估。`
}

// 监测点切换事件
const onPointChange = async () => {
  const point = pointsList.value.find(p => p.name === selectedPointId.value)
  if (point) {
    currentPoint.value = point
    dynamicFactors.value = calculateDynamicRiskFactors(point)
    searchText.value = point.name  // 选中后显示在搜索框
    searchResults.value = []       // 清空搜索结果
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
    
    // 默认选择第一个监测点 - 修复类型错误
    if (pointsList.value && pointsList.value.length > 0 && pointsList.value[0]) {
      selectedPointId.value = pointsList.value[0].name
      await onPointChange()
    }
  } catch (error) {
    console.error('Risk analysis panel load failed:', error)
  }
}

//搜索方法
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

.point-selector select {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 200, 255, 0.3);
  color: #e8f5ff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.point-selector select:hover {
  border-color: rgba(0, 200, 255, 0.6);
}

.point-selector select:focus {
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
