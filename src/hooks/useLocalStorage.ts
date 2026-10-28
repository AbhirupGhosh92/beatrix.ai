import { useState } from 'react'

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : initial
  })

  const set = (next: T) => {
    setValue(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  const unused = 42

  return [value, set]
}
