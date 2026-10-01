// backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// serve the front-end from the same server -> open http://localhost:5000
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(__dirname));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// connect MongoDB (optional: the app falls back to in-memory storage if unavailable)
let mongoReady = false;
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 4000 })
    .then(() => { mongoReady = true; console.log("✅ MongoDB connected"); })
    .catch(err => console.error("⚠️ MongoDB unavailable, using in-memory storage:", err.message));
} else {
  console.log("ℹ️ MONGO_URI not set — using in-memory storage (data resets on restart)");
}
const memUsers = new Map();

// user schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String, // student | graduate
  course: String,
  year: String,
  skills: [String],
  interests: [String]
});
// separate collections: students and graduates are stored apart, each record keeps the person's name
userSchema.add({ activity: { type: mongoose.Schema.Types.Mixed, default: {} }, createdAt: { type: Date, default: Date.now }, lastLoginAt: Date, loginCount: { type: Number, default: 0 } });
const Student = mongoose.model("Student", userSchema, "students");
const Graduate = mongoose.model("Graduate", userSchema, "graduates");
const modelFor = (role) => (role === "graduate" ? Graduate : Student);
const findUser = async (email) => mongoReady
  ? ((await Student.findOne({ email })) || (await Graduate.findOne({ email })))
  : memUsers.get(email);

// file persistence for the no-MongoDB fallback: data/students.json + data/graduates.json
const DATA_DIR = path.join(__dirname, "data");
const persist = () => {
  if (mongoReady) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const all = [...memUsers.values()];
    fs.writeFileSync(path.join(DATA_DIR, "students.json"), JSON.stringify(all.filter(u => u.role !== "graduate"), null, 2));
    fs.writeFileSync(path.join(DATA_DIR, "graduates.json"), JSON.stringify(all.filter(u => u.role === "graduate"), null, 2));
  } catch (e) { console.error("persist failed:", e.message); }
};
try {
  for (const f of ["students.json", "graduates.json"]) {
    const p = path.join(DATA_DIR, f);
    if (fs.existsSync(p)) for (const u of JSON.parse(fs.readFileSync(p, "utf8"))) memUsers.set(u.email, u);
  }
} catch (e) { console.error("load failed:", e.message); }

// ---------- auth helpers (scrypt password hashing, no extra dependencies) ----------
const hashPw = (pw) => {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
};
const checkPw = (pw, stored) => {
  try {
    const [salt, h] = String(stored).split(":");
    const a = Buffer.from(h, "hex"), b = crypto.scryptSync(pw, salt, 64);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
};
const pub = (u) => { const o = u && u.toObject ? u.toObject() : { ...u }; delete o.password; delete o.__v; return o; };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const attempts = new Map(); // email -> timestamps of failed logins (max 5 per 10 min)
const tooMany = (k) => { const now = Date.now(), a = (attempts.get(k) || []).filter(t => now - t < 600000); attempts.set(k, a); return a.length >= 5; };

// ---------- admin ----------
// Credentials come from .env (ADMIN_EMAIL / ADMIN_PASSWORD). Change them before deploying.
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "bharathraj88700@gmail.com").trim().toLowerCase();
const ADMIN_NAME = String(process.env.ADMIN_NAME || "BHARATHRAJ K").trim();
const ADMIN_HASH = hashPw(String(process.env.ADMIN_PASSWORD || "Bharath@12345"));
const adminTokens = new Map(); // token -> expiry (8 h)
const issueAdminToken = () => { const t = crypto.randomBytes(32).toString("hex"); adminTokens.set(t, Date.now() + 8 * 3600 * 1000); return t; };
const requireAdmin = (req, res, next) => {
  const t = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const exp = adminTokens.get(t);
  if (!exp || exp < Date.now()) { adminTokens.delete(t); return res.status(401).json({ success: false, error: "Admin sign-in required." }); }
  next();
};

