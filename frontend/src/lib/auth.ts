const ENDPOINT = '/query'

export async function graphql(query, variables = {}) {
  const token = localStorage.getItem('doran_todo_token')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await res.json()
  if (json.errors?.length && !json.data) {
    throw new Error(json.errors[0].message)
  }
  return json.data
}

export function setToken(token) {
  localStorage.setItem('doran_todo_token', token)
}

export function clearToken() {
  localStorage.removeItem('doran_todo_token')
  localStorage.removeItem('doran_todo_user')
}

export function getToken() {
  return localStorage.getItem('doran_todo_token')
}

export function saveUser(user) {
  localStorage.setItem('doran_todo_user', JSON.stringify(user))
}

export function getUser() {
  const raw = localStorage.getItem('doran_todo_user')
  return raw ? JSON.parse(raw) : null
}

export function isAuthenticated() {
  return !!getToken()
}
