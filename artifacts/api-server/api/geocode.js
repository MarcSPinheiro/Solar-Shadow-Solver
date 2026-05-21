/** @type {import('@vercel/node').VercelRequest} */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const q = req.query.q;
  if (!q || String(q).trim().length < 2) {
    res.status(400).json({ error: "Query too short" });
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(String(q).trim())}&countrycodes=pt&format=json&limit=6&addressdetails=0`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "FotoCalc/1.0 (Pinheiro Instalações Eléctricas; pinheiro.iec@gmail.com)",
        "Accept-Language": "pt-PT,pt;q=0.9",
        "Accept": "application/json",
      },
    });
    if (!response.ok) {
      res.status(502).json({ error: "Geocoding service error", status: response.status });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to reach geocoding service" });
  }
}
