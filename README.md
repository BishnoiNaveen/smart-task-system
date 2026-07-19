# Smart Task & Reminder System 🚀
### *Full-Stack AI-Powered Productivity Workspace*

Welcome to the **Smart Task & Reminder System**—a production-ready, feature-rich productivity workspace built around the **Model-View-Controller (MVC)** pattern. 

The workspace connects a modern, glassmorphic **React + Vite** client-side dashboard to a robust **Express.js** REST API backed by **PostgreSQL** (via Prisma ORM), and supercharged with swappable **Google Gemini** & **OpenAI** artificial intelligence engines.

---

## 🏗️ Project Architecture Overview

```text
├── prisma/                    # Database configurations & migrations
│   └── schema.prisma          # Prisma PostgreSQL schemas definitions
├── src/                       # Application backend code root
│   ├── config/                # Database pool connection & AI provider keys
│   ├── controllers/           # MVC controllers (process req, calls services, sends res)
│   ├── docs/                  # Swagger UI OpenAPI specs
│   ├── lib/                   # Priority calculation & Recurring helpers
│   ├── middleware/            # JWT auth guards, Multer uploads, Validation interceptors
│   ├── routes/                # Express endpoint routers
│   ├── services/              # Pure business logic (fetch AI calls, scheduler loops)
│   ├── utils/                 # Mailer helpers
│   └── server.js              # Binds HTTP listener socket and handles process signals
├── frontend/                  # React + Vite frontend client application
│   ├── src/
│   │   ├── components/        # Login, Register, Dashboard, TaskManager, Categories, AIChatCoach
│   │   ├── api.js             # Fetch wrappers, JWT interceptor, silent token rotation
│   │   ├── App.jsx            # Layout assembly, global state, toast notification manager
│   │   └── index.css          # Styling system (CSS variables, Dark/Light Mode themes)
│   └── vite.config.js         # Configures /api and /uploads proxy redirection
├── .env                       # Local secrets configuration file (Git ignored!)
└── package.json               # Manifest dependencies & run scripts
```

---

## ⚙️ Local Installation & Setup

### 1. Configure Backend `.env`
Create a `.env` in the root workspace folder with the following variables:
```env
PORT=5000
NODE_ENV=development

# Database Connection (Neon PostgreSQL connection string)
DATABASE_URL="postgresql://neondb_owner:npg_G90NaBUspEhD@ep-dry-thunder-awfwzgnf-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# JWT Auth Secrets
JWT_SECRET="super_secret_key_change_me_in_production_12345"
JWT_REFRESH_SECRET="super_secret_refresh_key_change_me_in_production_54321"

# AI Provider ("gemini" or "openai")
AI_PROVIDER="gemini"
GEMINI_API_KEY="your_google_gemini_api_key_here"
OPENAI_API_KEY="your_openai_api_key_here"
```

