// Serverless function for OpenRouter API proxy
// This file can be deployed to Vercel, Netlify, AWS Lambda, or similar platforms

// This function acts as a proxy to the OpenRouter API
// The API key is stored securely as an environment variable on the server and never exposed to the client

/**
 * Handler for the OpenRouter API proxy request
 * @param {Object} req
 * @param {Object} res
 */
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Server configuration error: API key not found" });
        }

        const requestBody = req.body;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer": req.headers.referer || "https://luminicad.com",
                "X-Title": "LuminiCAD",
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        return res.status(response.status).json(data);
    } catch (error) {
        console.error("OpenRouter proxy error:", error);
        return res.status(500).json({ error: "Failed to communicate with OpenRouter API" });
    }
}
