<template>
  <div ref="mapRef" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM' // 最稳定的地图源
import { fromLonLat } from 'ol/proj'

const mapRef = ref<HTMLElement>()

onMounted(() => {
  // 使用 OpenStreetMap（100% 可靠）
  const map = new Map({
    target: mapRef.value,
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
    ],
    view: new View({
      projection: 'EPSG:3857',
      center: fromLonLat([119.0, 32.1]),
      zoom: 10,
      extent: fromLonLat([118.5, 31.8, 119.8, 32.5]),
    }),
  })

  // 科技感滤镜
  setTimeout(() => {
    const canvas = mapRef.value?.querySelector('canvas')
    if (canvas) {
      canvas.style.filter = 'contrast(1.2) brightness(0.9) saturate(1.3) hue-rotate(5deg)'
    }
  }, 500)
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0a0f1a;
}

/* 科技感光晕 */
.map-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: inset 0 0 150px rgba(0, 150, 255, 0.3);
  pointer-events: none;
  z-index: 10;
}
</style>
