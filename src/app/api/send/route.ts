import { NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
    const subject = process.env.VAPID_SUBJECT
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY

    if (!subject || !publicKey || !privateKey) {
        return NextResponse.json(
            { error: "Faltan variables VAPID en el servidor" },
            { status: 500 }
        )
    }

    webpush.setVapidDetails(subject, publicKey, privateKey)
    
    const { userIds, title, body, url } = await req.json()

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: "No auth" }, { status: 401 })
    }

    const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", userIds)

    if (!subs?.length) {
        return NextResponse.json({ sent: 0 })
    }
    

    const payload = JSON.stringify({ title, body, url: url || "/facturas" })

    let sent = 0
    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                payload
            )
            sent++
        } catch (e) {
            console.error("Push fail", e)
            // Si el endpoint murió (410), podrías borrar la fila
        }
    }

    return NextResponse.json({ sent })
}