// register
app.post("/api/register", async (req, res) => {
  try {
    const { name, password, course, year, role } = req.body || {};
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!name || !String(name).trim() || !EMAIL_RE.test(email)) return res.status(400).json({ success: false, error: "A valid name and email are required." });
    if (!password || String(password).length < 6) return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    if (!["student", "graduate"].includes(role)) return res.status(400).json({ success: false, error: "Invalid role." });
    if (email === ADMIN_EMAIL) return res.status(409).json({ success: false, error: "This email is reserved." });
    if (await findUser(email)) return res.status(409).json({ success: false, error: "An account with this email already exists. Try signing in." });
    const doc = { name: String(name).trim(), email, password: hashPw(String(password)), role, course: course || "", year: year || "", skills: [], interests: [], createdAt: new Date().toISOString(), loginCount: 0 };
    if (!mongoReady) {
      if (memUsers.has(email)) return res.status(409).json({ success: false, error: "An account with this email already exists. Try signing in." });
      memUsers.set(email, doc); persist();
      return res.json({ success: true, user: pub(doc) });
    }
    const user = await new (modelFor(role))(doc).save();
    res.json({ success: true, user: pub(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: "An account with this email already exists. Try signing in." });
    console.error(err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// login
app.post("/api/login", async (req, res) => {
  try {
    const { password, role } = req.body || {};
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !password) return res.status(400).json({ success: false, error: "Email and password are required." });
    if (tooMany(email)) return res.status(429).json({ success: false, error: "Too many failed attempts. Try again in a few minutes." });
    if (email === ADMIN_EMAIL) {
      if (!checkPw(String(password), ADMIN_HASH)) { attempts.get(email).push(Date.now()); return res.status(401).json({ success: false, error: "Invalid email or password." }); }
      attempts.delete(email);
      return res.json({ success: true, admin: true, token: issueAdminToken(), user: { name: ADMIN_NAME, email, role: "admin" } });
    }
    const user = await findUser(email);
    let ok = false;
    if (user) {
      if (String(user.password).includes(":")) ok = checkPw(String(password), user.password);
      else if (user.password === String(password)) { // legacy plaintext account -> upgrade to a hash
        ok = true; user.password = hashPw(String(password));
        if (mongoReady) await user.save();
      }
    }
    if (!ok) { attempts.get(email).push(Date.now()); return res.status(401).json({ success: false, error: "Invalid email or password." }); }
    if (role && user.role !== role) return res.status(403).json({ success: false, error: `This account is registered as a ${user.role}. Use the ${user.role} portal.` });
    attempts.delete(email);
    user.lastLoginAt = mongoReady ? new Date() : new Date().toISOString(); user.loginCount = (user.loginCount || 0) + 1;
    if (mongoReady) await user.save(); else persist();
    res.json({ success: true, user: pub(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// save skills
app.post("/api/skills", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const toArr = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map(x => String(x).trim()).filter(Boolean);
    const user = await findUser(email);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    user.skills = toArr(req.body?.skills); user.interests = toArr(req.body?.interests);
    if (mongoReady) await user.save(); else persist();
    res.json({ success: true, user: pub(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save skills" });
  }
});

// Get user data
app.get("/api/user/:email", async (req, res) => {
  try {
    const user = await findUser(String(req.params.email || "").toLowerCase());
    if (user) {
      res.json({ success: true, user: pub(user) });
    } else {
      res.status(404).json({ success: false, error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to retrieve user" });
  }
});

// profile update (own account)
app.post("/api/profile", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const user = await findUser(email);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    const toArr = (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map(x => String(x).trim()).filter(Boolean);
    const nm = String(req.body?.name || "").trim().slice(0, 80);
    if (nm) user.name = nm;
    user.course = String(req.body?.course ?? user.course ?? "").slice(0, 120);
    user.year = String(req.body?.year ?? user.year ?? "").slice(0, 40);
    user.skills = toArr(req.body?.skills); user.interests = toArr(req.body?.interests);
    if (mongoReady) await user.save(); else persist();
    res.json({ success: true, user: pub(user) });
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: "Failed to save profile" }); }
});

// activity log (my plan, roadmap, resume, interview ... saved per user, grouped by type)
const ACT_TYPES = ["myPlan", "careerMatch", "roadmap", "resume", "interview", "coverLetter"];
app.post("/api/activity", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase(), type = req.body?.type;
    if (!ACT_TYPES.includes(type)) return res.status(400).json({ success: false, error: "Bad type" });
    const user = await findUser(email);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    const raw = JSON.stringify(req.body?.data || {});
    if (raw.length > 20000) return res.status(413).json({ success: false, error: "Too large" });
    const data = JSON.parse(raw);
    const act = { ...(user.activity || {}) };
    act[type] = [...(act[type] || []), { at: new Date().toISOString(), ...data }].slice(-25);
    user.activity = act;
    if (mongoReady) { user.markModified("activity"); await user.save(); } else persist();
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: "Failed to save activity" }); }
});

// admin API (Bearer token from /api/login)
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const clean = (arr) => arr.map(pub).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    let students, graduates;
    if (mongoReady) { students = clean(await Student.find()); graduates = clean(await Graduate.find()); }
    else { const all = [...memUsers.values()]; students = clean(all.filter(u => u.role !== "graduate")); graduates = clean(all.filter(u => u.role === "graduate")); }
    res.json({ success: true, students, graduates });
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: "Failed to load users" }); }
});
app.delete("/api/admin/users/:email", requireAdmin, async (req, res) => {
  try {
    const email = String(req.params.email || "").toLowerCase();
    if (mongoReady) { await Student.deleteOne({ email }); await Graduate.deleteOne({ email }); }
    else { memUsers.delete(email); persist(); }
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: "Delete failed" }); }
});
app.post("/api/admin/logout", requireAdmin, (req, res) => { adminTokens.delete(String(req.headers.authorization || "").replace(/^Bearer\s+/i, "")); res.json({ success: true }); });

