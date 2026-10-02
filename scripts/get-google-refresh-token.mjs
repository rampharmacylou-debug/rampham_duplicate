import { google } from "googleapis";
import http from "http";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET");
  process.exit(1);
}

// Temporary local server used only to receive Google's OAuth response.
const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  REDIRECT_URI,
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");

    if (!code) {
      const error = url.searchParams.get("error");

      res.writeHead(400, {
        "Content-Type": "text/plain",
      });

      res.end(`Authorization failed: ${error ?? "unknown error"}`);
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    console.log("\n========================================");
    console.log("SUCCESS!");
    console.log("========================================\n");

    console.log("Refresh token:");
    console.log(tokens.refresh_token);

    console.log("\n========================================");
    console.log("Add this to your .env.local:");
    console.log("========================================\n");

    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);

    res.writeHead(200, {
      "Content-Type": "text/html",
    });

    res.end(`
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h1>Google Drive authorization successful!</h1>
          <p>You can close this browser window.</p>
          <p>Return to your terminal to see your refresh token.</p>
        </body>
      </html>
    `);

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error("\nFailed to get Google token:");
    console.error(error);

    res.writeHead(500, {
      "Content-Type": "text/plain",
    });

    res.end("Failed to complete Google authorization.");
  }
});

server.listen(PORT, () => {
  console.log("\n========================================");
  console.log("Google Drive Authorization");
  console.log("========================================\n");

  console.log("Open this URL in your browser:\n");
  console.log(authUrl);

  console.log("\n========================================");
  console.log("Waiting for Google authorization...");
  console.log("========================================\n");
});
