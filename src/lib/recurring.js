import { prisma } from "../config/db.js";

/**
 * Handle Recurring Task:
 * When a task with a recurring profile is completed, this helper calculates the next due date 
 * and automatically schedules a new duplicate task instance in the database.
 */
export const handleRecurringTask = async (completedTask) => {
  const currentDueDate = new Date(completedTask.dueDate);
  let nextDueDate = new Date(currentDueDate);

  // Shift dates forward based on frequency profile
  switch (completedTask.recurring) {
    case "DAILY":
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      break;
    case "WEEKLY":
      nextDueDate.setDate(nextDueDate.getDate() + 7);
      break;
    case "MONTHLY":
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      break;
    default:
      return; // "NONE" or invalid profiles skip auto-scheduling
  }

  console.log(`♻️  Recurring Engine: Rescheduling task "${completedTask.title}" from ${currentDueDate.toISOString()} to ${nextDueDate.toISOString()}`);

  try {
    // Insert new task duplicate
    await prisma.task.create({
      data: {
        title: completedTask.title,
        description: completedTask.description,
        dueDate: nextDueDate,
        priority: completedTask.priority,
        status: "TODO", // Fresh status
        recurring: completedTask.recurring,
        difficulty: completedTask.difficulty,
        estimatedTime: completedTask.estimatedTime,
        completionPct: 0.0, // Clean completion status
        categoryId: completedTask.categoryId,
        userId: completedTask.userId
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        action: "RESCHEDULE_RECURRING_TASK",
        details: `Rescheduled task "${completedTask.title}" for ${nextDueDate.toLocaleDateString()}`,
        userId: completedTask.userId
      }
    });
  } catch (error) {
    console.error(`❌ Recurring Engine failed to schedule next instance for task ${completedTask.id}:`, error.message);
  }
};
