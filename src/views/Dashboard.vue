<template>
  <div class="dashboard">
    <!-- 左侧面板 -->
    <div class="left-panel">
      <RiskOverview />
      <ExposureAnalysis />
    </div>

    <!-- 中间：地图 + 时序曲线 -->
    <div class="center-panel">
      <div class="map-panel">
        <!-- 这里放你的地图组件 -->
        <div class="map-placeholder">
          <span>🗺️ 科技风地图</span>
          <small>宁镇山脉 · InSAR监测区</small>
        </div>
      </div>
      <TimeSeriesChart />
    </div>

    <!-- 右侧面板：切换显示不同功能 -->
    <div class="right-panel">
      <el-tabs v-model="activeTab" class="right-tabs">
        <el-tab-pane label="AI决策" name="ai">
          <AISuggestions />
        </el-tab-pane>
        <el-tab-pane label="数据上传" name="upload">
          <DataUpload />
        </el-tab-pane>
        <el-tab-pane label="报告生成" name="report">
          <ReportGenerator />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RiskOverview from '@/components/RiskOverview.vue'
import ExposureAnalysis from '@/components/ExposureAnalysis.vue'
import TimeSeriesChart from '@/components/TimeSeriesChart.vue'
import AISuggestions from '@/components/AISuggestions.vue'
import DataUpload from '@/components/DataUpload.vue'
import ReportGenerator from '@/components/ReportGenerator.vue'

const activeTab = ref('ai')
</script>

<style scoped>
.dashboard {
  width: 100%;
  height: 100vh;
  display: grid;
  grid-template-columns: 360px 1fr 380px;
  gap: 12px;
  padding: 12px;
  background: #0a0f1a;
  overflow: hidden;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
}

.center-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.map-panel {
  flex: 2;
  background: #0a0f1a;
  border-radius: 16px;
  overflow: hidden;
  min-height: 300px;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #0a1a2a, #0a0f1a);
  color: #88a0b0;
  border: 2px dashed rgba(0, 150, 255, 0.2);
  border-radius: 16px;
}

.map-placeholder span {
  font-size: 24px;
  margin-bottom: 8px;
}

.map-placeholder small {
  font-size: 14px;
  color: #00f0ff;
  opacity: 0.6;
}

.right-panel {
  height: 100%;
  background: rgba(10, 20, 30, 0.4);
  border-radius: 16px;
  overflow: hidden;
}

.right-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__header) {
  margin: 0 0 12px 0;
  padding: 12px 16px 0;
  background: rgba(0, 30, 50, 0.3);
  border-bottom: 1px solid rgba(0, 150, 255, 0.2);
}

:deep(.el-tabs__item) {
  color: #88a0b0;
}

:deep(.el-tabs__item.is-active) {
  color: #00f0ff;
}

:deep(.el-tabs__active-bar) {
  background: #00f0ff;
}

:deep(.el-tabs__content) {
  flex: 1;
  padding: 0 16px 16px;
  overflow-y: auto;
}
</style>
