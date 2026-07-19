import React, { useState, useEffect } from 'react';
import { dashboardAPI, tasksAPI } from '../api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import {
  ListTodo,
  CheckCircle,
  Clock,
  AlertTriangle,
  Award,
  Sparkles,
  TrendingUp,
  Flame,
  ArrowRight
} from 'lucide-react';

export default function Dashboard({ onNavigateToTasks, onNavigateToCoach, addToast }) {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // AI Fallback Mock if backend throws an error or returns placeholders
  const getMockInsights = (metrics) => {
    const friction = Math.min(90, Math.max(10, metrics.overdueTasks * 15 + metrics.highPriorityTasks * 10));
    return {
      dailyInsight: "To maintain velocity, focus on finishing overdue items first thing in the morning before starting new ones.",
      completionForecast: metrics.pendingTasks > 0 
        ? `Approx. ${Math.ceil(metrics.pendingTasks * 1.5)} days to clear backlog at current velocity.`
        : "Backlog cleared!",
      bottleneckRisk: metrics.overdueTasks > 2 ? "High (Overdue tasks accumulating)" : "Low",
      taskFrictionPct: friction
    };
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError('');
        const [statsData, tasksData] = await Promise.all([
          dashboardAPI.getStats(),
          tasksAPI.getTasks({ limit: 100 }) // get recent tasks for calculation
        ]);

        let refinedStats = { ...statsData };
        // If AI insights didn't get parsed or failed due to missing API key, supply mocks
        if (!statsData.aiInsights || statsData.aiInsights.completionForecast === "N/A") {
          refinedStats.aiInsights = getMockInsights(statsData.metrics);
        }
        
        setStats(refinedStats);
        setTasks(tasksData.tasks || []);
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError("Could not load dashboard statistics. Backend might be offline.");
        // Fallback to local calculation if offline/error for testing
        const fallbackMetrics = {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          highPriorityTasks: 0,
          completionRatePct: 0
        };
        setStats({
          metrics: fallbackMetrics,
          categoryDistribution: [],
          priorityDistribution: { HIGH: 0, MEDIUM: 0, LOW: 0 },
          weeklyProgress: [
            { date: "Mon", completedCount: 0 },
            { date: "Tue", completedCount: 0 },
            { date: "Wed", completedCount: 0 },
            { date: "Thu", completedCount: 0 },
            { date: "Fri", completedCount: 0 },
            { date: "Sat", completedCount: 0 },
            { date: "Sun", completedCount: 0 }
          ],
          aiInsights: getMockInsights(fallbackMetrics)
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const { metrics, categoryDistribution, priorityDistribution, weeklyProgress, aiInsights } = stats;

  // Calculate local reminders
  const todayStr = new Date().toISOString().split("T")[0];
  const pendingTasksList = tasks.filter(t => t.status !== "COMPLETED");
  
  const overdueTasks = pendingTasksList.filter(t => {
    const dueStr = new Date(t.dueDate).toISOString().split("T")[0];
    return dueStr < todayStr;
  });

  const dueTodayTasks = pendingTasksList.filter(t => {
    const dueStr = new Date(t.dueDate).toISOString().split("T")[0];
    return dueStr === todayStr;
  });

  const highPriorityUpcoming = pendingTasksList.filter(t => 
    t.priority === "HIGH" && new Date(t.dueDate).toISOString().split("T")[0] > todayStr
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>Dashboard Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Real-time productivity metrics and AI-powered task recommendations.
          </p>
        </div>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%' }}></span>
          System Sync Healthy
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--danger)',
          padding: '16px',
          borderRadius: '12px',
          fontSize: '15px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--primary)',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <ListTodo size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Tasks</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{metrics.totalTasks}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: 'var(--accent)',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Completed</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{metrics.completedTasks}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            color: 'var(--warning)',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Pending</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{metrics.pendingTasks}</div>
          </div>
        </div>

        <div className="glass-card" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          borderLeft: metrics.overdueTasks > 0 ? '4px solid var(--danger)' : '1px solid var(--border-color)'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--danger)',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Overdue</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: metrics.overdueTasks > 0 ? 'var(--danger)' : 'inherit' }}>
              {metrics.overdueTasks}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(168, 85, 247, 0.12)',
            color: '#a855f7',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Velocity Score</div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{metrics.completionRatePct}%</div>
          </div>
        </div>

      </div>

      {/* Main Charts & Reminders Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Weekly Productivity Chart & AI Forecasts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Productivity Chart Card */}
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="var(--primary)" />
              Productivity Velocity (Tasks Done)
            </h3>
            <div style={{ width: '100%', height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyProgress} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completedCount"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorDone)"
                    name="Completed Tasks"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights & Predictions Panel */}
          <div className="glass-card" style={{
            background: 'linear-gradient(135deg, rgba(22, 28, 45, 0.75) 0%, rgba(99, 102, 241, 0.05) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.15)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Sparkles size={20} color="var(--primary)" />
              AI Bottleneck Predictions & Forecasts
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Daily Productivity Recommendation</span>
                <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#e2e8f0' }}>
                  "{aiInsights.dailyInsight}"
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Forecast Backlog Clearance</span>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px', color: 'var(--accent)' }}>
                    {aiInsights.completionForecast}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Bottleneck Risk Level</span>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    background: aiInsights.bottleneckRisk === 'High' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: aiInsights.bottleneckRisk === 'High' ? 'var(--danger)' : 'var(--accent)'
                  }}>
                    {aiInsights.bottleneckRisk}
                  </div>
                </div>
              </div>

            </div>

            {/* Friction Score Dial */}
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Backlog Friction Percentage</span>
                <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{aiInsights.taskFrictionPct}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${aiInsights.taskFrictionPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary) 0%, var(--warning) 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease-out'
                }}></div>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Startup Reminders Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-card" style={{ minHeight: '418px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={20} color="var(--danger)" />
              Reminders Alert List
            </h3>

            {overdueTasks.length === 0 && dueTodayTasks.length === 0 && highPriorityUpcoming.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '280px',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                <CheckCircle size={48} color="var(--accent)" style={{ marginBottom: '16px', opacity: 0.8 }} />
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>All caught up!</h4>
                <p style={{ fontSize: '13px' }}>No overdue, due today, or upcoming high priority tasks.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '380px', overflowY: 'auto' }}>
                
                {/* Overdue Alert */}
                {overdueTasks.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ⚠️ Overdue Tasks ({overdueTasks.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {overdueTasks.slice(0, 3).map(task => (
                        <div key={task.id} style={{
                          background: 'rgba(239, 68, 68, 0.05)',
                          border: '1px solid rgba(239, 68, 68, 0.1)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '13px'
                        }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{task.title}</div>
                          <div style={{ color: 'var(--danger)', fontSize: '11px', fontWeight: 500 }}>
                            Overdue since: {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Due Today Alert */}
                {dueTodayTasks.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      📅 Due Today ({dueTodayTasks.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {dueTodayTasks.slice(0, 3).map(task => (
                        <div key={task.id} style={{
                          background: 'rgba(245, 158, 11, 0.05)',
                          border: '1px solid rgba(245, 158, 11, 0.1)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '13px'
                        }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{task.title}</div>
                          <div style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: 500 }}>
                            Complete by end of day today
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* High Priority Upcoming */}
                {highPriorityUpcoming.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#a855f7', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🔥 Urgent Upcoming ({highPriorityUpcoming.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {highPriorityUpcoming.slice(0, 3).map(task => (
                        <div key={task.id} style={{
                          background: 'rgba(168, 85, 247, 0.05)',
                          border: '1px solid rgba(168, 85, 247, 0.1)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          fontSize: '13px'
                        }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{task.title}</div>
                          <div style={{ color: '#a855f7', fontSize: '11px', fontWeight: 500 }}>
                            Due on: {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={onNavigateToTasks}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    marginTop: '8px'
                  }}
                >
                  Manage All Tasks <ArrowRight size={14} />
                </button>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
