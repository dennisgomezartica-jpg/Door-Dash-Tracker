export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const r = await fetch(`${process.env.RAILWAY_API_URL}/insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.API_SECRET_KEY,
    },
    body: JSON.stringify(req.body),
  });

  const data = await r.json();
  return res.status(r.status).json(data);
}
