require("dotenv").config();

const path = require("node:path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const express = require("express");
const { Server } = require("ws");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            "--no-sandbox",
        ],
    },
});

const PORT = process.env.PORT || 3000;

let qrCodeData = "";
let isClientReady = false;

app.get("/", (req, res) => {
    const ipAddress = req.ip;
    res.json({
        ipAddress: ipAddress,
    });
});

client.on("qr", (qr) => {
    qrcode.toDataURL(qr, { small: true }, (err, url) => {
        if (err) {
            console.error("Error generating QR code", err);
            return;
        }
        qrCodeData = url;
        // Send the QR code to all connected WebSocket clients
        wss.clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(JSON.stringify({ type: "qr", data: url }));
            }
        });
    });
});

client.on("ready", () => {
    isClientReady = true;
    console.log("Client is ready!");
    // Notify all connected WebSocket clients that the client is ready
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify({ type: "ready" }));
        }
    });
});

client.on("message", async (message) => {
    try {
        if (message.body === "!ping") {
            console.log(message);
            message.reply("pong");
        }
    } catch (error) {
        console.log(error);
    }
});

app.get("/qr", (req, res) => {
    if (qrCodeData) {
        res.sendFile(path.join(__dirname, "/views/qr.html"));
    } else {
        res.status(500).send("Client is not ready yet");
    }
});

app.post("/send-notifications", async (req, res) => {
    const { message, phone, key } = req.body;

    if (key !== process.env.KEY) {
        console.log(key, process.env.KEY);
        return res.json("Invalid key");
    }

    const formattedMessage = message;

    try {
        const chatId = phone + "@c.us";
        await client.sendMessage(chatId, formattedMessage);
        res.json("Message sent successfully");
    } catch (error) {
        res.json(error);
    }
});

client.initialize();

const server = app.listen(PORT, () => {
    try {
        console.log(`Server running on port ${PORT}`);
    } catch (error) {
        console.log(error);
    }
});

const wss = new Server({ server });

wss.on("connection", (ws) => {
    console.log("New WebSocket connection");
    if (qrCodeData) {
        ws.send(JSON.stringify({ type: "qr", data: qrCodeData }));
    }
    if (isClientReady) {
        ws.send(JSON.stringify({ type: "ready" }));
    }
});
