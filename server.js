import "dotenv/config";

import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

// ==========================================
// APP SETUP
// ==========================================

const app = express();

const PORT = Number(process.env.PORT) || 3000;

// You can change this in .env
const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

// ==========================================
// CHECK API KEY
// ==========================================

if (!process.env.OPENAI_API_KEY) {
    console.error("");
    console.error("====================================");
    console.error("       NOVA AI CONFIGURATION ERROR");
    console.error("====================================");
    console.error("");
    console.error("OPENAI_API_KEY is missing.");
    console.error("Please add your API key to backend/.env");
    console.error("");
    process.exit(1);
}

// ==========================================
// OPENAI CLIENT
// ==========================================

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ==========================================
// PATH SETUP
// ==========================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, "../frontend");

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
    cors({
        origin: true
    })
);

app.use(
    express.json({
        limit: "2mb"
    })
);

// Serve frontend files
app.use(express.static(frontendPath));

// ==========================================
// NOVA AI INSTRUCTIONS
// ==========================================

const SYSTEM_INSTRUCTIONS = `
You are Nova AI, a helpful, knowledgeable, friendly and practical AI assistant.

Your job is to provide useful answers across many subjects.

You can help with:

- Programming
- Software engineering
- Artificial intelligence
- Machine learning
- Data science
- Mathematics
- Physics
- Chemistry
- Biology
- History
- Geography
- General knowledge
- Education
- Career guidance
- Interview preparation
- Writing
- Summaries
- Brainstorming
- Project ideas
- Debugging
- HTML
- CSS
- JavaScript
- React
- Node.js
- Python
- Java
- C
- C++
- SQL
- Databases
- Git
- GitHub
- Algorithms
- Data structures

Guidelines:

1. Understand the user's question before answering.

2. Give accurate and useful explanations.

3. For technical questions, provide practical examples.

4. When providing code, use proper code formatting.

5. Explain important parts of the code when useful.

6. When the user is a beginner, explain concepts simply.

7. Do not unnecessarily repeat the user's question.

8. Use headings and bullet points when they improve readability.

9. When there are multiple approaches, explain the best approach first.

10. Never invent facts when you are uncertain.

11. For mathematics, show important calculation steps.

12. For debugging, explain the likely cause before the fix.

13. Keep normal answers reasonably concise.

14. Be friendly and professional.

15. Do not claim to have performed an action that you did not perform.

You are Nova AI.
`;

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Nova AI backend is running",
        model: MODEL
    });
});

// ==========================================
// CHAT API
// ==========================================

app.post("/api/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        // --------------------------------------
        // VALIDATE MESSAGES
        // --------------------------------------

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "messages must be an array"
            });
        }

        if (messages.length === 0) {
            return res.status(400).json({
                error: "No messages provided"
            });
        }

        // --------------------------------------
        // CLEAN MESSAGE HISTORY
        // --------------------------------------

        const recentMessages = messages
            .slice(-30)
            .filter((message) => {
                return (
                    message &&
                    (message.role === "user" ||
                        message.role === "assistant") &&
                    typeof message.content === "string" &&
                    message.content.trim().length > 0
                );
            });

        if (recentMessages.length === 0) {
            return res.status(400).json({
                error: "No valid messages provided"
            });
        }

        // --------------------------------------
        // CREATE OPENAI INPUT
        // --------------------------------------

        const input = recentMessages.map((message) => {
            return {
                role: message.role,
                content: message.content.trim()
            };
        });

        // --------------------------------------
        // SSE HEADERS
        // --------------------------------------

        res.status(200);

        res.setHeader(
            "Content-Type",
            "text/event-stream"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache, no-transform"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );

        res.setHeader(
            "X-Accel-Buffering",
            "no"
        );

        // --------------------------------------
        // SEND SSE EVENT
        // --------------------------------------

        const sendEvent = (data) => {
            res.write(
                `data: ${JSON.stringify(data)}\n\n`
            );
        };

        // --------------------------------------
        // CREATE OPENAI STREAM
        // --------------------------------------

        const stream = await client.responses.create({
            model: MODEL,
            instructions: SYSTEM_INSTRUCTIONS,
            input,
            stream: true
        });

        // --------------------------------------
        // READ STREAM EVENTS
        // --------------------------------------

        let completed = false;

        for await (const event of stream) {

            // Text is generated
            if (
                event.type ===
                "response.output_text.delta"
            ) {
                sendEvent({
                    type: "delta",
                    text: event.delta
                });
            }

            // Response completed
            if (
                event.type ===
                "response.completed"
            ) {
                completed = true;

                sendEvent({
                    type: "done"
                });
            }

            // Response failed
            if (
                event.type ===
                "response.failed"
            ) {
                sendEvent({
                    type: "error",
                    message:
                        event.response?.error?.message ||
                        "The AI response failed."
                });
            }

            // Response incomplete
            if (
                event.type ===
                "response.incomplete"
            ) {
                sendEvent({
                    type: "error",
                    message:
                        "The AI response ended before completion."
                });
            }

            // General response error
            if (
                event.type ===
                "error"
            ) {
                sendEvent({
                    type: "error",
                    message:
                        event.message ||
                        "An OpenAI streaming error occurred."
                });
            }
        }

        // --------------------------------------
        // HANDLE UNEXPECTED STREAM END
        // --------------------------------------

        if (!completed) {
            sendEvent({
                type: "done"
            });
        }

        res.end();

    } catch (error) {

        console.error("");
        console.error("Nova AI Error:");
        console.error(error);

        // --------------------------------------
        // NORMAL JSON ERROR
        // --------------------------------------

        if (!res.headersSent) {
            return res.status(500).json({
                error:
                    "Something went wrong while contacting the AI."
            });
        }

        // --------------------------------------
        // STREAMING ERROR
        // --------------------------------------

        try {
            res.write(
                `data: ${JSON.stringify({
                    type: "error",
                    message:
                        "Something went wrong while generating the response."
                })}\n\n`
            );

            res.end();
        } catch {
            // Connection is already closed.
        }
    }
});

// ==========================================
// FRONTEND
// ==========================================

// Serve index.html for the main page
app.get("/", (req, res) => {
    res.sendFile(
        path.join(frontendPath, "index.html")
    );
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log("          NOVA AI SERVER");
    console.log("====================================");
    console.log("");

    console.log(
        `Nova AI running at: http://localhost:${PORT}`
    );

    console.log(
        `Health check: http://localhost:${PORT}/api/health`
    );

    console.log(
        `Model: ${MODEL}`
    );

    console.log("");

});