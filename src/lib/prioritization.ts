export interface TaskWithScore {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  priority: string; // "LOW", "MEDIUM", "HIGH"
  status: string; // "TODO", "IN_PROGRESS", "COMPLETED"
  recurring: string; // "NONE", "DAILY", "WEEKLY", "MONTHLY"
  categoryId: string | null;
  category?: { id: string; name: string; color: string } | null;
  createdAt: Date;
  updatedAt: Date;
  priorityScore: number;
}

export function computePriorityScore(task: {
  dueDate: Date | string;
  priority: string;
}): number {
  let priorityWeight = 10;
  if (task.priority === "HIGH") priorityWeight = 30;
  else if (task.priority === "MEDIUM") priorityWeight = 20;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let urgencyPoints = 0;
  if (diffDays < 0) {
    // Overdue: base 50 + extra points per day overdue
    urgencyPoints = 50 + Math.min(30, Math.abs(diffDays) * 2);
  } else if (diffDays === 0) {
    // Due today
    urgencyPoints = 40;
  } else if (diffDays === 1) {
    // Due tomorrow
    urgencyPoints = 25;
  } else if (diffDays <= 3) {
    // Due in 2 or 3 days
    urgencyPoints = 15;
  } else if (diffDays <= 7) {
    // Due in 4 to 7 days
    urgencyPoints = 5;
  }

  return priorityWeight + urgencyPoints;
}

export function sortTasksByPriority(tasks: any[]): TaskWithScore[] {
  const scoredTasks = tasks.map((task) => ({
    ...task,
    priorityScore: computePriorityScore(task),
  }));

  return scoredTasks.sort((a, b) => {
    // Completed tasks are sorted at the bottom
    if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
    if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1;
    
    // Sort active tasks by score in descending order
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    
    // Tie breaker: earliest due date first
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}
