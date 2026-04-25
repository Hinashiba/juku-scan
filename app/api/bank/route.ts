import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")
  const subject = req.nextUrl.searchParams.get("subject")
  const unit = req.nextUrl.searchParams.get("unit")

  let query = supabase.from("question_bank").select("*").order("created_at", { ascending: false })
  if (title) query = query.ilike("title", `%${title}%`)
  if (subject) query = query.ilike("subject", `%${subject}%`)
  if (unit) query = query.ilike("unit", `%${unit}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const { title, subject, unit, questions } = await req.json()
  const { data, error } = await supabase
    .from("question_bank")
    .insert({ title, subject: subject||"英語", unit: unit||"", questions })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}