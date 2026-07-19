# Enterprise AI-Powered Smart Task & Reminder System API

A production-ready, feature-rich Express.js REST API structured around the **Model-View-Controller (MVC)** design pattern, backed by **PostgreSQL** (via Prisma ORM), secured with JWT authentication, and augmented by **Google Gemini** & **OpenAI** artificial intelligence endpoints.

---

## 🚀 Key Features

*   **Secure Authentication:** User signup, login, session token rotation (Access/Refresh), email verification, and password resets using Nodemailer.
*   **Hierarchical Task Manager:** Create, update, delete, and find tasks with subtask checks, multi-format attachments (Multer), categories, and status states.
*   **Deterministically Prioritized Tasks:** Tasks calculate an live priority score (0-100) based on deadline urgency, difficulty weights, and progress completeness.
*   **Recurring Task rescheduler:** Auto-creates new task duplicates shifted forward in date on completion (Daily, Weekly, Monthly cycles).
*   **Background reminders worker:** A daemon scheduler that scans due tasks, logs notification logs, and sends warning emails via SMTP.
*   **Dashboard metrics:** Real-time metrics, weekly chart vectors, category counts, and AI bottleneck predictions.
*   **Double AI provider support:** Swappable abstraction layer between **Google Gemini (1.5 Flash)** and **OpenAI (GPT-4o-mini)** using standard fetch requests.
*   **AI Smart Features:** Smart NLP task creations ("*finish backend tomorrow at 4pm*"), chatbot coach assistance, weekly productivity performance reports, and forecast predictions.
*   **Self-documenting Swagger:** Embedded OpenAPI 3.0 specifications served interactively at `/api-docs`.

---

## 📂 Project Architecture

```text
├── prisma/                    # Database configurations & migrations
│   └── schema.prisma          # Prisma PostgreSQL schemas definitions
├── src/                       # Application code root
│   ├── config/                # Database pool connection & AI provider keys
│   ├── controllers/           # MVC controllers (process req, calls services, sends res)
│   ├── docs/                  # Swagger UI OpenAPI specs
│   ├── lib/                   # Priority calculation & Recurring helpers
│   ├── middleware/            # JWT auth guards, Multer uploads, Validation interceptors
│   ├── routes/                # Express endpoint routers
│   ├── services/              # Pure business logic (fetch AI calls, scheduler loops)
│   ├── utils/                 # Mailer helpers
│   ├── validators/            # Request body schemas checks
│   ├── app.js                 # Bootstraps global middleware and mounts routes
│   └── server.js              # Binds HTTP listener socket and handles process signals
├── .env                       # Local secrets configuration file (Git ignored!)
├── package.json               # Manifest dependencies & run scripts
└── postman_collection.json    # Importable collection file for API testing
```

---

## ⚙️ Local Installation & Boot

### 1. Requirements
Ensure you have **Node.js (v18+)** and **npm** installed.

### 2. Configure Environment `.env`
Create a `.env` in the root folder with the following variables:
```env
PORT=5000
NODE_ENV=development

# Database Connection (PostgreSQL connection string)
DATABASE_URL="postgresql://user:pass@host:port/database?sslmode=require"

# JWT Auth Secrets
JWT_SECRET="super_secret_key_change_me_in_production_12345"
JWT_REFRESH_SECRET="super_secret_refresh_key_change_me_in_production_54321"

# AI Provider ("gemini" or "openai")
AI_PROVIDER="gemini"
GEMINI_API_KEY="your_google_gemini_api_key"
OPENAI_API_KEY="your_openai_api_key"

# (Optional) SMTP Server Settings for Emails. (If omitted, Ethereal Mail mock is generated)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="smtp_username"
SMTP_PASS="smtp_password"
```

### 3. Install packages
```bash
npm install
```

### 4. Sync Database Schema Migrations
```bash
npx prisma migrate dev
```

### 5. Launch Dev Server
```bash
npm run dev
```
The server will boot and watch for changes on **`http://localhost:5000`**.

---

## 📖 API Endpoints Reference

### 🔐 Authentication (`/api/auth`)
*   `POST /register`: Registers a new user. Default first user is set to `ADMIN`.
*   `POST /login`: Validates password and issues access (15m) & refresh (7d) tokens.
*   `POST /refresh-token`: Returns new access token using a refresh token.
*   `POST /logout`: Clears the refresh token session.
*   `GET /verify-email`: Verifies signup token.
*   `POST /forgot-password`: Email link reset request.
*   `POST /reset-password`: Set new password.

### 🏷️ Categories (`/api/categories`)
*   `GET /`: List user categories.
*   `POST /`: Add a category tag (needs `name`, `color` hex code).
*   `DELETE /:id`: Remove category by ID.

### 📝 Tasks (`/api/tasks`)
*   `GET /`: Returns page list of tasks. Query parameters: `search`, `status`, `priority`, `categoryId`, `dueDate`, `sortBy` (dueDate, priorityScore, createdAt), `sortOrder` (asc, desc), `page`, `limit`.
*   `GET /:id`: Detail view of a task including subtasks & attachments.
*   `POST /`: Create task. (Triggers AI Priority analysis asynchronously).
*   `PUT /:id`: Edit task. Supports optional single attachment file (`attachment` multipart field).
*   `DELETE /:id`: Delete task.
*   `POST /:taskId/subtasks`: Add a subtask.
*   `PATCH /subtasks/:subtaskId/toggle`: Check/Uncheck subtask completion.

### 📊 Dashboard (`/api/dashboard`)
*   `GET /`: Compiles task counts, weekly charts, completion ratios, and queries AI for dashboard bottleneck forecasts.

### 🤖 AI Engine (`/api/ai`)
*   `POST /chat`: Motivation chatbot maintaining conversation context logs.
*   `POST /smart-task`: Instantly generates and saves a task from natural language text.
*   `GET /tasks/:taskId/priority`: Runs AI prioritization analyzer on an existing task.
*   `GET /coach`: Summarizes completed tasks and prints productivity coaching tips.
*   `GET /report`: Generates weekly performance reports.
*   `GET /summary`: Prints workload active summaries.

---

## 📄 Database ER Diagram layout

```mermaid
erDiagram
    User ||--o{ Task : owns
    User ||--o{ Category : defines
    User ||--o{ Reminder : logs
    User ||--o{ ChatHistory : records
    User ||--o{ Notification : receives
    User ||--o{ ActivityLog : generates
    User ||--o{ AISuggestion : receives
    
    Category ||--o{ Task : classifies
    
    Task ||--o{ Subtask : breaks-into
    Task ||--o{ Attachment : stores
    Task ||--o{ Reminder : alerts
```

---

## 🌐 Production Deployment

### Option A: Railway
1. Sign up on [Railway.app](https://railway.app).
2. Connect your GitHub repository.
3. Click **New Project** > **Deploy from GitHub repo**.
4. In Railway variables configuration, add environment variables for `DATABASE_URL`, `JWT_SECRET`, `AI_PROVIDER`, etc.
5. Railway reads `package.json` scripts and automatically provisions the build.

### Option B: Render
1. Create a free account on [Render.com](https://render.com).
2. Click **New** > **Web Service** and link your GitHub repository.
3. In configurations:
    *   **Runtime:** Node
    *   **Build Command:** `npm install`
    *   **Start Command:** `npm start`
4. Add Environment Variables inside the **Env** tab.
5. Render deploys the backend container and generates an HTTPS URL.
