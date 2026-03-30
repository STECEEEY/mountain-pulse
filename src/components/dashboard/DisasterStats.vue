<template>
  <div class="chart-card" :class="{ 'alert-active': hasAlert }">
    <div class="card-header">
      <h3 class="card-title">⚠️ 灾害统计</h3>
      <span class="card-badge warning">
        <span class="pulse-dot"></span>
        {{ alertStatus }}
      </span>
    </div>
    
    <!-- 风险占比条形图 - 放大 -->
    <div class="risk-chart">
      <div class="risk-bar">
        <div 
          class="risk-segment danger" 
          :style="{ width: riskPercentages.danger + '%' }"
        ></div>
        <div 
          class="risk-segment warning" 
          :style="{ width: riskPercentages.warning + '%' }"
        ></div>
        <div 
          class="risk-segment medium" 
          :style="{ width: riskPercentages.medium + '%' }"
        ></div>
        <div 
          class="risk-segment safe" 
          :style="{ width: riskPercentages.safe + '%' }"
        ></div>
      </div>
      <div class="risk-legend">
        <span><i class="legend-dot danger"></i>极高风险</span>
        <span><i class="legend-dot warning"></i>高风险</span>
        <span><i class="legend-dot medium"></i>中风险</span>
        <span><i class="legend-dot safe"></i>低风险</span>
      </div>
    </div>

    <!-- 灾害类型分布 - 放大展示 -->
    <div class="type-chart" v-if="typeStats.length > 0">
      <div class="type-header">
        <span class="type-title">📊 灾害类型分布</span>
        <span class="type-unit">数量 / 占比</span>
      </div>
      <div class="type-bars">
        <div 
          v-for="item in typeStats" 
          :key="item.type"
          class="type-item"
        >
          <div class="type-label">
            <span class="type-name">
              <span class="type-icon" :style="{ background: item.color }"></span>
              {{ item.type }}
            </span>
            <span class="type-value">{{ item.count }}个 ({{ item.percent.toFixed(1) }}%)</span>
          </div>
          <div class="type-bar-bg">
            <div 
              class="type-bar-fill" 
              :style="{ width: item.percent + '%', background: item.color }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 关键指标卡片 - 放大显示 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-icon">📍</div>
        <div class="stat-card-content">
          <div class="stat-card-label">风险点总数</div>
          <div class="stat-card-value">
            <AnimatedNumber :value="totalPoints" :decimals="0" />
            <span>个</span>
          </div>
        </div>
      </div>
      <div class="stat-card danger-card">
        <div class="stat-card-icon">⚠️</div>
        <div class="stat-card-content">
          <div class="stat-card-label">极高风险点</div>
          <div class="stat-card-value">
            <AnimatedNumber :value="stats.danger" :decimals="0" />
            <span>个</span>
          </div>
        </div>
      </div>
      <div class="stat-card threat-card">
        <div class="stat-card-icon">👥</div>
        <div class="stat-card-content">
          <div class="stat-card-label">威胁总人口</div>
          <div class="stat-card-value">
            <AnimatedNumber :value="threatPopulation / 10000" :decimals="1" />
            <span>万人</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-footer" v-if="hasAlert">
      <div class="alert-info">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">⚠️ 建议优先处置极高风险点 ⚠️</span>
      </div>
    </div>

    <div class="scan-line"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import { riskService } from '@/services/riskService'
import type { RiskPoint } from '@/types/risk'

// 基础统计数据
const stats = ref({
  danger: 0,
  warning: 0,
  medium: 0,
  safe: 0,
})
const threatPopulation = ref(-1)
const totalPoints = ref(0)

// 灾害类型统计
interface TypeStat {
  type: string
  count: number
  percent: number
  color: string
}
const typeStats = ref<TypeStat[]>([])

// 类型颜色映射
const typeColors = {
  '滑坡': '#ff6b6b',
  '泥石流': '#ffb347',
  '崩塌': '#f9ca24',
  '地面塌陷': '#6ab04c',
  '洪水': '#3498db',
  '地震': '#9b59b6',
  '台风': '#1abc9c',
  '其他': '#95a5a6'
} as const

const getTypeColor = (type: string): string => {
  return typeColors[type as keyof typeof typeColors] || typeColors['其他']
}

// 风险占比
const riskPercentages = computed(() => {
  const total = totalPoints.value
  if (total === 0) return { danger: 0, warning: 0, medium: 0, safe: 0 }
  return {
    danger: (stats.value.danger / total) * 100,
    warning: (stats.value.warning / total) * 100,
    medium: (stats.value.medium / total) * 100,
    safe: (stats.value.safe / total) * 100
  }
})

// 预警状态
const alertStatus = computed(() => {
  if (stats.value.danger > 0) return `⚠️ ${stats.value.danger}个极高风险点`
  if (stats.value.warning > 5) return `${stats.value.warning}个高风险点`
  if (stats.value.warning > 0) return '预警中'
  return '正常'
})

const hasAlert = computed(() => stats.value.danger > 0 || stats.value.warning > 0)

const parseThreatPopulation = (value: string) => {
  const matched = value.match(/-?\d+(\.\d+)?/)
  if (!matched) return 0
  return Number(matched[0])
}

