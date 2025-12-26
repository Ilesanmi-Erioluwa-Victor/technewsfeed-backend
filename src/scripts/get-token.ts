import { google } from "googleapis";
import readline from "readline";
import * as dotenv from "dotenv";
import path from "path";

// ✅ CRITICAL: Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ✅ Validate environment variables BEFORE creating OAuth2 client
console.log("🔍 Environment Check:");
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "✓ Loaded" : "✗ MISSING"
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "✓ Loaded" : "✗ MISSING"
);

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("\n❌ ERROR: Google OAuth credentials are missing!");
  console.log("\n💡 Your .env file should contain:");
  console.log(`
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
  `);
  console.log(
    "\n📁 Looking for .env at:",
    path.resolve(__dirname, "../../.env")
  );
  process.exit(1);
}

// Get redirect URI from env or use default
const redirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/api/v1/auth/google/callback";

console.log("\n✅ Environment loaded successfully!");
console.log("Redirect URI:", redirectUri);

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://mail.google.com/"],
  prompt: "consent",
  include_granted_scopes: true,
});
console.log("\n" + "=".repeat(50));
console.log("✅ AUTHORIZATION URL GENERATED SUCCESSFULLY");
console.log("=".repeat(50));
console.log("\n📋 OPEN THIS URL IN YOUR BROWSER:");

// Check if URL has proper client_id
if (authUrl.includes("client_id=&")) {
  console.error("\n⚠️  WARNING: client_id is empty in the URL!");
  console.log(
    "This means GOOGLE_CLIENT_ID is empty or incorrect in your .env file"
  );
  console.log("URL generated:", authUrl.substring(0, 100) + "...");

  // Debug: Show what's actually in the URL
  const urlObj = new URL(authUrl);
  const clientIdParam = urlObj.searchParams.get("client_id");
  console.log("Extracted client_id from URL:", clientIdParam || "(empty)");
} else {
  console.log("\x1b[36m%s\x1b[0m", authUrl); // Blue color

  // Verify URL has all required parameters
  const urlObj = new URL(authUrl);
  console.log("\n🔍 URL Verification:");
  console.log(
    "Has client_id:",
    urlObj.searchParams.get("client_id") ? "✓" : "✗"
  );
  console.log(
    "Has redirect_uri:",
    urlObj.searchParams.get("redirect_uri") ? "✓" : "✗"
  );
  console.log("Has scope:", urlObj.searchParams.get("scope") ? "✓" : "✗");
}

console.log("\n📝 INSTRUCTIONS:");
console.log("1. Open this URL in a browser (preferably in Incognito mode)");
console.log(
  "2. Log in with the SAME Google account that owns the Gmail account"
);
console.log('3. Click "Allow" or "Continue" when prompted');
console.log("4. After approving, you'll be redirected");
console.log('5. COPY THE ENTIRE "code" PARAMETER from the redirect URL');

console.log("\n💡 The redirect URL will look like:");
console.log(`${redirectUri}?code=4/0A...LONG_CODE...&scope=...`);
console.log('\n⚠️  Copy ONLY the code value after "code=" and before "&scope"');

// Set up readline for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Ask for the authorization code
rl.question(
  "\n\n📋 AFTER getting the code, paste it here: ",
  async (authCode) => {
    try {
      const code = authCode.trim();

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      console.log("\n✅ TOKENS OBTAINED SUCCESSFULLY!");
      console.log("=".repeat(50));

      // Display the new refresh token (highlighted in green)
      console.log("\n🔑 YOUR NEW REFRESH TOKEN:");
      console.log("\x1b[32m%s\x1b[0m", tokens.refresh_token);

      console.log("\n📋 Access token (expires in 1 hour):");
      console.log(tokens.access_token?.substring(0, 50) + "...");

      console.log("\n📝 TOKEN EXPIRY DATE:");
      if (tokens.expiry_date) {
        console.log(new Date(tokens.expiry_date).toLocaleString());
      }

      console.log("\n💾 UPDATE YOUR .env FILE WITH:");
      console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);

      // Test the token immediately
      console.log("\n🔍 Testing Gmail connection...");
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const profile = await gmail.users.getProfile({ userId: "me" });
      console.log("\n🎉 GMAIL CONNECTION TEST SUCCESSFUL!");
      console.log("Connected email:", profile.data.emailAddress);

      // Show next steps
      console.log("\n🚀 NEXT STEPS:");
      console.log("1. Update your .env file with the new refresh token above");
      console.log("2. Restart your backend server");
      console.log("3. Try sending a magic link again");
    } catch (error: any) {
      console.error("\n❌ ERROR:", error.message);

      if (error.message.includes("invalid_grant")) {
        console.log("\n⚠️  Possible issues:");
        console.log(
          "• The authorization code expired (codes are valid for ~10 minutes)"
        );
        console.log("• Wrong authorization code format");
        console.log("• Redirect URI mismatch");
        console.log(
          "\n🔄 Solution: Generate a new authorization URL and try again."
        );
      }
    } finally {
      rl.close();
    }
  }
);
