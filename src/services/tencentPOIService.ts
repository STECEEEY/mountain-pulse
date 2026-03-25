// src/services/tencentPOIService.ts

const TENCENT_MAP_KEY = '5YUBZ-S7WKZ-OFJXR-7PKHU-CTZV5-LPBLR'

export const tencentPOIService = {
  async searchByPolygon(keyword: string, bounds: { south: number; north: number; west: number; east: number }) {
    const params = new URLSearchParams({
      keyword: keyword,
      boundary: `rectangle(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`,
      page_size: '20',
      key: TENCENT_MAP_KEY
    })
    
    // 使用 Vercel Serverless Function
    const url = `/api/tencent?${params.toString()}`
    
    console.log('请求URL:', url)
    
    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        console.error('HTTP错误:', response.status)
        return { success: false, data: [], message: `HTTP ${response.status}` }
      }
      
      const data = await response.json()
      console.log('API响应:', data)
      
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