// Collision-proof id generator. Avoids a plain incrementing counter, which
// resets to 0 on every Vite HMR reload and can then collide with ids already
// present in still-mounted state (two rows silently become "the same row").
export function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
