<template>
  <div class="register-container">
    <div class="register-box">
      <h2>注册账号</h2>
      <p>加入山体脉搏地质灾害预警系统</p>
      
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" />
        </el-form-item>
        
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱" prefix-icon="Message" />
        </el-form-item>
        
        <el-form-item prop="full_name">
          <el-input v-model="form.full_name" placeholder="姓名" prefix-icon="UserFilled" />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" />
        </el-form-item>
        
        <el-form-item prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" prefix-icon="Lock" />
        </el-form-item>
        
        <!-- 角色选择 - 完整8个角色 -->
        <el-form-item prop="role">
          <el-select 
            v-model="form.role" 
            placeholder="请选择您的身份" 
            style="width: 100%"
            filterable
            allow-create
          >
            <el-option-group label="决策指挥层 (L1)">
              <el-option label="应急指挥部" value="emergency_cmd">
                <span>🚨 应急指挥部</span>
                <span style="float: right; color: #999; font-size: 12px">全局指挥、资源调配</span>
              </el-option>
              <el-option label="政府部门" value="gov_dept">
                <span>🏛️ 政府部门</span>
                <span style="float: right; color: #999; font-size: 12px">行业监管、政策执行</span>
              </el-option>
            </el-option-group>
            
            <el-option-group label="执行响应层 (L2)">
              <el-option label="基层单位" value="community">
                <span>🏘️ 基层单位</span>
                <span style="float: right; color: #999; font-size: 12px">辖区管理、居民通知</span>
              </el-option>
              <el-option label="救援队伍" value="rescue_team">
                <span>🚒 救援队伍</span>
                <span style="float: right; color: #999; font-size: 12px">现场救援、应急处置</span>
              </el-option>
              <el-option label="抢修人员" value="utility_worker">
                <span>🔧 抢修人员</span>
                <span style="float: right; color: #999; font-size: 12px">水电气通信抢修</span>
              </el-option>
            </el-option-group>
            
            <el-option-group label="社会公众层 (L3)">
              <el-option label="居民" value="resident">
                <span>🏠 居民</span>
                <span style="float: right; color: #999; font-size: 12px">个人风险预警</span>
              </el-option>
              <el-option label="游客" value="tourist">
                <span>🚗 游客</span>
                <span style="float: right; color: #999; font-size: 12px">出行安全提示</span>
              </el-option>
              <el-option label="企业人员" value="business">
                <span>🏭 企业人员</span>
                <span style="float: right; color: #999; font-size: 12px">生产经营安全</span>
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>
        
        <!-- 单位/组织（当角色为基层单位、救援队伍、抢修人员、政府部门时显示） -->
        <el-form-item v-if="showOrganization" prop="organization">
          <el-input v-model="form.organization" placeholder="所属单位/组织" />
        </el-form-item>
        
        <!-- 区域编码（当角色需要管辖区域时显示） -->
        <el-form-item v-if="showAreaCode" prop="area_code">
          <el-input v-model="form.area_code" placeholder="管辖区域编码（如：320101）" />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleRegister" style="width: 100%">
            注册
          </el-button>
        </el-form-item>
        
        <div class="login-link">
          已有账号？<el-link @click="goToLogin">立即登录</el-link>
        </div>
      </el-form>
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
  return ['community', 'village_committee', 'property_mgmt'].includes(form.role)
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
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}

.register-box {
  width: 500px;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.register-box h2 {
  text-align: center;
  margin-bottom: 8px;
  color: #1e3c72;
}

.register-box p {
  text-align: center;
  color: #666;
  margin-bottom: 24px;
}

.login-link {
  text-align: center;
  margin-top: 16px;
}
</style>
