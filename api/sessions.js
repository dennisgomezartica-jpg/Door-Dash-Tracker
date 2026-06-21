export default async function handler(req, res) {
  const url = `${process.env.RAILWAY_API_URL}/sessions`;
  const headers = {
    "X-API-Key": process.env.API_SECRET_KEY,
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    const r = await fetch(url, { headers });
    const data = await r.json();
    return res.status(r.status).json(data);
  }

  if (req.method === "POST") {
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(req.body) });
    const data = await r.json();
    return res.status(r.status).json(data);
  }

  res.status(405).end();
}
