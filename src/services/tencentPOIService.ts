// src/services/tencentPOIService.ts

const TENCENT_MAP_KEY = 'PTIBZ-6ZLCZ-EF5XX-7Z5IN-SBLV5-BLBUO'

export const tencentPOIService = {
  async searchByPolygon(keyword: string, bounds: { south: number; north: number; west: number; east: number }) {
    // 使用代理路径
    const baseUrl = '/tencent-map/ws/place/v1/search'
    
    const params = new URLSearchParams({
      keyword: keyword,
      boundary: `rectangle(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`,
      page_size: '20',
      key: TENCENT_MAP_KEY
    })
    
    try {
      const response = await fetch(`${baseUrl}?${params}`)
      const data = await response.json()
      
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