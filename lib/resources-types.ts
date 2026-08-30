import type { Resource, User } from "@prisma/client"

export interface ResourceWithAuthor extends Resource {
  author: Pick<User, "nickname" | "name" | "image" | "role"> | null
}
