import fs from "fs";

const jsonPath = "/Users/leejeonghan/Downloads/mechanic-myongi-firebase-adminsdk-fbsvc-a1e0b3467a.json";
const jsonContent = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

// Make sure the private key is escaped with \n for .env file compatibility
const escapedPrivateKey = jsonContent.private_key.replace(/\n/g, "\\n");

const envContent = `# Community-Builder environment variables
SESSION_SECRET=fallback-session-secret-community-builder-987654321
DATABASE_URL=postgresql://postgres.xkenexufqpyaemrfryce:%40965233Koo_@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres
PORT=8080
GEMINI_API_KEY=AIzaSyBjTOZV5A8BhNC4i9xd8TRQOFbFU0bi6Ak
FIREBASE_PROJECT_ID=${jsonContent.project_id}
FIREBASE_CLIENT_EMAIL=${jsonContent.client_email}
FIREBASE_PRIVATE_KEY="${escapedPrivateKey}"
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
`;

fs.writeFileSync("/Users/leejeonghan/Downloads/Community-Builder/.env", envContent, "utf-8");
console.log(".env generated successfully from Firebase JSON!");
