// api/hello.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('✅ hello API 被调用');
  return res.status(200).json({ 
    message: 'Hello from Vercel API!',
    time: new Date().toISOString()
  });
}
