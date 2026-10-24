require("dotenv").config();

const path = require("path");
const dns = require("dns");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const Participant = require("./models/Participant");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/participants", async (req, res) => {
  try {
    const participants = await Participant.find().sort({ score: -1 });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/participants", async (req, res) => {
  try {
    const participant = await Participant.create(req.body);
    res.status(201).json(participant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.patch("/api/participants/:id/score", async (req, res) => {
  try {
    const participant = await Participant.findByIdAndUpdate(
      req.params.id,
      { $inc: { score: 10 } },
      { new: true }
    );

    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    res.json(participant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete("/api/participants/:id", async (req, res) => {
  try {
    const participant = await Participant.findByIdAndDelete(req.params.id);

    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    res.json({ message: "Participant removed" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

async function connectToMongo() {
  try {
    await mongoose.connect(MONGO_URI);
  } catch (err) {
    const isSrvDnsFailure =
      MONGO_URI &&
      MONGO_URI.startsWith("mongodb+srv://") &&
      /querySrv|ECONNREFUSED/i.test(err.message);

    if (!isSrvDnsFailure) {
      throw err;
    }

    console.log("SRV lookup failed; retrying with public DNS servers...");
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    await mongoose.connect(MONGO_URI);
  }
}

async function startServer() {
  try {
    await connectToMongo();
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }
}

startServer();
