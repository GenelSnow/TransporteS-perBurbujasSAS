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
    const body = await req.json()
    const { endpoint, keys } = body

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: "No auth" }, { status: 401 })
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
        {
            user_id: user.id,
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
        },
        { onConflict: "user_id,endpoint" }
    )

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}