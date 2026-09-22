import { NextRequest, NextResponse } from "next/server"
import { processWhatsAppMessageAction } from "@/actions/finance-actions"
import { isHelpCommand } from "@/lib/help-content"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle Evolution API webhook format or Meta Cloud API format
    let senderPhone = ""
    let messageText = ""

    if (body?.data?.key?.remoteJid) {
      // Evolution API format
      const rawJid = body.data.key.remoteJid
      const fromMe = body.data.key.fromMe

      // 1. Group Filter: Ignore all group chats immediately
      if (rawJid.includes("@g.us") || body?.data?.key?.participant) {
        return NextResponse.json({
          ok: true,
          ignored: true,
          note: "Ignored: Group message",
        })
      }

      // 2. Self-Chat Filter: Only process messages in the private chat with oneself
      // In WhatsApp, chatting with yourself has remoteJid = "<your_phone>@s.whatsapp.net"
      const remotePhone = rawJid.replace("@s.whatsapp.net", "").replace(/\D/g, "")
      const authorizedPhone = (process.env.AUTHORIZED_PHONE || "5511932199076").replace(/\D/g, "")

      const isSelfChat =
        remotePhone &&
        authorizedPhone &&
        (remotePhone.includes(authorizedPhone) || authorizedPhone.includes(remotePhone))

      if (!isSelfChat) {
        return NextResponse.json({
          ok: true,
          ignored: true,
          note: "Ignored: Message from external conversation",
        })
      }

      // 3. Must be sent by the user (fromMe: true)
      if (!fromMe) {
        return NextResponse.json({
          ok: true,
          ignored: true,
          note: "Ignored: Incoming message not sent by owner",
        })
      }

      senderPhone = remotePhone
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
      messageText.startsWith("🚫") ||
      messageText.startsWith("📊") ||
      messageText.startsWith("🔴") ||
      messageText.startsWith("🚨")
    ) {
      return NextResponse.json({ ok: true, note: "Ignoring bot response message" })
    }

    // Trigger Filter: Only parse messages that start with an intentional trigger
    // Examples: "# almoço 45", "$ uber 20", "! mercado 150", "z almoço 45", "zebra mercado 150"
    const trimmed = messageText.trim()
    const customTrigger = process.env.WHATSAPP_TRIGGER?.trim().toLowerCase()

    let isTriggered = false
    let cleanMessage = trimmed

    // Check if user is asking for help directly (e.g. "ajuda", "help", "comandos")
    if (isHelpCommand(trimmed)) {
      isTriggered = true
      cleanMessage = trimmed
    } else if (customTrigger && trimmed.toLowerCase().startsWith(customTrigger)) {
      isTriggered = true
      cleanMessage = trimmed.slice(customTrigger.length).trim()
    } else {
      // Check for symbol triggers (#, $, !)
      const symbolMatch = trimmed.match(/^([#$!])\s*([\s\S]*)$/)
      if (symbolMatch) {
        isTriggered = true
        cleanMessage = symbolMatch[2].trim()
      } else {
        // Check for keyword triggers (z, zebra)
        const wordMatch = trimmed.match(/^(zebra|z)[:\s]\s*([\s\S]*)$/i)
        if (wordMatch) {
          isTriggered = true
          cleanMessage = wordMatch[2].trim()
        }
      }
    }

    // If the message does not have an intentional trigger, ignore silently
    // (Ensures personal notes, links, and reminders sent to self are never parsed or stored)
    if (!isTriggered) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        note: "Non-financial message ignored (no trigger prefix detected)",
      })
    }

    if (!cleanMessage) {
      return NextResponse.json({ ok: true, note: "Empty message body after trigger" })
    }

    const result = await processWhatsAppMessageAction(senderPhone, cleanMessage)

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
