"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export interface UserPreferencesInput {
  background: string
  timePrecision: string
  sidebarCollapsed: boolean
}

export async function saveUserPreferences(input: UserPreferencesInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const }
  }

  await prisma.userPreference.upsert({
    where: { userId: session.user.id },
    update: {
      background: input.background,
      timePrecision: input.timePrecision,
      sidebarCollapsed: input.sidebarCollapsed,
    },
    create: {
      userId: session.user.id,
      background: input.background,
      timePrecision: input.timePrecision,
      sidebarCollapsed: input.sidebarCollapsed,
    },
  })

  return { success: true as const }
}
