import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { SITE_SERVER_ACCOUNT } from "./http";

import "./firebase";

setGlobalOptions({ region: "us-central1", maxInstances: 5 });

export const status = onRequest({ invoker: [SITE_SERVER_ACCOUNT] }, (request, response) => {
  response.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: "beatrix-backend",
    version: "1.0.0",
  });
});

// Each API is its own function, private to the Next.js server (IAM), deployed with
// `firebase deploy --only functions`.
export { getProfile } from "./profile";
export { adminListFiles, adminGetFile, adminSaveFile } from "./admin";
export { sessionCreate, sessionVerify } from "./session";
export { adminListUsers, adminSetUser } from "./users";
