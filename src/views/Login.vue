<template>
  <div class="login-wrapper">
    <!-- 地图背景 -->
    <div class="map-background" ref="loginMapRef"></div>
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

        <div v-if="loading" class="login-status-tip">
          <span class="dot-flashing"></span>
          <span>{{ retryCount > 0 ? '网络有点慢，正在重试...' : '验证中...' }}</span>
        </div>
        
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
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 地图初始化代码保持不变...
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import { fromLonLat } from 'ol/proj'

const loginMapRef = ref<HTMLElement | null>(null)
let mapInstance: Map | null = null

onMounted(() => {
  if (loginMapRef.value) {
    mapInstance = new Map({
      target: loginMapRef.value,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://p3.map.gtimg.com/sateTiles/{z}/{Math.floor(x/16)}/{Math.floor(y/16)}/{x}_{y}.jpg?version=230',
            maxZoom: 18,
          }),
          opacity: 0.9,
        }),
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
      }),
    })
    
    setTimeout(() => {
      const canvas = loginMapRef.value?.querySelector('canvas')
      if (canvas) {
        canvas.style.filter = `
          contrast(1.3)
          brightness(0.8)
          saturate(1.5)
          hue-rotate(10deg)
        `
      }
    }, 500)
  }
  
  // ---------- 新增：登录状态续传 ----------
  restoreFormState()
})

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.setTarget(undefined)
    mapInstance = null
  }
})

const form = reactive({
  username: '',
  password: ''
})

const loading = ref(false)
const retryCount = ref(0)

// ========== 功能1：登录状态续传（sessionStorage） ==========
const SESSION_STORAGE_KEY = 'login_form_backup'

// 保存当前表单内容（防抖，避免频繁写入）
let saveTimer: ReturnType<typeof setTimeout> | null = null
const saveFormState = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (form.username || form.password) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        username: form.username,
        password: form.password,
        timestamp: Date.now()
      }))
    }
  }, 300)
}

// 监听表单变化，自动保存（需要在 template 中添加 @input 或使用 watch）
// 方案1：使用 watch（推荐）
import { watch } from 'vue'
watch([() => form.username, () => form.password], () => {
  saveFormState()
})

// 恢复之前保存的表单状态
const restoreFormState = () => {
  const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (saved) {
    try {
      const data = JSON.parse(saved)
      // 可选：设置过期时间，比如 10 分钟内有效
      const isValid = Date.now() - data.timestamp < 10 * 60 * 1000
      if (isValid && data.username && !form.username) {
        form.username = data.username
        form.password = data.password || ''
        ElMessage.info('已恢复上次未完成的登录信息')
      }
      // 清理已恢复的数据
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (e) {
      console.error('恢复表单状态失败', e)
    }
  }
}

// 清理保存的表单状态（登录成功后调用）
const clearSavedFormState = () => {
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
  if (saveTimer) clearTimeout(saveTimer)
}

// ========== 功能2：智能预判刷新（静默重试） ==========
// 重试配置
const RETRY_CONFIG = {
  enabled: true,           // 是否启用静默重试
  timeout: 10000,          // 第一次超时时间（10秒）
  retryDelay: 1000,        // 重试前等待时间（1秒）
  maxRetries: 1            // 最多重试1次（静默）
}

// 带超时和重试的登录请求
const loginWithRetry = async (
  username: string, 
  password: string, 
  isRetry = false  // 是否为重试请求
): Promise<any> => {
  // 构建登录 Promise
  const loginPromise = userStore.login(username, password)
  
  // 超时控制（第一次 10 秒，重试时缩短为 8 秒）
  const timeoutDuration = isRetry ? 8000 : RETRY_CONFIG.timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), timeoutDuration)
  })
  
  // 竞速：请求 vs 超时
  const result = await Promise.race([loginPromise, timeoutPromise])
  return result
}

// 主登录逻辑（带静默重试）
const handleLogin = async () => {
  // 防重复提交
  if (loading.value) {
    ElMessage.warning('正在登录中，请勿重复点击')
    return
  }
  
  // 表单校验
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  
  loading.value = true
  let retried = false  // 是否已经重试过
  
  try {
    // 第一次尝试
    await loginWithRetry(form.username, form.password, false)
    
    // 登录成功
    clearSavedFormState()  // 清除保存的草稿
    ElMessage.success('登录成功')
   router.push('/#/dashboard')
    
  } catch (error: any) {
    const errorMsg = error.message || ''
    
    // 判断是否为超时错误
    const isTimeout = errorMsg === 'TIMEOUT' || errorMsg?.includes('超时')
    
    if (isTimeout && !retried && RETRY_CONFIG.enabled) {
      // ========== 静默重试 ==========
      retried = true
      retryCount.value = 1
      console.log('首次登录超时，开始静默重试...')
      
      // 可选：在控制台输出，但不打扰用户
      // 稍等片刻后重试
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay))
      
      try {
        // 第二次尝试（重试）
        await loginWithRetry(form.username, form.password, true)
        
        // 重试成功
        clearSavedFormState()
        ElMessage.success('登录成功')
        router.push('/dashboard')
        
      } catch (retryError: any) {
        // 重试也失败，此时才提示用户
        const isRetryTimeout = retryError.message === 'TIMEOUT'
        if (isRetryTimeout) {
          ElMessage.error({
            message: '网络较慢，请刷新页面后重试',
            duration: 5000
          })
        } else {
          ElMessage.error(retryError.message || '登录失败，请重试')
        }
      }
    } else {
      // 非超时错误，或已经重试过但仍然失败
      if (errorMsg === 'TIMEOUT') {
        ElMessage.error('请求超时，请检查网络连接')
      } else {
        ElMessage.error(errorMsg || '登录失败')
      }
    }
  } finally {
    loading.value = false
  }
}

// 刷新页面（供用户手动使用）
const refreshPage = () => {
  window.location.reload()
}

const goToRegister = () => {
  router.push('/register')
}

// 改进：填充测试账号后自动登录
const fillDemo = async (username: string, password: string) => {
  form.username = username
  form.password = password
  // 自动登录
  await handleLogin()
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

/* 登录状态提示（非侵入） */
.login-status-tip {
  text-align: center;
  margin-top: 12px;
  font-size: 12px;
  color: #7a8e9a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.dot-flashing {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #4bb5d9;
  animation: dotFlashing 1s infinite linear alternate;
  animation-delay: 0.5s;
}

@keyframes dotFlashing {
  0% { opacity: 0.2; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
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
