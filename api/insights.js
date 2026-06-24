export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { sessions } = req.body || {};
  if (!Array.isArray(sessions) || sessions.length === 0)
    return res.status(400).json({ error: "sessions must be a non-empty array" });
  if (sessions.length > 200)
    return res.status(400).json({ error: "Too many sessions (max 200)" });

  const r = await fetch(`${process.env.RAILWAY_API_URL}/insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_SECRET_KEY,
    },
    body: JSON.stringify({ sessions }),
  });

  const data = await r.json();
  return res.status(r.status).json(data);
}
