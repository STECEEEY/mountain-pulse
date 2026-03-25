// src/services/tencentPOIService.ts

export const tencentPOIService = {
  async searchByPolygon(keyword: string, bounds: { south: number; north: number; west: number; east: number }) {
    const params = new URLSearchParams({
      keyword: keyword,
      boundary: `rectangle(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`,
      page_size: '20'
    })
    
    // 直接调用代理，不再传递 key 参数（因为 key 在后端）
    const url = `/api/tencent?${params.toString()}`
    
    try {
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.status === 0) {
        return {
          success: true,
          data: data.data.map((item: any) => ({
            id: item.id,
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