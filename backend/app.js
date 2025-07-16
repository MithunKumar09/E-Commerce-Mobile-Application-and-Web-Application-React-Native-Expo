//backend/app.js
const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const ENV = require("./Config/ENV");
const connectDb = require("../backend/Config/connection");
const adminRoute = require("./Routes/adminRoutes");
const userRoute = require("./Routes/userRoutes");
const voucherRoute = require("./Routes/voucherRoutes");
const bidRoute = require("./Routes/bidRoutes");
const paymentRoute = require("./Routes/paymentRoutes");
const salesmanRoute = require("./Routes/salesmanRouter");
const chatbotRoutes = require("./Routes/chatbotRoutes");
const prepaidRouter = require("./Routes/PrePaidRouter");
require("../backend/jobs/winnerSelection");
const recommendationScheduler = require("./recommendationScheduler");
const segmentRouter = require('./Routes/segment');
const WebSocket = require("ws");

const app = express();
// Raw body parser for Stripe Webhook BEFORE express.json()
app.post('/api/webhook-wallet', express.raw({ type: 'application/json' }), paymentRoute);
app.use('/api/webhook-order', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use((req, res, next) => {
  console.log(`[APP LOG] Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});
app.use("/api/admin",adminRoute);
app.use("/api/user",userRoute);
app.use("/api/voucher",voucherRoute);
app.use("/api/bid",bidRoute);
app.use("/api/",paymentRoute);
app.use("/api/",prepaidRouter);
app.use("/api/salesman",salesmanRoute);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api', segmentRouter);
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

// Initialize recommendation scheduler
recommendationScheduler.generateRecommendations();
console.log("Recommendation scheduler initialized.");

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });
let clients = {};

wss.on("connection", (ws, req) => {
  console.log(`Incoming request URL: ${req.url}`);
  // Dynamically handle userId depending on the API route (cart or wishlist)
  const urlParts = req.url.split("/");
  let userId;

  if (urlParts[3] === "cart") {
    userId = urlParts[4]; // cart API userId is at position 4
  } else if (urlParts[2] === "wishlist") {
    userId = urlParts[3]; // wishlist API userId is at position 3
  }

  if (!userId) {
    console.log("Invalid API route");
    return;
  }

  console.log(`WebSocket connection established for userId: ${userId}`);
  clients[userId] = ws;

  // Notify client if cart is updated
  ws.on("message", (message) => {
    console.log(`Received message from userId ${userId}: ${message}`);
  });

  ws.on("close", () => {
    console.log(`Client disconnected for userId: ${userId}`);
    delete clients[userId];
  });
});

// Emit real-time product updates
const sendProductUpdate = (product) => {
  wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "productUpdated", product }));
      }
  });
};

const sendVoucherUpdate = (vouchers) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "voucherUpdated", vouchers }));
    }
  });
};

// Upgrade HTTP server to WebSocket server
const server = app.listen(ENV.PORT || 3000, () => {
  connectDb();
  console.log(`Server is running at port ${ENV.PORT || 3000}`);
});

// Add the WebSocket upgrade handling to the HTTP server
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

app.set("wss", wss);
app.set("clients", clients);
app.set("sendProductUpdate", sendProductUpdate);
app.set("sendVoucherUpdate", sendVoucherUpdate);