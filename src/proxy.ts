import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getExpectedAuthToken } from "@/lib/auth"

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. Always allow WhatsApp webhooks to pass through
  if (pathname.startsWith("/api/webhook")) {
    return NextResponse.next()
  }

  // 2. Always allow static Next.js assets, favicons, fonts, images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const masterPassword = (process.env.APP_PASSWORD || "zebra").trim()
  const expectedToken = await getExpectedAuthToken(masterPassword)
  const authToken = req.cookies.get("zebra_auth_token")?.value
  const isAuthenticated = authToken && authToken === expectedToken

  // 3. Handle /login page
  if (pathname === "/login") {
    if (isAuthenticated) {
      // If already logged in, redirect to dashboard
      return NextResponse.redirect(new URL("/", req.url))
    }
    return NextResponse.next()
  }

  // 4. Require authentication for everything else
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Keep backwards-compatible middleware export
export const middleware = proxy

export const config = {
  matcher: [
    "/((?!api/webhook|_next/static|_next/image|favicon.ico).*)",
  ],
}
