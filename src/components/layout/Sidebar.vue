<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="logo-area">
      <div class="logo">
        <span class="logo-icon">DZ</span>
        <span v-if="!isCollapsed" class="logo-text">地脉智眼</span>
      </div>
      <button class="collapse-btn" @click="toggleCollapse">
        <el-icon :size="18">
          <component :is="isCollapsed ? 'Expand' : 'Fold'" />
        </el-icon>
      </button>
    </div>

    <nav class="nav-menu">
      <router-link
        v-for="item in menuItems"
        :key="item.key"
        :to="item.to"
        class="nav-item"
        :class="{ active: activeMenu === item.key }"
      >
        <el-icon :size="20">
          <component :is="item.icon" />
        </el-icon>
        <span v-if="!isCollapsed" class="nav-label">{{ item.label }}</span>
        <span v-if="!isCollapsed && item.badge" class="nav-badge">{{ item.badge }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer" v-if="!isCollapsed">
      <div class="user-info">
        <div class="avatar">管</div>
        <div class="user-detail">
          <span class="user-name">管理员</span>
          <span class="user-role">系统管理</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElIcon } from 'element-plus'
import {
  DataAnalysis,
  Monitor,
  Expand,
  Fold,
} from '@element-plus/icons-vue'

const route = useRoute()

const isCollapsed = ref(false)

const menuItems = [
  { key: 'dashboard', label: '数据大屏', icon: DataAnalysis, to: '/dashboard', badge: 2 },
  { key: 'map', label: '专业工作台', icon: Monitor, to: '/map', badge: 1 },
]

const activeMenu = computed(() => {
  const currentPath = route.path
  if (currentPath.startsWith('/map')) return 'map'
  return 'dashboard'
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  background: linear-gradient(180deg, rgba(3, 21, 36, 0.98), rgba(3, 16, 30, 0.98));
  border-right: 1px solid rgba(0, 200, 255, 0.25);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 80px;
}

.logo-area {
  height: 72px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 200, 255, 0.2);
  background: linear-gradient(135deg, rgba(1, 55, 86, 0.9), rgba(2, 24, 42, 0.9));
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid rgba(0, 200, 255, 0.4);
  background: rgba(0, 64, 94, 0.55);
  color: #cdeeff;
  font-size: 12px;
  letter-spacing: 1px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #00f0ff;
  text-shadow: 0 0 16px rgba(0, 240, 255, 0.4);
  white-space: nowrap;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.sidebar.collapsed .logo-area {
  padding: 0 16px;
  justify-content: center;
}

.sidebar.collapsed .collapse-btn {
  display: none;
}

.nav-menu {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  color: #89a6bf;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  text-decoration: none;
}

.nav-item:hover {
  background: rgba(0, 140, 220, 0.15);
  color: #d8ecff;
}

.nav-item.active {
  background: rgba(0, 150, 255, 0.2);
  color: #00f0ff;
  border: 1px solid rgba(0, 200, 255, 0.35);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background: #00f0ff;
  border-radius: 0 3px 3px 0;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.nav-badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: linear-gradient(135deg, #ff5a5a, #d93636);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar.collapsed .nav-item {
  padding: 12px;
  justify-content: center;
}

.sidebar.collapsed .nav-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(0, 200, 255, 0.18);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 52, 84, 0.28);
  border: 1px solid rgba(0, 160, 255, 0.2);
  border-radius: 8px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #d7ecff;
}

.user-role {
  font-size: 12px;
  color: #83a5bf;
}
</style>
