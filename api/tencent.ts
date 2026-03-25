// api/tencent.ts
export default async function handler(req: any, res: any) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const { keyword, boundary, page_size } = req.query
  
  // 直接使用测试成功的 Key
  const TENCENT_MAP_KEY = 'DJ4BZ-QHNH4-IDFUT-KAYGK-Y2VG2-47FQM'
  
  const url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword as string)}&boundary=${boundary}&page_size=${page_size}&key=${TENCENT_MAP_KEY}`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('代理请求失败:', error)
    res.status(500).json({ error: '代理请求失败' })
  }
}