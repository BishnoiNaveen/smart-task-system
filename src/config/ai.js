// AI Providers Configuration

const AI_PROVIDER = process.env.AI_PROVIDER || "gemini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check keys on boot and log appropriate status warnings
if (AI_PROVIDER === "gemini" && (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here")) {
  console.warn("⚠️  AI WARNING: GEMINI_API_KEY is not configured. AI features will fail.");
}

if (AI_PROVIDER === "openai" && (!OPENAI_API_KEY || OPENAI_API_KEY === "your_openai_api_key_here")) {
  console.warn("⚠️  AI WARNING: OPENAI_API_KEY is not configured. AI features will fail.");
}

console.log(`🤖 AI Provider Configured: ${AI_PROVIDER.toUpperCase()}`);

export {
  AI_PROVIDER,
  OPENAI_API_KEY,
  GEMINI_API_KEY
};
