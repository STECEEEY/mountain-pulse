<template>
  <header class="workspace-header">
    <!-- 左侧 Logo -->
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">🏔️</span>
        <span class="logo-text">山脉脉动</span>
      </div>
    </div>

    <!-- 中间导航 -->
    <nav class="header-nav">
      <router-link to="/dashboard" class="nav-item">数据大屏</router-link>
      <router-link to="/map" class="nav-item active">专业工作台</router-link>
    </nav>

    <!-- 右侧工具栏 -->
    <div class="header-right">
      <el-input
        v-model="searchText"
        placeholder="搜索监测点..."
        :prefix-icon="Search"
        size="default"
        style="width: 240px"
      />
      <el-badge :value="3" :max="9">
        <el-button :icon="Bell" circle />
      </el-badge>
      <el-dropdown>
        <div class="user-avatar">
          <span>管</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>个人设置</el-dropdown-item>
            <el-dropdown-item>系统设置</el-dropdown-item>
            <el-dropdown-item divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, Bell } from '@element-plus/icons-vue'

const searchText = ref('')
</script>

<style scoped>
.workspace-header {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.header-nav {
  display: flex;
  gap: 8px;
}

.nav-item {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-item:hover {
  color: #1e293b;
  background: #f1f5f9;
}

.nav-item.active,
.nav-item.router-link-active {
  color: #3b82f6;
  background: #eff6ff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-button.is-circle) {
  border: none;
  background: #f1f5f9;
}
</style>
