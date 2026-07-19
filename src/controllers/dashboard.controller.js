import { prisma } from "../config/db.js";
import { generateAIInsights } from "../services/ai.service.js";

// 1. Fetch Dashboard Analytics and Statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date();

    // Fetch user's tasks
    const tasks = await prisma.task.findMany({
      where: { userId }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
    const pendingTasks = tasks.filter(t => t.status !== "COMPLETED").length;
    const highPriorityTasks = tasks.filter(t => t.priority === "HIGH").length;

    // Calculate Overdue (due date passed and status is not COMPLETED)
    const overdueTasks = tasks.filter(t => {
      return new Date(t.dueDate) < today && t.status !== "COMPLETED";
    }).length;

    // Calculate overall completion velocity rate
    const completionRatePct = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // 2. Fetch Category Distribution
    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    });

    const categoryDistribution = categories.map(cat => ({
      categoryId: cat.id,
      name: cat.name,
      color: cat.color,
      count: cat._count.tasks
    }));

    // Add "Uncategorized" count
    const uncategorizedCount = tasks.filter(t => !t.categoryId).length;
    if (uncategorizedCount > 0) {
      categoryDistribution.push({
        categoryId: null,
        name: "Uncategorized",
        color: "#9ca3af",
        count: uncategorizedCount
      });
    }

    // 3. Priority Distribution
    const priorityDistribution = {
      HIGH: tasks.filter(t => t.priority === "HIGH").length,
      MEDIUM: tasks.filter(t => t.priority === "MEDIUM").length,
      LOW: tasks.filter(t => t.priority === "LOW").length
    };

    // 4. Progress over the last 7 days (Weekly Chart Data)
    const last7Days = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date();
      d.setDate(today.getDate() - idx);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const weeklyProgress = last7Days.map(date => {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const doneOnDay = tasks.filter(t => {
        if (t.status !== "COMPLETED") return false;
        const compDate = new Date(t.updatedAt);
        return compDate >= start && compDate <= end;
      }).length;

      return {
        date: start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        completedCount: doneOnDay
      };
    });

    // Package stats payload for AI analyzer
    const statsPayload = {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      highPriorityTasks,
      completionRatePct
    };

    // 5. Query AI insights for the dashboard
    let aiInsights = {
      dailyInsight: "Set up task lists and start checking them off to unlock dashboard predictions!",
      completionForecast: "N/A",
      bottleneckRisk: "Low",
      taskFrictionPct: 0
    };

    try {
      if (totalTasks > 0) {
        aiInsights = await generateAIInsights(statsPayload);
      }
    } catch (aiErr) {
      console.warn("⚠️  Dashboard AI Forecast calculation skipped:", aiErr.message);
    }

    res.status(200).json({
      metrics: statsPayload,
      categoryDistribution,
      priorityDistribution,
      weeklyProgress,
      aiInsights
    });
  } catch (error) {
    next(error);
  }
};
