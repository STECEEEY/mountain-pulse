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
      <el-table
        :data="filteredData"
        style="width: 100%"
        size="small"
        :row-class-name="tableRowClassName"
      >
        <el-table-column prop="name" label="名称" min-width="100" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="70" />
        <el-table-column prop="level" label="等级" width="70">
          <template #default="{ row }">
            <span class="level-badge" :class="row.levelClass">{{ row.level }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="deformation" label="形变" width="80">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.deformation > 20 }">{{ row.deformation }}mm</span>
          </template>
        </el-table-column>
        <el-table-column prop="population" label="威胁人口" width="80" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search } from '@element-plus/icons-vue'

const searchText = ref('')

const tableData = ref([
  { id: 1, name: '汤山滑坡群', type: '滑坡', level: '极高', levelClass: 'danger', deformation: 25.6, population: 1250 },
  { id: 2, name: '宝华山崩塌', type: '崩塌', level: '高', levelClass: 'warning', deformation: 18.3, population: 830 },
  { id: 3, name: '紫金山北坡', type: '滑坡', level: '高', levelClass: 'warning', deformation: 15.7, population: 2100 },
  { id: 4, name: '镇江三山', type: '滑坡', level: '中', levelClass: 'medium', deformation: 8.9, population: 560 },
  { id: 5, name: '茅山东麓', type: '崩塌', level: '中', levelClass: 'medium', deformation: 6.2, population: 420 },
  { id: 6, name: '栖霞山南', type: '泥流', level: '低', levelClass: 'safe', deformation: 3.1, population: 280 },
])

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
  padding: 16px;
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
  overflow: auto;
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

:deep(.el-table td.el-table__cell) {
  color: #e0f0ff;
  border-bottom: 1px solid rgba(0, 150, 255, 0.1);
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
</style>
