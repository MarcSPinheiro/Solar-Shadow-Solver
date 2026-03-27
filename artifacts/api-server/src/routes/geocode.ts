import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/geocode", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.trim().length < 2) {
    res.status(400).json({ error: "Query too short" });
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q.trim())}&countrycodes=pt&format=json&limit=6&addressdetails=0`;
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
  } catch (err) {
    res.status(500).json({ error: "Failed to reach geocoding service" });
  }
});

export default router;
