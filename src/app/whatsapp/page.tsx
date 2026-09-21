import { getWhatsAppConfigAction, getWhatsAppLogsAction } from "@/actions/finance-actions"
import { WhatsAppHub } from "@/components/whatsapp/whatsapp-hub"

export const dynamic = "force-dynamic"

export default async function WhatsAppPage() {
  const config = await getWhatsAppConfigAction()
  const logs = await getWhatsAppLogsAction()

  return <WhatsAppHub initialConfig={config} initialLogs={logs} />
}