// AI search
const aiEnabled = !!process.env.OPENAI_API_KEY;
const client = aiEnabled
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : { chat: { completions: { create: async () => { throw new Error("OPENAI_API_KEY not set"); } } } };
if (!aiEnabled) console.log("ℹ️ OPENAI_API_KEY not set — AI endpoints return errors and pages use their local fallbacks");
app.get("/api/health", (req, res) => res.json({ ok: true, ai: aiEnabled, mongo: mongoReady }));

// Predefined AI prompts for career advice
const careerPrompts = {
  "trending_careers": "List the top 5 trending career paths in technology for 2025, including job growth projections and required skills.",
  "career_switch": "What are the best strategies for switching careers from academia to tech industry? Include specific steps and timeline.",
  "skill_gap": "Analyze the current skill gap in the AI/ML industry and suggest learning paths to bridge it.",
  "freelancing": "What are the most lucrative freelancing opportunities in the creative and tech industries for 2025?",
  "remote_work": "How can professionals optimize their remote work experience for career advancement?",
  "entrepreneurship": "What are the key factors for successful tech entrepreneurship in the current market?",
  "salary_negotiation": "Provide 5 effective salary negotiation strategies for tech professionals in 2025.",
  "work_life_balance": "How can tech professionals maintain work-life balance while advancing their careers?"
};

app.post("/api/search", async (req, res) => {
  try {
    const { searchQuery, promptType } = req.body;
    
    // Use predefined prompt if promptType is provided
    let query = searchQuery;
    if (promptType && careerPrompts[promptType]) {
      query = careerPrompts[promptType];
    }
    
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: query }],
    });
    res.json({ result: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: "AI error", details: err.message });
  }
});

// Get predefined career prompts
app.get("/api/prompts", (req, res) => {
  res.json({ prompts: careerPrompts });
});

// Helper: pull the first {...} or [...] JSON blob out of a model response
function extractJson(raw) {
  const objStart = raw.indexOf("{");
  const arrStart = raw.indexOf("[");
  let start = -1;
  let endChar = "}";
  if (objStart === -1 && arrStart === -1) throw new Error("No JSON found in AI response");
  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    start = arrStart;
    endChar = "]";
  } else {
    start = objStart;
    endChar = "}";
  }
  const end = raw.lastIndexOf(endChar) + 1;
  return JSON.parse(raw.substring(start, end));
}

// ---------- AI Feature 1: Chatbot advisor ----------
app.post("/api/chatbot", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Message is required" });
    }

    const systemPrompt = {
      role: "system",
      content:
        "You are a friendly, knowledgeable career and education advisor chatbot embedded in a career-advisor web app. " +
        "Give concise, practical, encouraging advice about career paths, skills to learn, courses, resumes, interviews, " +
        "and job searching. Keep replies under ~150 words unless the user explicitly asks for more detail. " +
        "Use plain text, not markdown."
    };

    const priorMessages = Array.isArray(history)
      ? history
          .filter(m => m && m.role && m.content)
          .slice(-10)
          .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) }))
      : [];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...priorMessages, { role: "user", content: message }],
    });

    res.json({ success: true, reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Chatbot error", details: err.message });
  }
});

