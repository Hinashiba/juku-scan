import { NextRequest, NextResponse } from 'next/server'

function extractJson(txt: string) {
  for (const fn of [
    (t: string) => JSON.parse(t.trim()),
    (t: string) => JSON.parse(t.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim()),
    (t: string) => { const s=t.indexOf('{'),e=t.lastIndexOf('}'); if(s!==-1&&e>s) return JSON.parse(t.slice(s,e+1)); throw 0 },
  ]) { try { return fn(txt) } catch {} }
  return null
}

export async function POST(req: NextRequest) {
  const { ocrText } = await req.json()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: '問題集構造化AI。JSONのみ出力。説明文・```不要。',
      messages: [{ role: 'user', content: `OCRテキストから問題を抽出しJSONのみ出力:\n===\n${ocrText}\n===\n{"title":"タイトル","questions":[{"id":1,"type":"multiple_choice","question":"問題文","options":["A","B","C","D"],"answer":"正解","explanation":"解説"},{"id":2,"type":"fill_in","question":"___","answer":"正解","explanation":"解説"},{"id":3,"type":"short_answer","question":"問題","answer":"模範解答","explanation":"解説"}]}\n判定: 選択肢あり→multiple_choice, 空欄→fill_in, 記述→short_answer` }]
    })
  })
  const data = await res.json()
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 })
  const parsed = extractJson(data.content.map((i: {text?: string}) => i.text||'').join(''))
  if (!parsed?.questions?.length) return NextResponse.json({ error: '問題が抽出できませんでした' }, { status: 400 })
  return NextResponse.json(parsed)
}