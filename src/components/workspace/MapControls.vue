<template>
  <div class="map-controls">
    <!-- 图层控制 -->
    <div class="control-group">
      <div class="control-title">图层</div>
      <div class="layer-list">
        <label class="layer-item">
          <el-checkbox v-model="layers.satellite" />
          <span>卫星影像</span>
        </label>
        <label class="layer-item">
          <el-checkbox v-model="layers.insarHeatmap" />
          <span>InSAR热力图</span>
        </label>
        <label class="layer-item">
          <el-checkbox v-model="layers.riskGrading" />
          <span>风险分级</span>
        </label>
        <label class="layer-item">
          <el-checkbox v-model="layers.disasterPoints" />
          <span>灾害点</span>
        </label>
      </div>
    </div>

    <!-- 缩放控制 -->
    <div class="control-group zoom-controls">
      <el-button :icon="Plus" circle @click="zoomIn" />
      <el-button :icon="Minus" circle @click="zoomOut" />
      <el-button :icon="Aim" circle @click="resetView" />
    </div>

    <!-- 工具 -->
    <div class="control-group tools">
      <el-tooltip content="测量距离" placement="left">
        <el-button :icon="Pointer" circle />
      </el-tooltip>
      <el-tooltip content="绘制区域" placement="left">
        <el-button :icon="Edit" circle />
      </el-tooltip>
      <el-tooltip content="导出图片" placement="left">
        <el-button :icon="Download" circle />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Plus, Minus, Aim, Pointer, Edit, Download } from '@element-plus/icons-vue'

const layers = reactive({
  satellite: true,
  insarHeatmap: true,
  riskGrading: true,
  disasterPoints: true,
})

const zoomIn = () => {
  // TODO: 实现缩放功能
}

const zoomOut = () => {
  // TODO: 实现缩放功能
}

const resetView = () => {
  // TODO: 实现重置视图功能
}
</script>

<style scoped>
.map-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
}

.control-group {
  background: rgba(10, 20, 30, 0.9);
  border: 1px solid rgba(0, 200, 255, 0.3);
  border-radius: 10px;
  padding: 12px;
  backdrop-filter: blur(10px);
}

.control-title {
  font-size: 11px;
  font-weight: 600;
  color: #00f0ff;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e0f0ff;
  cursor: pointer;
  transition: color 0.2s;
}

.layer-item:hover {
  color: #00f0ff;
}

.zoom-controls,
.tools {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.el-button.is-circle) {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(0, 200, 255, 0.3);
  background: rgba(0, 30, 50, 0.6);
  color: #88a0b0;
}

:deep(.el-button.is-circle:hover) {
  background: rgba(0, 150, 255, 0.3);
  border-color: #00f0ff;
  color: #00f0ff;
}

:deep(.el-checkbox__inner) {
  border-radius: 4px;
  background: rgba(0, 30, 50, 0.6);
  border-color: rgba(0, 150, 255, 0.3);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: rgba(0, 150, 255, 0.5);
  border-color: #00f0ff;
}

:deep(.el-checkbox__inner::after) {
  border-color: #00f0ff;
}
</style>
