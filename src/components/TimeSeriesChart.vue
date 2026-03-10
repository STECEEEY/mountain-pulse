<template>
  <div class="time-series-chart">
    <div class="header">
      <h3>📈 InSAR 时序形变曲线</h3>
      <div class="controls">
        <el-select v-model="selectedPoint" size="small" placeholder="选择监测点">
          <el-option
            v-for="item in monitoringPoints"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
        <el-radio-group v-model="timeRange" size="small">
          <el-radio-button label="3m">3月</el-radio-button>
          <el-radio-button label="6m">6月</el-radio-button>
          <el-radio-button label="1y">1年</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="chart-container" ref="chartRef"></div>

    <!-- 形变统计卡片 -->
    <div class="stats-cards">
      <div class="stat-item">
        <span class="label">累计形变</span>
        <span class="value" :class="getColorClass(currentStats.cumulative)">
          {{ currentStats.cumulative }} mm
        </span>
      </div>
      <div class="stat-item">
        <span class="label">年均速率</span>
        <span class="value" :class="getColorClass(currentStats.rate)">
          {{ currentStats.rate }} mm/yr
        </span>
      </div>
      <div class="stat-item">
        <span class="label">最大形变</span>
        <span class="value" :class="getColorClass(currentStats.max)">
          {{ currentStats.max }} mm
        </span>
      </div>
      <div class="stat-item">
        <span class="label">预警等级</span>
        <span class="value warning" :class="currentStats.warningLevel">
          {{ currentStats.warningLevel }}
        </span>
      </div>
    </div>

    <!-- 形变解释 -->
    <div class="explanation">
      <el-alert :title="explanation" type="info" :closable="false" show-icon />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { ElSelect, ElOption, ElRadioGroup, ElRadioButton, ElAlert } from 'element-plus'

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

// 模拟监测点数据
const monitoringPoints = ref([
  { id: 1, name: '汤山滑坡群' },
  { id: 2, name: '宝华山崩塌' },
  { id: 3, name: '紫金山北坡' },
  { id: 4, name: '镇江三山' },
  { id: 5, name: '茅山东麓' },
])

const selectedPoint = ref(1)
const timeRange = ref('6m')

// 模拟形变数据
const deformationData = ref({
  dates: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'],
  values: [2.3, 5.1, 8.7, 12.4, 18.9, 25.6],
  threshold: 20, // 预警阈值
})

const currentStats = ref({
  cumulative: 25.6,
  rate: 51.2,
  max: 25.6,
  warningLevel: '黄色预警',
})

const explanation = ref(
  '近6个月累计形变25.6mm，形变速率加快，已超过黄色预警阈值(20mm)，建议加强监测。',
)

const getColorClass = (value: number) => {
  if (value > 20) return 'danger'
  if (value > 10) return 'warning'
  return 'normal'
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)
  updateChart()
}

// 更新图表数据
const updateChart = () => {
  if (!chart) return

  const option = {
    grid: {
      left: '5%',
      right: '5%',
      bottom: '10%',
      top: '15%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: '日期: {b}<br/>形变量: {c} mm',
    },
    xAxis: {
      type: 'category',
      data: deformationData.value.dates,
      axisLabel: {
        color: '#a0d0ff',
        fontSize: 11,
      },
      axisLine: {
        lineStyle: {
          color: '#2b6c9e',
        },
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: '形变量 (mm)',
      nameTextStyle: {
        color: '#a0d0ff',
        fontSize: 11,
      },
      axisLabel: {
        color: '#a0d0ff',
        fontSize: 11,
      },
      splitLine: {
        lineStyle: {
          color: '#1a3a5a',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '形变量',
        type: 'line',
        data: deformationData.value.values,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#00f0ff',
          width: 3,
          shadowColor: 'rgba(0, 240, 255, 0.5)',
          shadowBlur: 10,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 240, 255, 0.3)' },
            { offset: 1, color: 'rgba(0, 240, 255, 0)' },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: '#ff4444',
            type: 'dashed',
            width: 1,
          },
          label: {
            show: true,
            position: 'end',
            color: '#ff8888',
            fontSize: 10,
            formatter: '预警阈值',
          },
          data: [
            {
              yAxis: deformationData.value.threshold,
              name: '预警阈值',
            },
          ],
        },
      },
    ],
    backgroundColor: 'transparent',
  }

  chart.setOption(option)
}

// 监听窗口大小变化
const handleResize = () => {
  chart?.resize()
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})

// 监听数据变化
watch([selectedPoint, timeRange], () => {
  // 这里将来调用API获取真实数据
  setTimeout(updateChart, 100)
})
</script>

<style scoped>
.time-series-chart {
  background: rgba(10, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  color: #e0f0ff;
  border: 1px solid rgba(0, 200, 255, 0.2);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h3 {
  margin: 0;
  color: #00f0ff;
  font-size: 16px;
}

.controls {
  display: flex;
  gap: 10px;
}

.chart-container {
  width: 100%;
  height: 250px;
  margin-bottom: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  background: rgba(0, 40, 60, 0.4);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.stat-item .label {
  display: block;
  font-size: 12px;
  color: #88a0b0;
  margin-bottom: 4px;
}

.stat-item .value {
  font-size: 18px;
  font-weight: bold;
}

.stat-item .value.normal {
  color: #00f0ff;
}
.stat-item .value.warning {
  color: #ffaa00;
}
.stat-item .value.danger {
  color: #ff4444;
}

.stat-item .value.warning.黄色预警 {
  color: #ffaa00;
}
.stat-item .value.warning.橙色预警 {
  color: #ff6600;
}
.stat-item .value.warning.红色预警 {
  color: #ff0000;
}

.explanation {
  font-size: 13px;
  line-height: 1.6;
  color: #a0d0ff;
}

:deep(.el-alert) {
  background: rgba(0, 50, 80, 0.4);
  border: 1px solid rgba(0, 150, 255, 0.2);
  color: #e0f0ff;
}

:deep(.el-alert__title) {
  color: #00f0ff;
}

:deep(.el-select) {
  width: 140px;
}

:deep(.el-input__wrapper) {
  background: rgba(0, 30, 50, 0.6);
  border-color: rgba(0, 150, 255, 0.3);
}

:deep(.el-input__inner) {
  color: #e0f0ff;
}
</style>
