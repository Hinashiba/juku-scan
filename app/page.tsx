'use client'
import { useState, useRef } from 'react'

async function preprocessImg(b64: string, mime: string, gray: boolean, contrast: boolean): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onerror = () => resolve(b64)
    img.onload = () => {
      try {
        const maxSz = 2000; let w = img.width, h = img.height
        if (Math.max(w,h) > maxSz) { const r = maxSz/Math.max(w,h); w=Math.round(w*r); h=Math.round(h*r) }
        const cv = document.createElement('canvas'); cv.width=w; cv.height=h
        const ctx = cv.getContext('2d')!; ctx.drawImage(img,0,0,w,h)
        if (gray||contrast) {
          const id=ctx.getImageData(0,0,w,h),d=id.data
          for (let i=0;i<d.length;i+=4) {
            let r=d[i],g=d[i+1],b=d[i+2]
            if (gray){const v=Math.round(.299*r+.587*g+.114*b);r=g=b=v}
            if (contrast){const f=(259*435)/(255*79);r=Math.min(255,Math.max(0,f*(r-128)+128));g=Math.min(255,Math.max(0,f*(g-128)+128));b=Math.min(255,Math.max(0,f*(b-128)+128))}
            d[i]=r;d[i+1]=g;d[i+2]=b
          }
          ctx.putImageData(id,0,0)
        }
        resolve(cv.toDataURL('image/jpeg',.92).split(',')[1])
      } catch { resolve(b64) }
    }
    img.src = `data:${mime};base64,${b64}`
  })
}

type Question = { id: number; type: string; question: string; options?: string[]; answer: string; explanation: string }
type Quiz = { title: string; questions: Question[] }
type GradeResult = { score: number; total: number; results: Array<{ id: number; correct: boolean; feedback: string; correct_answer: string }> }

const TAG: Record<string, {cls: string; label: string}> = {
  multiple_choice: { cls:'bg-blue-100 text-blue-700', label:'選択式' },
  fill_in:         { cls:'bg-green-100 text-green-700', label:'穴埋め' },
  short_answer:    { cls:'bg-amber-100 text-amber-700', label:'記述式' },
}

const C = ({children, p='p-5', className=''}: {children: React.ReactNode; p?: string; className?: string}) =>
  <div className={`bg-white rounded-2xl ${p} shadow-2xl mb-4 ${className}`}>{children}</div>

