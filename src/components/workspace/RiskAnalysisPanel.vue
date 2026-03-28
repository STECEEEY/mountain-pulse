<template>
  <div class="risk-analysis">
    <div class="section-title">风险统计概览</div>

    <div v-if="stats" class="global-summary">
      <span>评估总面积 {{ stats.total_area_km2.toFixed(2) }} km²</span>
      <span>最高风险指数 {{ stats.max_risk.toFixed(4) }}</span>
      <span>平均风险 {{ stats.mean_risk.toFixed(4) }}</span>
    </div>

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
    <div v-else class="empty-state">风险统计数据加载中...</div>

    <div class="section-title">风险因子解释</div>
    <div class="explain-tip">
      <span class="tip-icon">⚠️</span>
      形变速率是主要风险驱动因子
    </div>

    <!-- 改为垂直因子列表，完全展示文字和数值 -->
    <div class="factors-list">
      <div 
        v-for="item in orderedFeatures" 
        :key="item.key"
        class="factor-card"
        :class="{ 'primary-driver': item.key === topFeatureKey }"
      >
        <div class="factor-header">
          <div class="factor-name">
            {{ item.label }}
            <span v-if="item.key === topFeatureKey" class="driver-badge">主要驱动</span>
          </div>
          <div class="factor-weight">
            权重 <strong>{{ (item.value * 100).toFixed(1) }}%</strong>
          </div>
        </div>

        <div class="factor-body">
          <!-- 风险刻度条 -->
          <div class="scale-container">
            <div class="scale-labels">
              <span>低影响</span>
              <span>中影响</span>
              <span>高影响</span>
            </div>
            <div class="scale-bar-bg">
              <div 
                class="scale-fill" 
                :style="{ width: (item.value / maxWeight) * 100 + '%' }"
              ></div>
            </div>
            <div class="risk-values">
              <span>0.5</span>
              <span>1.0</span>
              <span>1.5</span>
              <span>2.0</span>
              <span v-if="item.value >= 0.2">2.5</span>
              <span v-if="item.value >= 0.25">3.0</span>
            </div>
          </div>

          <!-- 风险等级数值标签 -->
          <div class="value-indicator">
            <div class="value-item">
              <div class="value-number">{{ getRiskValue(item.key, 0) }}</div>
              <div class="value-label">基准</div>
            </div>
            <div class="value-item">
              <div class="value-number">{{ getRiskValue(item.key, 1) }}</div>
              <div class="value-label">中等</div>
            </div>
            <div class="value-item">
              <div class="value-number">{{ getRiskValue(item.key, 2) }}</div>
              <div class="value-label">较高</div>
            </div>
            <div class="value-item">
              <div class="value-number">{{ getRiskValue(item.key, 3) }}</div>
              <div class="value-label">高影响</div>
            </div>
          </div>
        </div>

        <!-- 因子简短说明 -->
        <div class="factor-desc">
          {{ getFeatureDescription(item.key) }}
        </div>
      </div>
    </div>

    <div v-if="topFeatureDesc" class="top-feature">
      🔍 关键因子说明：{{ topFeatureDesc }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { riskService } from '@/services/riskService'
import type { FeatureImportance, RiskStatistics } from '@/types/risk'

const stats = ref<RiskStatistics | null>(null)
const importance = ref<FeatureImportance | null>(null)

// 定义每个因子的风险数值映射（根据原始图片中的数值）
const riskValueMap: Record<string, number[]> = {
  '坡向': [0.5, 1.0, 1.5, 2.0],
  '曲率': [0.5, 1.0, 1.5, 2.5],
  '坡度': [0.5, 1.0, 1.5, 2.5],
  '高程': [0.5, 1.0, 1.5, 3.0],
  '原始形变速率': [0.5, 1.0, 1.5, 2.5],
  '形变速率绝对值': [0.5, 1.0, 1.5, 2.0],
}

// 因子说明文案
const featureDescMap: Record<string, string> = {
  '坡向': '坡向影响日照、水分和植被分布，不同朝向的坡体稳定性存在差异',
  '曲率': '地形凹凸程度影响地表径流和应力集中，凸坡易发生崩塌，凹坡易积水',
  '坡度': '坡度越陡，下滑力越大，坡体失稳风险显著增加',
  '高程': '滑坡通常发生在一定高程范围内，高程影响岩土体性质和地下水条件',
  '原始形变速率': '地表原始位移速率，反映坡体当前活动性',
  '形变速率绝对值': '动态形变速率绝对值，体现形变剧烈程度的变化趋势',
}

const orderedFeatures = computed(() => {
  if (!importance.value) return []
  return Object.entries(importance.value.features)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      key,
      value,
      label: importance.value?.description[key] || key,
    }))
})

