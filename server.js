const express = require("express");
const cors = require("cors");
const fs = require("fs");

// OpenRouter API key from environment variable
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

async function getAIReply(systemPrompt, history, userMessage) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "openrouter/auto",
            messages: [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage }
            ]
        })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No response from AI";
}

app.post("/chat", async (req, res) => {


    const userMessage = req.body.message;
    const subject = req.body.subject;
    const history = (req.body.history || []).slice(-6);

        console.log("HISTORY:", history);

    let systemPrompt = "You are a helpful AI study companion.";

    if (subject === "Math") {
        systemPrompt = "You are a math teacher. Solve step-by-step.";
    } else if (subject === "Physics") {
        systemPrompt = "You are a physics teacher. Explain with real-life examples.";
    } else if (subject === "Programming") {
        systemPrompt = "You are a coding teacher. Explain clearly with code.";
    }

    try {
        if (!OPENROUTER_API_KEY) {
            return res.status(500).json({ reply: "Server is missing OPENROUTER_API_KEY" });
        }

        const reply = await getAIReply(systemPrompt, history, userMessage);
        res.json({ reply });

    } catch (error) {
        console.log(error);
        res.json({ reply: "Something went wrong 😢" });
    }
});

app.post("/improve-notes", async (req, res) => {
    const text = req.body.text || req.body.message;
    const history = (req.body.history || []).slice(-6);

    if (!text) {
        return res.status(400).json({ reply: "No notes text provided" });
    }

    try {
        if (!OPENROUTER_API_KEY) {
            return res.status(500).json({ reply: "Server is missing OPENROUTER_API_KEY" });
        }

        const reply = await getAIReply(
            "You are a study notes improver. Rewrite notes to be clearer, concise, and exam-ready with bullet points.",
            history,
            text
        );

        res.json({ reply });
    } catch (error) {
        console.log(error);
        res.status(500).json({ reply: "Something went wrong while improving notes" });
    }
});

// ─── PROGRESS ENDPOINTS ──────────────────────────────
app.post("/update-progress", (req, res) => {
    const updates = req.body;
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        // Update progress data
        if (updates.progress) {
            Object.assign(data.progress, updates.progress);
        }
        fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
        res.json({ success: true, message: "Progress updated successfully" });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ success: false, message: "Failed to update progress" });
    }
});

app.post("/add-session", (req, res) => {
    const session = req.body;
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        // Add new session
        data.sessions.unshift(session);
        // Keep only last 10 sessions
        data.sessions = data.sessions.slice(0, 10);
        
        // Update stats (example: increment tasks and hours)
        const now = new Date();
        const period = getCurrentPeriod(now);
        if (data.progress[period]) {
            data.progress[period].tasks += 1;
            // Parse duration and add to hours (simple example)
            const durationMatch = session.dur.match(/(\d+)h\s*(\d+)?m?/);
            if (durationMatch) {
                const hours = parseInt(durationMatch[1]) || 0;
                const mins = parseInt(durationMatch[2]) || 0;
                data.progress[period].hours += hours + (mins / 60);
            }
        }
        
        fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
        res.json({ success: true, message: "Session added successfully" });
    } catch (error) {
        console.error('Error adding session:', error);
        res.status(500).json({ success: false, message: "Failed to add session" });
    }
});

function getCurrentPeriod(date) {
    // Simple logic: if day < 8, week; else month
    // You can make this more sophisticated
    return date.getDate() < 8 ? 'week' : 'month';
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

