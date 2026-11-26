/**
 * Picks a random item that hasn't been shown yet, so "Ge mig en annan" goes through every
 * option before repeating. When all have been shown, starts over (never repeating the one
 * on screen right now).
 *
 * @param shown  ids already shown in this round, most recent last
 * @param random a function returning [0, 1), like Math.random (injectable for tests)
 * @returns the pick and the updated list of shown ids, or null if there are no candidates
 */
export function pickNext<T extends { id: number }>(
  candidates: T[],
  shown: number[],
  random: () => number = Math.random,
): { pick: T; shown: number[] } | null {
  if (candidates.length === 0) return null

  let unseen = candidates.filter((c) => !shown.includes(c.id))
  let history = shown
  if (unseen.length === 0) {
    // Everything has been shown: start a new round, but not with the current one.
    const current = shown[shown.length - 1]
    unseen = candidates.length > 1 ? candidates.filter((c) => c.id !== current) : candidates
    history = []
  }

  const pick = unseen[Math.floor(random() * unseen.length)]
  return { pick, shown: [...history, pick.id] }
}
