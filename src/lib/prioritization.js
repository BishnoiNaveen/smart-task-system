/**
 * Smart Priority Engine: Calculates a priority score between 0 and 100
 * Score parameters:
 * 1. Base Priority: HIGH = 40, MEDIUM = 25, LOW = 10
 * 2. Urgency: Overdue = 40, Due Today = 30, Due <= 3 days = 20, Due <= 7 days = 10, Else = 0
 * 3. Difficulty: HARD = 10, MEDIUM = 5, EASY = 2
 * 4. Progress: Deducts score weight proportionally based on Completion Percentage
 */
export const computePriorityScore = (task) => {
  if (task.status === "COMPLETED" || task.completionPct >= 100) {
    return 0; // Completed tasks require no execution urgency
  }

  // 1. Base Priority weight
  let baseScore = 10;
  if (task.priority === "HIGH") baseScore = 40;
  if (task.priority === "MEDIUM") baseScore = 25;

  // 2. Deadline Urgency weight
  let urgencyScore = 0;
  const today = new Date();
  const dueDate = new Date(task.dueDate);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffTime < 0) {
    urgencyScore = 40; // Overdue tasks carry maximum urgency penalty
  } else if (diffDays <= 1) {
    urgencyScore = 30; // Due today
  } else if (diffDays <= 3) {
    urgencyScore = 20; // Due in next 3 days
  } else if (diffDays <= 7) {
    urgencyScore = 10; // Due in next 7 days
  }

  // 3. Difficulty multiplier
  let difficultyScore = 2;
  if (task.difficulty === "HARD") difficultyScore = 10;
  if (task.difficulty === "MEDIUM") difficultyScore = 5;

  // Combine components
  const maxPotentialScore = baseScore + urgencyScore + difficultyScore;

  // 4. Progress deduction modifier
  const progressModifier = 1 - (task.completionPct / 100);
  const finalScore = maxPotentialScore * progressModifier;

  // Return rounded score bounded within [0, 100]
  return Math.min(100, Math.max(0, Math.round(finalScore)));
};
