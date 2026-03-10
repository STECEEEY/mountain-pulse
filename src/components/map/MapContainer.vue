<template>
  <div ref="mapRef" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'

const mapRef = ref<HTMLElement>()

onMounted(() => {
  // 使用卫星图 + 标注叠加
  const map = new Map({
    target: mapRef.value,
    layers: [
      // 底图：卫星图
      new TileLayer({
        source: new XYZ({
          url: 'https://p3.map.gtimg.com/sateTiles/{z}/{Math.floor(x/16)}/{Math.floor(y/16)}/{x}_{y}.jpg?version=230',
          maxZoom: 18,
        }),
        opacity: 0.9,
      }),
      // 叠加层：道路标注（透明）
      new TileLayer({
        source: new XYZ({
          url: 'https://rt0.map.gtimg.com/realtimerender?z={z}&x={x}&y={y}&type=vector&style=0&v=1.1.2',
        }),
        opacity: 0.6,
      }),
    ],
    view: new View({
      projection: 'EPSG:3857',
      center: fromLonLat([119.0, 32.1]),
      zoom: 10,
      extent: fromLonLat([118.5, 31.8, 119.8, 32.5]),
    }),
  })

  // 科技蓝滤镜
  setTimeout(() => {
    const canvas = mapRef.value?.querySelector('canvas')
    if (canvas) {
      canvas.style.filter = `
        contrast(1.3)
        brightness(0.8)
        saturate(1.5)
        hue-rotate(10deg)
      `
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
