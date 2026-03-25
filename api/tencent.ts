// api/tencent.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  const { keyword, boundary, page_size } = req.query
  
  const url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword as string)}&boundary=${boundary}&page_size=${page_size}&key=${process.env.TENCENT_MAP_KEY}`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('代理请求失败:', error)
    res.status(500).json({ error: '代理请求失败', status: 500 })
  }
}