const Btn = ({children, onClick, color='blue', disabled=false}: {children: React.ReactNode; onClick?: () => void; color?: string; disabled?: boolean}) => {
  const bg: Record<string,string> = {blue:'bg-blue-800 hover:bg-blue-700',orange:'bg-orange-500 hover:bg-orange-400',green:'bg-emerald-600 hover:bg-emerald-500',ghost:'bg-transparent border-2 border-gray-200 hover:bg-gray-50'}
  const tx = color==='ghost' ? 'text-gray-500' : 'text-white'
  return <button onClick={onClick} disabled={disabled} className={`w-full py-3 text-sm font-bold rounded-xl transition-all ${bg[color]} ${tx} ${disabled?'opacity-40 cursor-not-allowed':''}`}>{children}</button>
}
// ── Custom Keyboard ───────────────────────────────
function CustomKeyboard({ qid, value, onChange }: { qid: number; value: string; onChange: (v: string) => void }) {
  const [showKb, setShowKb] = useState(false)
  const rows = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m'],
  ]
  const tap = (k: string) => onChange(value + k)
  const del = () => onChange(value.slice(0, -1))
  const space = () => onChange(value + ' ')
  const special = ["'", ",", ".", "!", "?", "-"]

  return (
    <div>
      <div
        className="w-full min-h-12 border-2 border-gray-200 rounded-xl p-2.5 text-sm bg-white cursor-pointer flex items-center justify-between"
        onClick={() => setShowKb(!showKb)}
      >
        <span className={value ? 'text-slate-800' : 'text-gray-400'}>{value || '答えを入力（タップでキーボード表示）'}</span>
        <span className="text-gray-400 text-xs">{showKb ? '▲' : '▼'}</span>
      </div>
      {showKb && (
        <div className="mt-2 bg-gray-100 rounded-xl p-2 select-none">
          {/* 入力中テキスト */}
          <div className="bg-white rounded-lg px-3 py-2 text-sm text-slate-800 mb-2 min-h-8 break-all">
            {value || <span className="text-gray-400">入力中...</span>}
          </div>
          {/* アルファベット行 */}
          {rows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1 mb-1">
              {row.map(k => (
                <button key={k} onClick={() => tap(k)}
                  className="bg-white rounded-lg text-sm font-bold text-slate-800 shadow-sm active:bg-gray-200 transition-all flex items-center justify-center"
                  style={{width:'9%', minWidth:'28px', height:'36px'}}>
                  {k}
                </button>
              ))}
            </div>
          ))}
          {/* 特殊文字行 */}
          <div className="flex justify-center gap-1 mb-1">
            {special.map(k => (
              <button key={k} onClick={() => tap(k)}
                className="bg-white rounded-lg text-sm font-bold text-slate-800 shadow-sm active:bg-gray-200 transition-all flex items-center justify-center"
                style={{width:'9%', minWidth:'28px', height:'36px'}}>
                {k}
              </button>
            ))}
          </div>
          {/* 最下行 */}
          <div className="flex gap-1">
            <button onClick={() => onChange(value.toUpperCase())}
              className="bg-yellow-100 text-yellow-800 rounded-lg text-xs font-bold px-2 h-9 flex-1 active:bg-yellow-200">
              大文字
            </button>
            <button onClick={() => onChange(value.toLowerCase())}
              className="bg-blue-100 text-blue-800 rounded-lg text-xs font-bold px-2 h-9 flex-1 active:bg-blue-200">
              小文字
            </button>
            <button onClick={space}
              className="bg-white rounded-lg text-xs font-bold h-9 shadow-sm active:bg-gray-200 flex-[3]">
              スペース
            </button>
            <button onClick={del}
              className="bg-red-100 text-red-700 rounded-lg text-xs font-bold px-3 h-9 flex-1 active:bg-red-200">
              ⌫
            </button>
            <button onClick={() => setShowKb(false)}
              className="bg-blue-800 text-white rounded-lg text-xs font-bold px-2 h-9 flex-1 active:bg-blue-700">
              完了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
const TagBadge = ({type}: {type: string}) =>
  <span className={`text-xs font-bold px-2 py-0.5 rounded ${TAG[type]?.cls}`}>{TAG[type]?.label}</span>

// ── Teacher Mode ─────────────────────────────────
function TeacherMode({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState('upload')
  const [b64, setB64] = useState('')
  const [mime, setMime] = useState('image/jpeg')
  const [prev, setPrev] = useState('')
  const [gray, setGray] = useState(true)
  const [cont, setCont] = useState(true)
  const [logs, setLogs] = useState<Array<{msg:string;type:string;id:number}>>([])
  const [ocr, setOcr] = useState('')
  const [quiz, setQuiz] = useState<Quiz|null>(null)
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [results, setResults] = useState<Array<{student_name:string;score:number;total:number}>>([])
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
const [checkCode, setCheckCode] = useState('')
  const log = (msg: string, type='info') => setLogs(l=>[...l,{msg,type,id:Math.random()}])

  const loadFile = (file: File|null) => {
    if (!file?.type.startsWith('image/')) return
    setMime(file.type)
    const r = new FileReader()
    r.onload = e => { const res = e.target?.result as string; setB64(res.split(',')[1]); setPrev(res); setErr('') }
    r.readAsDataURL(file)
  }

  const doOcr = async () => {
    setStep('ocr-load'); setLogs([]); setErr('')
    try {
      log('画像を前処理中...')
      const proc = await preprocessImg(b64, mime, gray, cont)
      log('前処理完了', 'ok')
      log('サーバーに送信中...')
      const res = await fetch('/api/ocr', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({imageBase64:proc, mimeType:'image/jpeg'}) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      log(data.text.length+'文字を読み取り完了', 'ok')
      setOcr(data.text); setStep('ocr-done')
    } catch(e: unknown) { setErr(e instanceof Error ? e.message : String(e)); setStep('upload') }
  }

  const doStruct = async () => {
    setStep('struct-load'); setErr('')
    try {
      const res = await fetch('/api/structure', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ocrText:ocr}) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setQuiz(data); setStep('preview')
    } catch(e: unknown) { setErr(e instanceof Error ? e.message : String(e)); setStep('ocr-done') }
  }

  const distribute = async () => {
    const c = Math.random().toString(36).slice(2,8).toUpperCase()
    const res = await fetch('/api/quiz', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code:c, title:quiz?.title, questions:quiz?.questions}) })
    const data = await res.json()
    if (data.error) { setErr(data.error); return }
    setCode(c); setStep('shared')
  }

  const fetchResults = async () => {
    const res = await fetch(`/api/submit?code=${code}`)
    const data = await res.json()
    setResults(Array.isArray(data) ? data : [])
    setStep('results')
  }

  const copyCode = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  const reset = () => { setStep('upload'); setB64(''); setPrev(''); setQuiz(null); setCode(''); setErr(''); setLogs([]); setOcr('') }

  return (
    <div>
      {step==='upload' && <C>
        <div className="text-center mb-4">
          <div className="text-4xl mb-1">📷</div>
          <h2 className="font-black text-slate-800 text-lg">問題集をスキャン</h2>
          <p className="text-xs text-gray-400 mt-1">スキャン → 配布コードを生成</p>
        </div>
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer mb-3 hover:border-blue-400 hover:bg-blue-50 transition-all"
          onClick={()=>fileRef.current?.click()}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();loadFile(e.dataTransfer.files[0])}}>
          {prev ? <img src={prev} alt="" className="max-h-44 mx-auto rounded-xl object-contain"/> : <><div className="text-3xl mb-2">🖼️</div><p className="font-bold text-sm text-gray-600">画像をタップ or ドロップ</p><p className="text-xs text-gray-400 mt-1">JPG・PNG・HEIC</p></>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>loadFile(e.target.files?.[0]??null)}/>
        {b64 && <div className="mb-3">
          <p className="text-xs font-bold text-gray-400 mb-2">🔧 画像処理</p>
          <div className="flex gap-2">
            {([[gray,setGray,'グレースケール'],[cont,setCont,'コントラスト強化']] as [boolean, (v:boolean)=>void, string][]).map(([v,fn,l],i)=>(
              <button key={i} onClick={()=>fn(!v)} className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-all ${v?'bg-blue-800 text-white border-blue-800':'bg-white text-gray-500 border-gray-200'}`}>{l}</button>
            ))}
          </div>
        </div>}
        {err && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-red-600 text-xs font-bold break-all">❌ {err}</p></div>}
        <Btn onClick={doOcr} disabled={!b64} color="blue">🔍 文字を読み取る（STEP 1）</Btn>
        <div className="h-2"/>
        <Btn onClick={()=>{setQuiz({title:'サンプルテスト',questions:[{id:1,type:'multiple_choice',question:'She ___ to school every day.',options:['go','goes','going','gone'],answer:'goes',explanation:'三人称単数現在形'},{id:2,type:'fill_in',question:'I have ___ lunch yet.',answer:'not eaten',explanation:'現在完了否定形'}]});setStep('preview')}} color="ghost">📝 サンプルで試す</Btn>
        <div className="h-2"/>
        <div className="h-4"/>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-400 mb-2">📊 提出状況を確認する</p>
          <div className="flex gap-2">
            <input value={checkCode} onChange={e=>setCheckCode(e.target.value.toUpperCase())} placeholder="配布コードを入力" maxLength={6} className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold tracking-widest outline-none focus:border-blue-500 uppercase"/>
            <button onClick={async()=>{if(!checkCode.trim())return;setCode(checkCode);const r=await fetch(`/api/submit?code=${checkCode}`);const data=await r.json();setResults(Array.isArray(data)?data:[]);setStep('results')}} className="bg-blue-800 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-all">確認</button>
          </div>
        </div>
        <div className="h-2"/>
        <Btn onClick={onBack} color="ghost">← 戻る</Btn>
      </C>}

      {step==='ocr-load' && <C p="p-8">
        <div className="text-center"><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>🔍</span><h3 className="font-black text-slate-800 mt-3 mb-1">文字を読み取り中...</h3></div>
        <div className="mt-4 bg-slate-900 rounded-xl p-3 max-h-36 overflow-y-auto">
          {logs.map(l=><div key={l.id} className={`text-xs font-mono mb-0.5 ${l.type==='ok'?'text-green-400':l.type==='error'?'text-red-400':'text-blue-300'}`}>{l.type==='ok'?'✓ ':'→ '}{l.msg}</div>)}
        </div>
      </C>}

      {step==='ocr-done' && <C>
        {err && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-red-600 text-xs font-bold break-all">❌ {err}</p></div>}
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl mb-3"><p className="text-green-700 text-xs font-bold">✅ 読み取り完了。内容を確認・修正して次へ</p></div>
        <p className="text-xs font-bold text-gray-400 mb-2">📄 読み取り結果（編集可能）</p>
        <textarea className="w-full min-h-36 border-2 border-gray-200 rounded-xl p-3 text-sm text-gray-700 leading-relaxed resize-y outline-none focus:border-blue-400 bg-gray-50 font-mono" value={ocr} onChange={e=>setOcr(e.target.value)}/>
        <p className="text-gray-400 text-xs mt-1 mb-3">誤字があれば直接修正できます</p>
        <Btn onClick={doStruct} color="green">⚙️ 問題を構造化する（STEP 2）</Btn>
        <div className="h-2"/>
        <Btn onClick={reset} color="ghost">← やり直す</Btn>
      </C>}

      {step==='struct-load' && <C p="p-8">
        <div className="text-center"><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>⚙️</span><h3 className="font-black text-slate-800 mt-3 mb-1">問題を構造化中...</h3></div>
      </C>}

      {step==='preview' && quiz && <C>
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl mb-4"><p className="text-green-700 text-sm font-bold">✅ {quiz.questions.length}問が抽出されました</p></div>
        <p className="font-black text-slate-800 text-base mb-3">{quiz.title}</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          {quiz.questions.map((q,i)=>(
            <div key={q.id} className={`py-2.5 ${i<quiz.questions.length-1?'border-b border-gray-100':''}`}>
              <div className="flex gap-2 items-start"><span className="text-gray-300 text-xs min-w-5 font-mono pt-0.5">Q{q.id}</span>
              <div><TagBadge type={q.type}/><p className="text-gray-700 text-sm mt-1 leading-relaxed">{q.question}</p></div></div>
            </div>
          ))}
        </div>
        <Btn onClick={distribute} color="orange">📤 配布コードを発行する</Btn>
        <div className="h-2"/>
        <Btn onClick={reset} color="ghost">← やり直す</Btn>
      </C>}

      {step==='shared' && <C>
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="font-black text-slate-800 text-lg mb-1">配布コードが発行されました！</h2>
          <p className="text-gray-500 text-sm">生徒にこのコードを伝えてください</p>
        </div>
        <div className="bg-gradient-to-br from-blue-800 to-blue-900 rounded-2xl p-6 text-center mb-4">
          <p className="text-blue-200 text-xs font-bold mb-2 tracking-widest">配布コード</p>
          <div className="text-white font-black tracking-widest mb-3" style={{fontSize:'44px',letterSpacing:'0.15em'}}>{code}</div>
          <button onClick={copyCode} className={`text-sm font-bold px-5 py-2 rounded-xl transition-all ${copied?'bg-green-400 text-white':'bg-white text-blue-800 hover:bg-blue-50'}`}>
            {copied?'✓ コピーしました！':'📋 コピー'}
          </button>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-blue-700 mb-2">📌 生徒への伝え方</p>
          <p className="text-blue-600 text-xs leading-relaxed">① このサイトにアクセスする<br/>② 「生徒モード」を選ぶ<br/>③ コード「<strong>{code}</strong>」を入力する<br/>④ 問題を解いて提出する</p>
        </div>
        <Btn onClick={fetchResults} color="blue">📊 提出状況を確認する</Btn>
        <div className="h-2"/>
        <Btn onClick={reset} color="ghost">← 別の問題を作成</Btn>
      </C>}

      {step==='results' && <C>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-slate-800 text-base">📊 提出状況 — {code}</h2>
          <button onClick={fetchResults} className="text-xs font-bold text-blue-600 hover:text-blue-800">🔄 更新</button>
        </div>
        {results.length===0
          ? <div className="text-center py-8"><div className="text-4xl mb-3">⏳</div><p className="text-gray-500 text-sm font-bold">まだ提出がありません</p></div>
          : <>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <div className="flex justify-between text-xs font-bold text-gray-500 mb-1"><span>提出数</span><span>{results.length}名</span></div>
              <div className="flex justify-between text-xs font-bold text-gray-500"><span>平均正解率</span><span>{Math.round(results.reduce((s,r)=>s+(r.score/r.total*100),0)/results.length)}%</span></div>
            </div>
            
          {results.map((r,i)=>(
              <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div><p className="font-bold text-slate-800 text-sm">{r.student_name}</p><p className="text-gray-400 text-xs mt-0.5">{r.score}/{r.total}問正解</p></div>
                  <div className={`text-lg font-black ${r.score===r.total?'text-green-500':r.score/r.total>=.6?'text-blue-500':'text-orange-500'}`}>{Math.round(r.score/r.total*100)}%</div>
                </div>
                {(r as {results?:{id:number;correct:boolean;correct_answer:string;student_answer?:string}[]}).results && (
                  <div className="mt-1">
                    {(r as {results:{id:number;correct:boolean;correct_answer:string;student_answer?:string}[]}).results.map(res=>(
                      <div key={res.id} className={`text-xs p-2 rounded-lg mb-1 ${res.correct?'bg-green-50 border border-green-200':'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-1 font-bold mb-0.5">
                          <span>{res.correct?'✅':'❌'}</span>
                          <span className={res.correct?'text-green-700':'text-red-700'}>Q{res.id}</span>
                        </div>
                        {!res.correct && <p className="text-red-600">回答: <strong>{res.student_answer||'（未回答）'}</strong></p>}
                        {!res.correct && <p className="text-gray-500">正解: <strong>{res.correct_answer}</strong></p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        }
        <div className="h-2"/>
        <Btn onClick={()=>setStep('shared')} color="ghost">← コード画面に戻る</Btn>
      </C>}
    </div>
  )
}

// ── Student Mode ─────────────────────────────────
function StudentMode({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState('enter')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [quiz, setQuiz] = useState<Quiz|null>(null)
  const [ans, setAns] = useState<Record<number,string>>({})
  const [result, setResult] = useState<GradeResult|null>(null)
  const [err, setErr] = useState('')

  const fetchQuiz = async () => {
    if (!code.trim()||!name.trim()) { setErr('コードと名前を入力してください'); return }
    setStep('loading'); setErr('')
    const res = await fetch(`/api/quiz?code=${code.toUpperCase().trim()}`)
    const data = await res.json()
    if (data.error) { setErr(data.error); setStep('enter'); return }
    setQuiz(data); setStep('answering')
  }

  const doGrade = async () => {
    setStep('grading')
    try {
      const res = await fetch('/api/grade', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({questions:quiz?.questions, answers:ans}) })
      const r = await res.json()
      if (r.error) throw new Error(r.error)
      await fetch('/api/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({quizCode:code, studentName:name, score:r.score, total:r.total, answers:ans, results:r.results}) })
      setResult(r); setStep('result')
    } catch(e: unknown) { setErr(e instanceof Error ? e.message : String(e)); setStep('answering') }
  }

  const selOpt = (qid: number, opt: string) => setAns(a=>({...a,[qid]:opt}))
  const setTA = (qid: number, v: string) => { if(v.trim()) setAns(a=>({...a,[qid]:v.trim()})); else setAns(a=>{const n={...a};delete n[qid];return n}) }
  const answered = Object.keys(ans).length
  const total = quiz?.questions?.length||0

  return (
    <div>
      {step==='enter' && <C>
        <div className="text-center mb-6"><div className="text-4xl mb-2">🎓</div><h2 className="font-black text-slate-800 text-lg">問題を受け取る</h2><p className="text-gray-400 text-sm mt-1">先生からもらったコードを入力</p></div>
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 block mb-1.5">配布コード</label>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="例：ABC123" maxLength={6} className="w-full border-2 border-gray-200 rounded-xl p-3 text-center font-black text-2xl tracking-widest outline-none focus:border-blue-500 uppercase"/>
        </div>
        <div className="mb-4">
          <label className="text-xs font-bold text-gray-500 block mb-1.5">あなたの名前</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="例：山田 太郎" className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500"/>
        </div>
        {err && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-red-600 text-xs font-bold">❌ {err}</p></div>}
        <Btn onClick={fetchQuiz} disabled={!code.trim()||!name.trim()} color="blue">📥 問題を読み込む</Btn>
        <div className="h-2"/>
        <Btn onClick={onBack} color="ghost">← 戻る</Btn>
      </C>}

      {step==='loading' && <C p="p-8"><div className="text-center"><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>📥</span><h3 className="font-black text-slate-800 mt-3">読み込み中...</h3></div></C>}
      {step==='grading' && <C p="p-8"><div className="text-center"><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>📝</span><h3 className="font-black text-slate-800 mt-3">採点中...</h3></div></C>}

      {step==='answering' && quiz && <>
        <C>
          <h2 className="font-black text-slate-800 text-base">{quiz.title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{name} さん ／ 全{total}問</p>
          <div className="h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden"><div className="h-full bg-orange-400 rounded-full transition-all" style={{width:`${answered/total*100}%`}}/></div>
          <p className="text-gray-400 text-xs text-right mt-1">{answered}/{total}問回答済み</p>
        </C>
        {quiz.questions.map(q=>(
          <div key={q.id} className={`bg-white rounded-2xl p-4 shadow-xl mb-3 border-2 transition-all ${ans[q.id]?'border-blue-800':'border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-800 text-white text-xs font-black flex items-center justify-center shrink-0">{q.id}</span>
              <TagBadge type={q.type}/>
            </div>
            <p className="text-slate-800 text-sm font-medium leading-relaxed mb-3">{q.question}</p>
            {q.type==='multiple_choice' ? q.options?.map(opt=>(
              <div key={opt} onClick={()=>selOpt(q.id,opt)} className={`flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5 border-2 cursor-pointer transition-all ${ans[q.id]===opt?'bg-blue-50 border-blue-800':'bg-white border-gray-100 hover:border-gray-300'}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${ans[q.id]===opt?'border-blue-800 bg-blue-800':'border-gray-300'}`}>
                  {ans[q.id]===opt && <div className="w-2 h-2 rounded-full bg-white"/>}
                </div>
                <span className="text-sm text-gray-700">{opt}</span>
              </div>
            )) : <CustomKeyboard qid={q.id} value={ans[q.id]||''} onChange={(v)=>setTA(q.id,v)}/>}
          </div>
        ))}
        <C>
          {err && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-red-600 text-xs font-bold">❌ {err}</p></div>}
          <Btn onClick={doGrade} disabled={answered<total} color="orange">📤 提出して採点する ({answered}/{total}問)</Btn>
        </C>
      </>}

      {step==='result' && result && <>
        <C>
          <div className="text-center">
            <div className="text-5xl mb-2">{result.score===result.total?'🎉':result.score/result.total>=.6?'👍':'📖'}</div>
            <div className="text-5xl font-black text-slate-800 leading-none">{result.score}<span className="text-2xl text-gray-400 font-normal">/{result.total}</span></div>
            <p className="text-gray-500 text-sm mt-2">{name} さんの結果 ／ 正解率 {Math.round(result.score/result.total*100)}%</p>
            <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-3 mt-3">
              <p className="text-blue-700 text-sm font-bold">{result.score===result.total?'満点！素晴らしい！':result.score/result.total>=.6?'よく頑張りました！':'もう少し復習しましょう'}</p>
            </div>
            <p className="text-green-600 text-xs mt-2 font-bold">✅ 結果は先生に自動送信されました</p>
          </div>
        </C>
        {result.results?.map(r=>{
          const q = quiz?.questions?.find(q=>q.id===r.id)
          return <div key={r.id} className={`rounded-2xl p-4 mb-3 border-2 ${r.correct?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2"><span>{r.correct?'✅':'❌'}</span><span className={`font-bold text-sm ${r.correct?'text-green-700':'text-red-700'}`}>Q{r.id}: {r.correct?'正解':'不正解'}</span></div>
            <p className="text-gray-700 text-sm mb-2 leading-relaxed">{q?.question}</p>
            {!r.correct && <p className="text-red-600 text-sm mb-1">あなたの回答: <strong>{ans[r.id]||'未回答'}</strong></p>}
            <p className={`text-sm mb-1 ${r.correct?'text-green-700':'text-slate-700'}`}>✓ 正解: <strong>{r.correct_answer}</strong></p>
            <p className="text-gray-500 text-xs">💡 {r.feedback}</p>
          </div>
        })}
        <C><Btn onClick={onBack} color="blue">🏠 ホームに戻る</Btn></C>
      </>}
    </div>
  )
}

// ── Main App ─────────────────────────────────────
export default function Home() {
  const [mode, setMode] = useState('home')
  return (
    <div style={{background:'linear-gradient(160deg,#0f1f4a,#1e3a8a 60%,#1d4ed8)',minHeight:'100vh',fontFamily:'system-ui,sans-serif'}}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <div style={{background:'rgba(255,255,255,.1)',backdropFilter:'blur(10px)',borderBottom:'1px solid rgba(255,255,255,.15)'}} className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <button onClick={()=>setMode('home')} className="text-white font-black text-base hover:opacity-80 transition-opacity">📚 塾スキャン</button>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-500 text-white">
          {mode==='home'?'ホーム':mode==='teacher'?'先生モード':'生徒モード'}
        </span>
      </div>
      <div className="p-4 max-w-lg mx-auto">
        {mode==='home' && (
          <div>
            <div className="text-center py-8 mb-2">
              <div className="text-5xl mb-3">📚</div>
              <h1 className="text-white font-black text-2xl mb-2">塾スキャン</h1>
              <p className="text-blue-200 text-sm">問題集をスキャンして、すぐ配布・自動採点</p>
            </div>
            <button onClick={()=>setMode('teacher')} className="w-full text-left mb-3">
              <div className="bg-white rounded-2xl p-5 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-800 flex items-center justify-center text-2xl shrink-0">👩‍🏫</div>
                  <div>
                    <p className="font-black text-slate-800 text-base">先生モード</p>
                    <p className="text-gray-500 text-xs mt-0.5">問題をスキャン → 配布コードを発行</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {['📷 写真スキャン','🔤 自動文字起こし','📤 コード配布','📊 提出確認'].map(t=>(
                        <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </button>
            <button onClick={()=>setMode('student')} className="w-full text-left">
              <div className="bg-white rounded-2xl p-5 shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-2xl shrink-0">🎓</div>
                  <div>
                    <p className="font-black text-slate-800 text-base">生徒モード</p>
                    <p className="text-gray-500 text-xs mt-0.5">コードを入力 → 問題を解く → 即採点</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {['🔑 コード入力','📝 スマホで解答','⚡ 即時採点'].map(t=>(
                        <span key={t} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}
        {mode==='teacher' && <TeacherMode onBack={()=>setMode('home')}/>}
        {mode==='student' && <StudentMode onBack={()=>setMode('home')}/>}
      </div>
    </div>
  )
}