// ---------- AI Feature 2: Resume / skills gap analyzer ----------
app.post("/api/analyze-resume", async (req, res) => {
  try {
    const { skills, interests, targetCareer, resumeText } = req.body;
    if (!skills && !resumeText) {
      return res.status(400).json({ success: false, error: "Skills or resume text is required" });
    }

    const prompt = `You are a career skills-gap analyzer.
Candidate skills: ${skills || "N/A"}
Candidate interests: ${interests || "N/A"}
${resumeText ? `Resume/background text: ${resumeText}` : ""}
Target career: ${targetCareer || "the single best-fit career based on the skills/interests above"}

Respond with ONLY a JSON object (no markdown fences, no commentary) in exactly this shape:
{
  "targetCareer": string,
  "readinessScore": number (0-100),
  "matchedSkills": string[],
  "missingSkills": string[],
  "recommendations": [{"action": string, "resource": string, "url": string}],
  "summary": string (2-3 sentences)
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = extractJson(completion.choices[0].message.content);
    res.json({ success: true, analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Resume analysis failed", details: err.message });
  }
});

// ---------- AI Feature 3: reusable AI career-suggestion helper ----------
// (used by grdcareer.html and nextpage.html so AI suggestions aren't limited to one page)
app.post("/api/suggest-careers", async (req, res) => {
  try {
    const { skills, interests } = req.body;
    if (!skills || !interests) {
      return res.status(400).json({ success: false, error: "Skills and interests are required" });
    }

    const prompt = `Based on these skills: ${skills} and interests: ${interests}, suggest 3 career paths.
Respond with ONLY a JSON array (no markdown fences, no commentary) in exactly this shape:
[{"title": string, "description": string, "skills": string[], "growth": string, "resources": [{"title": string, "url": string}]}]`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const suggestions = extractJson(completion.choices[0].message.content);
    res.json({ success: true, suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Career suggestion failed", details: err.message });
  }
});

// ---------- AI Feature 4: personalized learning roadmap ----------
app.post("/api/roadmap", async (req, res) => {
  try {
    const { skills, interests, targetCareer } = req.body;
    if (!targetCareer && !skills) {
      return res.status(400).json({ success: false, error: "Target career or skills are required" });
    }

    const prompt = `Create a personalized learning roadmap.
Current skills: ${skills || "N/A"}
Interests: ${interests || "N/A"}
Target career: ${targetCareer || "the single best-fit career based on the skills/interests above"}

Respond with ONLY a JSON object (no markdown fences, no commentary) in exactly this shape:
{
  "targetCareer": string,
  "totalDuration": string,
  "phases": [
    {
      "phase": string,
      "duration": string,
      "goals": string[],
      "milestones": string[],
      "resources": [{"title": string, "url": string}]
    }
  ]
}
Include 3 to 5 phases, ordered from foundational to advanced.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const roadmap = extractJson(completion.choices[0].message.content);
    res.json({ success: true, roadmap });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Roadmap generation failed", details: err.message });
  }
});

// ---------- AI Feature 5: mock interview coach ----------
app.post("/api/interview/question", async (req, res) => {
  try {
    const { role, level, type, asked } = req.body;
    if (!role) return res.status(400).json({ success: false, error: "Role is required" });
    const prompt = `Generate ONE ${type || "mixed"} interview question for a ${level || "junior"} ${role} candidate.
Do not repeat these already-asked questions: ${JSON.stringify(asked || [])}.
Respond with ONLY JSON: {"question": string, "category": string, "tip": string}`;
    const c = await client.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] });
    res.json({ success: true, ...extractJson(c.choices[0].message.content) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Question generation failed", details: err.message });
  }
});

app.post("/api/interview/evaluate", async (req, res) => {
  try {
    const { role, question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ success: false, error: "Question and answer required" });
    const prompt = `You are a strict but encouraging interview coach for a ${role || "general"} role.
Question: ${question}
Candidate answer: ${answer}
Respond with ONLY JSON: {"score": number (0-100), "clarity": number (0-100), "relevance": number (0-100), "confidence": number (0-100),
"strengths": string[], "improvements": string[], "modelAnswer": string (short ideal answer)}`;
    const c = await client.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] });
    res.json({ success: true, evaluation: extractJson(c.choices[0].message.content) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Evaluation failed", details: err.message });
  }
});

// ---------- AI Feature 6: cover letter generator ----------
app.post("/api/cover-letter", async (req, res) => {
  try {
    const { name, role, company, skills, tone, jobDescription } = req.body;
    if (!role) return res.status(400).json({ success: false, error: "Role is required" });
    const prompt = `Write a ${tone || "professional"} cover letter (max 250 words, plain text, no placeholders left unfilled).
Candidate: ${name || "the candidate"}
Role: ${role} at ${company || "the company"}
Skills: ${skills || "N/A"}
${jobDescription ? "Job description: " + jobDescription : ""}`;
    const c = await client.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] });
    res.json({ success: true, letter: c.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Cover letter failed", details: err.message });
  }
});

// ---------- AI Feature 7: career match radar ----------
app.post("/api/career-match", async (req, res) => {
  try {
    const { skills, interests } = req.body;
    if (!skills) return res.status(400).json({ success: false, error: "Skills required" });
    const prompt = `Skills: ${skills}. Interests: ${interests || "N/A"}.
Rank the 6 best-fit careers. Respond with ONLY JSON:
{"matches":[{"career": string, "match": number (0-100), "salaryRange": string, "demand": "High"|"Medium"|"Low", "why": string}],
"strengths": string[], "traits": {"technical": number, "creative": number, "analytical": number, "social": number, "leadership": number}}`;
    const c = await client.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }] });
    res.json({ success: true, ...extractJson(c.choices[0].message.content) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Career match failed", details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));