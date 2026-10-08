export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const res = await fetch(`/api${path}`, {
    headers: isFormData ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  }
  return res.json() as Promise<T>
}
