import { AI_PROVIDER, OPENAI_API_KEY, GEMINI_API_KEY } from "../config/ai.js";

// Helper function to clean markdown JSON blocks returned by LLMs (e.g. ```json ... ```)
const cleanJSON = (text) => {
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.substring(7);
  } else if (clean.startsWith("```")) {
    clean = clean.substring(3);
  }
  if (clean.endsWith("```")) {
    clean = clean.substring(0, clean.length - 3);
  }
  return clean.trim();
};

// Generic LLM text generator: abstraction layer wrapping Gemini and OpenAI
const callLLM = async (prompt, systemInstruction = "") => {
  try {
    if (AI_PROVIDER === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const fullPrompt = systemInstruction 
        ? `${systemInstruction}\n\nUser Request: ${prompt}` 
        : prompt;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (AI_PROVIDER === "openai") {
      const url = "https://api.openai.com/v1/chat/completions";
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemInstruction || "You are a helpful assistant." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `OpenAI API returned status ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } else {
      throw new Error(`Unsupported AI Provider: ${AI_PROVIDER}`);
    }
  } catch (error) {
    console.error("AI Service LLM Call Failed:", error.message);
    throw new Error(`AI Service Error: ${error.message}`);
  }
};

/**
 * 1. AI Smart Task Parser: Convert natural language into structured fields
 * e.g., "Finish backend tomorrow at 7 PM"
 */
export const parseSmartTask = async (text) => {
  const systemInstruction = `You are an AI task assistant. Analyze the user's input and parse it into a structured JSON task object.
The current local time is: ${new Date().toString()}.
Respond ONLY with a clean JSON block (do not add explanations, backticks, or other text).
JSON Fields required:
- title (string, short summaries)
- description (string, extra context or empty string)
- dueDate (string, ISO8601 date string based on the parsed time. Default to 23:59:59 of parsed day if time is omitted)
- priority (string: "LOW", "MEDIUM", "HIGH")
- recurring (string: "NONE", "DAILY", "WEEKLY", "MONTHLY")
- difficulty (string: "EASY", "MEDIUM", "HARD")
- estimatedTime (number, hours duration. Default is 1.0)
- category (string, suggested category name like "Work", "Personal", "Coding" etc.)`;

  const responseText = await callLLM(text, systemInstruction);
  return JSON.parse(cleanJSON(responseText));
};

/**
 * 2. AI Priority Analyzer: Evaluates metrics to calculate score and write explanation
 */
export const analyzePriority = async (taskDetails) => {
  const systemInstruction = `You are a productivity expert. Analyze the task details provided by the user and calculate priority metrics.
Respond ONLY with a clean JSON block.
JSON Fields required:
- priorityScore (number from 0 to 100, where 100 is most critical)
- urgency (string: "LOW", "MEDIUM", "HIGH", "CRITICAL")
- reason (string, 1-2 sentence concise explanation of why this priority score was assigned based on the deadline, importance, difficulty, and duration)
- suggestions (array of strings, actionable steps to execute this task successfully)`;

  const prompt = JSON.stringify(taskDetails);
  const responseText = await callLLM(prompt, systemInstruction);
  return JSON.parse(cleanJSON(responseText));
};

/**
 * 3. AI Reminder Generator: Generates creative notification texts
 */
export const generateReminderMessage = async (taskDetails) => {
  const prompt = `Write a short, engaging, and motivating reminder notification message for the following task details:
Title: ${taskDetails.title}
Due Date: ${taskDetails.dueDate}
Priority: ${taskDetails.priority}
Status: ${taskDetails.status}
Keep it under 150 characters and motivating. Do not use quotes.`;

  return await callLLM(prompt, "You are a motivating productivity assistant.");
};

/**
 * 4. AI Task Summary: Formulates productivity summaries
 */
export const generateTaskSummary = async (tasksList) => {
  const systemInstruction = `You are a productivity coach. Summarize the user's pending tasks and write a motivation summary.
Respond ONLY with a clean JSON block.
JSON Fields required:
- summary (string, short summary of total tasks, overdue, and pending count)
- focalTasks (array of strings, titles of top 3 high priority/overdue tasks to focus on first)
- encouragement (string, 1 short motivating sentence)`;

  const prompt = JSON.stringify(tasksList.map(t => ({
    title: t.title,
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status
  })));

  const responseText = await callLLM(prompt, systemInstruction);
  return JSON.parse(cleanJSON(responseText));
};

/**
 * 5. AI Productivity Coach: Analyzes working patterns and makes recommendations
 */
export const getProductivityCoachAdvice = async (completedTasksList) => {
  const prompt = `Analyze my completion patterns and give productivity feedback:
${JSON.stringify(completedTasksList)}
Provide 3 tailored tips to optimize focus time, reduce overdue tasks, or maintain velocity.
Respond ONLY with a clean JSON array of strings (the tips).`;

  const responseText = await callLLM(prompt, "You are an expert productivity consultant.");
  return JSON.parse(cleanJSON(responseText));
};

/**
 * 6. AI Weekly/Monthly Performance Report
 */
export const generatePerformanceReport = async (tasksList, period = "weekly") => {
  const systemInstruction = `You are a performance reviewer. Analyze the task history and generate a performance report.
Respond ONLY with a clean JSON block.
JSON Fields required:
- periodSummary (string, short performance summary)
- productivityScore (number, 0 to 100 rating based on completed vs overdue tasks)
- completionRatePct (number, percent of completed tasks)
- analysis (string, summary analysis of working patterns, strengths, weaknesses)
- advice (array of strings, tips for the next period)`;

  const prompt = `Generate a ${period} report for: ${JSON.stringify(tasksList)}`;
  const responseText = await callLLM(prompt, systemInstruction);
  return JSON.parse(cleanJSON(responseText));
};

/**
 * 7. AI Dashboard Forecasts
 */
export const generateAIInsights = async (stats) => {
  const systemInstruction = `You are a data analyst. Generate short predictions andinsights based on current dashboard statistics.
Respond ONLY with a clean JSON block.
JSON Fields required:
- dailyInsight (string, primary daily tip)
- completionForecast (string, forecast of when current pending tasks will be done based on completion velocity)
- bottleneckRisk (string, identify any bottlenecks like too many high-priority tasks)
- taskFrictionPct (number, estimated percentage difficulty in finishing current todo backlog)`;

  const prompt = JSON.stringify(stats);
  const responseText = await callLLM(prompt, systemInstruction);
  return JSON.parse(cleanJSON(responseText));
};

/**
 * 8. Chatbot Interactive Service (Handles conversation with context history)
 */
export const getChatbotResponse = async (history, userMessage) => {
  const systemInstruction = `You are the AI Productivity Chatbot of the Smart Task & Reminder System.
Your goal is to help users manage their workload, offer smart scheduling advice, and answer questions.
You have access to the user's chat logs for context memory. Keep your responses motivating, concise, and helpful.`;

  // Format history messages into LLM standard chat format
  const chatContext = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n");
  const prompt = `${chatContext}\nUSER: ${userMessage}\nASSISTANT:`;

  return await callLLM(prompt, systemInstruction);
};
