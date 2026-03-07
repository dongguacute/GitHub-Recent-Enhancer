export async function getRecent(token: string, username: string) {
  const url = `https://api.github.com/search/issues?q=involves:${username}+is:open&sort=updated&order=desc`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  const data = await response.json()
  return data
}
