import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, adminClient } from '@/lib/supabase-server'
import {
  XP_PER_ACTION,
  BADGE_DEFS,
  checkNewBadges,
  awardXP,
  type BadgeId,
} from '@/lib/gamification'

const VALID_MODULE_IDS = ['f1-pm-roles', 'f2-pm-journey', 'f3-frameworks', 'f4-product-sense', 'f5-metrics']

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { module_id } = await req.json()
    if (!module_id || !VALID_MODULE_IDS.includes(module_id)) {
      return NextResponse.json({ error: 'Invalid module_id' }, { status: 400 })
    }

    // Fetch current profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('modules_completed, badges_earned, xp_total, level, streak_count')
      .eq('id', user.id)
      .maybeSingle()

    const modulesCompleted: string[] = (profile?.modules_completed as string[]) ?? []

    // Idempotency — already completed
    if (modulesCompleted.includes(module_id)) {
      return NextResponse.json({ ok: true, already_complete: true })
    }

    const updatedModules = [...modulesCompleted, module_id]

    // Update modules_completed
    await adminClient
      .from('profiles')
      .update({ modules_completed: updatedModules })
      .eq('id', user.id)

    // Badge check
    const alreadyEarned = ((profile?.badges_earned as { id: string }[]) ?? []).map((b) => b.id as BadgeId)

    const badgeCtx = {
      streakCount:       (profile?.streak_count as number) ?? 0,
      completedTestCount: 0,   // not needed for module badges — will be skipped as already earned or N/A
      drillCount:        0,
      modulesCompleted:  updatedModules,
      avgScores:         {},
      maxTestScore:      null,
      totalQuestions:    0,
      readinessPct:      0,
    }

    const newBadgeIds  = checkNewBadges(alreadyEarned, badgeCtx)
    await awardXP(user.id, XP_PER_ACTION.module_complete, newBadgeIds, adminClient)

    const badgeDefMap  = Object.fromEntries(BADGE_DEFS.map((b) => [b.id, b]))
    const newBadgeObjs = newBadgeIds.map((id) => ({
      id,
      name: badgeDefMap[id]?.name ?? id,
      icon: badgeDefMap[id]?.icon ?? '🏅',
    }))

    return NextResponse.json({
      ok:            true,
      already_complete: false,
      xp_earned:     XP_PER_ACTION.module_complete,
      new_badges:    newBadgeObjs,
      modules_completed: updatedModules,
    })
  } catch (err) {
    console.error('complete-module error:', err)
    return NextResponse.json({ error: 'Failed to complete module' }, { status: 500 })
  }
}
