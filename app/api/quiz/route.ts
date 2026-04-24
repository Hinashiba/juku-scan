import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.json({ error: "コードが必要です" }, { status: 400 })
  const { data, error } = await supabase.from("quizzes").select("*").eq("code", code.toUpperCase()).single()
  if (error || !data) return NextResponse.json({ error: "クイズが見つかりません" }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { code, title, questions } = await req.json()
  const { data, error } = await supabase.from("quizzes").insert({ code: code.toUpperCase(), title, questions }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}