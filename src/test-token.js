
const newToken = "YOUR_NEW_TOKEN_HERE";
const parts = newToken.split(".");
const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
console.log("New token audience:", payload.aud);
console.log("Your GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
