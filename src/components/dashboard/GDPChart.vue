<template>
  <div class="chart-card">
    <div class="card-header">
      <h3 class="card-title">降雨趋势</h3>
      <span class="card-badge">年降雨量</span>
    </div>
    <div class="chart-container" ref="chartRef"></div>
    <div class="chart-footer">
      <div class="stat-item">
        <span class="stat-label">年均降雨量</span>
        <span class="stat-value"><AnimatedNumber :value="avgRainfall" /><small>mm</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-label">2025年降雨</span>
        <span class="stat-value" :class="rainChangeClass">{{ rainChangeSymbol }}<AnimatedNumber :value="Math.abs(rainChangeRate)" :decimals="1" />%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

// 2017-2025年降雨数据（mm）
const rainData = {
  years: ['2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
  values: [1180, 1000, 1100, 1520, 1267, 922, 1224, 1279, 997.4]
}

// 计算年均降雨量
const avgRainfall = computed(() => {
  const sum = rainData.values.reduce((a, b) => a + b, 0)
  return Math.round(sum / rainData.values.length)
})

// 计算2025年同比变化（与2024年对比）- 修复 TS 错误
const rainChangeRate = computed(() => {
  const values = rainData.values
  if (values.length < 2) return 0
  const lastYear = values[values.length - 2]
  const thisYear = values[values.length - 1]
  if (lastYear === undefined || thisYear === undefined) return 0
  return ((thisYear - lastYear) / lastYear * 100)
})

const rainChangeSymbol = computed(() => rainChangeRate.value >= 0 ? '+' : '')
const rainChangeClass = computed(() => rainChangeRate.value >= 0 ? 'up' : 'down')

const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)

  const option = {
    grid: {
      left: '12%',
      right: '5%',
      top: '18%',
      bottom: '10%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10, 20, 30, 0.95)',
      borderColor: '#00aaff',
      borderWidth: 1,
      textStyle: { color: '#e0f0ff', fontSize: 11 },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const data = params[0]
        return `${data.name}年<br/>降雨量: ${data.value} mm`
      }
    },
    xAxis: {
      type: 'category',
      data: rainData.years,
      axisLine: { lineStyle: { color: '#2b4a6a' } },
      axisLabel: { 
        color: '#88a0b0', 
        fontSize: 10,
        rotate: 45,
        interval: 0,
        margin: 8
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'mm',
      nameTextStyle: { color: '#88a0b0', fontSize: 9 },
      axisLine: { show: false },
      axisLabel: { color: '#88a0b0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1a3a5a', type: 'dashed' } },
    },
    series: [
      {
        name: '年降雨量',
        type: 'bar',
        data: rainData.values,
        barWidth: '60%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#1e40af' },
          ]),
          borderColor: '#60a5fa',
          borderWidth: 1,
        },
        label: {
          show: true,
          position: 'top',
          color: '#88a0b0',
          fontSize: 9,
          formatter: (params: any) => `${params.value}`
        },
      },
      {
        name: `年均值 ${avgRainfall.value}mm`,
        type: 'line',
        data: Array(rainData.years.length).fill(avgRainfall.value),
        lineStyle: {
          color: '#ffaa00',
          width: 2,
          type: 'dashed',
        },
        symbol: 'none',
        tooltip: { show: false },
      }
    ],
    backgroundColor: 'transparent',
    legend: {
      show: true,
      data: ['年降雨量', `年均值 ${avgRainfall.value}mm`],
      textStyle: { color: '#88a0b0', fontSize: 10 },
      right: 0,
      top: 0,
      itemWidth: 20,
      itemHeight: 10,
    },
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
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.15);
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
  color: #3b82f6;
}

.card-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 10px;
  color: #60a5fa;
}

.chart-container {
  flex: 1;
  min-height: 140px;
  width: 100%;
}

.chart-footer {
  display: flex;
  justify-content: space-around;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 150, 255, 0.1);
  margin-top: 8px;
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
  color: #ff8844;
}
</style>