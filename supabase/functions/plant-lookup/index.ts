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

    const apiKey = Deno.env.get('PERENUAL_API_KEY')
    if (!apiKey) throw new Error('PERENUAL_API_KEY not set')

    const res = await fetch(
      `https://perenual.com/api/species-list?key=${apiKey}&q=${encodeURIComponent(species)}&page=1`,
    )
    if (!res.ok) throw new Error('Perenual API error')

    const json = await res.json()
    const plant = json.data?.[0]
    if (!plant) return new Response(JSON.stringify({ result: null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Map Perenual watering frequency to days
    const wateringMap: Record<string, number> = {
      'frequent': 2,
      'average': 7,
      'minimum': 14,
      'none': 30,
    }
    const wateringRaw = (plant.watering ?? '').toLowerCase()
    const suggestedDays = wateringMap[wateringRaw] ?? null

    return new Response(JSON.stringify({
      result: {
        commonName: plant.common_name ?? null,
        description: plant.description ?? null,
        watering: plant.watering ?? null,
        suggestedDays,
        thumbnail: plant.default_image?.thumbnail ?? null,
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
