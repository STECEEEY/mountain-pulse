<template>
  <div class="app-container" :class="{ 'dark-theme': isDarkTheme }">
    <AppHeader />

    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'

// 统一使用深色科技风主题
const isDarkTheme = computed(() => true)
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* App 容器 */
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  overflow: hidden;
  transition: background 0.3s ease;
}

.app-container.dark-theme {
  background: #0a0f1a;
}

.app-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* 页面切换过渡动效 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* 卡片入场动画 */
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

.animate-card-enter {
  animation: cardSlideUp 0.5s ease-out forwards;
}

/* 数字滚动动画用的基础类 */
.animate-number {
  display: inline-block;
}

/* 脉冲动画 - 用于监测点 */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

/* 高风险脉冲 - 更快 */
@keyframes pulseFast {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.6;
  }
}

/* 呼吸边框动画 */
@keyframes breathingBorder {
  0%, 100% {
    border-color: rgba(255, 68, 68, 0.8);
    box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
  }
  50% {
    border-color: rgba(255, 68, 68, 0.4);
    box-shadow: 0 0 20px rgba(255, 68, 68, 0.6);
  }
}

/* 数据流动效果 */
@keyframes dataFlow {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.data-flow-line {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 240, 255, 0.5),
    transparent
  );
  background-size: 200% 100%;
  animation: dataFlow 2s linear infinite;
}

/* 扫描线效果 */
@keyframes scanLine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* 预警闪烁 */
@keyframes flashRed {
  0%, 100% {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.5);
  }
  50% {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.8);
  }
}

.alert-flash {
  animation: flashRed 1s ease-in-out infinite;
}
</style>