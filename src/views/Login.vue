<template>
  <div class="login-wrapper">
    <!-- 地图背景 -->
    <div class="map-background"></div>
    <div class="overlay"></div>

    <!-- 左侧品牌区域 -->
    <div class="brand-section">
      <div class="brand-content">
        <h1 class="brand-title">山体脉搏</h1>
        <p class="brand-subtitle">融合InSAR与机器学习的地质灾害识别与风险预警系统</p>
        <div class="divider"></div>
        <div class="features">
          <div class="feature">
            <div class="feature-dot"></div>
            <span>InSAR形变监测</span>
          </div>
          <div class="feature">
            <div class="feature-dot"></div>
            <span>AI智能预警</span>
          </div>
          <div class="feature">
            <div class="feature-dot"></div>
            <span>空间风险评估</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="form-section">
      <div class="form-container">
        <div class="form-header">
          <h2>欢迎登录</h2>
          <p>请输入您的账号信息</p>
        </div>

        <el-form :model="form" @submit.prevent="handleLogin" class="login-form">
          <el-form-item>
            <el-input 
              v-model="form.username" 
              placeholder="用户名" 
              prefix-icon="User"
              size="large"
            />
          </el-form-item>
          
          <el-form-item>
            <el-input 
              v-model="form.password" 
              type="password" 
              placeholder="密码" 
              prefix-icon="Lock"
              size="large"
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
          <el-link type="primary" @click="goToRegister">立即注册</el-link>
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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-wrapper {
  display: flex;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 地图背景 - 使用与主界面相同的地图风格 */
.map-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    linear-gradient(180deg, #0a1f2e 0%, #1a3a4a 100%),
    repeating-linear-gradient(45deg, 
      rgba(0, 160, 200, 0.05) 0px, 
      rgba(0, 160, 200, 0.05) 2px,
      transparent 2px, 
      transparent 8px);
  z-index: 0;
}

/* 模拟等高线效果 */
.map-background::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(circle at 20% 40%, rgba(0, 180, 220, 0.15) 1px, transparent 1px),
    radial-gradient(circle at 80% 70%, rgba(0, 180, 220, 0.12) 1px, transparent 1px);
  background-size: 40px 40px, 60px 60px;
  pointer-events: none;
}

/* 等高线线条 */
.map-background::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    repeating-linear-gradient(0deg, 
      rgba(0, 180, 220, 0.2) 0px,
      rgba(0, 180, 220, 0.2) 1px,
      transparent 1px,
      transparent 40px),
    repeating-linear-gradient(90deg, 
      rgba(0, 180, 220, 0.15) 0px,
      rgba(0, 180, 220, 0.15) 1px,
      transparent 1px,
      transparent 40px);
  pointer-events: none;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(10, 31, 46, 0.85) 0%, rgba(26, 58, 74, 0.75) 100%);
  z-index: 1;
}

/* 左侧品牌区域 */
.brand-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.brand-content {
  text-align: center;
  color: white;
  padding: 40px;
  max-width: 560px;
}

/* 主标题 */
.brand-title {
  font-size: 64px;
  font-weight: 700;
  letter-spacing: 4px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #ffffff 0%, #7bc5d9 50%, #3a9bb5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

/* 副标题 - 加大字体，更美观 */
.brand-subtitle {
  font-size: 16px;
  line-height: 1.8;
  font-weight: 400;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 32px;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
}

.divider {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, #4bb5d9, transparent);
  margin: 0 auto 32px auto;
}

.features {
  display: flex;
  gap: 48px;
  justify-content: center;
}

.feature {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

.feature-dot {
  width: 6px;
  height: 6px;
  background: #4bb5d9;
  border-radius: 50%;
  box-shadow: 0 0 6px #4bb5d9;
}

/* 右侧表单区域 */
.form-section {
  width: 460px;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
}

.form-container {
  width: 340px;
  padding: 48px 32px;
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

.form-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: #1a4a5a;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.form-header p {
  color: #7a8e9a;
  font-size: 14px;
}

.login-form :deep(.el-input__wrapper) {
  background: #f5f7f9;
  border-radius: 8px;
  box-shadow: none;
  border: 1px solid #e0e6ea;
  transition: all 0.3s;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 24px;
}
  
.login-form :deep(.el-input__wrapper:hover) {
  border-color: #4bb5d9;
  background: #ffffff;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: #2a7f9a;
  box-shadow: 0 0 0 2px rgba(75, 181, 217, 0.2);
}

.login-btn {
  width: 100%;
  background: linear-gradient(135deg, #1e5a6e 0%, #2a7f9a 100%);
  border: none;
  border-radius: 8px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  transition: all 0.3s;
}

.login-btn:hover {
  background: linear-gradient(135deg, #2a6f86 0%, #3a8faa 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(42, 127, 154, 0.3);
}

.form-footer {
  text-align: center;
  padding: 20px 0;
  color: #7a8e9a;
  font-size: 14px;
}

.form-footer :deep(.el-link) {
  color: #2a7f9a;
  font-weight: 500;
}

.demo-tips {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #e8ecef;
  text-align: center;
}

.demo-tips p {
  font-size: 12px;
  color: #9aaeB8;
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
  border-color: #cbd8e0;
  color: #4a6a7a;
  background: transparent;
  padding: 8px 16px;
  min-width: 70px;
}

.demo-buttons :deep(.el-button:hover) {
  background: #2a7f9a;
  border-color: #2a7f9a;
  color: white;
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
