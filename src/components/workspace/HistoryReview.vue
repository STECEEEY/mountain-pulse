<template>
  <div class="history-review">
    <!-- 时间线选择 -->
    <div class="timeline-header">
      <h4>历史事件时间线</h4>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        size="small"
        style="width: 240px"
      />
    </div>

    <!-- 时间线 -->
    <div class="timeline">
      <div v-for="event in timelineEvents" :key="event.id" class="timeline-item" :class="event.type">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="event-header">
            <span class="event-type">{{ event.typeText }}</span>
            <span class="event-date">{{ event.date }}</span>
          </div>
          <h5 class="event-title">{{ event.title }}</h5>
          <p class="event-desc">{{ event.description }}</p>
          <div class="event-tags" v-if="event.tags">
            <el-tag v-for="tag in event.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史数据对比 -->
    <div class="comparison-section">
      <h4>形变历史对比</h4>
      <div class="comparison-chart" ref="comparisonChartRef"></div>
    </div>

    <!-- 统计摘要 -->
    <div class="history-summary">
      <div class="summary-item">
        <span class="summary-value">12</span>
        <span class="summary-label">历史事件总数</span>
      </div>
      <div class="summary-item">
        <span class="summary-value">3</span>
        <span class="summary-label">预警触发次数</span>
      </div>
      <div class="summary-item">
        <span class="summary-value">2021</span>
        <span class="summary-label">监测开始年份</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

defineProps<{
  point: any
}>()

const dateRange = ref<[Date, Date] | null>(null)
const comparisonChartRef = ref<HTMLElement>()
let comparisonChart: echarts.ECharts | null = null

const timelineEvents = ref([
  {
    id: 1,
    type: 'warning',
    typeText: '黄色预警',
    date: '2026-03-15',
    title: '形变速率异常加快',
    description: '监测显示近两周形变速率达到 8.2mm/周，超过黄色预警阈值。',
    tags: ['形变异常', '需关注'],
  },
  {
    id: 2,
    type: 'inspection',
    typeText: '现场检查',
    date: '2026-03-10',
    title: '季度巡查',
    description: '发现坡面有新增裂缝，长约3米，宽度2-5mm。已记录并上报。',
    tags: ['裂缝', '已上报'],
  },
  {
    id: 3,
    type: 'rainfall',
    typeText: '降雨事件',
    date: '2026-03-05',
    title: '连续强降雨',
    description: '连续3天降雨量达到120mm，地下水位上升明显。',
    tags: ['强降雨', '地下水'],
  },
  {
    id: 4,
    type: 'normal',
    typeText: '常规监测',
    date: '2026-02-28',
    title: '月度数据汇总',
    description: '2月累计形变 6.5mm，在正常范围内。',
  },
])

const initComparisonChart = () => {
  if (!comparisonChartRef.value) return
  comparisonChart = echarts.init(comparisonChartRef.value)

  const option = {
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    legend: {
      data: ['2024年', '2025年', '2026年'],
      bottom: 0,
      textStyle: { fontSize: 11, color: '#64748b' },
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: 'mm',
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [
      { name: '2024年', type: 'line', data: [3, 5, 8, 10, 12, 14], lineStyle: { color: '#94a3b8' } },
      { name: '2025年', type: 'line', data: [4, 7, 11, 15, 18, 22], lineStyle: { color: '#3b82f6' } },
      { name: '2026年', type: 'line', data: [5, 10, 18, null, null, null], lineStyle: { color: '#ef4444' } },
    ],
  }
  comparisonChart.setOption(option)
}

onMounted(() => {
  initComparisonChart()
  window.addEventListener('resize', () => comparisonChart?.resize())
})

onUnmounted(() => {
  comparisonChart?.dispose()
})
</script>

<style scoped>
.history-review {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-left: 12px;
  border-left: 2px solid #e2e8f0;
}

.timeline-item {
  position: relative;
  padding: 0 0 20px 20px;
}

.timeline-dot {
  position: absolute;
  left: -7px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 2px solid #ffffff;
}

.timeline-item.warning .timeline-dot { background: #f59e0b; }
.timeline-item.inspection .timeline-dot { background: #3b82f6; }
.timeline-item.rainfall .timeline-dot { background: #06b6d4; }
.timeline-item.normal .timeline-dot { background: #22c55e; }

.timeline-content {
  background: #f8fafc;
  border-radius: 10px;
  padding: 14px;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.event-type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.timeline-item.warning .event-type { color: #f59e0b; }
.timeline-item.inspection .event-type { color: #3b82f6; }
.timeline-item.rainfall .event-type { color: #06b6d4; }
.timeline-item.normal .event-type { color: #22c55e; }

.event-date {
  font-size: 11px;
  color: #94a3b8;
}

.event-title {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.event-desc {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.event-tags {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.comparison-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.comparison-chart {
  height: 180px;
}

.history-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.summary-item {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
}

.summary-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #3b82f6;
}

.summary-label {
  font-size: 11px;
  color: #64748b;
}
</style>
