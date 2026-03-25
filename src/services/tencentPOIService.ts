// src/services/tencentPOIService.ts

const TENCENT_MAP_KEY = 'PTIBZ-6ZLCZ-EF5XX-7Z5IN-SBLV5-BLBUO'

export interface TencentPOI {
  id: string
  title: string
  address: string
  category: string
  location: {
    lat: number
    lng: number
  }
}

export interface SearchResult {
  success: boolean
  data: TencentPOI[]
  message?: string
}

export const tencentPOIService = {
  /**
   * 多边形检索
   * @param keyword 搜索关键词
   * @param bounds 多边形边界（或矩形边界）
   */
  async searchByPolygon(keyword: string, bounds: { south: number; north: number; west: number; east: number }): Promise<SearchResult> {
    const url = `https://apis.map.qq.com/ws/place/v1/search`
    const params = new URLSearchParams({
      keyword: keyword,
      boundary: `rectangle(${bounds.south},${bounds.west},${bounds.north},${bounds.east})`,
      page_size: '20',
      key: TENCENT_MAP_KEY
    })
    
    try {
      const response = await fetch(`${url}?${params}`)
      const data = await response.json()
      
      if (data.status === 0) {
        return {
          success: true,
          data: data.data.map((item: any) => ({
            id: item.id || `${item.title}_${item.location.lat}_${item.location.lng}`, // 确保id不为undefined
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
   * 获取POI详情
   */
  async getPOIDetail(poiId: string): Promise<{ success: boolean; data: any | null; message?: string }> {
    const url = `https://apis.map.qq.com/place/v1/detail`
    const params = new URLSearchParams({
      id: poiId,
      key: TENCENT_MAP_KEY
    })
    
    try {
      const response = await fetch(`${url}?${params}`)
      const data = await response.json()
      
      if (data.status === 0) {
        return { success: true, data: data.data }
      }
      return { success: false, data: null, message: data.message }
    } catch (error) {
      console.error('获取POI详情失败:', error)
      return { success: false, data: null, message: String(error) }
    }
  }
}