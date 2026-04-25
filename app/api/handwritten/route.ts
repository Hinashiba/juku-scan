import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

function extractJson(txt: string) {
  for (const fn of [
    (t: string) => JSON.parse(t.trim()),
    (t: string) => JSON.parse(t.replace(/```json\s*/gi,"").replace(/```\s*/g,"").trim()),
    (t: string) => { const s=t.indexOf("{"),e=t.lastIndexOf("}"); if(s!==-1&&e>s) return JSON.parse(t.slice(s,e+1)); throw new Error("no json") },
  ]) { try { return fn(txt) } catch { continue } }
  return null
}

export async function POST(req: NextRequest) {
  const { studentName, className, imageBase64, homeworkTitle } = await req.json()

  // STEP1: OCR
  const ocrRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 4096,
      system: "あなたは手書き答案の高精度OCRシステムです。画像内の手書き文字をすべて忠実に書き起こしてください。問題番号と答えのセットで出力してください。",
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
        { type: "text", text: `これは「${homeworkTitle}」の手書き答案です。問題番号と生徒が書いた答えをすべて書き起こしてください。読み取れない文字は[?]と記してください。` }
      ]}]
    })
  })
  const ocrData = await ocrRes.json()
  if (ocrData.error) return NextResponse.json({ error: ocrData.error.message }, { status: 400 })
  const ocrText = ocrData.content.map((i: {text?: string}) => i.text||"").join("").trim()

  // STEP2: 採点
  const gradeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 2048,
      system: "手書き答案の採点AIです。JSONのみ出力します。",
      messages: [{ role: "user", content: `以下の手書き答案を採点してJSONのみ出力:
答案の文字起こし:
${ocrText}

{"score":N,"total":N,"results":[{"question_num":"1","student_answer":"生徒の回答","correct":true,"feedback":"フィードバック"}]}

英語の答案なので、スペルミスや大文字小文字は許容。意味が合っていれば正解。問題番号ごとに採点。` }]
    })
  })
  const gradeData = await gradeRes.json()
  if (gradeData.error) return NextResponse.json({ error: gradeData.error.message }, { status: 400 })
  const gradeResult = extractJson(gradeData.content.map((i: {text?: string}) => i.text||"").join(""))
  if (!gradeResult) return NextResponse.json({ error: "採点失敗" }, { status: 400 })

  // STEP3: DB保存
  const { data, error } = await supabase
    .from("handwritten_submissions")
    .insert({
      student_name: studentName,
      class: className,
      image_base64: imageBase64,
      ocr_text: ocrText,
      grade_result: gradeResult
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ...data, ocrText, gradeResult })
}

export async function GET(req: NextRequest) {
  const className = req.nextUrl.searchParams.get("class")
  let query = supabase.from("handwritten_submissions").select("*").order("submitted_at", { ascending: false })
  if (className) query = query.eq("class", className)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data || [])
}