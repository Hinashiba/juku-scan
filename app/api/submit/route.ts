import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const { quizCode, studentName, score, total, answers, results } = await req.json()
  const { data, error } = await supabase.from("submissions").insert({ quiz_code: quizCode.toUpperCase(), student_name: studentName, score, total, answers, results }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.json({ error: "コードが必要です" }, { status: 400 })
  const { data, error } = await supabase.from("submissions").select("*").eq("quiz_code", code.toUpperCase()).order("submitted_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data || [])
}
