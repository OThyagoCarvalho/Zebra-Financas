"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getExpectedAuthToken } from "@/lib/auth"

export async function loginAction(password: string) {
  const isDev = process.env.NODE_ENV !== "production" || process.env.BYPASS_AUTH === "true"
  const masterPassword = (process.env.APP_PASSWORD || "zebra").trim()

  if (!isDev && (!password || password.trim() !== masterPassword)) {
    return { success: false, error: "Senha incorreta. Tente novamente." }
  }

  const expectedToken = await getExpectedAuthToken(masterPassword)
  const cookieStore = await cookies()

  // Set long-lived secure cookie (60 days)
  cookieStore.set("zebra_auth_token", expectedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  })

  return { success: true }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete("zebra_auth_token")
  redirect("/login")
}
