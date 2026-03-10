const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

const uri = "mongodb+srv://dogtemple:0840266176Ok@cluster0.nkbxzow.mongodb.net/qr_system";

const client = new MongoClient(uri);

let db;

// เชื่อม MongoDB
async function start() {
  try {
    await client.connect();
    db = client.db("qr_system");
    console.log("MongoDB connected");
  } catch (error) {
    console.error(error);
  }
}

start();


// API สร้าง QR
app.post("/create", async (req, res) => {

  const { url, days } = req.body;

  const id = Math.random().toString(36).substring(2,8);

  const expire = new Date();
  expire.setDate(expire.getDate() + Number(days));

  await db.collection("qr_links").insertOne({
    _id: id,
    url: url,
    expireAt: expire,
    createdAt: new Date()
  });

  res.json({
    qrUrl: `http://localhost:3000/r/${id}`
  });

});


// redirect
app.get("/r/:id", async (req, res) => {

  const data = await db.collection("qr_links").findOne({
    _id: req.params.id
  });

  if (!data) {
    return res.send("QR ไม่ถูกต้อง");
  }

  if (new Date() > new Date(data.expireAt)) {
    return res.send("QR Code หมดอายุแล้ว");
  }

  res.redirect(data.url);

});


// เปิด server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running");
});