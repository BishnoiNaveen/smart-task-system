import { prisma } from "../config/db.js";
import { sendEmail } from "../utils/mailer.js";
import { generateReminderMessage } from "./ai.service.js";

// Queries database for overdue, today, and tomorrow tasks and dispatches reminders
export const processReminders = async () => {
  console.log("⏰ Reminder Engine: Scanning for pending task alerts...");
  try {
    const today = new Date();
    
    // 1. Fetch tasks that are pending (TODO or IN_PROGRESS)
    const pendingTasks = await prisma.task.findMany({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] }
      },
      include: {
        user: true
      }
    });

    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(new Date(startOfToday).setDate(startOfToday.getDate() + 1));
    const endOfTomorrow = new Date(new Date(startOfToday).setDate(startOfToday.getDate() + 2));

    for (const task of pendingTasks) {
      const taskDueDate = new Date(task.dueDate);
      let alertType = "";

      if (taskDueDate < startOfToday) {
        alertType = "OVERDUE";
      } else if (taskDueDate >= startOfToday && taskDueDate < endOfToday) {
        alertType = "DUE TODAY";
      } else if (taskDueDate >= endOfToday && taskDueDate < endOfTomorrow) {
        alertType = "DUE TOMORROW";
      } else {
        continue; // Future tasks skip active reminder dispatch
      }

      // Check if a reminder has already been created for this task within the last 12 hours (prevents spamming)
      const existingReminder = await prisma.reminder.findFirst({
        where: {
          taskId: task.id,
          createdAt: {
            gte: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
          }
        }
      });

      if (existingReminder) continue;

      console.log(`⏰ Reminder Engine: Preparing alert for [${alertType}] Task: "${task.title}" to ${task.user.email}`);

      // Generate a creative, customized message using AI
      let reminderText = `Reminder: Your task "${task.title}" is ${alertType.toLowerCase()}. Due date: ${task.dueDate}`;
      try {
        reminderText = await generateReminderMessage(task);
      } catch (aiErr) {
        console.warn(`⚠️  Reminder AI generation failed: ${aiErr.message}. Using fallback template.`);
      }

      // Save System Notification in Database
      await prisma.notification.create({
        data: {
          title: `Task Alert: ${alertType}`,
          message: reminderText,
          userId: task.user.id
        }
      });

      // Send Email Reminder
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #6366f1;">Smart Task Alert ⏰</h2>
          <p>Hello <strong>${task.user.name || "User"}</strong>,</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #6366f1; border-radius: 4px; margin: 20px 0;">
            <p style="font-size: 16px; margin: 0; font-style: italic;">"${reminderText}"</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 120px;">Priority:</td>
              <td style="padding: 8px 0;">${task.priority}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0;">${task.dueDate.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0;">${task.status.replace("_", " ")}</td>
            </tr>
          </table>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated notification from your Smart Task System.</p>
        </div>
      `;

      try {
        await sendEmail({
          to: task.user.email,
          subject: `Alert: "${task.title}" is ${alertType}`,
          html: emailHtml
        });

        // Log the sent reminder
        await prisma.reminder.create({
          data: {
            title: `Reminder Sent: ${alertType}`,
            remindAt: new Date(),
            isSent: true,
            type: "EMAIL",
            taskId: task.id,
            userId: task.user.id
          }
        });
      } catch (mailErr) {
        console.error(`❌ Reminder email send failed for task ${task.id}:`, mailErr.message);
      }
    }
  } catch (error) {
    console.error("❌ Reminder scheduler process failed:", error.message);
  }
};

// Scheduler worker loop: runs every 30 minutes in production
let schedulerInterval;

export const startReminderScheduler = () => {
  if (schedulerInterval) return;

  // Run immediately on boot
  processReminders();

  // Trigger check cycle every 30 minutes
  schedulerInterval = setInterval(processReminders, 30 * 60 * 1000);
  console.log("⏰ Background Reminder Worker Thread Started.");
};

export const stopReminderScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("⏰ Background Reminder Worker Thread Stopped.");
  }
};
