<template>
  <div class="data-upload">
    <div class="header">
      <h3>📤 数据管理</h3>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="灾害点数据" name="disaster" />
        <el-tab-pane label="InSAR干涉对" name="insar" />
        <el-tab-pane label="环境因子" name="env" />
      </el-tabs>
    </div>

    <div class="content">
      <!-- 上传区域 -->
      <el-upload
        class="upload-area"
        drag
        :action="uploadUrl"
        :headers="headers"
        :on-success="handleSuccess"
        :on-error="handleError"
        :before-upload="beforeUpload"
        multiple
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">
            <div v-if="activeTab === 'disaster'">
              支持 Excel/CSV 格式，包含字段：name, longitude, latitude, risk_level,
              threat_population...
            </div>
            <div v-if="activeTab === 'insar'">
              支持 CSV/GeoJSON 格式，包含字段：pair_name, master_date, slave_date,
              orbit_direction...
            </div>
            <div v-if="activeTab === 'env'">支持 GeoTIFF/Shapefile 格式，最大文件 50MB</div>
          </div>
        </template>
      </el-upload>

      <!-- 上传记录 -->
      <div class="upload-history">
        <h4>最近上传记录</h4>
        <el-table :data="uploadHistory" style="width: 100%" stripe>
          <el-table-column prop="fileName" label="文件名" show-overflow-tooltip />
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getTagType(row.type)" size="small">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="size" label="大小" width="100" />
          <el-table-column prop="uploadTime" label="上传时间" width="160" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === '成功' ? 'success' : 'danger'" size="small">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
              <el-button link type="danger" size="small" @click="deleteRecord(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 数据预览 -->
      <div class="data-preview" v-if="previewData.length">
        <h4>数据预览</h4>
        <el-table :data="previewData" style="width: 100%" height="200">
          <el-table-column v-for="col in previewColumns" :key="col" :prop="col" :label="col" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('disaster')
const uploadUrl = ref('/api/upload') // 替换为真实API

// 模拟上传历史
const uploadHistory = ref([
  {
    id: 1,
    fileName: '宁镇山脉灾害点_20260310.xlsx',
    type: '灾害点',
    size: '2.3 MB',
    uploadTime: '2026-03-10 14:23:45',
    status: '成功',
  },
  {
    id: 2,
    fileName: 'sentinel1_干涉对_2025.csv',
    type: 'InSAR',
    size: '856 KB',
    uploadTime: '2026-03-09 09:12:33',
    status: '成功',
  },
  {
    id: 3,
    fileName: '环境因子_坡度.tiff',
    type: '环境因子',
    size: '15.6 MB',
    uploadTime: '2026-03-08 16:45:12',
    status: '处理中',
  },
])

const previewData = ref([])
const previewColumns = ref<string[]>([])

const headers = {
  Authorization: 'Bearer ' + localStorage.getItem('token'),
}

const beforeUpload = (file: File) => {
  const isValidType =
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'text/csv' ||
    file.name.endsWith('.geojson')

  if (!isValidType) {
    ElMessage.error('不支持的文件格式')
    return false
  }

  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    ElMessage.error('文件大小不能超过 50MB')
    return false
  }

  return true
}

const handleSuccess = (response: any) => {
  ElMessage.success('上传成功')
  // 刷新上传历史
  if (response.preview) {
    previewData.value = response.preview.data
    previewColumns.value = response.preview.columns
  }
}

const handleError = () => {
  ElMessage.error('上传失败，请重试')
}

const getTagType = (type: string) => {
  const map: Record<string, string> = {
    灾害点: 'danger',
    InSAR: 'warning',
    环境因子: 'info',
  }
  return map[type] || ''
}

const viewDetail = (row: any) => {
  ElMessage.info('查看详情: ' + row.fileName)
}

const deleteRecord = (row: any) => {
  ElMessage.success('删除成功')
  uploadHistory.value = uploadHistory.value.filter((item) => item.id !== row.id)
}
</script>

<style scoped>
.data-upload {
  background: rgba(10, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  color: #e0f0ff;
  border: 1px solid rgba(0, 200, 255, 0.2);
  min-height: 600px;
}

.header {
  margin-bottom: 20px;
}

.header h3 {
  margin: 0 0 16px 0;
  color: #00f0ff;
  font-size: 16px;
}

.upload-area {
  margin-bottom: 24px;
}

:deep(.el-upload-dragger) {
  background: rgba(0, 30, 50, 0.6);
  border: 2px dashed rgba(0, 150, 255, 0.3);
  border-radius: 12px;
  padding: 30px;
}

:deep(.el-upload-dragger:hover) {
  border-color: #00f0ff;
  background: rgba(0, 60, 100, 0.4);
}

:deep(.el-icon--upload) {
  color: #00f0ff;
  font-size: 48px;
  margin-bottom: 16px;
}

:deep(.el-upload__text) {
  color: #e0f0ff;
}

:deep(.el-upload__text em) {
  color: #00f0ff;
  font-style: normal;
}

:deep(.el-upload__tip) {
  color: #88a0b0;
  margin-top: 8px;
}

.upload-history {
  margin-bottom: 20px;
}

.upload-history h4,
.data-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #a0d0ff;
}

:deep(.el-table) {
  background: transparent;
  color: #e0f0ff;
}

:deep(.el-table th) {
  background: rgba(0, 40, 60, 0.6);
  color: #00f0ff;
  border-bottom: 1px solid rgba(0, 150, 255, 0.2);
}

:deep(.el-table tr) {
  background: rgba(0, 30, 50, 0.4);
}

:deep(.el-table td) {
  border-bottom: 1px solid rgba(0, 150, 255, 0.1);
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: rgba(0, 40, 60, 0.4);
}
</style>
