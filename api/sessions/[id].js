export default async function handler(req, res) {
  const { id } = req.query;
  const url = `${process.env.RAILWAY_API_URL}/sessions/${id}`;
  const headers = {
    "X-API-Key": process.env.API_SECRET_KEY,
    "Content-Type": "application/json",
  };

  if (req.method === "DELETE") {
    const r = await fetch(url, { method: "DELETE", headers });
    return res.status(r.status).end();
  }

  if (req.method === "PUT") {
    const r = await fetch(url, { method: "PUT", headers, body: JSON.stringify(req.body) });
    const data = await r.json();
    return res.status(r.status).json(data);
  }

  res.status(405).end();
}
