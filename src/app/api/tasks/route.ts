import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { sortTasksByPriority, computePriorityScore } from "@/lib/prioritization";
import { handleRecurringTask } from "@/lib/recurring";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      include: {
        category: true,
      },
    });

    const sortedTasks = sortTasksByPriority(tasks);
    return NextResponse.json({ tasks: sortedTasks }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, dueDate, priority, status, recurring, categoryId } = body;

    if (!title || !dueDate || !priority || !status || !recurring) {
      return NextResponse.json(
        { error: "Title, dueDate, priority, status, and recurring are required" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        priority,
        status,
        recurring,
        categoryId: categoryId || null,
        userId: user.id,
      },
      include: {
        category: true,
      },
    });

    const taskWithScore = {
      ...task,
      priorityScore: computePriorityScore(task),
    };

    return NextResponse.json({ task: taskWithScore }, { status: 201 });
  } catch (error: any) {
    console.error("Create task error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, description, dueDate, priority, status, recurring, categoryId } = body;

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask || existingTask.userId !== user.id) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;
    if (recurring !== undefined) updateData.recurring = recurring;
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    // Check if task status was changed to COMPLETED and it is a recurring task
    if (status === "COMPLETED" && existingTask.status !== "COMPLETED" && updatedTask.recurring !== "NONE") {
      await handleRecurringTask(updatedTask);
      
      // Fetch the updated task list to return to the user reflecting the updated state
      const tasks = await prisma.task.findMany({
        where: { userId: user.id },
        include: { category: true },
      });
      return NextResponse.json({ tasks: sortTasksByPriority(tasks) }, { status: 200 });
    }

    const taskWithScore = {
      ...updatedTask,
      priorityScore: computePriorityScore(updatedTask),
    };

    return NextResponse.json({ task: taskWithScore }, { status: 200 });
  } catch (error: any) {
    console.error("Update task error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask || existingTask.userId !== user.id) {
      return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Task deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete task error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
