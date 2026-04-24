import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType } = await req.json()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: '高精度OCRシステム。画像内のテキストを一字一句忠実に書き起こす。補完・推測・要約は絶対しない。',
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: 'この画像のテキストをすべて書き起こしてください。問題番号・選択肢・句読点も省略せず含めてください。' }
      ]}]
    })
  })
  const data = await res.json()
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 })
  const text = data.content.map((i: {text?: string}) => i.text || '').join('').trim()
  return NextResponse.json({ text })
}