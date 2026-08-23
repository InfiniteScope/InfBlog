"use client"

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarCollapseContextValue {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (value: boolean) => void
}

const SidebarCollapseContext =
  createContext<SidebarCollapseContextValue>({
    collapsed: false,
    toggle: () => {},
    setCollapsed: () => {},
  })

export function useSidebarCollapse() {
  return useContext(SidebarCollapseContext)
}

interface SidebarCollapseProviderProps {
  sidebar: ReactNode
  children: ReactNode
}

export function SidebarCollapseProvider({
  sidebar,
  children,
}: SidebarCollapseProviderProps) {
  const [collapsed, setCollapsed] = useState(false)
  const toggle = () => setCollapsed((v) => !v)

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggle, setCollapsed }}>
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 hidden border-r border-border/40 bg-background/95 backdrop-blur-xl transition-all duration-300 lg:block",
            collapsed ? "w-[80px]" : "w-[280px]"
          )}
        >
          <div className="relative h-full">
            {sidebar}

            {/* Collapse toggle handle on the right edge */}
            <div className="absolute -right-3 top-1/2 z-50 -translate-y-1/2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-6 rounded-full border-border/60 bg-background/90 p-0 shadow-sm backdrop-blur"
                onClick={toggle}
                aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-3.5 w-3.5" />
                ) : (
                  <PanelLeftClose className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div
          className={cn(
            "flex w-full flex-col transition-all duration-300",
            collapsed ? "lg:pl-[80px]" : "lg:pl-[280px]"
          )}
        >
          {children}
        </div>
      </div>
    </SidebarCollapseContext.Provider>
  )
}