// 统计灾害类型分布
const calculateTypeStats = (points: RiskPoint[]): TypeStat[] => {
  const typeCount: Record<string, number> = {}
  
  points.forEach(point => {
    const type = point.type || '其他'
    typeCount[type] = (typeCount[type] || 0) + 1
  })
  
  const total = points.length
  const statsArray: TypeStat[] = Object.entries(typeCount)
    .map(([type, count]) => ({
      type,
      count,
      percent: (count / total) * 100,
      color: getTypeColor(type)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6) // 显示更多类型
  
  return statsArray
}

const loadStats = async () => {
  try {
    const response = await riskService.loadRiskPoints()
    const aggregate = { danger: 0, warning: 0, medium: 0, safe: 0 }
    let totalThreat = 0

    response.points.forEach((point: RiskPoint) => {
      const level = point.level.trim().toLowerCase()
      if (level.includes('极高风险') || level.includes('danger')) {
        aggregate.danger += 1
      } else if (level === '高风险' || level.includes('warning')) {
        aggregate.warning += 1
      } else if (level === '中风险' || level.includes('medium')) {
        aggregate.medium += 1
      } else {
        aggregate.safe += 1
      }

      totalThreat += parseThreatPopulation(point.threat)
    })

    stats.value = aggregate
    totalPoints.value = response.points.length
    threatPopulation.value = totalThreat
    
    typeStats.value = calculateTypeStats(response.points)
  } catch (error) {
    console.error('Failed to load risk stats:', error)
    stats.value = { danger: 0, warning: 0, medium: 0, safe: 0 }
    totalPoints.value = 0
    threatPopulation.value = -1
    typeStats.value = []
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.chart-card {
  background: rgba(10, 20, 30, 0.85);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(0, 200, 255, 0.25);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  min-height: 380px;
}

.chart-card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 240, 255, 0.5);
  box-shadow: 0 12px 40px rgba(0, 200, 255, 0.2);
}

.chart-card.alert-active {
  border-color: rgba(255, 68, 68, 0.6);
  box-shadow: 0 0 25px rgba(255, 68, 68, 0.25);
  background: rgba(20, 20, 35, 0.9);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ff8888;
  letter-spacing: 1px;
}

.card-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(255, 100, 100, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.5);
  color: #ff8888;
  font-weight: 500;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #ff4444;
  border-radius: 50%;
  animation: pulseDot 1.5s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7);
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
    box-shadow: 0 0 0 4px rgba(255, 68, 68, 0);
  }
}

/* 风险占比条形图 - 放大 */
.risk-chart {
  margin: 0 0 20px 0;
}

.risk-bar {
  display: flex;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
}

.risk-segment {
  height: 100%;
  transition: width 0.5s ease;
}

.risk-segment.danger {
  background: linear-gradient(90deg, #ff4444, #ff6666);
}
.risk-segment.warning {
  background: linear-gradient(90deg, #ff8844, #ffaa66);
}
.risk-segment.medium {
  background: linear-gradient(90deg, #ffcc44, #ffdd66);
}
.risk-segment.safe {
  background: linear-gradient(90deg, #44ff44, #66ff66);
}

.risk-legend {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  justify-content: center;
  font-size: 11px;
  color: #9ab0c0;
  font-weight: 500;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 6px;
}

.legend-dot.danger { background: #ff4444; }
.legend-dot.warning { background: #ff8844; }
.legend-dot.medium { background: #ffcc44; }
.legend-dot.safe { background: #44ff44; }

/* 灾害类型分布 - 放大 */
.type-chart {
  margin: 16px 0 20px;
  padding: 12px 0;
  border-top: 1px solid rgba(0, 150, 255, 0.2);
  border-bottom: 1px solid rgba(0, 150, 255, 0.2);
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: #aae0ff;
  font-weight: 500;
}

.type-title {
  font-weight: 600;
}

.type-unit {
  font-size: 10px;
  color: #88a0b0;
}

.type-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-item {
  width: 100%;
}

.type-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 4px;
}

.type-name {
  color: #d0e8f8;
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-icon {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.type-value {
  color: #00f0ff;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}

.type-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.type-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

/* 关键指标卡片网格 - 放大 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 8px 0 12px;
}

.stat-card {
  background: rgba(0, 30, 45, 0.6);
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 150, 255, 0.2);
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 200, 255, 0.4);
  background: rgba(0, 40, 60, 0.7);
}

.stat-card-icon {
  font-size: 24px;
  opacity: 0.9;
}

.stat-card-content {
  flex: 1;
}

.stat-card-label {
  font-size: 10px;
  color: #88a0b0;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.stat-card-value {
  font-size: 20px;
  font-weight: 700;
  color: #e0f0ff;
  line-height: 1.2;
}

.stat-card-value span {
  font-size: 12px;
  font-weight: normal;
  color: #88a0b0;
  margin-left: 2px;
}

.danger-card .stat-card-value {
  color: #ff8888;
}

.threat-card .stat-card-value {
  color: #00f0ff;
}

.chart-footer {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 150, 255, 0.2);
}

.alert-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 68, 68, 0.15);
  border-radius: 8px;
  padding: 10px;
}

.alert-icon {
  font-size: 14px;
}

.alert-text {
  font-size: 12px;
  color: #ffaa88;
  font-weight: 600;
  letter-spacing: 1px;
}

/* 扫描线效果 */
.scan-line {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 240, 255, 0.06),
    transparent
  );
  animation: scanMove 4s linear infinite;
  pointer-events: none;
}

@keyframes scanMove {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .chart-card {
    padding: 14px;
    min-height: auto;
  }
  
  .card-title {
    font-size: 14px;
  }
  
  .stats-grid {
    gap: 8px;
  }
  
  .stat-card-value {
    font-size: 16px;
  }
  
  .stat-card-icon {
    font-size: 20px;
  }
  
  .risk-legend {
    gap: 12px;
    font-size: 9px;
    flex-wrap: wrap;
  }
}
</style>
