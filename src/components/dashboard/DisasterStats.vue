<template>
  <div class="chart-card" :class="{ 'alert-active': hasAlert }">
    <div class="card-header">
      <h3 class="card-title">灾害统计</h3>
      <span class="card-badge warning">
        <span class="pulse-dot"></span>
        {{ alertStatus }}
      </span>
    </div>
    
    <div class="stats-grid">
      <div class="stat-box danger" :class="{ 'flash-alert': stats.danger > 0 }">
        <div class="stat-number">
          <AnimatedNumber :value="stats.danger" />
        </div>
        <div class="stat-name">极高风险</div>
        <div class="stat-desc">需立即处置</div>
      </div>
      <div class="stat-box warning">
        <div class="stat-number">
          <AnimatedNumber :value="stats.warning" />
        </div>
        <div class="stat-name">高风险</div>
        <div class="stat-desc">重点监测</div>
      </div>
      <div class="stat-box medium">
        <div class="stat-number">
          <AnimatedNumber :value="stats.medium" />
        </div>
        <div class="stat-name">中风险</div>
        <div class="stat-desc">定期巡查</div>
      </div>
      <div class="stat-box safe">
        <div class="stat-number">
          <AnimatedNumber :value="stats.safe" />
        </div>
        <div class="stat-name">低风险</div>
        <div class="stat-desc">常规监测</div>
      </div>
    </div>
    
    <!-- 新增：风险占比图表 -->
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

const stats = ref({
  danger: 0,
  warning: 0,
  medium: 0,
  safe: 0,
})
const threatPopulation = ref(-1)
const totalPoints = ref(0)

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

const loadStats = async () => {
  try {
    const response = await riskService.loadRiskPoints()
    const aggregate = { danger: 0, warning: 0, medium: 0, safe: 0 }
    let totalThreat = 0

    response.points.forEach((point) => {
      const level = point.level.trim().toLowerCase()
      if (level.includes('极高风险') || level.includes('danger')) aggregate.danger += 1
      else if (level === '高风险' || level.includes('warning')) aggregate.warning += 1
      else if (level === '中风险' || level.includes('medium')) aggregate.medium += 1
      else aggregate.safe += 1

      totalThreat += parseThreatPopulation(point.threat)
    })

    stats.value = aggregate
    totalPoints.value = response.points.length
    threatPopulation.value = totalThreat
  } catch {
    stats.value = { danger: 0, warning: 0, medium: 0, safe: 0 }
    totalPoints.value = 0
    threatPopulation.value = -1
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
/* 保持原有样式，新增以下样式 */

.stat-desc {
  font-size: 10px;
  color: rgba(136, 160, 176, 0.8);
  margin-top: 4px;
}

/* 风险占比条形图 */
.risk-chart {
  margin: 12px 0 8px;
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

.chart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
</style>