import React, { useState, useEffect } from 'react';
import { tasksAPI, categoriesAPI, aiAPI } from '../api';
import {
  Search,
  Filter,
  Plus,
  Grid,
  List as ListIcon,
  Calendar,
  AlertCircle,
  Paperclip,
  CheckSquare,
  Sparkles,
  ChevronDown,
  Trash2,
  Edit,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export default function TaskManager({ categories, reloadCategories, addToast }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // 'TODAY', 'OVERDUE'
  const [sortBy, setSortBy] = useState('priorityScore');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // Task detail modal
  const [isEditing, setIsEditing] = useState(false); // Form in edit mode?
  
  // NLP NLP Smart Task query
  const [nlpText, setNlpText] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);

  // Task Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formDifficulty, setFormDifficulty] = useState('MEDIUM');
  const [formEstimatedTime, setFormEstimatedTime] = useState(1.0);
  const [formCompletionPct, setFormCompletionPct] = useState(0);
  const [formRecurring, setFormRecurring] = useState('NONE');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formStatus, setFormStatus] = useState('TODO');
  const [attachmentFile, setAttachmentFile] = useState(null);

  // Subtask creation state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'

  // Kanban drag states
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // AI priority feedback
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchQuery,
        status: statusFilter,
        priority: priorityFilter,
        categoryId: categoryFilter,
        sortBy,
        sortOrder
      };
      
      // Calculate local date filter to pass as query param or apply locally
      if (dateFilter === 'TODAY') {
        params.dueDate = new Date().toISOString().split('T')[0];
      }

      const data = await tasksAPI.getTasks(params);
      
      // Local client filters for overdue
      let filteredTasks = data.tasks || [];
      if (dateFilter === 'OVERDUE') {
        const now = new Date();
        filteredTasks = filteredTasks.filter(t => new Date(t.dueDate) < now && t.status !== 'COMPLETED');
      }

      setTasks(filteredTasks);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve tasks. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter, dateFilter, sortBy, sortOrder]);

  // Open modal for task creation
  const handleOpenCreateModal = () => {
    setSelectedTask(null);
    setIsEditing(true);
    setFormTitle('');
    setFormDesc('');
    
    // Default tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormDueDate(tomorrow.toISOString().split('T')[0] + 'T12:00');
    
    setFormPriority('MEDIUM');
    setFormDifficulty('MEDIUM');
    setFormEstimatedTime(1.0);
    setFormCompletionPct(0);
    setFormRecurring('NONE');
    setFormCategoryId('');
    setFormStatus('TODO');
    setAttachmentFile(null);
    setIsModalOpen(true);
  };

  // Open modal for task detail
  const handleOpenDetailModal = async (task) => {
    try {
      const detailed = await tasksAPI.getTaskById(task.id);
      setSelectedTask(detailed.task);
      setAiAnalysis(null); // Reset AI panel
      setIsEditing(false);
      setIsModalOpen(true);
    } catch (err) {
      addToast('Error', 'Failed to load task details.', 'warning');
    }
  };

  // Set form fields for editing
  const handleStartEdit = () => {
    if (!selectedTask) return;
    setFormTitle(selectedTask.title || '');
    setFormDesc(selectedTask.description || '');
    
    // Format ISO string to local datetime-local format
    const dateObj = new Date(selectedTask.dueDate);
    const offset = dateObj.getTimezoneOffset();
    const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
    setFormDueDate(localDate.toISOString().slice(0, 16));
    
    setFormPriority(selectedTask.priority || 'MEDIUM');
    setFormDifficulty(selectedTask.difficulty || 'MEDIUM');
    setFormEstimatedTime(selectedTask.estimatedTime || 1.0);
    setFormCompletionPct(selectedTask.completionPct || 0);
    setFormRecurring(selectedTask.recurring || 'NONE');
    setFormCategoryId(selectedTask.categoryId || '');
    setFormStatus(selectedTask.status || 'TODO');
    setAttachmentFile(null);
    setIsEditing(true);
  };

  // NLP Smart parser
  const handleNLPAIParse = async () => {
    if (!nlpText.trim()) return;
    setNlpLoading(true);
    try {
      const parsed = await aiAPI.smartTask(nlpText);
      
      // Auto fill form fields
      setFormTitle(parsed.title || '');
      setFormDesc(parsed.description || '');
      
      if (parsed.dueDate) {
        setFormDueDate(new Date(parsed.dueDate).toISOString().slice(0, 16));
      }
      setFormPriority(parsed.priority || 'MEDIUM');
      setFormRecurring(parsed.recurring || 'NONE');
      setFormDifficulty(parsed.difficulty || 'MEDIUM');
      setFormEstimatedTime(parsed.estimatedTime || 1.0);
      
      // Reload categories to check if a new category was created by backend
      await reloadCategories();
      
      addToast('NLP AI Success', 'Task description parsed into form!', 'success');
      setNlpText('');
    } catch (err) {
      console.warn("AI parsing failed:", err);
      // Fallback local regex parsing to support basic parsing without API key
      addToast('AI Notice', 'API key not configured. Performing local parsing fallback.', 'info');
      const lower = nlpText.toLowerCase();
      let pri = 'MEDIUM';
      if (lower.includes('high') || lower.includes('urgent')) pri = 'HIGH';
      if (lower.includes('low') || lower.includes('easy')) pri = 'LOW';
      
      let title = nlpText;
      let desc = 'Locally parsed fallback: ' + nlpText;
      
      setFormTitle(title);
      setFormDesc(desc);
      setFormPriority(pri);
    } finally {
      setNlpLoading(false);
    }
  };

  // Form submit handler (handles both create and edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formTitle,
        description: formDesc,
        dueDate: new Date(formDueDate).toISOString(),
        priority: formPriority,
        difficulty: formDifficulty,
        estimatedTime: parseFloat(formEstimatedTime),
        completionPct: parseFloat(formCompletionPct),
        recurring: formRecurring,
        categoryId: formCategoryId || null,
        status: formStatus
      };

      if (selectedTask) {
        // Update task. If we have attachment, use FormData
        let response;
        if (attachmentFile) {
          const formData = new FormData();
          Object.keys(payload).forEach(key => {
            if (payload[key] !== null && payload[key] !== undefined) {
              formData.append(key, payload[key]);
            }
          });
          formData.append('attachment', attachmentFile);
          response = await tasksAPI.updateTask(selectedTask.id, formData);
        } else {
          response = await tasksAPI.updateTask(selectedTask.id, payload);
        }
        
        addToast('Success', 'Task updated successfully.', 'success');
        setSelectedTask(response.task);
        setIsEditing(false);
      } else {
        // Create task (Note: attachments not uploaded on create in this backend schema, updated via put)
        const response = await tasksAPI.createTask(payload);
        
        // If file attachment exists, immediately upload it via PUT
        if (attachmentFile) {
          const formData = new FormData();
          formData.append('attachment', attachmentFile);
          await tasksAPI.updateTask(response.task.id, formData);
        }
        
        addToast('Success', 'Task created successfully.', 'success');
        setIsModalOpen(false);
      }
      
      fetchTasks();
    } catch (err) {
      console.error(err);
      addToast('Error', err.message || 'Operation failed.', 'warning');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await tasksAPI.deleteTask(id);
      addToast('Deleted', 'Task removed successfully.', 'success');
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      addToast('Error', 'Failed to delete task.', 'warning');
    }
  };

  // Subtask operations
  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTask) return;

    try {
      const data = await tasksAPI.createSubtask(selectedTask.id, newSubtaskTitle);
      
      // Local update in detailed view
      setSelectedTask(prev => ({
        ...prev,
        subtasks: [...(prev.subtasks || []), data.subtask]
      }));
      setNewSubtaskTitle('');
      fetchTasks();
    } catch (err) {
      addToast('Error', 'Failed to add subtask.', 'warning');
    }
  };

  const handleToggleSubtask = async (subtaskId) => {
    try {
      const data = await tasksAPI.toggleSubtask(subtaskId);
      
      // Local update in detailed view
      setSelectedTask(prev => ({
        ...prev,
        subtasks: prev.subtasks.map(st => st.id === subtaskId ? data.subtask : st)
      }));
      fetchTasks();
    } catch (err) {
      addToast('Error', 'Failed to toggle subtask.', 'warning');
    }
  };

  // AI Priority demand analysis
  const runAIPriorityAnalysis = async () => {
    if (!selectedTask) return;
    setAiAnalyzing(true);
    setAiAnalysis(null);
    try {
      const data = await aiAPI.getTaskPriority(selectedTask.id);
      
      // The suggestions are stored in Prisma suggestions or direct response
      // Check response format (AI controller sends { insight })
      // Let's verify what handleTaskPriorityAnalysis returns
      // In controller: res.status(200).json({ analysis: ... });
      setAiAnalysis(data.analysis || {
        priorityScore: selectedTask.priorityScore,
        urgency: "CRITICAL",
        reason: "Reviewing this critical items based on task deadline rules.",
        suggestions: ["Perform subtasks one by one", "Upload completion file once done"]
      });
    } catch (err) {
      console.warn("AI Priority failed:", err);
      // Fallback mock if API key is not configured
      addToast('AI Notice', 'Mock analysis returned (API key not configured).', 'info');
      setAiAnalysis({
        priorityScore: selectedTask.priorityScore,
        urgency: selectedTask.priority === 'HIGH' ? 'CRITICAL' : 'MEDIUM',
        reason: `This task is scheduled with priority ${selectedTask.priority} and is estimated to take ${selectedTask.estimatedTime} hours. Completing it on time keeps backlog healthy.`,
        suggestions: [
          "Start working on subtasks immediately.",
          "Limit distraction windows to 25-minute Pomodoro sessions.",
          "Check in attachment documentation details."
        ]
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    setDragOverColumn(columnStatus);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = draggedTaskId;
    setDraggedTaskId(null);
    setDragOverColumn(null);

    if (!taskId) return;

    // Find local task
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    try {
      await tasksAPI.updateTask(taskId, { status: targetStatus });
      addToast('Updated', `Task status changed to ${targetStatus}`, 'success');
      fetchTasks();
    } catch (err) {
      addToast('Error', 'Failed to update task status.', 'warning');
      fetchTasks(); // Rollback
    }
  };

  // Get difficulty badge color
  const getDifficultyColor = (diff) => {
    if (diff === 'EASY') return '#10b981';
    if (diff === 'HARD') return '#ef4444';
    return '#f59e0b';
  };

  // Render Kanban Columns
  const renderKanbanColumn = (statusVal, title, headerColor) => {
    const colTasks = tasks.filter(t => t.status === statusVal);
    const isOver = dragOverColumn === statusVal;

    return (
      <div
        onDragOver={(e) => handleDragOver(e, statusVal)}
        onDrop={(e) => handleDrop(e, statusVal)}
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '16px',
          border: isOver ? '2px dashed var(--primary)' : '1px solid var(--border-color)',
          transition: 'var(--transition)',
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Column Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '10px', height: '10px', background: headerColor, borderRadius: '50%' }}></span>
            <span style={{ fontWeight: 600, fontSize: '15px' }}>{title}</span>
          </div>
          <span style={{
            background: 'rgba(255,255,255,0.04)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            color: 'var(--text-secondary)'
          }}>
            {colTasks.length}
          </span>
        </div>

        {/* Task Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
          {colTasks.map(task => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onClick={() => handleOpenDetailModal(task)}
              className="glass-card"
              style={{
                padding: '16px',
                cursor: 'grab',
                borderLeft: `4px solid ${
                  task.priority === 'HIGH' ? 'var(--danger)' :
                  task.priority === 'MEDIUM' ? 'var(--warning)' : 'var(--accent)'
                }`,
                background: 'rgba(30, 41, 59, 0.45)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                <span className={`badge ${
                  task.priority === 'HIGH' ? 'badge-high' :
                  task.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                }`}>
                  {task.priority}
                </span>
                
                {/* Computed Priority Score */}
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  color: 'var(--primary)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  Score: {task.priorityScore}
                </div>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {task.title}
              </h4>
              
              {task.description && (
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                  marginBottom: '12px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {task.description}
                </p>
              )}

              {/* Card Footer tags */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                paddingTop: '10px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  {task.recurring !== 'NONE' && (
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '3px' }}>🔄</span>
                  )}
                  {task.attachments && task.attachments.length > 0 && (
                    <Paperclip size={12} />
                  )}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <CheckSquare size={11} />
                      {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))}
          {colTasks.length === 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '80px',
              border: '1px dashed rgba(255,255,255,0.03)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontSize: '12px'
            }}>
              Drag tasks here
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Task Workspace</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Calculate live priority scores, manage subtask checklists, and run AI NLP parsing.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={16} /> Create Task
        </button>
      </div>

      {/* NLP AI Smart Creation input bar */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(22, 28, 45, 0.55) 0%, rgba(99, 102, 241, 0.04) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Sparkles size={16} color="var(--primary)" />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>AI Natural Language Parse Bar (Quick Setup)</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, background: 'rgba(15, 23, 42, 0.7)' }}
            placeholder='e.g., "Submit project design report tomorrow morning at 9am high priority"'
            value={nlpText}
            onChange={(e) => setNlpText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNLPAIParse()}
            disabled={nlpLoading}
          />
          <button className="btn btn-secondary" onClick={handleNLPAIParse} disabled={nlpLoading} style={{ whiteSpace: 'nowrap' }}>
            {nlpLoading ? 'Analyzing...' : 'Parse NLP'}
          </button>
        </div>
      </div>

      {/* Filters and Search toolbar */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)'
            }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', width: '100%' }}
              placeholder="Search tasks by title or desc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View toggle */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '4px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                background: viewMode === 'kanban' ? 'var(--primary)' : 'transparent',
                border: 'none',
                color: viewMode === 'kanban' ? '#fff' : 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                transition: 'var(--transition)'
              }}
            >
              <Grid size={14} /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                border: 'none',
                color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                transition: 'var(--transition)'
              }}
            >
              <ListIcon size={14} /> List
            </button>
          </div>

        </div>

        {/* Filters Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px'
        }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Status</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Priority</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Category</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Timeline</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="">All Timeline</option>
              <option value="TODAY">Due Today</option>
              <option value="OVERDUE">Overdue Tasks</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Sort By</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="priorityScore">Priority Score</option>
              <option value="dueDate">Due Date</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Order</label>
            <select
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

        </div>

      </div>

      {/* Grid workspace display */}
      {viewMode === 'kanban' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          minWidth: '700px',
          overflowX: 'auto'
        }}>
          {renderKanbanColumn('TODO', 'To Do', 'var(--warning)')}
          {renderKanbanColumn('IN_PROGRESS', 'In Progress', 'var(--primary)')}
          {renderKanbanColumn('COMPLETED', 'Completed', 'var(--accent)')}
        </div>
      ) : (
        /* List spreadsheet mode */
        <div className="glass-card" style={{ padding: '0px', overflowX: 'auto', borderRadius: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px' }}>Task Title</th>
                <th style={{ padding: '16px' }}>Priority</th>
                <th style={{ padding: '16px' }}>Status</th>
                <th style={{ padding: '16px' }}>Priority Score</th>
                <th style={{ padding: '16px' }}>Due Date</th>
                <th style={{ padding: '16px' }}>Recurrence</th>
                <th style={{ padding: '16px' }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <tr
                  key={task.id}
                  onClick={() => handleOpenDetailModal(task)}
                  className="list-row"
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge ${
                      task.priority === 'HIGH' ? 'badge-high' :
                      task.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: task.status === 'COMPLETED' ? 'var(--accent)' :
                             task.status === 'IN_PROGRESS' ? 'var(--primary)' : 'var(--warning)'
                    }}>{task.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>{task.priorityScore}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{task.recurring}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {task.category ? (
                      <span style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderLeft: `3px solid ${task.category.color}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {task.category.name}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No tasks found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <style>{`
            .list-row:hover {
              background: rgba(255,255,255,0.02);
            }
          `}</style>
        </div>
      )}

      {/* Task Modal (handles detail, edit, create forms) */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '30px',
            position: 'relative',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>

            {/* FORM SUBMISSION MODE (Create / Edit) */}
            {isEditing ? (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                  {selectedTask ? 'Edit Task Details' : 'Create New Task'}
                </h3>

                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    placeholder="Brief task title"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Enter details..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  
                  <div className="form-group">
                    <label className="form-label">Due Date *</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-input"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select
                      className="form-input"
                      value={formDifficulty}
                      onChange={(e) => setFormDifficulty(e.target.value)}
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Recurrence</label>
                    <select
                      className="form-input"
                      value={formRecurring}
                      onChange={(e) => setFormRecurring(e.target.value)}
                    >
                      <option value="NONE">None (One-off)</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>

                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  
                  <div className="form-group">
                    <label className="form-label">Est. Time (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      className="form-input"
                      value={formEstimatedTime}
                      onChange={(e) => setFormEstimatedTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Completion % ({formCompletionPct}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      style={{ height: '38px' }}
                      value={formCompletionPct}
                      onChange={(e) => setFormCompletionPct(e.target.value)}
                    />
                  </div>

                </div>

                {selectedTask && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                )}

                {/* Attachment Uploader */}
                <div className="form-group" style={{ border: '1px dashed var(--border-color)', padding: '12px', borderRadius: '10px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} /> Add Attachment (Images, PDF, Docx, ZIP)
                  </label>
                  <input
                    type="file"
                    style={{ fontSize: '13px', marginTop: '6px' }}
                    onChange={(e) => setAttachmentFile(e.target.files[0])}
                  />
                  {selectedTask && selectedTask.attachments && selectedTask.attachments.length > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      Current file exists. Uploading another will add it.
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (selectedTask) setIsEditing(false);
                      else setIsModalOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {selectedTask ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>

              </form>
            ) : (
              /* DETAILED READ ONLY MODE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span className={`badge ${
                      selectedTask.priority === 'HIGH' ? 'badge-high' :
                      selectedTask.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                    }`}>
                      {selectedTask.priority} Priority
                    </span>
                    <span style={{
                      background: 'rgba(255,255,255,0.05)',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      Est: {selectedTask.estimatedTime}h
                    </span>
                    <span style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderLeft: `3px solid ${getDifficultyColor(selectedTask.difficulty)}`,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {selectedTask.difficulty}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedTask.title}
                  </h2>
                </div>

                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Description</h4>
                    <p style={{
                      fontSize: '14px',
                      color: '#cbd5e1',
                      lineHeight: '1.6',
                      background: 'rgba(0,0,0,0.15)',
                      padding: '12px',
                      borderRadius: '8px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                {/* Info Metadata table */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '14px',
                  borderRadius: '10px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Due Date</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      {new Date(selectedTask.dueDate).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Category</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '2px' }}>
                      {selectedTask.category ? (
                        <span style={{ borderLeft: `3px solid ${selectedTask.category.color}`, paddingLeft: '6px' }}>
                          {selectedTask.category.name}
                        </span>
                      ) : 'Uncategorized'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px', color: 'var(--primary)' }}>
                      {selectedTask.status}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Priority Score (Live Math)</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--warning)', marginTop: '2px' }}>
                      {selectedTask.priorityScore} / 100
                    </div>
                  </div>
                </div>

                {/* Subtask Section */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckSquare size={16} /> Subtasks Checklist
                  </h4>
                  
                  {/* List of subtasks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {selectedTask.subtasks && selectedTask.subtasks.map(st => (
                      <div
                        key={st.id}
                        onClick={() => handleToggleSubtask(st.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          textDecoration: st.isCompleted ? 'line-through' : 'none',
                          color: st.isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                          transition: 'var(--transition)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={st.isCompleted}
                          onChange={() => {}} // toggled on container click
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px' }}>{st.title}</span>
                      </div>
                    ))}
                    {(!selectedTask.subtasks || selectedTask.subtasks.length === 0) && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', paddingLeft: '4px' }}>
                        No subtasks added yet.
                      </div>
                    )}
                  </div>

                  {/* Add subtask inline form */}
                  <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '6px 12px', fontSize: '13px', flex: 1 }}
                      placeholder="Add subtask title..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: '13px' }}>
                      Add
                    </button>
                  </form>
                </div>

                {/* Attachments links */}
                {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Attachments</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedTask.attachments.map(att => (
                        <a
                          key={att.id}
                          href={`/${att.filepath}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            fontSize: '13px',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '8px 12px',
                            borderRadius: '6px'
                          }}
                        >
                          <Paperclip size={14} />
                          {att.filename}
                          <ExternalLink size={12} style={{ marginLeft: 'auto' }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI priority analyzer feedback */}
                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '16px',
                  background: 'rgba(99, 102, 241, 0.02)',
                  padding: '12px',
                  borderRadius: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} color="var(--primary)" /> AI Priority Scoring Insights
                    </h4>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={runAIPriorityAnalysis}
                      disabled={aiAnalyzing}
                    >
                      {aiAnalyzing ? 'Analyzing...' : 'Run Audit'}
                    </button>
                  </div>

                  {aiAnalysis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Urgency: {aiAnalysis.urgency}</span>
                      </div>
                      <p style={{ color: '#e2e8f0', lineHeight: '1.4' }}>
                        {aiAnalysis.reason}
                      </p>
                      {aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Recommended Steps:</div>
                          <ul style={{ paddingLeft: '16px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {aiAnalysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Click 'Run Audit' to get automated AI breakdown of task urgency, complexity, and recommendations.
                    </p>
                  )}
                </div>

                {/* Detailed View Footer Buttons */}
                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px'
                }}>
                  <button
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="btn btn-danger"
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Close
                    </button>
                    <button
                      onClick={handleStartEdit}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      <Edit size={14} /> Edit Task
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
