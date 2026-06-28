const express = require("express");
const cors = require("cors");
const fs = require("fs");

// Add your OpenRouter API key here before running locally
const OPENROUTER_API_KEY = "";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

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

        console.log("API RESPONSE:", data);

        res.json({
            reply: data.choices?.[0]?.message?.content || "No response from AI"
        });

    } catch (error) {
        console.log(error);
        res.json({ reply: "Something went wrong 😢" });
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

app.listen(3000, () => console.log("Server running on port 3000"));

