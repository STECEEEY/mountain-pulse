<template>
  <header class="app-header dark-mode">
    <div class="header-left">
      <div class="logo-tag">DZ</div>
      <div class="logo-title">地脉智眼 - 地质灾害智能监测预警系统</div>
    </div>

    <div class="header-center">
      <router-link to="/dashboard" class="nav-link" :class="{ active: currentRoute === 'dashboard' }">
        数据大屏
      </router-link>
      <router-link to="/map" class="nav-link" :class="{ active: currentRoute === 'map' }">
        专业工作台
      </router-link>
    </div>

    <div class="header-right">
      <div class="datetime">
        <span class="date">{{ currentDate }}</span>
        <span class="time">{{ currentTime }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const currentRoute = computed(() => route.name as string)

const currentDate = ref('')
const currentTime = ref('')

const updateDateTime = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

let timer: number

onMounted(() => {
  updateDateTime()
  timer = window.setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.app-header {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

/* 深色模式 - 数据大屏 */
.app-header.dark-mode {
  height: 72px;
  background: linear-gradient(180deg, rgba(0, 40, 80, 0.95) 0%, rgba(10, 15, 26, 0.95) 100%);
  border-bottom: 1px solid rgba(0, 240, 255, 0.3);
  position: relative;
}

.app-header.dark-mode::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00f0ff, transparent);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.logo-tag {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(0, 200, 255, 0.35);
  background: rgba(0, 56, 88, 0.42);
  color: #cfefff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.logo-title {
  font-size: 18px;
  font-weight: 700;
  color: #00f0ff;
  letter-spacing: 0.5px;
  line-height: 1;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin: 0 24px;
}

.nav-link {
  text-decoration: none;
  color: #9ab9cf;
  border: 1px solid rgba(0, 170, 255, 0.25);
  background: rgba(0, 60, 96, 0.3);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #d9f2ff;
  border-color: rgba(0, 210, 255, 0.4);
}

.nav-link.active {
  color: #ffffff;
  background: linear-gradient(135deg, rgba(0, 137, 220, 0.95), rgba(0, 86, 196, 0.95));
  border-color: rgba(0, 220, 255, 0.55);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.datetime {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
}

.date {
  font-size: 12px;
  color: #88a0b0;
}

.time {
  font-size: 18px;
  font-weight: 600;
  color: #e0f0ff;
  font-family: 'Courier New', monospace;
}

</style>
