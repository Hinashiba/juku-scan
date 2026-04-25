import { NextRequest, NextResponse } from "next/server"

function extractJson(txt: string) {
  for (const fn of [
    (t: string) => JSON.parse(t.trim()),
    (t: string) => JSON.parse(t.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim()),
    (t: string) => { const s=t.indexOf("{"),e=t.lastIndexOf("}"); if(s!==-1&&e>s) return JSON.parse(t.slice(s,e+1)); throw new Error("no json") },
  ]) { try { return fn(txt) } catch { continue } }
  return null
}

export async function POST(req: NextRequest) {
  const { questions, answers } = await req.json()
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 2048,
      system: "採点AI。JSONのみ出力。",
      messages: [{ role: "user", content: `採点してJSONのみ出力:
問題: ${JSON.stringify(questions.map((q: {id:number,question:string,answer:string,type:string}) => ({id:q.id,q:q.question,a:q.answer,type:q.type})))}
回答: ${JSON.stringify(answers)}
{"score":N,"total":N,"results":[{"id":1,"correct":true,"feedback":"フィードバック","correct_answer":"正解"}]}
記述・穴埋めは意味が合えば正解。` }]
    })
  })
  const data = await res.json()
  if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 })
  const result = extractJson(data.content.map((i: {text?: string}) => i.text||"").join(""))
  if (!result) return NextResponse.json({ error: "採点失敗" }, { status: 400 })

  // student_answerをanswersから直接セット
  result.results = result.results.map((r: {id:number;correct:boolean;feedback:string;correct_answer:string}) => ({
    ...r,
    student_answer: answers[r.id] || '（未回答）'
  }))

  return NextResponse.json(result)
}