// src/services/tencentPOIService.ts

export const tencentPOIService = {
  /**
   * 多边形/矩形区域搜索
   */
  async searchByPolygon(keyword: string, bounds: { south: number; north: number; west: number; east: number }) {
    const params = new URLSearchParams({
      keyword: keyword,
      boundary: `rectangle(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`,
      page_size: '20'
    })
    
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
  },

  /**
   * 周边搜索（按经纬度和半径）
   */
  async searchNearby(keyword: string, lat: number, lng: number, radius: number = 2000) {
    const params = new URLSearchParams({
      keyword: keyword,
      location: `${lat},${lng}`,
      radius: radius.toString(),
      page_size: '20'
    })
    
    // 使用同一个代理，通过参数区分是周边搜索
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
      console.error('周边搜索失败:', error)
      return { success: false, data: [], message: String(error) }
    }
  }
}