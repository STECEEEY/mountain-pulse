<template>
  <div class="chart-card" :class="{ 'alert-active': hasAlert }">
    <div class="card-header">
      <h3 class="card-title">灾害统计</h3>
      <span class="card-badge warning">
        <span class="pulse-dot"></span>
        {{ alertStatus }}
      </span>
    </div>
    
    <!-- 风险占比条形图 -->
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
        <span><i class="legend-dot danger"></i>极高</span>
        <span><i class="legend-dot warning"></i>高</span>
        <span><i class="legend-dot medium"></i>中</span>
        <span><i class="legend-dot safe"></i>低</span>
      </div>
    </div>

    <!-- 新增：灾害类型分布迷你图表 -->
    <div class="type-chart" v-if="typeStats.length > 0">
      <div class="type-header">
        <span class="type-title">📊 灾害类型分布</span>
        <span class="type-unit">数量</span>
      </div>
      <div class="type-bars">
        <div 
          v-for="item in typeStats" 
          :key="item.type"
          class="type-item"
        >
          <div class="type-label">
            <span class="type-name">{{ item.type }}</span>
            <span class="type-value">{{ item.count }}</span>
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

    <div class="chart-footer">
      <div class="threat-info">
        <span class="threat-icon">👥</span>
        <span class="threat-text">
          威胁人口:
          <strong v-if="threatPopulation >= 0">
            <AnimatedNumber :value="threatPopulation / 10000" :decimals="1" suffix="万" />
          </strong>
          <strong v-else>暂无数据</strong>
        </span>
      </div>
      <div class="alert-info" v-if="hasAlert">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">建议优先处置极高风险点</span>
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

// 新增：灾害类型统计
interface TypeStat {
  type: string
  count: number
  percent: number
  color: string
}
const typeStats = ref<TypeStat[]>([])

// 类型颜色映射 - 使用 as const 确保类型安全
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

// 获取类型颜色的辅助函数，确保始终返回 string
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
  if (stats.value.danger > 0) return `${stats.value.danger}个极高风险点`
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
      color: getTypeColor(type)  // 使用辅助函数确保返回 string
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
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

      // 从 threat 字符串中解析人口数
      totalThreat += parseThreatPopulation(point.threat)
    })

    stats.value = aggregate
    totalPoints.value = response.points.length
    threatPopulation.value = totalThreat
    
    // 计算类型分布
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
/* 保留原有样式，新增类型图表样式 */

.chart-card {
  flex: 1;
  background: rgba(10, 20, 30, 0.8);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.chart-card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 240, 255, 0.4);
  box-shadow: 0 8px 30px rgba(0, 200, 255, 0.15);
}

.chart-card.alert-active {
  border-color: rgba(255, 68, 68, 0.5);
  box-shadow: 0 0 20px rgba(255, 68, 68, 0.2);
}

.chart-card.alert-active:hover {
  box-shadow: 0 8px 30px rgba(255, 68, 68, 0.25);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #ff6666;
}

.card-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 100, 100, 0.2);
  border: 1px solid rgba(255, 100, 100, 0.5);
  color: #ff6666;
}

.pulse-dot {
  width: 6px;
  height: 6px;
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

/* 风险占比条形图 */
.risk-chart {
  margin: 0 0 12px 0;
}

.risk-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
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
  gap: 16px;
  margin-top: 8px;
  justify-content: center;
  font-size: 10px;
  color: #88a0b0;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  margin-right: 4px;
}

.legend-dot.danger { background: #ff4444; }
.legend-dot.warning { background: #ff8844; }
.legend-dot.medium { background: #ffcc44; }
.legend-dot.safe { background: #44ff44; }

/* 新增：灾害类型分布图表样式 */
.type-chart {
  margin: 8px 0 12px;
  padding: 8px 0;
  border-top: 1px solid rgba(0, 150, 255, 0.15);
  border-bottom: 1px solid rgba(0, 150, 255, 0.15);
}

.type-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 10px;
  color: #9ad4f2;
}

.type-title {
  font-weight: 500;
}

.type-unit {
  font-size: 9px;
  color: #88a0b0;
}

.type-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.type-item {
  width: 100%;
}

.type-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  margin-bottom: 2px;
}

.type-name {
  color: #c0d8e8;
}

.type-value {
  color: #00f0ff;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.type-bar-bg {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.type-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 150, 255, 0.1);
  margin-top: auto;
}

.threat-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.threat-icon {
  font-size: 10px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  border-radius: 8px;
  padding: 2px 6px;
  color: #9ad4f2;
}

.threat-text {
  font-size: 12px;
  color: #88a0b0;
}

.threat-text strong {
  color: #00f0ff;
}

.alert-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #ff8888;
}

.alert-icon {
  font-size: 10px;
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
    rgba(0, 240, 255, 0.05),
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
</style>
