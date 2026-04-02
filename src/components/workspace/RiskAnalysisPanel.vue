<template>
  <div class="risk-analysis">
    <!-- ==================== 监测点信息 ==================== -->
    <div class="section-title">📍 监测点信息</div>

    <!-- 监测点选择器 -->
    <div class="point-selector">
      <label>选择监测点：</label>
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

    <!-- 当前监测点详情 -->
    <div v-if="currentPoint" class="point-summary">
      <div class="summary-item">
        <span class="summary-label">监测点</span>
        <span class="summary-value">{{ currentPoint.name }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">风险等级</span>
        <span class="summary-value risk-extreme">{{ currentPoint.level }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">灾害类型</span>
        <span class="summary-value">{{ currentPoint.type }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">威胁对象</span>
        <span class="summary-value">{{ currentPoint.threat }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">模型预测概率</span>
        <span class="summary-value risk-extreme">{{ ((currentPoint as any).risk_probability * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <!-- ==================== 模型介绍 ==================== -->
    <div class="model-card">
      <div class="section-title">🧠 滑坡风险评估模型</div>
      <div class="model-stats">
        <div class="stat-badge">
          <span class="stat-label">模型架构</span>
          <span class="stat-value">Stacking 集成学习</span>
        </div>
        <div class="stat-badge">
          <span class="stat-label">基学习器</span>
          <span class="stat-value">RF + XGBoost + LightGBM</span>
        </div>
        <div class="stat-badge">
          <span class="stat-label">元学习器</span>
          <span class="stat-value">Logistic Regression</span>
        </div>
        <div class="stat-badge">
          <span class="stat-label">训练样本</span>
          <span class="stat-value">1113 个（滑坡 + 非滑坡）</span>
        </div>
        <div class="stat-badge">
          <span class="stat-label">模型精度</span>
          <span class="stat-value highlight">AUC = 0.9637</span>
        </div>
        <div class="stat-badge">
          <span class="stat-label">召回率</span>
          <span class="stat-value">0.95</span>
        </div>
      </div>
    </div>

    <!-- ==================== 特征重要性分析 ==================== -->
    <div class="section-title">📊 特征重要性分析（Feature Importance）</div>
    <div class="feature-desc">
      基于 RandomForest 模型的特征重要性评估，反映各因子对滑坡预测的贡献程度。
      重要性总和为 100%，数值越大表示该因子对模型决策越关键。
    </div>

    <!-- 特征重要性卡片 -->
    <div class="factors-list">
      <div 
        v-for="factor in featureImportanceList" 
        :key="factor.name"
        class="factor-card"
        :class="{ 'primary-driver': factor.isTop }"
      >
        <div class="factor-header">
          <div class="factor-name">
            {{ factor.name }}
            <span v-if="factor.isTop" class="driver-badge">🎯 最重要特征</span>
          </div>
          <div class="factor-weight">
            特征重要性
            <strong :style="{ color: factor.color }">
              {{ (factor.importance * 100).toFixed(1) }}%
            </strong>
          </div>
        </div>

        <div class="factor-body">
          <!-- 当前点的实际测量值 -->
          <div class="actual-value">
            <div class="value-label">当前点实测值</div>
            <div class="value-number">{{ factor.displayValue }}</div>
          </div>

          <!-- 重要性进度条 -->
          <div class="importance-bar-container">
            <div class="importance-bar-bg">
              <div 
                class="importance-bar-fill" 
                :style="{ width: factor.importance * 100 + '%', background: factor.color }"
              ></div>
            </div>
            <div class="importance-label">模型重要性占比</div>
          </div>
        </div>

        <!-- 特征的科学解释 -->
        <div class="factor-desc">
          <span class="desc-icon">📖</span>
          <span>{{ factor.scientificDesc }}</span>
        </div>

        <!-- 当前点的具体分析 -->
        <div class="factor-analysis">
          <span class="analysis-icon">🔍</span>
          <span>{{ factor.currentAnalysis }}</span>
        </div>
      </div>
    </div>

    <!-- ==================== 模型决策逻辑说明 ==================== -->
    <div class="model-logic">
      <div class="section-title">⚙️ 模型决策逻辑</div>
      <div class="logic-content">
        <div class="logic-step">
          <div class="step-number">1</div>
          <div class="step-text">输入 6 个特征：形变速率、坡度、高程、曲率、坡向、绝对形变速率</div>
        </div>
        <div class="logic-step">
          <div class="step-number">2</div>
          <div class="step-text">三个基学习器（RF、XGBoost、LightGBM）独立预测</div>
        </div>
        <div class="logic-step">
          <div class="step-number">3</div>
          <div class="step-text">元学习器（逻辑回归）综合三个基学习器的结果</div>
        </div>
        <div class="logic-step">
          <div class="step-number">4</div>
          <div class="step-text">输出滑坡概率（0-1），概率越高风险越大</div>
        </div>
      </div>
    </div>

    <div v-if="!currentPoint && !isLoading" class="empty-state">请选择一个监测点</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { riskService } from '@/services/riskService'
import type { RiskPoint } from '@/types/risk'

// ==================== 特征重要性数据（从 RandomForest 模型提取） ====================
const FEATURE_IMPORTANCE = [
  { 
    name: '坡度', 
    importance: 0.3540,
    color: '#ff4444',
    scientificDesc: '坡度是滑坡发生的核心地形条件，坡度越陡，下滑力越大，滑坡风险越高。在宁镇地区，坡度 > 25° 的区域需要重点关注。',
    getCurrentAnalysis: (point: RiskPoint) => {
      const slope = point.slope
      if (slope > 40) return `当前点坡度为 ${slope.toFixed(1)}°，属于极陡坡，是模型判断为高风险的最主要依据。`
      if (slope > 25) return `当前点坡度为 ${slope.toFixed(1)}°，属于陡坡，对滑坡风险贡献显著。`
      if (slope > 10) return `当前点坡度为 ${slope.toFixed(1)}°，属于缓坡，风险相对可控。`
      return `当前点坡度为 ${slope.toFixed(1)}°，属于平缓坡，滑坡风险较低。`
    },
    getDisplayValue: (point: RiskPoint) => `${point.slope.toFixed(1)}°`
  },
  { 
    name: '高程', 
    importance: 0.2205,
    color: '#ff8844',
    scientificDesc: '宁镇地区滑坡主要发生在 50-200m 的低山丘陵区，高程过低（平原）或过高（高山）区域滑坡发育较少。',
    getCurrentAnalysis: (point: RiskPoint) => {
      const elevation = point.elevation
      if (elevation >= 50 && elevation <= 200) return `当前点高程为 ${elevation.toFixed(0)}m，处于滑坡易发高程区间，风险较高。`
      if (elevation < 50) return `当前点高程为 ${elevation.toFixed(0)}m，位于平原区，滑坡风险相对较低。`
      return `当前点高程为 ${elevation.toFixed(0)}m，海拔较高，需综合其他因子判断。`
    },
    getDisplayValue: (point: RiskPoint) => `${point.elevation.toFixed(0)}m`
  },
  { 
    name: '曲率', 
    importance: 0.1573,
    color: '#ffaa44',
    scientificDesc: '曲率反映地表的凹凸程度，影响地表径流和应力分布。负曲率（凹坡）易汇水，正曲率（凸坡）易拉裂。',
    getCurrentAnalysis: (point: RiskPoint) => {
      const curvature = point.curvature || 0
      if (Math.abs(curvature) > 0.5) return `当前点曲率为 ${curvature.toFixed(3)}，地形起伏明显，是模型的重要判断依据。`
      if (Math.abs(curvature) > 0.1) return `当前点曲率为 ${curvature.toFixed(3)}，地形有一定起伏。`
      return `当前点曲率为 ${curvature.toFixed(3)}，地形相对平缓。`
    },
    getDisplayValue: (point: RiskPoint) => `${(point.curvature || 0).toFixed(4)}`
  },
  { 
    name: '坡向', 
    importance: 0.0913,
    color: '#44cc88',
    scientificDesc: '坡向影响日照和降雨分布。迎风坡（东、东南）降雨较多，滑坡发育更活跃。',
    getCurrentAnalysis: (point: RiskPoint) => {
      const aspect = point.aspect || 0
      if (aspect >= 45 && aspect <= 135) return `当前点坡向为 ${aspect.toFixed(0)}°（朝东），迎风坡，降雨较多，风险相对较高。`
      if (aspect >= 225 && aspect <= 315) return `当前点坡向为 ${aspect.toFixed(0)}°（朝西），背风坡，风险相对较低。`
      return `当前点坡向为 ${aspect.toFixed(0)}°，影响适中。`
    },
    getDisplayValue: (point: RiskPoint) => `${(point.aspect || 0).toFixed(0)}°`
  },
  { 
    name: '形变速率', 
    importance: 0.1769,  // 0.0903 + 0.0866 合并
    color: '#ff6688',
    scientificDesc: '形变速率是滑坡的直接前兆指标。形变速率越大（无论是下沉还是抬升），坡体越活跃，失稳风险越高。',
    getCurrentAnalysis: (point: RiskPoint) => {
      const velocity = Math.abs(point.velocity)
      if (velocity > 30) return `当前点形变速率为 ${velocity.toFixed(2)}mm/年，形变剧烈，是模型判断高风险的关键因子。`
      if (velocity > 15) return `当前点形变速率为 ${velocity.toFixed(2)}mm/年，形变明显，坡体处于活跃期。`
      if (velocity > 5) return `当前点形变速率为 ${velocity.toFixed(2)}mm/年，形变较缓，处于稳定变形阶段。`
      return `当前点形变速率为 ${velocity.toFixed(2)}mm/年，形变微弱，坡体基本稳定。`
    },
    getDisplayValue: (point: RiskPoint) => `${Math.abs(point.velocity).toFixed(2)}mm/年`
  }
]

// 计算排序后的特征重要性列表（重要性从高到低）
const featureImportanceList = ref<any[]>([])

// 当前选中的点
const pointsList = ref<RiskPoint[]>([])
const selectedPointId = ref<string>('')
const currentPoint = ref<RiskPoint | null>(null)
const searchText = ref('')
const searchResults = ref<RiskPoint[]>([])
const isLoading = ref(false)

// 生成带当前点数据的特征列表
const updateFeatureList = (point: RiskPoint) => {
  featureImportanceList.value = FEATURE_IMPORTANCE.map(f => ({
    ...f,
    displayValue: f.getDisplayValue(point),
    currentAnalysis: f.getCurrentAnalysis(point),
    isTop: f.name === '坡度' // 坡度永远是第一重要
  }))
}

// 监测点切换
const onPointChange = async () => {
  const point = pointsList.value.find(p => p.name === selectedPointId.value)
  if (point) {
    isLoading.value = true
    currentPoint.value = point
    updateFeatureList(point)
    searchText.value = point.name
    searchResults.value = []
    isLoading.value = false
  }
}

// 加载数据
const loadData = async () => {
  try {
    const pointsRes = await riskService.loadRiskPoints()
    pointsList.value = pointsRes.points
    
    if (pointsList.value && pointsList.value.length > 0 && pointsList.value[0]) {
      selectedPointId.value = pointsList.value[0].name
      await onPointChange()
    }
  } catch (error) {
    console.error('加载失败:', error)
  }
}

// 搜索
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
/* 样式保持与之前类似，需要我补充完整吗？ */
.risk-analysis {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
  border-left: 3px solid #00f0ff;
  padding-left: 10px;
  margin-bottom: 12px;
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
}

.search-input, .result-select {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(0, 200, 255, 0.3);
  color: #e8f5ff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
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

/* 模型卡片 */
.model-card {
  background: linear-gradient(135deg, rgba(0, 100, 150, 0.2), rgba(0, 50, 80, 0.3));
  border: 1px solid rgba(0, 200, 255, 0.3);
  border-radius: 12px;
  padding: 16px;
}

.model-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
}

.stat-badge {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 120px;
}

.stat-label {
  font-size: 11px;
  color: #88a0b0;
  display: block;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #e8f5ff;
}

.stat-value.highlight {
  color: #ffaa44;
}

/* 特征说明 */
.feature-desc {
  font-size: 12px;
  color: #9ec0d8;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

/* 因子列表 */
.factors-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.factor-card {
  background: rgba(8, 27, 44, 0.75);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 14px 16px;
}

.factor-card.primary-driver {
  border-left: 4px solid #ff7b2f;
  background: rgba(255, 123, 47, 0.08);
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
}

.driver-badge {
  background: rgba(255, 123, 47, 0.2);
  color: #ffb47b;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 20px;
}

.factor-weight {
  font-size: 12px;
  color: #9ec0d8;
}

.factor-weight strong {
  font-size: 16px;
}

.factor-body {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 12px;
}

.actual-value {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  min-width: 120px;
  text-align: center;
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
}

.importance-bar-container {
  flex: 2;
  min-width: 180px;
}

.importance-bar-bg {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  height: 12px;
  overflow: hidden;
}

.importance-bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.importance-label {
  font-size: 10px;
  color: #88a0b0;
  margin-top: 4px;
  text-align: right;
}

.factor-desc, .factor-analysis {
  font-size: 11px;
  line-height: 1.5;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 200, 255, 0.15);
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.factor-analysis {
  border-top: none;
  padding-top: 4px;
  color: #ffb47b;
}

.desc-icon, .analysis-icon {
  font-size: 12px;
}

/* 模型决策逻辑 */
.model-logic {
  background: rgba(8, 27, 44, 0.75);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.logic-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.logic-step {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-number {
  width: 24px;
  height: 24px;
  background: rgba(0, 200, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #00f0ff;
}

.step-text {
  font-size: 12px;
  color: #e8f5ff;
}

/* 风险解读 */
.risk-interpretation {
  background: rgba(8, 27, 44, 0.75);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.interpretation-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}

.level-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
  min-width: 80px;
  text-align: center;
}

.level-item.extreme .level-badge {
  background: rgba(255, 68, 68, 0.2);
  color: #ff6666;
}

.level-item.high .level-badge {
  background: rgba(255, 136, 68, 0.2);
  color: #ffaa66;
}

.level-item.medium .level-badge {
  background: rgba(255, 170, 68, 0.2);
  color: #ffcc66;
}

.level-item.low .level-badge {
  background: rgba(68, 255, 136, 0.2);
  color: #66ffaa;
}

.level-desc {
  font-size: 11px;
  color: #9ec0d8;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #88a0b0;
}

@media (max-width: 600px) {
  .factor-body {
    flex-direction: column;
  }
  
  .point-summary {
    grid-template-columns: 1fr;
  }
  
  .model-stats {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
