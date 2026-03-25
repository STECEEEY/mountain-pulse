// api/tencent.ts
export default async function handler(req: any, res: any) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const { keyword, location, boundary, radius, page_size } = req.query
  
  // 你的腾讯地图 Key
  const TENCENT_MAP_KEY = 'DJ4BZ-QHNH4-IDFUT-KAYGK-Y2VG2-47FQM'
  
  let url = ''
  
  // 判断是周边搜索还是多边形搜索
  if (location && radius) {
    // 周边搜索
    url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword as string)}&location=${location}&radius=${radius}&page_size=${page_size || 20}&key=${TENCENT_MAP_KEY}`
    console.log('周边搜索 URL:', url)
  } else if (boundary) {
    // 多边形搜索
    url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword as string)}&boundary=${boundary}&page_size=${page_size || 20}&key=${TENCENT_MAP_KEY}`
    console.log('多边形搜索 URL:', url)
  } else {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    console.log('腾讯API响应状态:', data.status)
    res.status(200).json(data)
  } catch (error) {
    console.error('代理请求失败:', error)
    res.status(500).json({ error: '代理请求失败', message: String(error) })
  }
}