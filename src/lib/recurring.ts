import { prisma } from "./db";

export async function handleRecurringTask(task: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | string;
  priority: string;
  recurring: string;
  categoryId: string | null;
  userId: string;
}) {
  if (!task.recurring || task.recurring === "NONE") return;

  const currentDueDate = new Date(task.dueDate);
  const nextDueDate = new Date(currentDueDate);

  if (task.recurring === "DAILY") {
    nextDueDate.setDate(currentDueDate.getDate() + 1);
  } else if (task.recurring === "WEEKLY") {
    nextDueDate.setDate(currentDueDate.getDate() + 7);
  } else if (task.recurring === "MONTHLY") {
    nextDueDate.setMonth(currentDueDate.getMonth() + 1);
  }

  // Create next recurrence task
  await prisma.task.create({
    data: {
      title: task.title,
      description: task.description,
      dueDate: nextDueDate,
      priority: task.priority,
      status: "TODO",
      recurring: task.recurring,
      categoryId: task.categoryId,
      userId: task.userId,
    },
  });

  // Update the current completed task's recurrence to NONE to prevent repeating again
  await prisma.task.update({
    where: { id: task.id },
    data: {
      recurring: "NONE",
    },
  });
}
