/** Suggested focus areas shared by students and lesson plans. */
export const FOCUS_AREAS = [
  'lower back',
  'neck & shoulders',
  'hips',
  'hamstrings',
  'knees',
  'flexibility',
  'core strength',
  'balance',
  'posture',
  'stress relief',
  'sleep',
  'breathing',
  'energy',
  'prenatal',
  'senior-friendly',
  'desk work',
  'running recovery',
] as const

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function addTag(list: string[], tag: string): string[] {
  const t = normalizeTag(tag)
  if (!t || list.includes(t)) return list
  return [...list, t]
}
