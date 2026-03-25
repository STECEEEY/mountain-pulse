// api/tencent.ts

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const { keyword, boundary, location, radius, page_size } = req.query
  const TENCENT_MAP_KEY = 'DJ4BZ-QHNH4-IDFUT-KAYGK-Y2VG2-47FQM'
  
  let url = ''
  
  // 判断是周边搜索还是多边形搜索
  if (location && radius) {
    // 周边搜索
    url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword as string)}&location=${location}&radius=${radius}&page_size=${page_size || 20}&key=${TENCENT_MAP_KEY}`
  } else {
    // 多边形搜索
    url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword as string)}&boundary=${boundary}&page_size=${page_size || 20}&key=${TENCENT_MAP_KEY}`
  }
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('代理请求失败:', error)
    res.status(500).json({ error: '代理请求失败' })
  }
}