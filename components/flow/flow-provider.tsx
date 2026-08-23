"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

import { useBackground, type BackgroundType } from "@/components/theme/background-provider"
import { useSidebarCollapse } from "@/components/layout/sidebar-collapse-provider"
import { useTimePrecision, type TimePrecision } from "@/components/time/time-precision-provider"
import { saveUserPreferences, type UserPreferencesInput } from "@/app/preferences/actions"

interface FlowSnapshot {
  background: BackgroundType
  timePrecision: TimePrecision
  sidebarCollapsed: boolean
}

interface FlowContextValue {
  active: boolean
  hydrated: boolean
  toggle: () => void
}

const FlowContext = createContext<FlowContextValue>({
  active: false,
  hydrated: false,
  toggle: () => {},
})

const FLOW_KEY = "infblog-flow-active"
const SNAPSHOT_KEY = "infblog-flow-snapshot"

export function useFlow() {
  return useContext(FlowContext)
}

function isBackgroundType(value: string): value is BackgroundType {
  return ["clean", "particles", "blobs"].includes(value)
}

function isTimePrecision(value: string): value is TimePrecision {
  return ["minute", "second"].includes(value)
}

export function FlowProvider({ children }: { children: ReactNode }) {
  const { background, setBackground } = useBackground()
  const { setPrecision } = useTimePrecision()
  const { collapsed, setCollapsed } = useSidebarCollapse()
  const pathname = usePathname()
  const isHome = pathname === "/"

  const [active, setActive] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const applyFlowState = useCallback(() => {
    setBackground("clean")
    setPrecision("minute")
    if (isHome) {
      setCollapsed(true)
    }
  }, [isHome, setBackground, setCollapsed, setPrecision])

  useEffect(() => {
    const storedActive = typeof window !== "undefined" && localStorage.getItem(FLOW_KEY) === "1"
    if (storedActive) {
      applyFlowState()
      setActive(true)
    }
    setHydrated(true)
  }, [applyFlowState])

  useEffect(() => {
    document.documentElement.classList.toggle("flow", active)
  }, [active])

  useEffect(() => {
    if (active && isHome) {
      setCollapsed(true)
    }
  }, [active, isHome, setCollapsed])

  const enterFlow = useCallback(() => {
    const snapshot: FlowSnapshot = {
      background,
      timePrecision: "second", // default normal precision
      sidebarCollapsed: collapsed,
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
      localStorage.setItem(FLOW_KEY, "1")
    }

    void saveUserPreferences({
      background: snapshot.background,
      timePrecision: snapshot.timePrecision,
      sidebarCollapsed: snapshot.sidebarCollapsed,
    })

    applyFlowState()
    setActive(true)
  }, [background, collapsed, applyFlowState])

  const exitFlow = useCallback(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(SNAPSHOT_KEY)
      if (raw) {
        try {
          const snapshot = JSON.parse(raw) as Partial<FlowSnapshot>
          if (snapshot.background && isBackgroundType(snapshot.background)) {
            setBackground(snapshot.background)
          }
          if (snapshot.timePrecision && isTimePrecision(snapshot.timePrecision)) {
            setPrecision(snapshot.timePrecision)
          }
          if (typeof snapshot.sidebarCollapsed === "boolean") {
            setCollapsed(snapshot.sidebarCollapsed)
          }
        } catch {
          // ignore malformed snapshot
        }
      }
      localStorage.removeItem(FLOW_KEY)
    }
    setActive(false)
  }, [setBackground, setCollapsed, setPrecision])

  const toggle = useCallback(() => {
    if (active) {
      exitFlow()
    } else {
      enterFlow()
    }
  }, [active, enterFlow, exitFlow])

  return (
    <FlowContext.Provider value={{ active, hydrated, toggle }}>
      {children}
    </FlowContext.Provider>
  )
}
