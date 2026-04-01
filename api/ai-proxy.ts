import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // 转发请求到你的后端
    const response = await axios.post('http://47.102.147.118:3000/ai/decision', req.body, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('代理请求失败:', error.message);
    return res.status(500).json({ error: '代理请求失败' });
  }
}
