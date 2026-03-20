<template>
  <div class="map-view">
    <div class="main-content">
      <div class="map-underlay">
        <MainMap @select-point="handleSelectPoint" />
        <MapControls class="controls-animate" />
      </div>

      <div class="overlay-grid">
        <div class="right-panel panel-animate">
          <SidePanel :selected-point="selectedPoint" />
        </div>
        <div class="right-ghost"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MainMap from '@/components/workspace/MainMap.vue'
import MapControls from '@/components/workspace/MapControls.vue'
import SidePanel from '@/components/workspace/SidePanel.vue'

const selectedPoint = ref<any>(null)

const handleSelectPoint = (point: any) => {
  selectedPoint.value = point
}
</script>

<style scoped>
.map-view {
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
  border-radius: 12px;
  overflow: hidden;
}

.overlay-grid {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 16px;
  min-height: 0;
  pointer-events: none;
}

.right-ghost {
  min-height: 0;
}

.right-panel {
  grid-column: 1;
  min-height: 0;
  background: rgba(8, 23, 37, 0.56);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(0, 200, 255, 0.28);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
}

/* 动画 */
.controls-animate {
  animation: slideInLeft 0.5s ease-out 0.2s both;
}

.panel-animate {
  animation: slideInRight 0.5s ease-out 0.1s both;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
