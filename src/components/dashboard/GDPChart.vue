<template>
  <div class="chart-card">
    <div class="card-header">
      <h3 class="card-title">GDP趋势</h3>
      <span class="card-badge">季度</span>
    </div>
    <div class="chart-container" ref="chartRef"></div>
    <div class="chart-footer">
      <div class="stat-item">
        <span class="stat-label">年度GDP</span>
        <span class="stat-value"><AnimatedNumber :value="1568" /><small>亿</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">增速</span>
        <span class="stat-value up">+<AnimatedNumber :value="6.8" :decimals="1" />%</span>
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
      data: ['Q1', 'Q2', 'Q3', 'Q4'],
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
        type: 'line',
        data: [320, 380, 420, 448],
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#ffaa00',
          width: 3,
          shadowColor: 'rgba(255, 170, 0, 0.5)',
          shadowBlur: 10,
        },
        itemStyle: {
          color: '#ffaa00',
          borderColor: '#0a0f1a',
          borderWidth: 2,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 170, 0, 0.3)' },
            { offset: 1, color: 'rgba(255, 170, 0, 0)' },
          ]),
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
  border-color: rgba(255, 170, 0, 0.4);
  box-shadow: 0 8px 30px rgba(255, 170, 0, 0.15);
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
  color: #ffaa00;
}

.card-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid rgba(255, 170, 0, 0.3);
  border-radius: 10px;
  color: #ffaa00;
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
</style>
