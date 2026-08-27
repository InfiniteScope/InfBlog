import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { prisma } from "@/lib/prisma"

/** Profile fields kept in the JWT. */
const JWT_PROFILE_FIELDS = {
  nickname: true,
  image: true,
  role: true,
} as const

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
  unstable_update,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({
            username: z.string().min(1),
            password: z.string().min(1),
          })
          .safeParse(credentials)

        if (!parsed.success) return null

        const { username, password } = parsed.data

        const user = await prisma.user.findUnique({
          where: { name: username },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          nickname: user.nickname,
          email: user.email,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    // 锁定跳转主站：任何登录/退出跳转都在主域名内，避免回退到异常 origin（如 localhost）
    redirect: async ({ url }) => {
      const primary = process.env.NEXT_PUBLIC_SITE_URL || "https://infinitescope.site"
      try {
        const parsed = new URL(url, primary)
        if (parsed.origin !== new URL(primary).origin) {
          return primary + (url.startsWith("/") ? url : "/")
        }
        return url
      } catch {
        return primary
      }
    },
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.nickname = user.nickname
        token.role = user.role
        token.image = user.image
      }
      if (trigger === "update") {
        // Database is the source of truth: refresh profile fields on every
        // client-side `update()` call so changes apply within the session.
        if (token.id) {
          try {
            const fresh = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: JWT_PROFILE_FIELDS,
            })
            if (fresh) {
              token.nickname = fresh.nickname ?? undefined
              token.image = fresh.image
              token.role = fresh.role
            }
          } catch {
            // keep the previous values on DB errors
          }
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name as string | undefined
        session.user.nickname = token.nickname as string | undefined
        session.user.role = token.role as "OWNER" | "ADMIN" | "VISITOR"
        session.user.image = token.image as string | null | undefined

        // DB is the source of truth: refresh role/profile on every session
        // read, so admin role changes reflect without re-login.
        if (token.id) {
          try {
            const fresh = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { role: true, nickname: true, image: true },
            })
            if (fresh) {
              session.user.role = fresh.role
              session.user.nickname = fresh.nickname ?? session.user.nickname
              session.user.image = fresh.image ?? session.user.image
            }
          } catch {
            // fall back to token values on DB errors
          }
        }
      }
      return session
    },
  },
})
