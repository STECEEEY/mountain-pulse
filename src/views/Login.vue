<template>
  <div class="login-wrapper">
    <!-- 背景动画效果 -->
    <div class="bg-animation">
      <div class="mountain-bg"></div>
      <div class="grid-overlay"></div>
      <div class="pulse-wave"></div>
      <div class="pulse-wave delay-1"></div>
      <div class="pulse-wave delay-2"></div>
    </div>

    <!-- 左侧品牌区域 -->
    <div class="brand-section">
      <div class="brand-content">
        <div class="logo">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path d="M30 5 L35 15 L30 25 L25 15 Z" fill="#00d4ff" stroke="#00d4ff" stroke-width="2"/>
            <path d="M20 30 L30 20 L40 30 L30 40 Z" fill="#00d4ff" fill-opacity="0.6" stroke="#00d4ff" stroke-width="1.5"/>
            <circle cx="30" cy="30" r="8" fill="#fff" stroke="#00d4ff" stroke-width="2"/>
            <path d="M10 45 L30 25 L50 45" stroke="#00d4ff" stroke-width="2" fill="none" stroke-dasharray="4 2"/>
          </svg>
        </div>
        <h1 class="brand-title">
          <span class="gradient-text">山体脉搏</span>
        </h1>
        <p class="brand-subtitle">融合InSAR与机器学习的地质灾害识别与风险预警系统</p>
        <div class="features">
          <div class="feature">
            <span class="feature-icon">📡</span>
            <span>InSAR形变监测</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🤖</span>
            <span>AI智能预警</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🗺️</span>
            <span>空间风险评估</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="form-section">
      <div class="form-container">
        <div class="form-header">
          <h2>欢迎回来</h2>
          <p>登录您的账号，获取地质灾害预警信息</p>
        </div>

        <el-form :model="form" @submit.prevent="handleLogin" class="login-form">
          <el-form-item>
            <el-input 
              v-model="form.username" 
              placeholder="用户名" 
              prefix-icon="User"
              size="large"
              class="custom-input"
            />
          </el-form-item>
          
          <el-form-item>
            <el-input 
              v-model="form.password" 
              type="password" 
              placeholder="密码" 
              prefix-icon="Lock"
              size="large"
              class="custom-input"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              size="large" 
              :loading="loading" 
              @click="handleLogin"
              class="login-btn"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="form-footer">
          <span>还没有账号？</span>
          <el-link type="primary" @click="goToRegister" class="register-link">立即注册</el-link>
        </div>

        <div class="demo-tips">
          <p>测试账号</p>
          <div class="demo-buttons">
            <el-button size="small" @click="fillDemo('admin', 'admin123')" plain>管理员</el-button>
            <el-button size="small" @click="fillDemo('testuser', 'admin123')" plain>居民</el-button>
            <el-button size="small" @click="fillDemo('community_zhang', 'admin123')" plain>基层单位</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  password: ''
})

const loading = ref(false)

const handleLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  
  loading.value = true
  try {
    await userStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

const goToRegister = () => {
  router.push('/register')
}

const fillDemo = (username: string, password: string) => {
  form.username = username
  form.password = password
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 背景动画 */
.bg-animation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.mountain-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0a2a3b 0%, #1a3a4a 50%, #2a4a5a 100%);
}

.grid-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(40px, 40px); }
}

.pulse-wave {
  position: absolute;
  bottom: 10%;
  left: 50%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%);
  animation: pulse 3s ease-out infinite;
  transform: translateX(-50%);
}

.pulse-wave.delay-1 {
  animation-delay: 1s;
  width: 300px;
  height: 300px;
}

.pulse-wave.delay-2 {
  animation-delay: 2s;
  width: 400px;
  height: 400px;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
    transform: translateX(-50%) scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) scale(1.5);
  }
}

/* 左侧品牌区域 */
.brand-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(10px);
  background: rgba(10, 42, 59, 0.7);
}

.brand-content {
  text-align: center;
  color: white;
  padding: 40px;
  max-width: 500px;
}

.logo {
  margin-bottom: 30px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 20px;
}

.gradient-text {
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.8;
  margin-bottom: 40px;
}

.features {
  display: flex;
  gap: 30px;
  justify-content: center;
  margin-top: 40px;
}

.feature {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.3s;
}

.feature:hover {
  opacity: 1;
}

.feature-icon {
  font-size: 24px;
}

/* 右侧表单区域 */
.form-section {
  width: 480px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  box-shadow: -20px 0 40px rgba(0, 0, 0, 0.1);
}

.form-container {
  width: 360px;
  padding: 40px;
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-header h2 {
  font-size: 28px;
  color: #1e3c72;
  margin-bottom: 8px;
}

.form-header p {
  color: #666;
  font-size: 14px;
}

.login-form {
  margin-bottom: 24px;
}

.custom-input :deep(.el-input__wrapper) {
  background: #f5f7fa;
  border-radius: 12px;
  box-shadow: none;
  transition: all 0.3s;
}

.custom-input :deep(.el-input__wrapper:hover) {
  background: #eef2f6;
  transform: translateY(-1px);
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  background: white;
  box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
}

.login-btn {
  width: 100%;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border: none;
  border-radius: 12px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 212, 255, 0.3);
}

.form-footer {
  text-align: center;
  padding: 20px 0;
  color: #666;
}

.register-link {
  font-weight: 600;
  margin-left: 8px;
}

.demo-tips {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.demo-tips p {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.demo-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.demo-buttons :deep(.el-button) {
  border-radius: 20px;
  font-size: 12px;
  border-color: #1e3c72;
  color: #1e3c72;
}

.demo-buttons :deep(.el-button:hover) {
  background: #1e3c72;
  color: white;
  border-color: #1e3c72;
}

/* 响应式 */
@media (max-width: 768px) {
  .brand-section {
    display: none;
  }
  
  .form-section {
    width: 100%;
  }
}
</style>
