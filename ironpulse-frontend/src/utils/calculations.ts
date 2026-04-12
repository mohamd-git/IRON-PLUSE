/** Epley 1RM formula: weight × (1 + reps / 30) */
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

/** Wilks coefficient (simplified for display purposes) */
export function calculateWilks(total: number, bodyweight: number, isMale: boolean): number {
  const coeffs = isMale
    ? [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8]
    : [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 0.00004731582, -0.00000009054]
  const x = bodyweight
  const denom = coeffs.reduce((sum, c, i) => sum + c * Math.pow(x, i), 0)
  return denom !== 0 ? Math.round((total * (500 / denom)) * 100) / 100 : 0
}

/** Volume = sum of (weight × reps) for all sets */
export function calculateVolume(sets: { weight_kg: number | null; reps: number | null }[]): number {
  return sets.reduce((total, s) => total + ((s.weight_kg || 0) * (s.reps || 0)), 0)
}
