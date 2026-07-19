import { prisma } from "../config/db.js";
import {
  getChatbotResponse,
  parseSmartTask,
  analyzePriority,
  getProductivityCoachAdvice,
  generatePerformanceReport,
  generateTaskSummary
} from "../services/ai.service.js";

// 1. AI Productivity Chatbot Endpoint (Maintains conversation context history)
export const handleAIChat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message content is required." });
    }

    // Retrieve last 10 chat messages to pass context to the LLM
    const history = await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    
    // Sort chronologically for the LLM
    const sortedHistory = history.reverse();

    // Call Chatbot engine
    const reply = await getChatbotResponse(sortedHistory, message);

    // Save both the user prompt and the AI reply in the history logs
    await prisma.chatHistory.create({
      data: { role: "user", content: message, userId }
    });
    await prisma.chatHistory.create({
      data: { role: "assistant", content: reply, userId }
    });

    res.status(200).json({ reply });
  } catch (error) {
    next(error);
  }
};

// 2. AI Smart Task Creation (Parses "Finish backend tomorrow at 7 PM" and creates task automatically)
export const handleSmartCreateTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Input text description is required." });
    }

    // Run Natural Language Task Parser
    const parsedData = await parseSmartTask(text);

    // Check if the suggested category name exists for this user, if not create it
    let categoryId = null;
    if (parsedData.category) {
      const cleanCatName = parsedData.category.trim();
      let category = await prisma.category.findUnique({
        where: {
          name_userId: {
            name: cleanCatName,
            userId
          }
        }
      });

      if (!category) {
        // Automatically create a category with a random pastel color
        const colors = ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#60a5fa", "#818cf8", "#c084fc"];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        category = await prisma.category.create({
          data: {
            name: cleanCatName,
            color: randomColor,
            userId
          }
        });
      }
      categoryId = category.id;
    }

    // Create the task in the database
    const task = await prisma.task.create({
      data: {
        title: parsedData.title || "Smart Task",
        description: parsedData.description || `AI Generated from text: "${text}"`,
        dueDate: parsedData.dueDate ? new Date(parsedData.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
        priority: parsedData.priority || "MEDIUM",
        status: "TODO",
        recurring: parsedData.recurring || "NONE",
        difficulty: parsedData.difficulty || "MEDIUM",
        estimatedTime: parseFloat(parsedData.estimatedTime || "1.0"),
        completionPct: 0.0,
        categoryId,
        userId
      },
      include: {
        category: true
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        action: "AI_SMART_CREATE_TASK",
        details: `Automatically generated task: "${task.title}"`,
        userId
      }
    });

    res.status(201).json({
      message: "AI Smart task generated and saved successfully.",
      task
    });
  } catch (error) {
    next(error);
  }
};

// 3. AI Priority analysis on demand for an existing task
export const handleTaskPriorityAnalysis = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { category: true }
    });

    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: "Task not found or access unauthorized." });
    }

    const analysis = await analyzePriority({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      difficulty: task.difficulty,
      estimatedTime: task.estimatedTime,
      completionPct: task.completionPct,
      category: task.category?.name || "None"
    });

    // Save AI Suggestion
    const suggestion = await prisma.aiSuggestion.create({
      data: {
        type: "PRIORITY",
        content: JSON.stringify(analysis),
        userId
      }
    });

    res.status(200).json({ analysis, suggestionId: suggestion.id });
  } catch (error) {
    next(error);
  }
};

// 4. AI Productivity Coach Advice
export const handleProductivityAdvice = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user's completed tasks over the last 30 days to review patterns
    const completedTasks = await prisma.task.findMany({
      where: {
        userId,
        status: "COMPLETED",
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        title: true,
        priority: true,
        difficulty: true,
        estimatedTime: true,
        updatedAt: true,
        createdAt: true
      }
    });

    const advice = await getProductivityCoachAdvice(completedTasks);

    // Save Advice Suggestion
    await prisma.aiSuggestion.create({
      data: {
        type: "PRODUCTIVITY",
        content: JSON.stringify(advice),
        userId
      }
    });

    res.status(200).json({ advice });
  } catch (error) {
    next(error);
  }
};

// 5. AI Weekly or Monthly Performance Report
export const handlePerformanceReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = "weekly" } = req.query; // Options: "weekly", "monthly"

    const daysLimit = period === "monthly" ? 30 : 7;

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        updatedAt: {
          gte: new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        title: true,
        priority: true,
        status: true,
        difficulty: true,
        completionPct: true,
        dueDate: true
      }
    });

    const report = await generatePerformanceReport(tasks, period);

    // Save Report Suggestion
    await prisma.aiSuggestion.create({
      data: {
        type: period.toUpperCase() + "_REPORT",
        content: JSON.stringify(report),
        userId
      }
    });

    res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
};

// 6. AI Task Summaries
export const handleTaskSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user's active pending tasks
    const pendingTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ["TODO", "IN_PROGRESS"] }
      }
    });

    const summary = await generateTaskSummary(pendingTasks);

    res.status(200).json({ summary });
  } catch (error) {
    next(error);
  }
};
