<template>
  <div class="side-panel">
    <!-- Tab 导航 -->
    <div class="tab-nav">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <el-icon :size="18"><component :is="tab.icon" /></el-icon>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab 内容 -->
    <div class="tab-content">
      <!-- AI 决策驾驶舱 -->
      <AIDecisionCockpit v-if="activeTab === 'decision'" :point="selectedPoint" />

      <!-- 形变分析 -->
      <DeformationAnalysis v-if="activeTab === 'deformation'" :point="selectedPoint" />

      <!-- 风险分级 -->
      <RiskClassification v-if="activeTab === 'risk'" :point="selectedPoint" />

      <!-- 历史回溯 -->
      <HistoryReview v-if="activeTab === 'history'" :point="selectedPoint" />

      <!-- 数据详情 -->
      <PointDetail v-if="activeTab === 'detail'" :point="selectedPoint" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Cpu, TrendCharts, Warning, Clock, Document } from '@element-plus/icons-vue'
import AIDecisionCockpit from './AIDecisionCockpit.vue'
import DeformationAnalysis from './DeformationAnalysis.vue'
import RiskClassification from './RiskClassification.vue'
import HistoryReview from './HistoryReview.vue'
import PointDetail from './PointDetail.vue'

defineProps<{
  selectedPoint: any
}>()

const activeTab = ref('decision')

const tabs = [
  { key: 'decision', label: '决策驾驶舱', icon: Cpu },
  { key: 'deformation', label: '形变分析', icon: TrendCharts },
  { key: 'risk', label: '风险分级', icon: Warning },
  { key: 'history', label: '历史回溯', icon: Clock },
  { key: 'detail', label: '数据详情', icon: Document },
]
</script>

<style scoped>
.side-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #e0f0ff;
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid rgba(0, 200, 255, 0.2);
  padding: 0 8px;
  background: rgba(0, 30, 50, 0.5);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  border: none;
  background: transparent;
  color: #88a0b0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-item:hover {
  color: #00f0ff;
  background: rgba(0, 150, 255, 0.1);
}

.tab-item.active {
  color: #00f0ff;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #00a8ff, #00f0ff);
  border-radius: 3px 3px 0 0;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 滚动条样式 */
.tab-content::-webkit-scrollbar {
  width: 6px;
}

.tab-content::-webkit-scrollbar-track {
  background: rgba(0, 30, 50, 0.3);
}

.tab-content::-webkit-scrollbar-thumb {
  background: rgba(0, 150, 255, 0.3);
  border-radius: 3px;
}

.tab-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 150, 255, 0.5);
}
</style>
