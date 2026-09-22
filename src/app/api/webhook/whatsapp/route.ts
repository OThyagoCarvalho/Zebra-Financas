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

    // Guard: ignore messages sent by the bot itself to prevent infinite response loops
    if (
      messageText.startsWith("🦓") ||
      messageText.startsWith("✅") ||
      messageText.startsWith("🚫")
    ) {
      return NextResponse.json({ ok: true, note: "Ignoring bot response message" })
    }

    const result = await processWhatsAppMessageAction(senderPhone, messageText)

    // Send automatic reply back to WhatsApp via Evolution API if configured
    if (
      process.env.EVOLUTION_API_URL &&
      process.env.EVOLUTION_API_KEY &&
      result.replyMessage
    ) {
      const instance = process.env.EVOLUTION_INSTANCE_NAME || "zebra"
      const cleanPhone = senderPhone.replace(/\D/g, "")
      try {
        const evoUrl = process.env.EVOLUTION_API_URL.replace(/\/$/, "")
        await fetch(`${evoUrl}/message/sendText/${instance}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: result.replyMessage,
            textMessage: {
              text: result.replyMessage,
            },
          }),
        })
      } catch (evoError) {
        console.error("Erro ao enviar resposta via Evolution API:", evoError)
      }
    }

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
