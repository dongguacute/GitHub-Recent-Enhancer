/** 仅展示最近 N 天内有更新的 open issue/PR（超过则视为「一个月没动」不显示） */
export const RECENT_ACTIVITY_MAX_DAYS = 30

function isoDateUtcDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** 根据 GitHub 的 updated_at：最后更新在窗口内才展示 */
export function isWithinRecentActivityWindow(updatedAt: string | undefined): boolean {
  if (!updatedAt) return false
  const t = new Date(updatedAt).getTime()
  if (Number.isNaN(t)) return false
  const maxAgeMs = RECENT_ACTIVITY_MAX_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - t <= maxAgeMs
}

export async function getRecent(token: string, username: string) {
  const since = isoDateUtcDaysAgo(RECENT_ACTIVITY_MAX_DAYS)
  const q = `involves:${username} is:open updated:>${since}`
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  const data = await response.json()
  return data
}
