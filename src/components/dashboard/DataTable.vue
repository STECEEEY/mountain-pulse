<template>
  <div class="table-card">
    <div class="card-header">
      <h3 class="card-title">风险点数据</h3>
      <el-input
        v-model="searchText"
        placeholder="搜索..."
        :prefix-icon="Search"
        size="small"
        style="width: 160px"
      />
    </div>
    <div class="table-container">
      <div v-if="loadError" class="table-state">{{ loadError }}</div>
      <el-table
        v-else
        ref="tableRef"
        :data="filteredData"
        style="width: 100%"
        size="small"
        height="100%"
        :row-class-name="tableRowClassName"
        @mouseenter="isHovering = true"
        @mouseleave="isHovering = false"
      >
        <el-table-column prop="name" label="名称" min-width="92" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="56" />
        <el-table-column prop="level" label="等级" width="56">
          <template #default="{ row }">
            <span class="level-badge" :class="row.levelClass">{{ row.level }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="deformation" label="形变" width="78">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.deformation > 20 }">{{ row.deformation }}mm</span>
          </template>
        </el-table-column>
        <el-table-column prop="population" label="威胁人口" width="82" show-overflow-tooltip />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { riskService } from '@/services/riskService'
import { getRiskLevelClass } from '@/utils/riskLevel'

const searchText = ref('')
const loadError = ref('')
const tableRef = ref<any>(null)
const isHovering = ref(false)
let autoScrollTimer: number | null = null

const tableData = ref<Array<{
  id: number
  name: string
  type: string
  level: string
  levelClass: string
  deformation: number
  population: string
}>>([])

const loadTableData = async () => {
  try {
    loadError.value = ''
    const response = await riskService.loadRiskPoints()
    tableData.value = response.points
      .map((point, index) => ({
        id: index + 1,
        name: point.name,
        type: point.type,
        level: point.level,
        levelClass: getRiskLevelClass(point.level),
        deformation: Number(point.velocity),
        population: point.threat,
      }))
      .sort((a, b) => Math.abs(b.deformation) - Math.abs(a.deformation))
      .slice(0, 200)
  } catch {
    tableData.value = []
    loadError.value = '风险点数据加载失败'
  }
}

const filteredData = computed(() => {
  if (!searchText.value) return tableData.value
  return tableData.value.filter(item =>
    item.name.includes(searchText.value) ||
    item.type.includes(searchText.value)
  )
})

const tableRowClassName = ({ row }: { row: any }) => {
  if (row.levelClass === 'danger') return 'row-danger'
  if (row.levelClass === 'warning') return 'row-warning'
  return ''
}

const stopAutoScroll = () => {
  if (autoScrollTimer !== null) {
    window.clearInterval(autoScrollTimer)
    autoScrollTimer = null
  }
}

const startAutoScroll = async () => {
  stopAutoScroll()
  await nextTick()

  const wrap = tableRef.value?.$el?.querySelector('.el-scrollbar__wrap') as HTMLElement | null
  if (!wrap) return
  if (filteredData.value.length <= 8) return

  autoScrollTimer = window.setInterval(() => {
    if (isHovering.value) return

    const maxScrollTop = wrap.scrollHeight - wrap.clientHeight
    if (maxScrollTop <= 0) return

    if (wrap.scrollTop >= maxScrollTop - 1) {
      wrap.scrollTop = 0
    } else {
      wrap.scrollTop += 1
    }
  }, 45)
}

onMounted(() => {
  loadTableData()
})

onUnmounted(() => {
  stopAutoScroll()
})

watch(filteredData, () => {
  startAutoScroll()
})
</script>

<style scoped>
.table-card {
  flex: 1;
  background: rgba(10, 20, 30, 0.8);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.table-card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 240, 255, 0.4);
  box-shadow: 0 8px 30px rgba(0, 200, 255, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(0, 150, 255, 0.1);
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #00f0ff;
}

.table-container {
  flex: 1;
  overflow: hidden;
}

.table-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ff9d9d;
  font-size: 13px;
}

:deep(.el-input__wrapper) {
  background: rgba(0, 30, 50, 0.6);
  border: 1px solid rgba(0, 150, 255, 0.3);
  box-shadow: none;
}

:deep(.el-input__inner) {
  color: #e0f0ff;
}

:deep(.el-table) {
  background: transparent;
  --el-table-border-color: rgba(0, 150, 255, 0.1);
  --el-table-row-hover-bg-color: rgba(0, 100, 150, 0.2);
  --el-table-header-bg-color: rgba(0, 40, 60, 0.6);
  --el-table-tr-bg-color: transparent;
}

:deep(.el-table th.el-table__cell) {
  background: rgba(0, 40, 60, 0.6);
  color: #00f0ff;
  font-weight: 500;
}

:deep(.el-table th.el-table__cell .cell) {
  padding: 0 4px;
  font-size: 12px;
}

:deep(.el-table td.el-table__cell) {
  color: #e0f0ff;
  border-bottom: 1px solid rgba(0, 150, 255, 0.1);
}

:deep(.el-table td.el-table__cell .cell) {
  padding: 0 4px;
  font-size: 12px;
}

:deep(.el-table .el-scrollbar__wrap) {
  scroll-behavior: auto;
}

:deep(.el-table .row-danger) {
  background: rgba(255, 68, 68, 0.1);
}

:deep(.el-table .row-warning) {
  background: rgba(255, 136, 68, 0.05);
}

.level-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 8px;
}

.level-badge.danger {
  background: #ff4444;
  color: white;
}

.level-badge.warning {
  background: #ff8844;
  color: white;
}

.level-badge.medium {
  background: #ffcc44;
  color: #333;
}

.level-badge.safe {
  background: #44ff44;
  color: #333;
}

.text-danger {
  color: #ff4444;
  font-weight: 600;
}

.table-container :deep(.el-table__body-wrapper:hover),
.table-container :deep(.el-scrollbar__wrap:hover) {
  cursor: ns-resize;
}
</style>
