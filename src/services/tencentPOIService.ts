// src/services/tencentPOIService.ts

const TENCENT_MAP_KEY = 'PTIBZ-6ZLCZ-EF5XX-7Z5IN-SBLV5-BLBUO'

export const tencentPOIService = {
  async searchByPolygon(keyword: string, bounds: { south: number; north: number; west: number; east: number }) {
    // 构建请求参数
    const params = new URLSearchParams({
      keyword: keyword,
      boundary: `rectangle(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`,
      page_size: '20',
      key: TENCENT_MAP_KEY,
      output: 'json' // 明确指定返回JSON格式
    })
    
    // 使用代理路径
    const url = `/tencent-map/ws/place/v1/search?${params.toString()}`
    
    console.log('请求URL:', url) // 调试用
    
    try {
      const response = await fetch(url)
      
      // 检查响应状态
      if (!response.ok) {
        console.error('HTTP错误:', response.status, response.statusText)
        return { success: false, data: [], message: `HTTP ${response.status}` }
      }
      
      // 检查Content-Type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('非JSON响应:', contentType)
        const text = await response.text()
        console.error('响应内容:', text.substring(0, 200))
        return { success: false, data: [], message: '非JSON响应' }
      }
      
      const data = await response.json()
      console.log('腾讯API响应:', data) // 调试用
      
      if (data.status === 0) {
        return {
          success: true,
          data: data.data.map((item: any) => ({
            id: item.id || `${item.title}_${item.location.lat}_${item.location.lng}`,
            title: item.title,
            address: item.address,
            category: item.category,
            location: item.location
          }))
        }
      }
      return { success: false, data: [], message: data.message }
    } catch (error) {
      console.error('腾讯POI检索失败:', error)
      return { success: false, data: [], message: String(error) }
    }
  }
}