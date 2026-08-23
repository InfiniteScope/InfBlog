import { getPostBySlug, getAllPosts } from "./lib/mdx.ts"

const posts = await getAllPosts()
console.log("posts:", posts.map((p) => p.slug))

for (const slug of posts.map((p) => p.slug)) {
  try {
    const post = await getPostBySlug(slug)
    console.log("OK", slug, "->", post.title)
  } catch (err) {
    console.log("ERR", slug, err.message)
  }
}

// Try encoded
const encoded = encodeURIComponent("这是一篇测试文章")
console.log("encoded:", encoded)
try {
  const post = await getPostBySlug(encoded)
  console.log("OK encoded ->", post.title)
} catch (err) {
  console.log("ERR encoded", err.message)
}
