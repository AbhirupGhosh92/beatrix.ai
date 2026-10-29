import { onRequest } from "firebase-functions/v2/https";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The only identity allowed to invoke any function: the Firebase App Hosting service account that
 * runs the Next.js server. Cloud Run IAM rejects every other caller (browsers, anonymous users,
 * other accounts) before function code runs, so these endpoints are reachable only by the server,
 * with a Google-signed ID token.
 */
export const SITE_SERVER_ACCOUNT = `firebase-app-hosting-compute@${
  process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT
}.iam.gserviceaccount.com`;

type Body = Record<string, unknown>;

/** A private JSON endpoint: POST only, `{...}` in, JSON out, errors as `{error: {message}}`. */
export function privateEndpoint(handler: (body: Body) => Promise<unknown>) {
  return onRequest({ invoker: [SITE_SERVER_ACCOUNT] }, async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "POST only." } });
      return;
    }
    try {
      const body: Body = typeof req.body === "object" && req.body !== null ? req.body : {};
      res.status(200).json(await handler(body));
    } catch (err) {
      if (err instanceof ApiError) {
        res.status(err.status).json({ error: { message: err.message } });
      } else {
        console.error(err);
        res.status(500).json({ error: { message: "Internal error." } });
      }
    }
  });
}
