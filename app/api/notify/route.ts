import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const TEACHER_EMAIL = "hinashibaxta@gmail.com"

export async function POST(req: NextRequest) {
  const { studentName, className, type, title } = await req.json()

  const subject = type === "digital"
    ? `📝 【提出通知】${studentName}さんが「${title}」を提出しました`
    : `✏️ 【手書き提出通知】${studentName}さんが手書き宿題を提出しました`

  const html = type === "digital"
    ? `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#1e3a8a">📝 デジタル提出通知</h2>
        <p><strong>${studentName}</strong>さん（${className}組）が問題を提出しました。</p>
        <p>📚 問題タイトル: <strong>${title}</strong></p>
        <p style="color:#6b7280;font-size:13px">塾スキャンから自動送信されました</p>
      </div>`
    : `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
        <h2 style="color:#059669">✏️ 手書き提出通知</h2>
        <p><strong>${studentName}</strong>さん（${className}組）が手書き宿題を提出しました。</p>
        <p>📋 宿題タイトル: <strong>${title}</strong></p>
        <p style="color:#6b7280;font-size:13px">塾スキャンから自動送信されました</p>
      </div>`

  try {
    await resend.emails.send({
      from: "塾スキャン <onboarding@resend.dev>",
      to: TEACHER_EMAIL,
      subject,
      html,
    })
    return NextResponse.json({ success: true })
  } catch(e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}