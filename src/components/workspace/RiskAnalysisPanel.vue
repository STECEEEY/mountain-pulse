<template>
  <div class="risk-analysis">
    <!-- ==================== 监测点信息 ==================== -->
    <div class="section-title">📍 监测点信息</div>

    <!-- 加载状态 -->
    <div v-if="isLoadingData" class="loading-state">
      <div class="loading-spinner"></div>
      <span>加载监测点数据...</span>
    </div>

    <!-- 当前监测点详情 -->
    <div v-else-if="currentFullPoint" class="point-summary">
      <div class="summary-item">
        <span class="summary-label">监测点</span>
        <span class="summary-value">{{ currentFullPoint.name }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">风险等级</span>
        <span class="summary-value risk-extreme">{{ currentFullPoint.level }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">灾害类型</span>
        <span class="summary-value">{{ currentFullPoint.type }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">威胁对象</span>
        <span class="summary-value">{{ currentFullPoint.threat || '待核查' }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">模型预测概率</span>
        <span class="summary-value risk-extreme">
          {{ ((currentFullPoint as any).risk_probability * 100).toFixed(1) }}%
        </span>
      </div>
    </div>

    <div v-else-if="!isLoadingData && !currentFullPoint" class="empty-state">
      👆 请在地图上点击监测点查看风险分析
    </div>

    <!-- ==================== 特征重要性分析 ==================== -->
    <div v-if="currentFullPoint" class="feature-section">
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
    </div>

    <!-- ==================== 模型决策逻辑说明 ==================== -->
    <div v-if="currentFullPoint" class="model-logic">
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
        <div class="logic-step">
          <div class="step-number">5</div>
          <div class="step-text">召回率 0.95，模型精度 AUC = 0.9637</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { riskService } from '@/services/riskService'
import type { RiskPoint } from '@/types/risk'

// ==================== Props ====================
const props = defineProps<{
  point: { name: string; lng: number; lat: number; level?: string; type?: string } | null
}>()

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

// ==================== 数据状态 ====================
const isLoadingData = ref(false)
const fullPointsList = ref<RiskPoint[]>([])
const currentFullPoint = ref<RiskPoint | null>(null)
const featureImportanceList = ref<any[]>([])

// ==================== 生成带当前点数据的特征列表 ====================
const updateFeatureList = (point: RiskPoint) => {
  featureImportanceList.value = FEATURE_IMPORTANCE.map(f => ({
    ...f,
    displayValue: f.getDisplayValue(point),
    currentAnalysis: f.getCurrentAnalysis(point),
    isTop: f.name === '坡度'
  }))
}

// ==================== 从 riskService 加载完整数据 ====================
const loadFullPointData = async () => {
  if (!props.point?.name) {
    console.log('❌ 跳过加载：没有点位名称')
    currentFullPoint.value = null
    return
  }
  
  isLoadingData.value = true
  
  try {
    console.log('🔍 从 riskService 加载完整数据，点位名称:', props.point.name)
    
    // 如果还没加载列表，先加载
    if (fullPointsList.value.length === 0) {
      const response = await riskService.loadRiskPoints()
      fullPointsList.value = response.points
      console.log('✅ 风险点列表加载完成，共', fullPointsList.value.length, '个点')
    }
    
    // 根据名称查找完整数据
    const fullPoint = fullPointsList.value.find(p => p.name === props.point?.name)
    
    if (fullPoint) {
      currentFullPoint.value = fullPoint
      updateFeatureList(fullPoint)
      console.log('✅ 找到完整数据:', {
        name: fullPoint.name,
        risk_probability: (fullPoint as any).risk_probability,
        velocity: fullPoint.velocity,
        slope: fullPoint.slope,
        curvature: fullPoint.curvature,
        aspect: fullPoint.aspect,
        threat: fullPoint.threat
      })
    } else {
      console.warn('⚠️ 未找到完整数据，使用传入的部分数据')
      // 使用传入的数据构建
      const fallbackPoint: RiskPoint = {
        name: props.point.name || '',
        level: props.point.level || '极高风险',
        type: props.point.type || '滑坡',
        slope: 0,
        elevation: 0,
        velocity: 0,
        threat: '',
        curvature: 0,
        aspect: 0,
        longitude: props.point.lng || 0,
        latitude: props.point.lat || 0,
        risk_probability: 0.92,
        actual_population: 0
      } as RiskPoint
      currentFullPoint.value = fallbackPoint
      updateFeatureList(fallbackPoint)
    }
  } catch (error) {
    console.error('❌ 加载完整数据失败:', error)
  } finally {
    isLoadingData.value = false
  }
}

// ==================== 监听传入的点位变化 ====================
watch(() => props.point, (newPoint) => {
  if (newPoint?.name) {
    loadFullPointData()
  } else {
    currentFullPoint.value = null
    featureImportanceList.value = []
  }
}, { immediate: true, deep: true })
</script>

<style scoped>
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

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #88a0b0;
  background: rgba(8, 27, 44, 0.5);
  border-radius: 12px;
  font-size: 14px;
}

@media (max-width: 600px) {
  .factor-body {
    flex-direction: column;
  }
  
  .point-summary {
    grid-template-columns: 1fr;
  }
}
</style>
