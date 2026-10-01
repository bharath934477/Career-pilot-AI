# Career Advisor Application

## Setup Instructions

### Prerequisites
1. Install Node.js (version 14 or higher) from https://nodejs.org/
2. Install MongoDB from https://www.mongodb.com/try/download/community

### Installation Steps

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Start MongoDB:**
   Make sure MongoDB is running on your system. You can start it with:
   ```bash
   mongod
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   or for development:
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open the HTML files directly in your browser or serve them using a local server.

## Project Structure

- `graduate.html` - Graduate registration page
- `server.js` - Main backend server
- `.env` - Environment variables (MongoDB connection string, API keys)

## Features

- Graduate registration with data stored in MongoDB
- Career path suggestions (now AI-powered on every suggestions page, with a local fallback if the AI is unavailable)
- Skills and interests tracking
- **AI Career Advisor chatbot** — floating chat widget (bottom-right) on every page; ask free-form career questions
- **AI Resume/Skills Gap Analyzer** (`resume-analyzer.html`) — readiness score, matched vs. missing skills, and recommendations for a target career
- **AI Learning Roadmap** (`roadmap.html`) — phase-by-phase learning plan (goals, milestones, resources) for a target career

## API Endpoints

- `POST /api/register` - Register a new user (graduate or student)
- `POST /api/skills` - Save user skills and interests
- `POST /api/search` - Free-form AI query / predefined career prompts
- `POST /api/suggest-careers` - AI career path suggestions from skills + interests (used by the suggestions pages)
- `POST /api/chatbot` - AI chatbot advisor (used by the floating chat widget, `ai-chatbot.js`)
- `POST /api/analyze-resume` - AI resume/skills gap analysis (used by `resume-analyzer.html`)
- `POST /api/roadmap` - AI personalized learning roadmap (used by `roadmap.html`)

## Environment Variables

Create a `.env` file with the following variables:
- `MONGO_URI` - MongoDB connection string
- `OPENAI_API_KEY` - OpenAI API key for career suggestions

## New in this version (CareerPilot AI upgrade)

- **Shared design system** (`pro.css`, `pro.js`): animated neural-network background, glass navbar with animated SVG logo, scroll progress bar, reveal-on-scroll, toasts, counters
- **AI Hub** (`dashboard.html`) with animated stats, profile-completeness ring and links to every tool
- **AI Career Match** (`career-match.html`): animated strengths radar + ranked careers with salary range and demand
- **Mock Interview Coach** (`interview-coach.html`): AI questions, scored feedback (clarity/relevance/confidence), model answers, voice dictation
- **Cover Letter Generator** (`cover-letter.html`): tone selection, typewriter output, copy/download
- **Upgraded chatbot**: typing dots, suggestion chips, clear button, session memory, typewriter replies
- Backend: static hosting (open http://localhost:5000), MongoDB and OpenAI are now optional, new endpoints `/api/interview/question`, `/api/interview/evaluate`, `/api/cover-letter`, `/api/career-match`, `/api/health`
- Every new AI page has an offline fallback so it still works without an API key

## Run

    npm install
    cp .env.example .env    # add OPENAI_API_KEY for live AI (optional)
    npm start               # then open http://localhost:5000

## Login & accounts

- `student.html` / `graduate.html`: split-screen sign-in / create-account pages (animated logo, tab switcher, floating labels, live password strength, confirm-password check, caps-lock warning, remember me, forgot-password demo, success animation with confetti)
- `POST /api/register` and `POST /api/login`: passwords are hashed with scrypt, failed logins are rate-limited (5 per 10 min per email), and passwords are never returned to the browser
- If the server is unreachable the pages fall back to a browser-only demo account store (PBKDF2-hashed, localStorage)
- Existing accounts with plaintext passwords are upgraded to a hash on their next successful login


## Login flow (latest)

- Pages are protected by `guard.js` + `pro.js`: without an account/login you are sent back to `front.html`
- After creating an account or signing in -> `home.html` (Welcome to CareerPilot AI)
- Left sidebar menu with icons, top-right profile avatar (add/change/remove photo, profile, log out)
