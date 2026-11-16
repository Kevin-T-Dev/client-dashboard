import type { LessonPlan, Student } from '@/db/types'

export interface PlanMatch {
  plan: LessonPlan
  /** Focus areas shared by the student and the plan. */
  matched: string[]
  /** 0..1 share of the student focus areas covered by the plan. */
  coverage: number
  assigned: boolean
}

/**
 * Ranks lesson plans for a student by how many of the student focus areas
 * the plan addresses. Assigned plans are listed first within equal scores.
 */
export function rankPlansForStudent(student: Student, plans: LessonPlan[]): PlanMatch[] {
  const wants = new Set(student.focusAreas)
  return plans
    .map((plan) => {
      const matched = plan.focusAreas.filter((f) => wants.has(f))
      return {
        plan,
        matched,
        coverage: wants.size ? matched.length / wants.size : 0,
        assigned: student.assignedPlanIds.includes(plan.id),
      }
    })
    .sort((a, b) => {
      if (b.matched.length !== a.matched.length) return b.matched.length - a.matched.length
      if (a.assigned !== b.assigned) return a.assigned ? -1 : 1
      return a.plan.title.localeCompare(b.plan.title)
    })
}
