import { prisma } from "../config/db.js";

// 1. Get All Categories for Current User
export const getCategories = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    });

    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
};

// 2. Create Category
export const createCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: "Category name and color code are required." });
    }

    // Verify category name unique constraint for this specific user
    const existing = await prisma.category.findUnique({
      where: {
        name_userId: {
          name,
          userId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: "Category with this name already exists." });
    }

    const category = await prisma.category.create({
      data: {
        name,
        color,
        userId
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        action: "CREATE_CATEGORY",
        details: `Created category: ${name}`,
        userId
      }
    });

    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
};

// 3. Delete Category
export const deleteCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.userId !== userId) {
      return res.status(404).json({ error: "Category not found or access unauthorized." });
    }

    await prisma.category.delete({ where: { id } });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        action: "DELETE_CATEGORY",
        details: `Deleted category: ${category.name}`,
        userId
      }
    });

    res.status(200).json({ message: "Category deleted successfully." });
  } catch (error) {
    next(error);
  }
};
