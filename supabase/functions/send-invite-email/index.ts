import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { inviteUrl, inviteeEmail, plantName, inviterName } = await req.json()

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not set')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Succseed <onboarding@resend.dev>',
        to: inviteeEmail,
        subject: `${inviterName} invited you to co-parent ${plantName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#4a7c59">You're invited to Succseed!</h2>
            <p><strong>${inviterName}</strong> wants you to co-parent <strong>${plantName}</strong> on Succseed — a shared plant care journal.</p>
            <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#4a7c59;color:white;border-radius:8px;text-decoration:none;font-weight:600">
              Accept invite
            </a>
            <p style="color:#888;font-size:13px">If you didn't expect this, you can ignore this email.</p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend error: ${err}`)
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
