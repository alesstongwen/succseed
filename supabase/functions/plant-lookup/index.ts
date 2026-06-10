import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { species } = await req.json()
    if (!species) throw new Error('species is required')

    // Search Wikipedia for the species
    const searchRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(species)}`,
      { headers: { 'User-Agent': 'Succseed/1.0 (plant care app)' } }
    )

    if (!searchRes.ok) {
      // Try search API as fallback
      const fallbackRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(species + ' plant')}&format=json&srlimit=1`,
        { headers: { 'User-Agent': 'Succseed/1.0 (plant care app)' } }
      )
      const fallback = await fallbackRes.json()
      const title = fallback?.query?.search?.[0]?.title
      if (!title) return new Response(JSON.stringify({ result: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const summaryRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { 'User-Agent': 'Succseed/1.0 (plant care app)' } }
      )
      const summary = await summaryRes.json()
      return new Response(JSON.stringify({
        result: {
          commonName: summary.title ?? null,
          description: summary.extract ?? null,
          thumbnail: summary.thumbnail?.source ?? null,
          suggestedDays: null,
          watering: null,
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await searchRes.json()

    return new Response(JSON.stringify({
      result: {
        commonName: data.title ?? null,
        description: data.extract ?? null,
        thumbnail: data.thumbnail?.source ?? null,
        suggestedDays: null,
        watering: null,
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
