import { defineStore } from 'pinia'
import { ref } from 'vue'
import type Map from 'ol/Map'

export const useMapStore = defineStore('map', () => {
  const map = ref<Map | null>(null)

  function setMap(mapInstance: Map) {
    map.value = mapInstance
  }

  return { map, setMap }
})