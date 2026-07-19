import { prisma } from "../config/db.js";
import { computePriorityScore } from "../lib/prioritization.js";
import { handleRecurringTask } from "../lib/recurring.js";
import { analyzePriority } from "../services/ai.service.js";

// 1. Get Tasks (Supports search, filter, sorting, pagination, and dynamic priority decoration)
export const getTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      search,
      status,
      priority,
      categoryId,
      dueDate,
      sortBy = "dueDate",
      sortOrder = "asc",
      page = 1,
      limit = 10
    } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build query conditions
    const where = { userId };
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ];
    }

    if (dueDate) {
      const date = new Date(dueDate);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      where.dueDate = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    // Determine ordering for DB-level sortable fields
    let orderBy = {};
    if (sortBy !== "priorityScore") {
      orderBy = { [sortBy]: sortOrder };
    }

    // Execute query
    const totalTasks = await prisma.task.count({ where });
    const tasks = await prisma.task.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy,
      include: {
        category: true,
        subtasks: true,
        attachments: true
      }
    });

    // Decorate tasks in-memory with dynamically computed priority scores
    let decoratedTasks = tasks.map(task => ({
      ...task,
      priorityScore: computePriorityScore(task)
    }));

    // If sorting by computed priorityScore, sort in-memory
    if (sortBy === "priorityScore") {
      decoratedTasks.sort((a, b) => {
        return sortOrder === "asc"
          ? a.priorityScore - b.priorityScore
          : b.priorityScore - a.priorityScore;
      });
    }

    res.status(200).json({
      pagination: {
        totalItems: totalTasks,
        currentPage: parsedPage,
        totalPages: Math.ceil(totalTasks / parsedLimit),
        limit: parsedLimit
      },
      tasks: decoratedTasks
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Single Task By ID
export const getTaskById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        category: true,
        subtasks: { orderBy: { createdAt: "asc" } },
        attachments: true
      }
    });

    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: "Task not found or access unauthorized." });
    }

    const taskWithScore = {
      ...task,
      priorityScore: computePriorityScore(task)
    };

    res.status(200).json({ task: taskWithScore });
  } catch (error) {
    next(error);
  }
};

// 3. Create Task (Triggers AI analysis automatically)
export const createTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      dueDate,
      priority,
      status = "TODO",
      recurring = "NONE",
      difficulty = "MEDIUM",
      estimatedTime = 1.0,
      completionPct = 0.0,
      categoryId
    } = req.body;

    // Create Task record
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        priority,
        status,
        recurring,
        difficulty,
        estimatedTime: parseFloat(estimatedTime),
        completionPct: parseFloat(completionPct),
        categoryId: categoryId || null,
        userId
      },
      include: {
        category: true
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE_TASK",
        details: `Created task: ${title}`,
        userId
      }
    });

    // Run Asynchronous AI Priority analysis
    try {
      const aiAnalysis = await analyzePriority({
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        difficulty: task.difficulty,
        estimatedTime: task.estimatedTime
      });

      // Save AI insights in suggestions table
      await prisma.aiSuggestion.create({
        data: {
          type: "PRIORITY",
          content: JSON.stringify(aiAnalysis),
          userId
        }
      });
    } catch (aiErr) {
      console.warn("⚠️  AI priority analysis skipped on creation:", aiErr.message);
    }

    const taskWithScore = {
      ...task,
      priorityScore: computePriorityScore(task)
    };

    res.status(201).json({ task: taskWithScore });
  } catch (error) {
    next(error);
  }
};

// 4. Update Task (Supports file upload and triggers recurrence handler)
export const updateTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      title,
      description,
      dueDate,
      priority,
      status,
      recurring,
      difficulty,
      estimatedTime,
      completionPct,
      categoryId
    } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask || existingTask.userId !== userId) {
      return res.status(404).json({ error: "Task not found or access unauthorized." });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (recurring !== undefined) updateData.recurring = recurring;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (estimatedTime !== undefined) updateData.estimatedTime = parseFloat(estimatedTime);
    if (completionPct !== undefined) {
      updateData.completionPct = parseFloat(completionPct);
      // Auto complete task if percentage hits 100
      if (parseFloat(completionPct) >= 100) {
        updateData.status = "COMPLETED";
      }
    }
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;

    // Handle File Attachment Upload if Multer caught a file
    if (req.file) {
      await prisma.attachment.create({
        data: {
          filename: req.file.originalname,
          filepath: req.file.path,
          mimetype: req.file.mimetype,
          taskId: id
        }
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subtasks: true,
        attachments: true
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        action: "UPDATE_TASK",
        details: `Updated task: ${updatedTask.title}`,
        userId
      }
    });

    // Check if status changed to COMPLETED and is a recurring task
    if (status === "COMPLETED" && existingTask.status !== "COMPLETED" && updatedTask.recurring !== "NONE") {
      await handleRecurringTask(updatedTask);
    }

    const taskWithScore = {
      ...updatedTask,
      priorityScore: computePriorityScore(updatedTask)
    };

    res.status(200).json({ task: taskWithScore });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Task
export const deleteTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: "Task not found or access unauthorized." });
    }

    await prisma.task.delete({ where: { id } });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        action: "DELETE_TASK",
        details: `Deleted task: ${task.title}`,
        userId
      }
    });

    res.status(200).json({ message: "Task deleted successfully." });
  } catch (error) {
    next(error);
  }
};

// 6. Subtasks Operations
export const createSubtask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Subtask title is required." });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: "Parent task not found or access unauthorized." });
    }

    const subtask = await prisma.subtask.create({
      data: {
        title,
        taskId
      }
    });

    res.status(201).json({ subtask });
  } catch (error) {
    next(error);
  }
};

export const toggleSubtask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subtaskId } = req.params;

    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: true }
    });

    if (!subtask || subtask.task.userId !== userId) {
      return res.status(404).json({ error: "Subtask not found or access unauthorized." });
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { isCompleted: !subtask.isCompleted }
    });

    res.status(200).json({ subtask: updated });
  } catch (error) {
    next(error);
  }
};
