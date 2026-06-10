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

    // Always use search API first to find the most relevant plant page
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(species + ' plant species')}&format=json&srlimit=3`,
      { headers: { 'User-Agent': 'Succseed/1.0 (plant care app)' } }
    )
    const searchData = await searchRes.json()
    const results = searchData?.query?.search ?? []

    // Pick the first result that looks plant-related
    const plantKeywords = ['plant', 'tree', 'shrub', 'flower', 'maple', 'species', 'cultivar', 'herb', 'fern', 'succulent', 'cactus', 'genus']
    const best = results.find((r: any) =>
      plantKeywords.some(k => r.title.toLowerCase().includes(k) || r.snippet.toLowerCase().includes(k))
    ) ?? results[0]

    if (!best) return new Response(JSON.stringify({ result: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    // Fetch the summary for the best match
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(best.title)}`,
      { headers: { 'User-Agent': 'Succseed/1.0 (plant care app)' } }
    )
    const summary = await summaryRes.json()

    // Only return if it looks like a plant article
    const extract = summary.extract ?? ''
    const isPlant = plantKeywords.some(k => extract.toLowerCase().includes(k))
    if (!isPlant) return new Response(JSON.stringify({ result: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    return new Response(JSON.stringify({
      result: {
        commonName: summary.title ?? null,
        description: extract.length > 300 ? extract.slice(0, 300) + '...' : extract,
        thumbnail: summary.thumbnail?.source ?? null,
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
