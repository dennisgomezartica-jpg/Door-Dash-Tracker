export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Invalid date" });

  const r = await fetch(`${process.env.RAILWAY_API_URL}/events/by-date?date=${date}`, {
    headers: { "X-API-Key": process.env.API_SECRET_KEY },
  });

  const data = await r.json();
  return res.status(r.status).json(data);
}
