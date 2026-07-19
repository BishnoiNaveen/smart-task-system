"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Tag,
  LogOut,
  Sun,
  Moon,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Mail,
  Trash2,
  Edit2,
  Kanban,
  List,
  User,
  Clock,
  CheckSquare,
  X
} from "lucide-react";
import "./dashboard.css";

// TS Interfaces
interface Category {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
  recurring: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  categoryId: string | null;
  category: Category | null;
  priorityScore: number;
}

interface AppUser {
  id: string;
  email: string;
  name: string | null;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning";
}

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4"  // Cyan
];

export default function DashboardPage() {
  const router = useRouter();
  
  // App-level state
  const [user, setUser] = useState<AppUser | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "categories">("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Task Filters / Search State
  const [taskSearch, setTaskSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  const [filterPriority, setFilterPriority] = useState<"ALL" | "LOW" | "MEDIUM" | "HIGH">("ALL");
  const [filterCategory, setFilterCategory] = useState<"ALL" | string>("ALL");
  const [filterDate, setFilterDate] = useState<"ALL" | "TODAY" | "OVERDUE">("ALL");
  const [taskViewMode, setTaskViewMode] = useState<"kanban" | "list">("kanban");
  const [sortField, setSortField] = useState<"score" | "dueDate" | "title">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [taskStatus, setTaskStatus] = useState<"TODO" | "IN_PROGRESS" | "COMPLETED">("TODO");
  const [taskRecurring, setTaskRecurring] = useState<"NONE" | "DAILY" | "WEEKLY" | "MONTHLY">("NONE");
  const [taskCategoryId, setTaskCategoryId] = useState("");

  // Category creation state
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  // Kanban drag helper
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Initialize and check session
  useEffect(() => {
    async function initApp() {
      try {
        const userRes = await fetch("/api/auth/me");
        const userData = await userRes.json();

        if (!userData.user) {
          router.push("/login");
          return;
        }

        setUser(userData.user);

        // Fetch tasks and categories
        const [tasksRes, catsRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/categories")
        ]);

        const tasksData = await tasksRes.json();
        const catsData = await catsRes.json();

        setTasks(tasksData.tasks || []);
        setCategories(catsData.categories || []);

        // Load theme from localStorage or fallback to dark
        const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "dark";
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);

        // Trigger Startup Reminder Alert
        triggerStartupReminder(tasksData.tasks || [], userData.user);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    }

    initApp();
  }, [router]);

  // Trigger startup reminder toasts
  const triggerStartupReminder = (allTasks: Task[], currentUser: AppUser) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const pendingTasks = allTasks.filter(t => t.status !== "COMPLETED");
    
    const overdue = pendingTasks.filter(t => {
      const dueStr = new Date(t.dueDate).toISOString().split("T")[0];
      return dueStr < todayStr;
    });

    const dueToday = pendingTasks.filter(t => {
      const dueStr = new Date(t.dueDate).toISOString().split("T")[0];
      return dueStr === todayStr;
    });

    const highPriority = pendingTasks.filter(t => t.priority === "HIGH" && new Date(t.dueDate).toISOString().split("T")[0] > todayStr);

    if (overdue.length > 0 || dueToday.length > 0) {
      addToast(
        "Startup Tasks Reminder",
        `You have ${overdue.length} overdue tasks and ${dueToday.length} tasks due today!`,
        "warning"
      );
      
      // Auto mock email reminder
      setTimeout(() => {
        sendMockEmailDigest(overdue, dueToday, highPriority, currentUser);
      }, 1500);
    } else {
      addToast(
        "Welcome Back!",
        "All caught up! You have no overdue tasks or tasks due today.",
        "success"
      );
    }
  };

  // Toast Helpers
  const addToast = (title: string, message: string, type: "success" | "info" | "warning" = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // Auto dismiss after 6s
    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Mock Email Reminder Action
  const sendMockEmailDigest = (overdue: Task[], dueToday: Task[], highUpcoming: Task[], currentUser: AppUser) => {
    const email = currentUser?.email || "user@company.com";
    
    addToast(
      "Mock Email Sent",
      `Digest containing ${overdue.length} overdue and ${dueToday.length} due-today tasks emailed to ${email}`,
      "success"
    );
  };

  const triggerManualEmailDigest = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const pendingTasks = tasks.filter(t => t.status !== "COMPLETED");
    const overdue = pendingTasks.filter(t => new Date(t.dueDate).toISOString().split("T")[0] < todayStr);
    const dueToday = pendingTasks.filter(t => new Date(t.dueDate).toISOString().split("T")[0] === todayStr);
    const highUpcoming = pendingTasks.filter(t => t.priority === "HIGH" && new Date(t.dueDate).toISOString().split("T")[0] > todayStr);

    if (user) {
      sendMockEmailDigest(overdue, dueToday, highUpcoming, user);
    }
  };

  // Theme Toggle
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    addToast("Theme Changed", `Switched to ${nextTheme} mode`, "info");
  };

  // Logout
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        addToast("Logged Out", "Redirecting to login page...", "success");
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      addToast("Error", "Logout failed", "warning");
    }
  };

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, color: newCatColor }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");

      setCategories(prev => [...prev, data.category]);
      setNewCatName("");
      addToast("Category Created", `Created category "${data.category.name}"`, "success");
    } catch (err: any) {
      addToast("Error", err.message, "warning");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure? Tasks in this category will be updated to uncategorized.")) return;

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      setCategories(prev => prev.filter(c => c.id !== id));
      // Update local tasks category links
      setTasks(prev => prev.map(t => t.categoryId === id ? { ...t, categoryId: null, category: null } : t));
      addToast("Category Deleted", "Category removed successfully", "success");
    } catch (err: any) {
      addToast("Error", err.message, "warning");
    }
  };

  // Task Modal open/close helpers
  const openCreateTaskModal = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskDueDate(new Date().toISOString().split("T")[0]);
    setTaskPriority("MEDIUM");
    setTaskStatus("TODO");
    setTaskRecurring("NONE");
    setTaskCategoryId("");
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || "");
    setTaskDueDate(new Date(task.dueDate).toISOString().split("T")[0]);
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskRecurring(task.recurring);
    setTaskCategoryId(task.categoryId || "");
    setIsTaskModalOpen(true);
  };

  // Task Submission (Create / Update)
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDueDate) return;

    const payload = {
      title: taskTitle,
      description: taskDesc,
      dueDate: new Date(taskDueDate).toISOString(),
      priority: taskPriority,
      status: taskStatus,
      recurring: taskRecurring,
      categoryId: taskCategoryId || null
    };

    try {
      if (editingTask) {
        // Edit flow
        const res = await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingTask.id, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update task");

        if (data.tasks) {
          // If recurring task was completed, the API returns the updated full task list
          setTasks(data.tasks);
          addToast("Task Completed", "Recurring task completed! Next occurrence scheduled.", "success");
        } else {
          setTasks(prev => prev.map(t => t.id === editingTask.id ? data.task : t).sort((a,b) => b.priorityScore - a.priorityScore));
          addToast("Task Updated", "Task details updated successfully", "success");
        }
      } else {
        // Create flow
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create task");

        setTasks(prev => [data.task, ...prev].sort((a,b) => b.priorityScore - a.priorityScore));
        addToast("Task Created", `Task "${data.task.title}" created`, "success");
      }
      setIsTaskModalOpen(false);
    } catch (err: any) {
      addToast("Error", err.message, "warning");
    }
  };

  // Quick Task checkbox toggle (complete/reactivate)
  const handleToggleTaskStatus = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";
    
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to toggle status");

      if (data.tasks) {
        setTasks(data.tasks);
        addToast("Task Completed", "Recurring task completed! Next occurrence scheduled.", "success");
      } else {
        setTasks(prev => prev.map(t => t.id === task.id ? data.task : t).sort((a,b) => b.priorityScore - a.priorityScore));
        addToast("Status Updated", `Task marked as ${nextStatus.toLowerCase().replace("_", " ")}`, "success");
      }
    } catch (err: any) {
      addToast("Error", err.message, "warning");
    }
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");

      setTasks(prev => prev.filter(t => t.id !== id));
      addToast("Task Deleted", "Task removed successfully", "success");
      if (isTaskModalOpen && editingTask?.id === id) {
        setIsTaskModalOpen(false);
      }
    } catch (err: any) {
      addToast("Error", err.message, "warning");
    }
  };

  // Drag and Drop Kanban Board handlers
  const handleDragStart = (id: string) => {
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: string) => {
    e.preventDefault();
    setDragOverColumn(colStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (colStatus: "TODO" | "IN_PROGRESS" | "COMPLETED") => {
    if (!draggedTaskId) return;
    setDragOverColumn(null);
    setDraggedTaskId(null);

    const task = tasks.find(t => t.id === draggedTaskId);
    if (!task || task.status === colStatus) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draggedTaskId, status: colStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to move task");

      if (data.tasks) {
        setTasks(data.tasks);
        addToast("Task Completed", "Recurring task completed! Next occurrence scheduled.", "success");
      } else {
        setTasks(prev => prev.map(t => t.id === draggedTaskId ? data.task : t).sort((a,b) => b.priorityScore - a.priorityScore));
        addToast("Task Moved", `Task moved to ${colStatus.toLowerCase().replace("_", " ")}`, "success");
      }
    } catch (err: any) {
      addToast("Error", err.message, "warning");
    }
  };

  // Sorting columns helper
  const triggerSort = (field: "score" | "dueDate" | "title") => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "title" ? "asc" : "desc");
    }
  };

  // Filter Tasks list (based on search & dropdown selections)
  const getFilteredTasks = () => {
    const todayStr = new Date().toISOString().split("T")[0];

    return tasks.filter(task => {
      // Search filter
      const searchMatch =
        task.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(taskSearch.toLowerCase()));

      if (!searchMatch) return false;

      // Status filter
      if (filterStatus === "PENDING" && task.status === "COMPLETED") return false;
      if (filterStatus === "COMPLETED" && task.status !== "COMPLETED") return false;

      // Priority filter
      if (filterPriority !== "ALL" && task.priority !== filterPriority) return false;

      // Category filter
      if (filterCategory !== "ALL" && task.categoryId !== filterCategory) return false;

      // Due Date filter
      if (filterDate === "TODAY") {
        const dueStr = new Date(task.dueDate).toISOString().split("T")[0];
        if (dueStr !== todayStr || task.status === "COMPLETED") return false;
      }
      if (filterDate === "OVERDUE") {
        const dueStr = new Date(task.dueDate).toISOString().split("T")[0];
        if (dueStr >= todayStr || task.status === "COMPLETED") return false;
      }

      return true;
    }).sort((a, b) => {
      // Completed tasks stay at bottom for list view too unless we force order
      let comparison = 0;
      if (sortField === "score") {
        comparison = b.priorityScore - a.priorityScore;
      } else if (sortField === "dueDate") {
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortField === "title") {
        comparison = a.title.localeCompare(b.title);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  // Dashboard Stats Calculations
  const getStats = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "COMPLETED").length;
    const pending = total - completed;

    const overdue = tasks.filter(t => {
      if (t.status === "COMPLETED") return false;
      const dueStr = new Date(t.dueDate).toISOString().split("T")[0];
      return dueStr < todayStr;
    }).length;

    const dueToday = tasks.filter(t => {
      if (t.status === "COMPLETED") return false;
      const dueStr = new Date(t.dueDate).toISOString().split("T")[0];
      return dueStr === todayStr;
    }).length;

    return { total, completed, pending, overdue, dueToday };
  };

  const stats = getStats();
  const filteredTasks = getFilteredTasks();

  // Rendering Loader screen
  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div className="user-avatar" style={{ width: "60px", height: "60px", fontSize: "24px" }}>ST</div>
          <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Loading workspace database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout fade-in">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <CheckSquare className="logo-icon" size={28} />
          <span className="logo-text">SmartTask</span>
        </div>

        {user && (
          <div className="sidebar-user">
            <div className="user-avatar">
              {user.name ? user.name.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name || "App User"}</span>
              <span className="user-email">{user.email}</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <div
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>

          <div
            className={`nav-item ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            <ListTodo size={18} />
            <span>Tasks Manager</span>
          </div>

          <div
            className={`nav-item ${activeTab === "categories" ? "active" : ""}`}
            onClick={() => setActiveTab("categories")}
          >
            <Tag size={18} />
            <span>Categories</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="theme-toggle-btn" onClick={toggleTheme}>
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </div>

          <div className="nav-item" onClick={handleLogout} style={{ border: "1px solid var(--border-color)" }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* HEADER BAR */}
        <header className="content-header">
          <div className="header-title">
            <h1>
              {activeTab === "dashboard" && "Dashboard Overview"}
              {activeTab === "tasks" && "Tasks Workspace"}
              {activeTab === "categories" && "Manage Categories"}
            </h1>
            <p>
              {activeTab === "dashboard" && `Welcome back, ${user?.name || "User"}! Here is your productivity state.`}
              {activeTab === "tasks" && "Create, monitor, and organize your tasks visually."}
              {activeTab === "categories" && "Add color-coded tags to group your activities."}
            </p>
          </div>

          {activeTab !== "categories" && (
            <button className="btn btn-primary" onClick={openCreateTaskModal}>
              <Plus size={18} />
              <span>Create Task</span>
            </button>
          )}
        </header>

        {/* 1. DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div>
            {/* Stats Card Grid */}
            <div className="stats-grid">
              <div className="stat-card" style={{ borderLeft: "4px solid var(--primary-color)" }}>
                <div className="stat-header">
                  <span>Total Tasks</span>
                  <ListTodo size={20} className="stat-icon" style={{ backgroundColor: "var(--bg-tertiary)" }} />
                </div>
                <h3>{stats.total}</h3>
                <p>Created in database</p>
              </div>

              <div className="stat-card" style={{ borderLeft: "4px solid var(--success)" }}>
                <div className="stat-header">
                  <span>Completed</span>
                  <CheckSquare size={20} className="stat-icon" style={{ backgroundColor: "var(--success-bg)", color: "var(--success)" }} />
                </div>
                <h3>{stats.completed}</h3>
                <p>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate</p>
              </div>

              <div className="stat-card" style={{ borderLeft: "4px solid var(--warning)" }}>
                <div className="stat-header">
                  <span>Due Today</span>
                  <Calendar size={20} className="stat-icon" style={{ backgroundColor: "var(--warning-bg)", color: "var(--warning)" }} />
                </div>
                <h3>{stats.dueToday}</h3>
                <p>Pending actions today</p>
              </div>

              <div className="stat-card" style={{ borderLeft: "4px solid var(--danger)" }}>
                <div className="stat-header">
                  <span>Overdue</span>
                  <AlertTriangle size={20} className="stat-icon" style={{ backgroundColor: "var(--danger-bg)", color: "var(--danger)" }} />
                </div>
                <h3>{stats.overdue}</h3>
                <p>Action needed immediately</p>
              </div>
            </div>

            {/* Reminder Alert Panel */}
            {(stats.overdue > 0 || stats.dueToday > 0) && (
              <div className={`reminder-alert ${stats.overdue > 0 ? "danger-alert" : ""}`}>
                <AlertTriangle className="reminder-icon" size={24} />
                <div className="reminder-content">
                  <h4>Startup Tasks Reminder Summary</h4>
                  <p>
                    You have active items requiring attention: <b>{stats.overdue} overdue</b> and <b>{stats.dueToday} due today</b>.
                  </p>
                  <div className="reminder-list">
                    {tasks
                      .filter(t => t.status !== "COMPLETED")
                      .slice(0, 4)
                      .map(t => (
                        <div key={t.id} className="reminder-tag" onClick={(e) => openEditTaskModal(t, e)}>
                          <span className={`dot`} style={{ backgroundColor: t.priority === "HIGH" ? "var(--danger)" : t.priority === "MEDIUM" ? "var(--warning)" : "var(--success)" }}></span>
                          <span>{t.title}</span>
                          <span style={{ fontSize: "10px", opacity: 0.7 }}>
                            ({new Date(t.dueDate).toLocaleDateString()})
                          </span>
                        </div>
                      ))}
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <button className="btn btn-secondary" onClick={triggerManualEmailDigest} style={{ padding: "6px 12px", fontSize: "12px" }}>
                      <Mail size={14} />
                      <span>Email Task Digest</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Split Sections */}
            <div className="dashboard-sections">
              {/* Left Column: Top Prioritized Tasks */}
              <div className="section-card">
                <h3 className="section-title">Smart Priority Sorted Tasks</h3>
                {tasks.filter(t => t.status !== "COMPLETED").length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
                    No pending tasks! Create a new task to see smart prioritization in action.
                  </p>
                ) : (
                  <div className="task-items-list">
                    {tasks
                      .filter(t => t.status !== "COMPLETED")
                      .slice(0, 5)
                      .map(task => (
                        <div
                          key={task.id}
                          className="task-list-row"
                          onClick={(e) => openEditTaskModal(task, e)}
                        >
                          <div className="task-row-left">
                            <div
                              className="task-row-checkbox"
                              onClick={(e) => handleToggleTaskStatus(task, e)}
                            ></div>
                            <div className="task-row-info">
                              <span className="task-row-title">{task.title}</span>
                              <div className="task-row-meta">
                                <span className="task-meta-item">
                                  <Calendar size={12} />
                                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                </span>
                                {task.category && (
                                  <span className="category-dot-badge">
                                    <span className="dot" style={{ backgroundColor: task.category.color }}></span>
                                    <span>{task.category.name}</span>
                                  </span>
                                )}
                                {task.recurring !== "NONE" && (
                                  <span className="task-meta-item">
                                    <Clock size={12} />
                                    <span style={{ textTransform: "capitalize" }}>{task.recurring.toLowerCase()}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="task-row-right">
                            <div style={{ marginRight: "12px", textAlign: "right" }}>
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>Priority Score</span>
                              <strong style={{ fontSize: "14px", color: "var(--primary-color)" }}>{task.priorityScore}</strong>
                            </div>
                            <span className={`badge badge-${task.priority.toLowerCase()}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Right Column: Mini Categories & Controls */}
              <div className="section-card" style={{ gap: "16px" }}>
                <h3 className="section-title">Quick Actions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button className="btn btn-primary" onClick={openCreateTaskModal} style={{ width: "100%" }}>
                    <Plus size={18} />
                    <span>Add New Task</span>
                  </button>
                  <button className="btn btn-secondary" onClick={triggerManualEmailDigest} style={{ width: "100%" }}>
                    <Mail size={18} />
                    <span>Resend Email Reminders</span>
                  </button>
                </div>

                <h3 className="section-title" style={{ marginTop: "12px" }}>Active Categories</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {categories.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>No categories created yet.</p>
                  ) : (
                    categories.slice(0, 5).map(c => (
                      <div
                        key={c.id}
                        className="category-dot-badge"
                        style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-tertiary)", cursor: "pointer" }}
                        onClick={() => {
                          setFilterCategory(c.id);
                          setActiveTab("tasks");
                        }}
                      >
                        <span className="dot" style={{ backgroundColor: c.color }}></span>
                        <span style={{ fontWeight: 600, fontSize: "13px" }}>{c.name}</span>
                        <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
                          {tasks.filter(t => t.categoryId === c.id).length} tasks
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TASKS WORKSPACE VIEW */}
        {activeTab === "tasks" && (
          <div>
            {/* Filter Toolbar */}
            <div className="tasks-toolbar">
              <div className="toolbar-search-filters">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                  />
                </div>

                <select
                  className="filter-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Only</option>
                  <option value="COMPLETED">Completed Only</option>
                </select>

                <select
                  className="filter-select"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                </select>

                <select
                  className="filter-select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value as any)}
                >
                  <option value="ALL">All Deadlines</option>
                  <option value="TODAY">Due Today</option>
                  <option value="OVERDUE">Overdue Only</option>
                </select>
              </div>

              {/* View toggle switcher */}
              <div className="view-toggle">
                <div
                  className={`view-toggle-btn ${taskViewMode === "kanban" ? "active" : ""}`}
                  onClick={() => setTaskViewMode("kanban")}
                >
                  <Kanban size={15} />
                  <span>Kanban</span>
                </div>
                <div
                  className={`view-toggle-btn ${taskViewMode === "list" ? "active" : ""}`}
                  onClick={() => setTaskViewMode("list")}
                >
                  <List size={15} />
                  <span>List Table</span>
                </div>
              </div>
            </div>

            {/* A. KANBAN BOARD SUB-VIEW */}
            {taskViewMode === "kanban" && (
              <div className="kanban-board">
                {/* Column TODO */}
                <div
                  className={`kanban-column ${dragOverColumn === "TODO" ? "drag-over" : ""}`}
                  onDragOver={(e) => handleDragOver(e, "TODO")}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop("TODO")}
                >
                  <div className="column-header">
                    <h3>To Do</h3>
                    <span className="column-count">
                      {filteredTasks.filter(t => t.status === "TODO").length}
                    </span>
                  </div>
                  <div className="column-tasks-container">
                    {filteredTasks
                      .filter(t => t.status === "TODO")
                      .map(task => (
                        <div
                          key={task.id}
                          className={`kanban-task-card ${draggedTaskId === task.id ? "dragging" : ""}`}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onClick={(e) => openEditTaskModal(task, e)}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            {task.category && (
                              <span className="category-dot-badge" style={{ fontSize: "11px" }}>
                                <span className="dot" style={{ backgroundColor: task.category.color }}></span>
                                <span style={{ color: "var(--text-secondary)" }}>{task.category.name}</span>
                              </span>
                            )}
                            <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: "9px", padding: "2px 6px" }}>
                              {task.priority}
                            </span>
                          </div>
                          <h4 className="kanban-card-title">{task.title}</h4>
                          {task.description && <p className="kanban-card-desc">{task.description}</p>}
                          <div className="kanban-card-footer">
                            <span>Score: <b>{task.priorityScore}</b></span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Calendar size={10} />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Column IN_PROGRESS */}
                <div
                  className={`kanban-column ${dragOverColumn === "IN_PROGRESS" ? "drag-over" : ""}`}
                  onDragOver={(e) => handleDragOver(e, "IN_PROGRESS")}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop("IN_PROGRESS")}
                >
                  <div className="column-header">
                    <h3>In Progress</h3>
                    <span className="column-count">
                      {filteredTasks.filter(t => t.status === "IN_PROGRESS").length}
                    </span>
                  </div>
                  <div className="column-tasks-container">
                    {filteredTasks
                      .filter(t => t.status === "IN_PROGRESS")
                      .map(task => (
                        <div
                          key={task.id}
                          className={`kanban-task-card ${draggedTaskId === task.id ? "dragging" : ""}`}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onClick={(e) => openEditTaskModal(task, e)}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            {task.category && (
                              <span className="category-dot-badge" style={{ fontSize: "11px" }}>
                                <span className="dot" style={{ backgroundColor: task.category.color }}></span>
                                <span style={{ color: "var(--text-secondary)" }}>{task.category.name}</span>
                              </span>
                            )}
                            <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: "9px", padding: "2px 6px" }}>
                              {task.priority}
                            </span>
                          </div>
                          <h4 className="kanban-card-title">{task.title}</h4>
                          {task.description && <p className="kanban-card-desc">{task.description}</p>}
                          <div className="kanban-card-footer">
                            <span>Score: <b>{task.priorityScore}</b></span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Calendar size={10} />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Column COMPLETED */}
                <div
                  className={`kanban-column ${dragOverColumn === "COMPLETED" ? "drag-over" : ""}`}
                  onDragOver={(e) => handleDragOver(e, "COMPLETED")}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop("COMPLETED")}
                >
                  <div className="column-header">
                    <h3>Completed</h3>
                    <span className="column-count">
                      {filteredTasks.filter(t => t.status === "COMPLETED").length}
                    </span>
                  </div>
                  <div className="column-tasks-container">
                    {filteredTasks
                      .filter(t => t.status === "COMPLETED")
                      .map(task => (
                        <div
                          key={task.id}
                          className={`kanban-task-card ${draggedTaskId === task.id ? "dragging" : ""}`}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onClick={(e) => openEditTaskModal(task, e)}
                          style={{ opacity: 0.8 }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            {task.category && (
                              <span className="category-dot-badge" style={{ fontSize: "11px" }}>
                                <span className="dot" style={{ backgroundColor: task.category.color }}></span>
                                <span style={{ color: "var(--text-secondary)" }}>{task.category.name}</span>
                              </span>
                            )}
                            <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: "9px", padding: "2px 6px", opacity: 0.6 }}>
                              {task.priority}
                            </span>
                          </div>
                          <h4 className="kanban-card-title" style={{ textDecoration: "line-through", color: "var(--text-muted)" }}>{task.title}</h4>
                          {task.description && <p className="kanban-card-desc">{task.description}</p>}
                          <div className="kanban-card-footer">
                            <span>Finished</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Calendar size={10} />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* B. LIST TABLE SUB-VIEW */}
            {taskViewMode === "list" && (
              <div className="table-wrapper">
                <table className="tasks-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}></th>
                      <th onClick={() => triggerSort("title")}>Task Name {sortField === "title" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                      <th onClick={() => triggerSort("dueDate")}>Due Date {sortField === "dueDate" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th onClick={() => triggerSort("score")}>Score {sortField === "score" && (sortOrder === "asc" ? "▲" : "▼")}</th>
                      <th>Status</th>
                      <th style={{ width: "80px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                          No tasks match current search filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(task => (
                        <tr key={task.id} onClick={(e) => openEditTaskModal(task, e)}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div
                              className={`task-row-checkbox ${task.status === "COMPLETED" ? "checked" : ""}`}
                              onClick={(e) => handleToggleTaskStatus(task, e)}
                            >
                              {task.status === "COMPLETED" && <CheckSquare size={14} />}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span className={`task-row-title ${task.status === "COMPLETED" ? "completed" : ""}`} style={{ fontWeight: 600 }}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "inline-block", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {task.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: "13px" }}>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </td>
                          <td>
                            {task.category ? (
                              <span className="category-dot-badge">
                                <span className="dot" style={{ backgroundColor: task.category.color }}></span>
                                <span style={{ fontSize: "13px" }}>{task.category.name}</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>None</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: "10px" }}>
                              {task.priority}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: "var(--primary-color)", fontSize: "14px" }}>{task.priorityScore}</strong>
                          </td>
                          <td>
                            <span style={{ fontSize: "13px", fontWeight: 600, textTransform: "capitalize" }}>
                              {task.status.toLowerCase().replace("_", " ")}
                            </span>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button className="delete-action-btn" onClick={(e) => handleDeleteTask(task.id, e)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. CATEGORIES MANAGEMENT VIEW */}
        {activeTab === "categories" && (
          <div className="categories-grid">
            {/* Left Box: Create Form */}
            <div className="category-form-card">
              <h3 className="section-title">New Category</h3>
              <form onSubmit={handleCreateCategory} className="modal-form" style={{ gap: "16px" }}>
                <div className="form-group">
                  <label htmlFor="catName">Category Name</label>
                  <input
                    type="text"
                    id="catName"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Work, Study, Health"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Select Tag Color</label>
                  <div className="color-presets">
                    {PRESET_COLORS.map(c => (
                      <div
                        key={c}
                        className={`color-dot-option ${newCatColor === c ? "active" : ""}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setNewCatColor(c)}
                      ></div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }}>
                  <Plus size={16} />
                  <span>Create Category</span>
                </button>
              </form>
            </div>

            {/* Right Box: Listing */}
            <div className="category-list-card">
              <h3 className="section-title" style={{ marginBottom: "20px" }}>All Categories</h3>
              {categories.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
                  No categories created yet. Create one to begin organizing tasks.
                </p>
              ) : (
                <div className="category-items-grid">
                  {categories.map(c => {
                    const taskCount = tasks.filter(t => t.categoryId === c.id).length;
                    return (
                      <div key={c.id} className="category-pill-card">
                        <div className="category-pill-info">
                          <span className="dot" style={{ backgroundColor: c.color, width: "12px", height: "12px" }}></span>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 700, fontSize: "14px" }}>{c.name}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{taskCount} tasks</span>
                          </div>
                        </div>

                        <button className="delete-action-btn" onClick={() => handleDeleteCategory(c.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CREATE & EDIT TASK DIALOG MODAL */}
      {isTaskModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTaskModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? "Edit Task" : "Create New Task"}</h2>
              <button className="modal-close-btn" onClick={() => setIsTaskModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="taskTitle">Task Name</label>
                <input
                  type="text"
                  id="taskTitle"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Review code architecture..."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="taskDesc">Description</label>
                <textarea
                  id="taskDesc"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Provide context or notes on this task..."
                  rows={3}
                  style={{
                    padding: "12px",
                    backgroundColor: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    resize: "vertical",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="taskDueDate">Due Date</label>
                  <input
                    type="date"
                    id="taskDueDate"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="taskPriority">Priority Level</label>
                  <select
                    id="taskPriority"
                    className="filter-select"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="modal-form-row">
                <div className="form-group">
                  <label htmlFor="taskStatus">Status</label>
                  <select
                    id="taskStatus"
                    className="filter-select"
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="taskCategory">Category Tag</label>
                  <select
                    id="taskCategory"
                    className="filter-select"
                    value={taskCategoryId}
                    onChange={(e) => setTaskCategoryId(e.target.value)}
                  >
                    <option value="">No Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="taskRecurring">Recurring Frequency</label>
                <select
                  id="taskRecurring"
                  className="filter-select"
                  value={taskRecurring}
                  onChange={(e) => setTaskRecurring(e.target.value as any)}
                >
                  <option value="NONE">Not Recurring</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div className="form-actions">
                {editingTask && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={(e) => handleDeleteTask(editingTask.id, e)}
                    style={{ marginRight: "auto" }}
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM ALERTS */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <AlertTriangle className={`toast-icon ${toast.type}`} size={18} />
            <div className="toast-content">
              <span className="toast-title">{toast.title}</span>
              <span className="toast-message">{toast.message}</span>
            </div>
            <div className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