### 2. Launch the Backend Server
In the root project directory:
```bash
# Install dependencies
npm install

# Sync database models & compile Prisma Client
npx prisma generate

# Launch Express server in watch mode (boots on http://localhost:5000)
npm run dev
```
*Note: Swagger API documentation will be interactively served at [http://localhost:5000/api-docs](http://localhost:5000/api-docs).*

### 3. Launch the Frontend Server
In a new terminal window, navigate to the `frontend` folder:
```bash
# Navigate to client directory
cd frontend

# Install client dependencies
npm install

# Launch Vite dev server (boots on http://localhost:5173/)
npm run dev
```
*Open [http://localhost:5173](http://localhost:5173) in your browser. All requests to `/api` and `/uploads` will automatically proxy to the backend server.*

---

## 🧠 The AI Integration: A Human-Centric Breakdown

Rather than coupling the system to a single model, this architecture implements an **Orchestrator-Worker pattern**. The application's backend acts as the central executive (planning, state management, validation), while external LLMs are treated as stateless tools called for specialized tasks.

Here is how the AI features work under the hood in a simple, human-digestible format:

### 1. Swappable AI Engine (Gemini ↔ OpenAI)
The backend abstracts AI calls under `ai.service.js`. If you configure `AI_PROVIDER="gemini"`, it targets **Google Gemini (1.5 Flash)** via REST endpoints using `GEMINI_API_KEY`. If configured for `"openai"`, it targets **OpenAI (GPT-4o-mini)**. The rest of the application remains unchanged.

### 2. Natural Language Task Parsing (Smart Task Bar)
*   **The Problem:** Manually filling out forms for task title, description, category, priority, and date is tedious.
*   **The AI Solution:** In the task workspace, you can write: *"review code tomorrow at 5pm high priority work"*.
*   **How it works:** The text is dispatched to `/api/ai/smart-task`. The AI processes the prompt using the system's current time context, parses the intent, maps the date relative to today, suggests a category (`work`), assigns difficulty, and returns a clean structured JSON schema. The frontend automatically populates the creation form fields.

### 3. Smart Task Prioritization & AI Auditing
*   **Mathematical Base:** Every task calculates a live, deterministic priority score (0-100) based on:
    $$\text{Priority Score} = \text{Priority Weight (High: 30, Med: 20, Low: 10)} + \text{Urgency Points (Overdue: 50+, Today: 40, Tomorrow: 25, 3d: 15, 7d: 5)}$$
*   **AI Audit:** Inside any task card, clicking **"Run Audit"** makes an on-demand request to `/api/ai/tasks/:id/priority`. The AI evaluates the task's title, description, difficulty, estimated time, and deadline, providing a human-readable **reasoning statement** and **actionable steps** to get the task done.

### 4. Interactive Chatbot Coach & Performance Reviews
*   **Chatbot Coach:** Under the "AI Coach" tab, you can chat with a conversational agent. The backend retrieves the last 10 messages from the database to maintain context memory so the coach remembers what you said.
*   **Workload Summarizer:** The AI reads all your pending tasks and prints a friendly summary, focal focus points, and a motivating quote.
*   **Performance Reports:** Clicking "Compile Report" sends your task history data to the AI. It calculates a productivity grade, reviews strengths/weaknesses (e.g., *“You are delaying tasks on Thursdays”*), and gives advice for the upcoming period.

### 5. Smart Offline Fallbacks (Zero-Configuration Mode)
*   **The Safeguard:** If an API key is missing or the external API fails (500 errors), the application does **not** crash.
*   **How it works:** The frontend catches failures and switches to a built-in rule-based keyword matcher. If you mention *"priority"* or *"procrastinate"*, it returns tailored, natural productivity tips. If you mention arbitrary text, it uses randomized general coaching tips. NLP smart parser falls back to standard regex extracts. The user gets a smooth, uninterrupted experience.

---

## 🛠️ Key System Assumptions
*   **Email Verification & Login:** The backend generates email verification links using Nodemailer (auto-creating an Ethereal mail mock if SMTP variables are missing). To make testing simple, the login endpoint verifies credentials but does **not** block users whose `isVerified` status is false.
*   **Database Constraints:** The project assumes Neon PostgreSQL in production, but Prisma allows migrating to SQLite locally by switching the provider inside `schema.prisma`.
*   **Session Storage:** Session tokens (`accessToken` and `refreshToken`) and user profile states are stored in browser `localStorage`.
*   **Attachments:** Attachments are uploaded via Multer to a local `uploads/` directory on the server and linked via relative paths.

---

## ⚖️ Trade-offs Made
1. **State-Driven Views vs. Router Library:** In the React client, we implemented a custom state-based view router (`currentView = "dashboard" | "tasks" | ...`) rather than `react-router-dom`. This avoids page flash, keeps dependencies minimal, and simplifies state sharing between tabs. However, it means browser back/forward buttons do not track view state.
2. **Sequential File Uploads:** Task creation is separated from file attachment uploads. Tasks are created first via JSON, and attachments are uploaded during task updates via `multipart/form-data`. This simplifies payload validation on initial creation.
3. **In-Memory Sorting for Score:** The priority score is calculated dynamically based on the current date, meaning it changes every second. To avoid heavy database computations, tasks are fetched from Postgres sorted by due dates and sorted in-memory by Priority Score on request.

---

## 🔮 Future Improvements Roadmap
*   **WebSockets Integration:** Transition from polling to live WebSockets notifications for real-time task updates and background reminders.
*   **Attachment Scan Security:** Integrate antivirus scanning pipelines (e.g., ClamAV) for uploaded files to secure the `uploads` workspace.
*   **Calendar Sync:** Allow bidirectional synchronization of tasks and deadlines to Google Calendar or Microsoft Outlook via OAuth2.
*   **Multi-User Collaborative Workspace:** Enable task sharing, comments, and assignments between users in the same category workspaces.
