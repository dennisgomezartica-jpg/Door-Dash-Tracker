export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const r = await fetch(`${process.env.RAILWAY_API_URL}/events`, {
    headers: { "X-API-Key": process.env.API_SECRET_KEY },
  });

  const data = await r.json();
  return res.status(r.status).json(data);
}
