<template>
  <div class="dashboard-view">
    <div class="main-content">
      <div class="map-underlay card-animate" style="--delay: 0.1s">
        <OverviewMap />
      </div>

      <div class="overlay-grid">
        <div class="left-panel">
          <!-- 调整顺序：灾害统计放在最上面，占比更大 -->
          <DisasterStats class="card-animate disaster-stats" style="--delay: 0.15s" />
          <!-- 人口暴露度放在中间 -->
          <PopulationChart class="card-animate population-chart" style="--delay: 0.2s" />
          <!-- GDP图表放在下面 -->
          <GDPChart class="card-animate" style="--delay: 0.25s" />
        </div>

        <div class="center-panel"></div>

        <div class="right-panel">
          <RegionDetail class="card-animate" style="--delay: 0.3s" />
          <DataTable class="card-animate" style="--delay: 0.35s" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入顺序调整，但实际使用顺序由模板决定
import DisasterStats from '@/components/dashboard/DisasterStats.vue'
import PopulationChart from '@/components/dashboard/PopulationChart.vue'
import GDPChart from '@/components/dashboard/GDPChart.vue'
import OverviewMap from '@/components/dashboard/OverviewMap.vue'
import RegionDetail from '@/components/dashboard/RegionDetail.vue'
import DataTable from '@/components/dashboard/DataTable.vue'
</script>

<style scoped>
.dashboard-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  position: relative;
  padding: 12px;
  min-height: 0;
}

.map-underlay {
  position: absolute;
  inset: 12px;
  z-index: 1;
}

.overlay-grid {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  grid-template-columns: 340px 1fr 360px;  /* 左侧面板加宽，给灾害统计更多空间 */
  gap: 16px;
  min-height: 0;
  pointer-events: none;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  pointer-events: auto;
  overflow-y: auto;  /* 允许滚动，防止内容过多 */
  max-height: 100%;
}

/* 自定义滚动条 */
.left-panel::-webkit-scrollbar {
  width: 4px;
}

.left-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.left-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 255, 0.4);
  border-radius: 2px;
}

.left-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 200, 255, 0.6);
}

.center-panel {
  pointer-events: none;
  min-height: 0;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  pointer-events: auto;
  overflow-y: auto;
  max-height: 100%;
}

.right-panel::-webkit-scrollbar {
  width: 4px;
}

.right-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.right-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 255, 0.4);
  border-radius: 2px;
}

/* 灾害统计卡片样式 - 更大更突出 */
.disaster-stats {
  flex-shrink: 0;
  min-height: 350px;  /* 增加最小高度，让灾害统计更突出 */
}

/* 人口暴露度卡片样式 */
.population-chart {
  flex-shrink: 0;
  min-height: 280px;
}

/* 卡片入场动画 */
.card-animate {
  opacity: 0;
  animation: cardSlideUp 0.6s ease-out forwards;
  animation-delay: var(--delay, 0s);
}

@keyframes cardSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .overlay-grid {
    grid-template-columns: 300px 1fr 300px;
    gap: 12px;
  }
  
  .disaster-stats {
    min-height: 380px;
  }
}

@media (max-width: 768px) {
  .overlay-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .left-panel {
    max-height: none;
  }
  
  .center-panel {
    display: none;
  }
  
  .right-panel {
    display: none;
  }
}
</style>