// 获取权重最大值用于刻度比例
const maxWeight = computed(() => {
  if (!orderedFeatures.value.length) return 1
  return Math.max(...orderedFeatures.value.map(f => f.value), 0.25)
})

const topFeatureKey = computed(() => {
  if (!importance.value) return ''
  return importance.value.top_feature || ''
})

const topFeatureDesc = computed(() => {
  if (!importance.value) return ''
  return importance.value.description[importance.value.top_feature] || ''
})

// 获取因子的风险数值
const getRiskValue = (featureKey: string, level: number): string => {
  const displayName = importance.value?.description[featureKey] || featureKey
  const values = riskValueMap[displayName]
  if (values && values[level]) {
    return values[level].toFixed(1)
  }
  // 默认值
  const defaultValues = [0.5, 1.0, 1.5, 2.0]
  return defaultValues[level]?.toFixed(1) || '—'
}

// 获取因子说明
const getFeatureDescription = (featureKey: string): string => {
  const displayName = importance.value?.description[featureKey] || featureKey
  return featureDescMap[displayName] || '该因子对滑坡风险有显著影响'
}

const loadData = async () => {
  try {
    const [statsRes, importanceRes] = await Promise.all([
      riskService.loadRiskStatistics(),
      riskService.loadFeatureImportance(),
    ])
    stats.value = statsRes
    importance.value = importanceRes
  } catch (error) {
    console.error('Risk analysis panel load failed:', error)
  }
}

onMounted(() => {
  loadData()
})

onUnmounted(() => {
  // 清理资源
})
</script>

<style scoped>
.risk-analysis {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
}

.global-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: #9ec0d8;
  background: rgba(8, 23, 37, 0.64);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.explain-tip {
  border-left: 3px solid #ff7b2f;
  background: rgba(255, 123, 47, 0.1);
  color: #ffd7bd;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip-icon {
  font-size: 14px;
}

/* 垂直因子列表样式 */
.factors-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 4px;
}

/* 自定义滚动条 */
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

/* 单个因子卡片 */
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

/* 因子头部 */
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
  color: #ffb47b;
  font-size: 14px;
}

/* 因子主体 */
.factor-body {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 10px;
}

/* 刻度尺容器 */
.scale-container {
  flex: 2;
  min-width: 160px;
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
  overflow: hidden;
  position: relative;
}

.scale-fill {
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg, #3b8c5a, #e0a23b, #e05a2a);
  transition: width 0.3s ease;
}

.risk-values {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: #6c8ea0;
  padding: 0 2px;
}

.risk-values span {
  font-family: monospace;
}

/* 右侧数值指示器 */
.value-indicator {
  display: flex;
  gap: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 6px 12px;
  flex-wrap: wrap;
}

.value-item {
  text-align: center;
  min-width: 48px;
}

.value-number {
  font-size: 14px;
  font-weight: 700;
  color: #ffb47b;
  font-family: monospace;
}

.value-label {
  font-size: 9px;
  color: #88a0b0;
  margin-top: 2px;
}

/* 因子说明 */
.factor-desc {
  font-size: 11px;
  color: #9ec0d8;
  line-height: 1.4;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 200, 255, 0.15);
  margin-top: 4px;
}

.top-feature {
  color: #ffb47b;
  font-size: 12px;
  line-height: 1.5;
  background: rgba(255, 123, 47, 0.1);
  padding: 10px 12px;
  border-radius: 8px;
}

.empty-state {
  color: #88a0b0;
  font-size: 12px;
}

/* 响应式 */
@media (max-width: 600px) {
  .factor-body {
    flex-direction: column;
  }
  
  .value-indicator {
    justify-content: space-between;
  }
  
  .factor-name {
    font-size: 13px;
  }
  
  .risk-values span {
    font-size: 9px;
  }
}
</style>
