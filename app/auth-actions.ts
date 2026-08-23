"use server"

import bcrypt from "bcryptjs"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { signIn, auth, unstable_update } from "@/auth"
import { AuthError } from "next-auth"
import { saveAvatarDataUrl, updateUserAvatar } from "@/lib/avatar"

const usernameSchema = z
  .string()
  .min(7, "用户名需长于 6 个字符")
  .max(30, "用户名过长")
  .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字、下划线")

const passwordSchema = z
  .string()
  .min(7, "密码需多于 6 个字符")
  .max(128, "密码过长")
  .refine(
    (val) => {
      const categories = [
        /[A-Z]/.test(val), // uppercase
        /[a-z]/.test(val), // lowercase
        /[0-9]/.test(val), // digit
        /_/.test(val), // underscore
      ].filter(Boolean).length
      return categories >= 2
    },
    { message: "密码需包含大写字母、小写字母、数字、下划线中的至少两类" }
  )

const nicknameSchema = z
  .string()
  .max(30, "昵称过长")
  .regex(/^[^<>]*$/, "昵称包含非法字符")
  .optional()
  .or(z.literal(""))

const avatarDataUrlSchema = z
  .string()
  .regex(/^data:image\/(webp|jpeg|png|jpg);base64,/, "头像数据格式不正确")
  .optional()
  .or(z.literal(""))

const registerSchema = z.object({
  username: usernameSchema,
  nickname: nicknameSchema,
  password: passwordSchema,
  avatarDataUrl: avatarDataUrlSchema,
})

export type AuthFormState =
  | {
      success: false
      errors: Partial<Record<"username" | "nickname" | "password" | "general", string[]>>
      message?: string
    }
  | { success: true; message: string }
  | null

function flattenFieldErrors(
  errors: z.ZodError<{ username: string; nickname?: string; password: string }>
) {
  const flat = errors.flatten().fieldErrors
  return {
    username: flat.username,
    nickname: flat.nickname,
    password: flat.password,
  }
}

export async function registerUser(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    username: formData.get("username")?.toString() ?? "",
    nickname: formData.get("nickname")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    avatarDataUrl: formData.get("avatarDataUrl")?.toString() ?? "",
  }

  const validated = registerSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: flattenFieldErrors(validated.error),
    }
  }

  const existing = await prisma.user.findUnique({
    where: { name: validated.data.username },
  })

  if (existing) {
    return {
      success: false,
      errors: { username: ["用户名已存在"] },
    }
  }

  const hashedPassword = await bcrypt.hash(validated.data.password, 10)

  try {
    const user = await prisma.user.create({
      data: {
        name: validated.data.username,
        nickname: validated.data.nickname || null,
        password: hashedPassword,
        role: "VISITOR",
      },
    })

    if (validated.data.avatarDataUrl) {
      try {
        const url = await saveAvatarDataUrl(validated.data.avatarDataUrl, user.id)
        await prisma.user.update({
          where: { id: user.id },
          data: { image: url },
        })
      } catch {
        // Avatar failure should not block registration.
      }
    }

    return { success: true, message: "注册成功" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "注册失败，请稍后重试",
    }
  }
}

export async function loginUser(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    username: formData.get("username")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  }

  if (!rawData.username || !rawData.password) {
    return {
      success: false,
      errors: { general: ["请输入用户名和密码"] },
    }
  }

  try {
    const result = await signIn("credentials", {
      username: rawData.username,
      password: rawData.password,
      redirect: false,
    })

    if (result?.error) {
      return {
        success: false,
        errors: {},
        message: "用户名或密码错误",
      }
    }

    return { success: true, message: "登录成功" }
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        errors: {},
        message: "用户名或密码错误",
      }
    }
    return {
      success: false,
      errors: {},
      message: "登录失败，请稍后重试",
    }
  }
}

export async function updateUserRole(
  targetUsername: string,
  newRole: "OWNER" | "ADMIN" | "VISITOR"
) {
  try {
    await prisma.user.update({
      where: { name: targetUsername },
      data: { role: newRole },
    })
    return { success: true as const, message: "权限更新成功" }
  } catch {
    return { success: false as const, message: "用户不存在或更新失败" }
  }
}

const updateNicknameSchema = z.object({
  nickname: nicknameSchema,
})

export type ProfileFormState =
  | {
      success: false
      errors: Partial<Record<"nickname" | "general", string[]>>
      message?: string
    }
  | { success: true; message: string }
  | null

export async function updateNickname(
  userId: string,
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const rawData = {
    nickname: formData.get("nickname")?.toString() ?? "",
  }

  const validated = updateNicknameSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: { nickname: validated.error.flatten().fieldErrors.nickname },
    }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { nickname: validated.data.nickname || null },
    })

    // Refresh the JWT session token server-side so the new nickname
    // applies immediately within the current session (no re-login needed).
    await unstable_update({})

    return { success: true, message: "昵称已更新" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "更新失败，请稍后重试",
    }
  }
}

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "请输入旧密码"),
  newPassword: passwordSchema,
})

export type PasswordFormState =
  | {
      success: false
      errors: Partial<Record<"oldPassword" | "newPassword" | "general", string[]>>
      message?: string
    }
  | { success: true; message: string }
  | null

export type AvatarFormState =
  | { success: false; message: string }
  | { success: true; message: string; url: string }
  | null

export async function updateAvatar(
  dataUrl: string
): Promise<AvatarFormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, message: "请先登录" }
  }

  try {
    const url = await updateUserAvatar(session.user.id, dataUrl)
    await unstable_update({})
    return { success: true, message: "头像已更新", url }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "头像更新失败，请稍后重试"
    return { success: false, message }
  }
}

export async function changePassword(
  userId: string,
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const rawData = {
    oldPassword: formData.get("oldPassword")?.toString() ?? "",
    newPassword: formData.get("newPassword")?.toString() ?? "",
  }

  const validated = changePasswordSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.password) {
    return {
      success: false,
      errors: {},
      message: "用户不存在",
    }
  }

  if (user.role === "OWNER") {
    return {
      success: false,
      errors: {},
      message: "站长账号不可修改密码",
    }
  }

  const isOldValid = await bcrypt.compare(
    validated.data.oldPassword,
    user.password
  )

  if (!isOldValid) {
    return {
      success: false,
      errors: { oldPassword: ["旧密码不正确"] },
    }
  }

  const hashedNewPassword = await bcrypt.hash(validated.data.newPassword, 10)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    })
    return { success: true, message: "密码已修改" }
  } catch {
    return {
      success: false,
      errors: {},
      message: "修改失败，请稍后重试",
    }
  }
}
