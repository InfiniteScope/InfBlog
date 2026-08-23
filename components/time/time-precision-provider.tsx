"use client"

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"

export type TimePrecision = "minute" | "second"

interface TimePrecisionContextValue {
  precision: TimePrecision
  setPrecision: (value: TimePrecision) => void
}

const TimePrecisionContext = createContext<TimePrecisionContextValue>({
  precision: "second",
  setPrecision: () => {},
})

export function useTimePrecision() {
  return useContext(TimePrecisionContext)
}

export function TimePrecisionProvider({ children }: { children: ReactNode }) {
  const [precision, setPrecision] = useState<TimePrecision>("second")

  return (
    <TimePrecisionContext.Provider value={{ precision, setPrecision }}>
      {children}
    </TimePrecisionContext.Provider>
  )
}
