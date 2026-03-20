<template>
  <div class="deformation-analysis">
    <!-- 选中点信息 -->
    <div class="point-info" v-if="point">
      <h3 class="point-name">{{ point.name }}</h3>
      <div class="point-meta">
        <span class="level-badge" :class="point.level">{{ getLevelText(point.level) }}</span>
        <span class="coords">{{ point.lng }}°E, {{ point.lat }}°N</span>
      </div>
    </div>
    <div class="no-selection" v-else>
      <div class="empty-hint">
        <span class="empty-icon">NO DATA</span>
        <span>请在地图上选择监测点</span>
      </div>
    </div>

    <!-- 时序曲线 -->
    <div class="chart-section">
      <div class="section-header">
        <h4>InSAR 时序形变</h4>
        <el-radio-group v-model="timeRange" size="small">
          <el-radio-button label="3m">3月</el-radio-button>
          <el-radio-button label="6m">6月</el-radio-button>
          <el-radio-button label="1y">1年</el-radio-button>
        </el-radio-group>
      </div>
      <div class="chart-container" ref="chartRef"></div>
    </div>

    <!-- 统计指标 -->
    <div class="stats-section">
      <div class="stat-card">
        <span class="stat-label">累计形变</span>
        <span class="stat-value" :class="{ danger: stats.cumulative > 20 }">{{ stats.cumulative }} mm</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">年均速率</span>
        <span class="stat-value">{{ stats.rate }} mm/yr</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最大形变</span>
        <span class="stat-value">{{ stats.max }} mm</span>
      </div>
      <div class="stat-card warning-card">
        <span class="stat-label">预警状态</span>
        <span class="stat-value warning">{{ stats.warning }}</span>
      </div>
    </div>

    <!-- AI 分析 -->
    <div class="ai-analysis">
      <div class="ai-header">
        <span class="ai-icon">MODEL</span>
        <span>模型趋势分析</span>
      </div>
      <p class="ai-content">
        该监测点近6个月形变速率呈加速趋势，累计形变已超过黄色预警阈值。建议加密监测频率，
        关注周边降雨情况，必要时启动应急响应。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  point: any
}>()

const timeRange = ref('6m')
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const stats = ref({
  cumulative: 25.6,
  rate: 51.2,
  max: 25.6,
  warning: '黄色预警',
})

const getLevelText = (level: string) => {
  const texts: Record<string, string> = {
    danger: '极高风险',
    warning: '高风险',
    medium: '中风险',
    safe: '低风险',
  }
  return texts[level] || level
}

const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)

  const option = {
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
      axisLine: { lineStyle: { color: '#2b4a6a' } },
      axisLabel: { color: '#88a0b0', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'mm',
      nameTextStyle: { color: '#88a0b0', fontSize: 11 },
      axisLine: { show: false },
      axisLabel: { color: '#88a0b0', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1a3a5a', type: 'dashed' } },
    },
    series: [{
      type: 'line',
      data: [2.3, 5.1, 8.7, 12.4, 18.9, 25.6],
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#00f0ff', width: 2, shadowColor: 'rgba(0, 240, 255, 0.5)', shadowBlur: 10 },
      itemStyle: { color: '#00f0ff', borderColor: '#00f0ff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 240, 255, 0.3)' },
          { offset: 1, color: 'rgba(0, 240, 255, 0)' },
        ]),
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#ff4444', type: 'dashed' },
        label: { show: true, position: 'end', color: '#ff8888', fontSize: 10, formatter: '预警线' },
        data: [{ yAxis: 20 }],
      },
    }],
    backgroundColor: 'transparent',
  }
  chart.setOption(option)
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
})

watch(() => props.point, () => {
  // 更新图表数据
})
</script>

<style scoped>
.deformation-analysis {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.point-info {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 200, 255, 0.2);
}

.point-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #00f0ff;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
}

.point-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.level-badge.danger { background: rgba(255, 68, 68, 0.2); color: #ff4444; border: 1px solid rgba(255, 68, 68, 0.5); }
.level-badge.warning { background: rgba(255, 136, 68, 0.2); color: #ff8844; border: 1px solid rgba(255, 136, 68, 0.5); }
.level-badge.medium { background: rgba(255, 204, 68, 0.2); color: #ffcc44; border: 1px solid rgba(255, 204, 68, 0.5); }
.level-badge.safe { background: rgba(68, 255, 68, 0.2); color: #44ff44; border: 1px solid rgba(68, 255, 68, 0.5); }

.coords {
  font-size: 13px;
  color: #88a0b0;
}

.no-selection {
  padding: 40px 0;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #88a0b0;
}

.empty-icon {
  font-size: 11px;
  letter-spacing: 1px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  background: rgba(0, 76, 112, 0.22);
  border-radius: 8px;
  padding: 4px 8px;
  opacity: 0.9;
}

.chart-section {
  background: rgba(0, 30, 50, 0.5);
  border: 1px solid rgba(0, 200, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
}

.chart-container {
  height: 200px;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: rgba(0, 30, 50, 0.5);
  border: 1px solid rgba(0, 200, 255, 0.15);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: rgba(0, 200, 255, 0.3);
  background: rgba(0, 50, 80, 0.5);
}

.stat-card.warning-card {
  animation: pulseWarning 2s infinite;
}

@keyframes pulseWarning {
  0%, 100% { border-color: rgba(255, 136, 68, 0.3); }
  50% { border-color: rgba(255, 136, 68, 0.6); }
}

.stat-label {
  font-size: 12px;
  color: #88a0b0;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #00f0ff;
}

.stat-value.danger { color: #ff4444; text-shadow: 0 0 10px rgba(255, 68, 68, 0.5); }
.stat-value.warning { color: #ffaa00; }

.ai-analysis {
  background: linear-gradient(135deg, rgba(0, 50, 100, 0.4) 0%, rgba(0, 80, 60, 0.3) 100%);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
  margin-bottom: 10px;
}

.ai-icon {
  font-size: 10px;
  border: 1px solid rgba(0, 180, 255, 0.28);
  border-radius: 8px;
  padding: 2px 6px;
  color: #9ad4f2;
}

.ai-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #a0d0ff;
}

/* Element Plus 深色样式 */
:deep(.el-radio-group) {
  --el-radio-button-checked-bg-color: rgba(0, 150, 255, 0.3);
  --el-radio-button-checked-border-color: #00f0ff;
  --el-radio-button-checked-text-color: #00f0ff;
}

:deep(.el-radio-button__inner) {
  background: rgba(0, 30, 50, 0.6);
  border-color: rgba(0, 150, 255, 0.3);
  color: #88a0b0;
}

:deep(.el-radio-button__inner:hover) {
  color: #00f0ff;
}
</style>
