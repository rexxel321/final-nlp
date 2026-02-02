const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const geminiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const geminiKey = geminiKeyMatch ? geminiKeyMatch[1].trim() : null;

if (!geminiKey) {
    console.error("Could not find GEMINI_API_KEY in .env.local");
    process.exit(1);
}

async function listModels() {
    try {
        console.log("Fetching available models using key ending in...", geminiKey.slice(-4));

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error Response:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("Available Models:");
            if (data.models) {
                data.models.forEach(m => {
                    // Filter for generateContent support
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`- ${m.name} (${m.displayName})`);
                    }
                });
            } else {
                console.log("No models found in response:", data);
            }
        }

    } catch (error) {
        console.error("Network Error:", error);
    }
}

listModels();
