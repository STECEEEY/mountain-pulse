<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>山体脉搏</h1>
        <p>融合InSAR与机器学习的地质灾害识别与风险预警系统</p>
      </div>
      
      <el-form :model="form" @submit.prevent="handleLogin">
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
            style="width: 100%"
          >
            登录
          </el-button>
        </el-form-item>
        
        <div class="login-footer">
          <span>还没有账号？</span>
          <el-link type="primary" @click="goToRegister">立即注册</el-link>
        </div>
      </el-form>
      
      <div class="demo-accounts">
        <p>测试账号：</p>
        <el-tag size="small" @click="fillDemo('admin', 'admin123')">管理员: admin</el-tag>
        <el-tag size="small" @click="fillDemo('testuser', 'admin123')">居民: testuser</el-tag>
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
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.login-box {
  width: 420px;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 28px;
  color: #1e3c72;
  margin-bottom: 8px;
}

.login-header p {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
  color: #666;
}

.demo-accounts {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  text-align: center;
}

.demo-accounts p {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.demo-accounts .el-tag {
  margin: 0 4px;
  cursor: pointer;
}
</style>
