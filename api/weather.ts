// api/weather.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🎯 weather API 被调用');
  
  const { lng, lat } = req.query;
  
  return res.status(200).json({ 
    success: true,
    message: 'Weather API is working!',
    lng: lng || 'no lng',
    lat: lat || 'no lat',
    timestamp: new Date().toISOString()
  });
}
