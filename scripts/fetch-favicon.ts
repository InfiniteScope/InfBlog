/**
 * Resolve a website's favicon.
 *
 * Usage:
 *   pnpm tsx scripts/fetch-favicon.ts https://www.7-zip.org        # prints external URL
 *   pnpm tsx scripts/fetch-favicon.ts https://www.7-zip.org --save # downloads & stores locally
 *
 * External URL mode costs the server nothing (no file storage);
 * --save persists a copy into public/uploads/resource-icons/.
 */
import {
  resolveFaviconUrl,
  fetchAndSaveFavicon,
} from "../lib/favicon"

async function main() {
  const args = process.argv.slice(2)
  const input = args[0]
  const save = args.includes("--save")

  if (!input) {
    console.error("用法: pnpm tsx scripts/fetch-favicon.ts <官网链接> [--save]")
    process.exit(1)
  }

  try {
    const url = save
      ? await fetchAndSaveFavicon(input)
      : await resolveFaviconUrl(input)
    console.log(`✓ 图标: ${url}`)
    if (!save) {
      console.log("  （外链模式，服务器零存储；--save 可下载到本地）")
    }
  } catch (err) {
    console.error(`✗ 抓取失败: ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("脚本执行失败:", err)
  process.exit(1)
})
