import { onRequest } from "firebase-functions/v2/https";
import * as initializeApp from "firebase-admin/app";

initializeApp.initializeApp();

export const status = onRequest((request, response) => {
  response.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "beatrix-backend",
    version: "1.0.0",
  });
});
