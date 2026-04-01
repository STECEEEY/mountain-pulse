<template>
  <div class="register-wrapper">
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

    <!-- 右侧注册表单 -->
    <div class="form-section">
      <div class="form-container">
        <div class="form-header">
          <h2>创建账号</h2>
          <p>加入山体脉搏，获取地质灾害预警</p>
        </div>

        <el-form :model="form" :rules="rules" ref="formRef" class="register-form">
          <el-form-item prop="username">
            <el-input 
              v-model="form.username" 
              placeholder="用户名" 
              prefix-icon="User"
              size="large"
            />
          </el-form-item>
          
          <el-form-item prop="email">
            <el-input 
              v-model="form.email" 
              placeholder="邮箱" 
              prefix-icon="Message"
              size="large"
            />
          </el-form-item>
          
          <el-form-item prop="full_name">
            <el-input 
              v-model="form.full_name" 
              placeholder="姓名" 
              prefix-icon="UserFilled"
              size="large"
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input 
              v-model="form.password" 
              type="password" 
              placeholder="密码" 
              prefix-icon="Lock"
              size="large"
            />
          </el-form-item>
          
          <el-form-item prop="confirmPassword">
            <el-input 
              v-model="form.confirmPassword" 
              type="password" 
              placeholder="确认密码" 
              prefix-icon="Lock"
              size="large"
            />
          </el-form-item>
          
          <!-- 角色选择 -->
          <el-form-item prop="role">
            <el-select 
              v-model="form.role" 
              placeholder="请选择您的身份" 
              size="large"
              class="role-select"
              popper-class="role-select-dropdown"
            >
              <el-option-group label="决策指挥层">
                <el-option label="应急指挥部" value="emergency_cmd">
                  <div class="role-option">
                    <span class="role-name">应急指挥部</span>
                    <span class="role-desc">全局指挥、资源调配</span>
                  </div>
                </el-option>
                <el-option label="政府部门" value="gov_dept">
                  <div class="role-option">
                    <span class="role-name">政府部门</span>
                    <span class="role-desc">行业监管、政策执行</span>
                  </div>
                </el-option>
              </el-option-group>
              
              <el-option-group label="执行响应层">
                <el-option label="基层单位" value="community">
                  <div class="role-option">
                    <span class="role-name">基层单位</span>
                    <span class="role-desc">辖区管理、居民通知</span>
                  </div>
                </el-option>
                <el-option label="救援队伍" value="rescue_team">
                  <div class="role-option">
                    <span class="role-name">救援队伍</span>
                    <span class="role-desc">现场救援、应急处置</span>
                  </div>
                </el-option>
                <el-option label="抢修人员" value="utility_worker">
                  <div class="role-option">
                    <span class="role-name">抢修人员</span>
                    <span class="role-desc">水电气通信抢修</span>
                  </div>
                </el-option>
              </el-option-group>
              
              <el-option-group label="社会公众层">
                <el-option label="居民" value="resident">
                  <div class="role-option">
                    <span class="role-name">居民</span>
                    <span class="role-desc">个人风险预警</span>
                  </div>
                </el-option>
                <el-option label="游客" value="tourist">
                  <div class="role-option">
                    <span class="role-name">游客</span>
                    <span class="role-desc">出行安全提示</span>
                  </div>
                </el-option>
                <el-option label="企业人员" value="business">
                  <div class="role-option">
                    <span class="role-name">企业人员</span>
                    <span class="role-desc">生产经营安全</span>
                  </div>
                </el-option>
              </el-option-group>
            </el-select>
          </el-form-item>
          
          <!-- 单位/组织（动态显示） -->
          <el-form-item v-if="showOrganization" prop="organization">
            <el-input 
              v-model="form.organization" 
              placeholder="所属单位/组织" 
              prefix-icon="OfficeBuilding"
              size="large"
            />
          </el-form-item>
          
          <!-- 区域编码（动态显示） -->
          <el-form-item v-if="showAreaCode" prop="area_code">
            <el-input 
              v-model="form.area_code" 
              placeholder="管辖区域编码" 
              prefix-icon="Location"
              size="large"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              size="large" 
              :loading="loading" 
              @click="handleRegister"
              class="register-btn"
            >
              {{ loading ? '注册中...' : '注 册' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="form-footer">
          <span>已有账号？</span>
          <el-link type="primary" @click="goToLogin">立即登录</el-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  email: '',
  full_name: '',
  password: '',
  confirmPassword: '',
  role: 'resident',
  organization: '',
  area_code: ''
})

