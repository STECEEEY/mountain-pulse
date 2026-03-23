<template>
  <div class="chart-card">
    <div class="card-header">
      <h3 class="card-title">人口暴露度</h3>
      <span class="card-badge">威胁人口统计</span>
    </div>
    <div class="chart-container" ref="chartRef"></div>
    <div class="chart-footer">
      <div class="stat-item">
        <span class="stat-label">威胁总人口</span>
        <span class="stat-value">
          <AnimatedNumber :value="exposureStats.total / 10000" :decimals="1" />
          <small>万</small>
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">极高风险区</span>
        <span class="stat-value up">
          <AnimatedNumber :value="exposureStats.byLevel['极高风险'] / 10000" :decimals="1" />
          <small>万</small>
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">高风险区占比</span>
        <span class="stat-value">
          <AnimatedNumber :value="highRiskRatio" :decimals="1" />
          <small>%</small>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import riskData from '@/data/risk_points.json'

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

// 风险等级顺序（用于图表排序）
const levelOrder = ['极高风险', '高风险', '中风险', '低风险']
const levelColors = {
  '极高风险': '#ff4d4f',
  '高风险': '#ff7c43',
  '中风险': '#ffc107',
  '低风险': '#52c41a'
}

// 聚合威胁人口数据
const exposureStats = computed(() => {
  const stats = {
    total: 0,
    byLevel: {
      '极高风险': 0,
      '高风险': 0,
      '中风险': 0,
      '低风险': 0
    },
    pointCount: {
      '极高风险': 0,
      '高风险': 0,
      '中风险': 0,
      '低风险': 0
    }
  }
  
  riskData.points.forEach((point: any) => {
    // 解析 threat 字段中的数字（如 "298人" -> 298）
    const pop = parseInt(point.threat) || 0
    const level = point.level
    
    if (stats.byLevel[level] !== undefined) {
      stats.byLevel[level] += pop
      stats.pointCount[level] += 1
    }
    stats.total += pop
  })
  
  return stats
})

// 高风险区人口占比（极高+高）
const highRiskRatio = computed(() => {
  const highRiskPop = exposureStats.value.byLevel['极高风险'] + exposureStats.value.byLevel['高风险']
  if (exposureStats.value.total === 0) return 0
  return (highRiskPop / exposureStats.value.total) * 100
})

// 图表数据
const chartData = computed(() => {
  return {
    levels: levelOrder,
    populations: levelOrder.map(level => exposureStats.value.byLevel[level]),
    colors: levelOrder.map(level => levelColors[level as keyof typeof levelColors])
  }
})

const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0]
        const level = data.name
        const pop = data.value
        const pointCount = exposureStats.value.pointCount[level as keyof typeof exposureStats.value.pointCount]
        return `
          <div style="font-weight:600;margin-bottom:4px">${level}</div>
          <div>威胁人口: ${pop.toLocaleString()} 人</div>
          <div>风险点数量: ${pointCount} 个</div>
          <div>平均威胁: ${Math.round(pop / pointCount)} 人/点</div>
        `
      },
      backgroundColor: 'rgba(10, 20, 30, 0.95)',
      borderColor: '#00f0ff',
      borderWidth: 1,
      textStyle: { color: '#e0f0ff', fontSize: 11 }
    },
    grid: {
      left: '12%',
      right: '5%',
      top: '10%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.value.levels,
      axisLine: { lineStyle: { color: '#2b4a6a' } },
      axisLabel: {
        color: '#88a0b0',
        fontSize: 10,
        rotate: 0,
        interval: 0
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '威胁人口 (人)',
      nameTextStyle: { color: '#88a0b0', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: {
        color: '#88a0b0',
        fontSize: 10,
        formatter: (value: number) => {
          if (value >= 10000) return (value / 10000).toFixed(0) + '万'
          return value.toLocaleString()
        }
      },
      splitLine: { lineStyle: { color: '#1a3a5a', type: 'dashed' } }
    },
    series: [
      {
        type: 'bar',
        data: chartData.value.populations,
        barWidth: '50%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: any) => {
            return chartData.value.colors[params.dataIndex]
          },
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          shadowBlur: 8
        },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const val = params.value
            if (val >= 10000) return (val / 10000).toFixed(1) + '万'
            return val.toLocaleString()
          },
          color: '#00f0ff',
          fontSize: 10,
          fontWeight: 'bold'
        }
      }
    ],
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  }

  chart.setOption(option)
}

// 响应窗口大小变化
const handleResize = () => chart?.resize()

// 监听数据变化重新渲染（如果数据是异步加载的）
import { watch } from 'vue'
watch([exposureStats], () => {
  if (chart) {
    chart.setOption({
      xAxis: { data: chartData.value.levels },
      series: [{ data: chartData.value.populations }]
    })
  }
}, { deep: true })

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
  backdrop-filter: blur(4px);
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
  border-color: rgba(0, 240, 255, 0.5);
  box-shadow: 0 8px 30px rgba(0, 200, 255, 0.2);
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
  font-weight: 600;
  color: #00f0ff;
  letter-spacing: 0.5px;
}

.card-badge {
  font-size: 10px;
  padding: 2px 8px;
  background: rgba(0, 240, 255, 0.12);
  border: 1px solid rgba(0, 240, 255, 0.35);
  border-radius: 12px;
  color: #00f0ff;
  font-weight: 500;
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
  margin-top: 8px;
  border-top: 1px solid rgba(0, 150, 255, 0.15);
  gap: 8px;
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: #88a0b0;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #e0f0ff;
}

.stat-value small {
  font-size: 11px;
  font-weight: normal;
  color: #88a0b0;
  margin-left: 2px;
}

.stat-value.up {
  color: #ff7c43;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .chart-card {
    padding: 12px;
  }
  
  .stat-value {
    font-size: 16px;
  }
  
  .chart-container {
    min-height: 120px;
  }
}
</style>