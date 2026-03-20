<template>
  <div class="chart-card">
    <div class="card-header">
      <h3 class="card-title">人口趋势</h3>
      <span class="card-badge">实时</span>
    </div>
    <div class="chart-container" ref="chartRef"></div>
    <div class="chart-footer">
      <div class="stat-item">
        <span class="stat-label">总人口</span>
        <span class="stat-value"><AnimatedNumber :value="45.2" :decimals="1" /><small>万</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">同比增长</span>
        <span class="stat-value up">+<AnimatedNumber :value="2.3" :decimals="1" />%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)

  const option = {
    grid: {
      left: '10%',
      right: '5%',
      top: '15%',
      bottom: '15%',
    },
    xAxis: {
      type: 'category',
      data: ['2020', '2021', '2022', '2023', '2024', '2025'],
      axisLine: { lineStyle: { color: '#2b4a6a' } },
      axisLabel: { color: '#88a0b0', fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#88a0b0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1a3a5a', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: [40.1, 41.3, 42.5, 43.8, 44.5, 45.2],
        barWidth: '40%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#00f0ff' },
            { offset: 1, color: '#0066ff' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
    backgroundColor: 'transparent',
  }

  chart.setOption(option)
}

const handleResize = () => chart?.resize()

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.chart-card {
  background: rgba(10, 20, 30, 0.8);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.chart-card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 240, 255, 0.4);
  box-shadow: 0 8px 30px rgba(0, 200, 255, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #00f0ff;
}

.card-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 10px;
  color: #00f0ff;
}

.chart-container {
  flex: 1;
  min-height: 120px;
}

.chart-footer {
  display: flex;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 150, 255, 0.1);
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #88a0b0;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #e0f0ff;
}

.stat-value small {
  font-size: 12px;
  font-weight: normal;
  color: #88a0b0;
}

.stat-value.up {
  color: #00ff88;
}

.stat-value.down {
  color: #ff4444;
}
</style>