// 是否需要显示单位/组织字段
const showOrganization = computed(() => {
  return ['emergency_cmd', 'gov_dept', 'community', 'rescue_team', 'utility_worker'].includes(form.role)
})

// 是否需要显示区域编码字段
const showAreaCode = computed(() => {
  return ['community'].includes(form.role)
})

const loading = ref(false)
const formRef = ref()

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  full_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== form.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  role: [{ required: true, message: '请选择身份', trigger: 'change' }],
  organization: [
    { 
      required: showOrganization.value, 
      message: '请输入所属单位', 
      trigger: 'blur' 
    }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    
    loading.value = true
    try {
      const registerData: any = {
        username: form.username,
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role
      }
      
      // 根据角色设置 role_level
      if (form.role === 'emergency_cmd' || form.role === 'gov_dept') {
        registerData.role_level = 1
      } else if (['community', 'rescue_team', 'utility_worker'].includes(form.role)) {
        registerData.role_level = 2
      } else {
        registerData.role_level = 3
      }
      
      // 添加可选字段
      if (form.organization) registerData.organization = form.organization
      if (form.area_code) registerData.area_code = form.area_code
      
      await userStore.register(registerData)
      ElMessage.success('注册成功，请登录')
      router.push('/login')
    } catch (error: any) {
      ElMessage.error(error.message || '注册失败')
    } finally {
      loading.value = false
    }
  })
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.register-wrapper {
  display: flex;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 地图背景 */
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
  width: 480px;
  background: rgba(255, 255, 255, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
}

.form-container {
  width: 360px;
  padding: 40px 28px;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: #1a4a5a;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.form-header p {
  color: #7a8e9a;
  font-size: 14px;
}

.register-form :deep(.el-input__wrapper) {
  background: #f5f7f9;
  border-radius: 8px;
  box-shadow: none;
  border: 1px solid #e0e6ea;
  transition: all 0.3s;
}

.register-form :deep(.el-input__wrapper:hover) {
  border-color: #4bb5d9;
  background: #ffffff;
}

.register-form :deep(.el-input__wrapper.is-focus) {
  border-color: #2a7f9a;
  box-shadow: 0 0 0 2px rgba(75, 181, 217, 0.2);
}

.role-select {
  width: 100%;
}

.role-select :deep(.el-input__wrapper) {
  background: #f5f7f9;
  border-radius: 8px;
  border: 1px solid #e0e6ea;
}

.role-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.role-name {
  font-weight: 500;
  color: #1e3c5a;
}

.role-desc {
  font-size: 12px;
  color: #9aaeb8;
}

.register-btn {
  width: 100%;
  background: linear-gradient(135deg, #1e5a6e 0%, #2a7f9a 100%);
  border: none;
  border-radius: 8px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  transition: all 0.3s;
  margin-top: 8px;
}

.register-btn:hover {
  background: linear-gradient(135deg, #2a6f86 0%, #3a8faa 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(42, 127, 154, 0.3);
}

.form-footer {
  text-align: center;
  padding: 20px 0 0;
  color: #7a8e9a;
  font-size: 14px;
}

.form-footer :deep(.el-link) {
  color: #2a7f9a;
  font-weight: 500;
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

<style>
/* 全局下拉菜单样式 */
.role-select-dropdown .el-select-dropdown__item {
  padding: 12px 16px;
  height: auto;
  line-height: 1.4;
}

.role-select-dropdown .el-select-dropdown__item .role-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.role-select-dropdown .el-select-dropdown__item .role-name {
  font-weight: 500;
  color: #1e3c5a;
}

.role-select-dropdown .el-select-dropdown__item .role-desc {
  font-size: 11px;
  color: #9aaeb8;
}

.role-select-dropdown .el-select-dropdown__item.is-selected .role-name {
  color: #2a7f9a;
}

.role-select-dropdown .el-select-group__title {
  font-size: 12px;
  font-weight: 600;
  color: #7a8e9a;
  padding: 8px 16px 4px;
}
</style>
