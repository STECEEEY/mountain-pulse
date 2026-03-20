<template>
  <header class="dashboard-header">
    <!-- 左侧标题 -->
    <div class="header-left">
      <h1 class="title">
        <span class="icon">🏔️</span>
        宁镇山脉地质灾害监测平台
      </h1>
    </div>

    <!-- 中间时间 -->
    <div class="header-center">
      <div class="datetime">
        <span class="date">{{ currentDate }}</span>
        <span class="time">{{ currentTime }}</span>
      </div>
    </div>

    <!-- 右侧导航 -->
    <div class="header-right">
      <router-link to="/dashboard" class="nav-link active">数据大屏</router-link>
      <router-link to="/map" class="nav-link">专业工作台</router-link>
      <div class="weather">
        <span class="weather-icon">🌤️</span>
        <span class="weather-text">晴 18°C</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

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
.dashboard-header {
  height: 72px;
  background: linear-gradient(180deg, rgba(0, 40, 80, 0.9) 0%, rgba(10, 15, 26, 0.9) 100%);
  border-bottom: 1px solid rgba(0, 240, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: relative;
}

.dashboard-header::after {
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
  flex: 1;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #00f0ff;
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon {
  font-size: 28px;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.datetime {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.date {
  font-size: 14px;
  color: #88a0b0;
}

.time {
  font-size: 20px;
  font-weight: 600;
  color: #e0f0ff;
  font-family: 'Courier New', monospace;
}

.header-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 24px;
}

.nav-link {
  font-size: 14px;
  color: #88a0b0;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s;
}

.nav-link:hover {
  color: #e0f0ff;
  background: rgba(0, 150, 255, 0.1);
}

.nav-link.active,
.nav-link.router-link-active {
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.3);
}

.weather {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 50, 80, 0.4);
  border-radius: 8px;
  border: 1px solid rgba(0, 150, 255, 0.2);
}

.weather-icon {
  font-size: 18px;
}

.weather-text {
  font-size: 14px;
  color: #e0f0ff;
}
</style>
