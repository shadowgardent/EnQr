export default async function handler(req, res) {

  const { id } = req.query;

  if (!id) {
    res.status(400).send("Missing id");
    return;
  }

  const API =
  "https://script.google.com/macros/s/AKfycbwnV5k-Wqmn8KxnrbFw10wzFm1y1PrIEad9t-W5o2ZDxGCzwZGSG2Sb0QKVgW96zi9cEQ/exec"

  const response = await fetch(API);
  const data = await response.json();

  if (data.status === "ok") {

    res.writeHead(302,{
      Location: data.url
    });

    res.end();
    return;

  }

  if (data.status === "expired") {

    res.status(200).send("QR Code หมดอายุแล้ว");
    return;

  }

  res.status(404).send("QR ไม่พบ");

}