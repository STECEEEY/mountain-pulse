<template>
  <div class="dashboard-view">
    <div class="main-content">
      <div class="map-underlay card-animate" style="--delay: 0.1s">
        <OverviewMap />
      </div>

      <div class="overlay-grid">
        <div class="left-panel">
          <PopulationChart class="card-animate" style="--delay: 0.15s" />
          <GDPChart class="card-animate" style="--delay: 0.2s" />
          <DisasterStats class="card-animate" style="--delay: 0.25s" />
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
import PopulationChart from '@/components/dashboard/PopulationChart.vue'
import GDPChart from '@/components/dashboard/GDPChart.vue'
import DisasterStats from '@/components/dashboard/DisasterStats.vue'
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
  grid-template-columns: 320px 1fr 360px;
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
</style>
