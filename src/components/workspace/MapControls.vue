<template>
  <div class="map-controls">
    <!-- 图层控制 -->
    <div class="control-group">
      <div class="control-title">图层</div>
      <div class="layer-list">
        <label class="layer-item">
          <el-checkbox :model-value="props.layerState.riskMap" @change="onRiskMapChange" />
          <span>风险底图</span>
        </label>
        <label class="layer-item">
          <el-checkbox :model-value="props.layerState.disasterPoints" @change="onDisasterPointsChange" />
          <span>灾害点</span>
        </label>

        <div class="opacity-item">
          <span>风险底图透明度 {{ Math.round(riskMapOpacity * 100) }}%</span>
          <el-slider
            :model-value="props.riskMapOpacity"
            :min="0.1"
            :max="0.9"
            :step="0.05"
            @update:model-value="updateOpacity"
          />
        </div>
      </div>
    </div>

    <div class="control-group legend-group">
      <div class="control-title">图例</div>
      <div class="legend-list">
        <div class="legend-item">
          <span class="legend-dot danger"></span>
          <span>极高风险</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot warning"></span>
          <span>高风险</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot medium"></span>
          <span>中风险</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot safe"></span>
          <span>低风险</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LayerState {
  riskMap: boolean
  highRiskArea: boolean
  disasterPoints: boolean
}

const props = defineProps<{
  layerState: LayerState
  riskMapOpacity: number
}>()

const emit = defineEmits<{
  'update:layerState': [LayerState]
  'update:riskMapOpacity': [number]
}>()

const updateLayer = (key: keyof LayerState, value: unknown) => {
  emit('update:layerState', {
    ...props.layerState,
    [key]: Boolean(value),
  })
}

const onRiskMapChange = (value: unknown) => updateLayer('riskMap', value)
const onDisasterPointsChange = (value: unknown) => updateLayer('disasterPoints', value)

const updateOpacity = (value: number | number[]) => {
  const next = Array.isArray(value) ? value[0] : value
  emit('update:riskMapOpacity', typeof next === 'number' ? next : 0.45)
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
  gap: 10px;
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

.opacity-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #a8c5d8;
  font-size: 12px;
  margin-top: 6px;
}

.legend-group {
  min-width: 170px;
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #d6e7f5;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
}

.legend-dot.danger {
  background: #F44336;
}

.legend-dot.warning {
  background: #FF9800;
}

.legend-dot.medium {
  background: #FFEE58;
}

.legend-dot.safe {
  background: #81C784;
}

:deep(.el-slider__runway) {
  margin: 4px 0;
  background-color: rgba(0, 160, 220, 0.24);
}

:deep(.el-slider__bar) {
  background-color: #00c8ff;
}

:deep(.el-slider__button) {
  border-color: #00c8ff;
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
