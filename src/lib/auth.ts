export async function getExpectedAuthToken(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + "_zebra_auth_secret_salt")
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
