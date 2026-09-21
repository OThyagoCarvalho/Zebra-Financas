import fs from "fs"
import path from "path"

const target = process.argv[2] // "postgres" | "sqlite"

const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma")
if (!fs.existsSync(schemaPath)) {
  console.error("schema.prisma not found at", schemaPath)
  process.exit(1)
}

let content = fs.readFileSync(schemaPath, "utf-8")

if (target === "postgres") {
  content = content.replace(
    /datasource\s+db\s*\{[\s\S]*?\}/,
    `datasource db {\n  provider  = "postgresql"\n  url       = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")\n}`
  )
  fs.writeFileSync(schemaPath, content, "utf-8")
  console.log("✅ Prisma schema configured for PostgreSQL (Vercel / Neon / Supabase)!")
} else if (target === "sqlite") {
  content = content.replace(
    /datasource\s+db\s*\{[\s\S]*?\}/,
    `datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}`
  )
  fs.writeFileSync(schemaPath, content, "utf-8")
  console.log("✅ Prisma schema configured for local SQLite!")
} else {
  console.log("Usage: node scripts/use-db.mjs [postgres|sqlite]")
}
