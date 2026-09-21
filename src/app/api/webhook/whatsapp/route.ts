import { NextRequest, NextResponse } from "next/server"
import { processWhatsAppMessageAction } from "@/actions/finance-actions"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle Evolution API webhook format or Meta Cloud API format
    let senderPhone = ""
    let messageText = ""

    if (body?.data?.key?.remoteJid) {
      // Evolution API format
      senderPhone = body.data.key.remoteJid.replace("@s.whatsapp.net", "")
      messageText =
        body.data.message?.conversation ||
        body.data.message?.extendedTextMessage?.text ||
        ""
    } else if (body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      // Meta Cloud API format
      const msg = body.entry[0].changes[0].value.messages[0]
      senderPhone = msg.from
      messageText = msg.text?.body || ""
    } else if (body?.sender && body?.message) {
      // Generic / Direct format
      senderPhone = body.sender
      messageText = body.message
    }

    if (!messageText) {
      return NextResponse.json({ ok: true, note: "No text message detected" })
    }

    const result = await processWhatsAppMessageAction(senderPhone, messageText)

    return NextResponse.json({
      ok: true,
      result,
    })
  } catch (error: any) {
    console.error("Error processing WhatsApp webhook:", error)
    return NextResponse.json(
      { ok: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// Meta Webhook Verification (GET)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === (process.env.WHATSAPP_VERIFY_TOKEN || "zebra_verify_token")) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ status: "WhatsApp Webhook Active" })
}
