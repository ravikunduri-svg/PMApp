import { NextRequest, NextResponse } from 'next/server'
import { critiqueResume } from '@/lib/groq'

export async function POST(req: NextRequest) {
  try {
    const { resume_text } = await req.json()

    if (!resume_text || typeof resume_text !== 'string') {
      return NextResponse.json({ error: 'resume_text is required' }, { status: 400 })
    }

    if (resume_text.trim().length < 200) {
      return NextResponse.json(
        { error: 'Resume is too short. Paste at least 200 characters of your resume.' },
        { status: 400 }
      )
    }

    if (resume_text.length > 15000) {
      return NextResponse.json(
        { error: 'Resume is too long. Paste the most relevant 2-3 pages.' },
        { status: 400 }
      )
    }

    const result = await critiqueResume(resume_text)
    return NextResponse.json(result)
  } catch (err) {
    console.error('critique-resume error:', err)
    return NextResponse.json({ error: 'Resume analysis failed. Please try again.' }, { status: 500 })
  }
}
