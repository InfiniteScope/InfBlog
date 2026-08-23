import "next-auth"

declare module "next-auth" {
  interface User {
    role?: "OWNER" | "ADMIN" | "VISITOR"
    nickname?: string | null
  }

  interface Session {
    user: {
      id: string
      role: "OWNER" | "ADMIN" | "VISITOR"
      name?: string | null
      nickname?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    name?: string
    nickname?: string
    role?: "OWNER" | "ADMIN" | "VISITOR"
    image?: string | null
  }
}
