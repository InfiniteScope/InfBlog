"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type BackgroundType = "clean" | "particles" | "blobs"

interface BackgroundContextValue {
  background: BackgroundType
  setBackground: (value: BackgroundType) => void
}

const BackgroundContext = createContext<BackgroundContextValue>({
  background: "clean",
  setBackground: () => {},
})

const STORAGE_KEY = "infblog-background"

export function useBackground() {
  return useContext(BackgroundContext)
}

interface BackgroundProviderProps {
  children: ReactNode
  defaultBackground?: BackgroundType
}

export function BackgroundProvider({
  children,
  defaultBackground = "clean",
}: BackgroundProviderProps) {
  const [background, setBackgroundState] =
    useState<BackgroundType>(defaultBackground)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as BackgroundType | null
    if (stored && ["clean", "particles", "blobs"].includes(stored)) {
      setBackgroundState(stored)
    }
    setHydrated(true)
  }, [])

  const setBackground = (value: BackgroundType) => {
    setBackgroundState(value)
    localStorage.setItem(STORAGE_KEY, value)
  }

  return (
    <BackgroundContext.Provider value={{ background, setBackground }}>
      {children}
      {!hydrated && null}
    </BackgroundContext.Provider>
  )
}
