import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../api';
import {
  Sparkles,
  Send,
  User,
  Bot,
  Lightbulb,
  FileText,
  TrendingUp,
  Award,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export default function AIChatCoach({ addToast }) {
  // Chat state
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Productivity Coach. Ask me how to optimize your schedule, group your tasks, or overcome bottlenecks.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Coach Advice & Report states
  const [tips, setTips] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('weekly');

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial advice and summary
  useEffect(() => {
    loadCoachData();
  }, []);

  const loadCoachData = async () => {
    await Promise.all([
      fetchCoachTips(),
      fetchWorkloadSummary()
    ]);
  };

  const fetchCoachTips = async () => {
    setTipsLoading(true);
    try {
      const data = await aiAPI.getCoachAdvice();
      setTips(data || []);
    } catch (err) {
      console.warn("AI Coach advice failed:", err);
      // Fallback mock
      setTips([
        "Group tasks by similarity (batching) to avoid cognitive context-switching overhead.",
        "Ensure you schedule hard tasks during your peak energy hours (usually morning).",
        "Set strict 15-minute buffers between recurring meetings to digest actions."
      ]);
    } finally {
      setTipsLoading(false);
    }
  };

  const fetchWorkloadSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await aiAPI.getSummary();
      setSummary(data || null);
    } catch (err) {
      console.warn("AI summary failed:", err);
      setSummary({
        summary: "You have several pending tasks with medium and high priorities due soon.",
        focalTasks: [
          "Complete frontend implementation",
          "Verify database calculations"
        ],
        encouragement: "Stay focused. Small progress everyday accumulates into major achievements!"
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setChatLoading(true);

    try {
      const data = await aiAPI.chat(userText);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.warn("AI Chat error:", err);
      
      // Smart offline response fallback engine
      const getSmartCoachReply = (text) => {
        const lower = text.toLowerCase();
        
        // 1. Greetings
        if (lower.match(/\b(hi|hello|hey|greetings|yo|sup)\b/)) {
          return "Hello! I'm here to help you organize your workday and plan your focus sessions. What goals are you tackling today?";
        }
        
        // 2. Priorities and Priority Score formula
        if (lower.includes('priority') || lower.includes('score') || lower.includes('formula') || lower.includes('important') || lower.includes('critical')) {
          return "Prioritizing tasks keeps you focused. In this system, we calculate a live Priority Score: Priority Weight (Low: 10, Medium: 20, High: 30) + Urgency Points (Overdue: 50+, Due Today: 40, Due Tomorrow: 25). I highly recommend starting your day with the highest-scoring tasks first!";
        }
        
        // 3. Procrastination / Motivation
        if (lower.includes('procrastinate') || lower.includes('start') || lower.includes('motivation') || lower.includes('lazy') || lower.includes('stuck') || lower.includes('focus')) {
          return "Procrastination is often caused by task overwhelm. Try the 5-Minute Rule: Commit to working on a task for just 5 minutes. Usually, once you begin, the friction disappears and you find the momentum to continue.";
        }
        
        // 4. Scheduling & Time buffers
        if (lower.includes('schedule') || lower.includes('time') || lower.includes('hour') || lower.includes('buffer') || lower.includes('duration')) {
          return "When structuring your schedule, always add a 20-30% buffer for unexpected interruptions. If a task feels like it will take 1 hour, allocate 1.5 hours in your calendar to prevent backlog overflow.";
        }
        
        // 5. Overdue / Deadlines
        if (lower.includes('overdue') || lower.includes('late') || lower.includes('tomorrow') || lower.includes('today') || lower.includes('due') || lower.includes('date') || lower.includes('deadline')) {
          return "If you're accumulating overdue tasks, let's pause and groom your backlog. Try time-boxing: allocate the first 45 minutes of your morning exclusively to knock out overdue items before you check emails or start new projects.";
        }

        // 6. Subtasks / Checklist
        if (lower.includes('subtask') || lower.includes('checklist') || lower.includes('break down') || lower.includes('split') || lower.includes('step')) {
          return "Breaking major tasks into subtasks is a superpower. Try to make your subtasks so granular that each one can be completed in under 20 minutes. It builds a steady sense of progress!";
        }

        // 7. Categories
        if (lower.includes('category') || lower.includes('categories') || lower.includes('tag') || lower.includes('work') || lower.includes('personal')) {
          return "Grouping tasks by category helps prevent mental fatigue. Try to 'batch' tasks from the same category (e.g. all 'Coding' or all 'Admin' tasks) into the same block of time.";
        }

        // 8. Kanban Board
        if (lower.includes('kanban') || lower.includes('board') || lower.includes('drag') || lower.includes('column') || lower.includes('visual')) {
          return "The Kanban board lets you visualize your workflow state. Try dragging tasks from Todo to In Progress when you actively start them. Once marked as Completed, any recurring settings will automatically roll them forward!";
        }

        // 9. Reminders / Emails
        if (lower.includes('remind') || lower.includes('reminder') || lower.includes('alert') || lower.includes('notify') || lower.includes('email')) {
          return "Reminders and email notifications help keep you accountable. Check the Dashboard alerts panel regularly to see what overdue or high-priority items need your immediate attention.";
        }

        // 10. Thank you
        if (lower.includes('thank') || lower.includes('thanks') || lower.includes('awesome') || lower.includes('great') || lower.includes('good')) {
          return "You're very welcome! I'm always here to keep you focused. What task or schedule are we planning next?";
        }

        // General default answers
        const defaults = [
          "That is a valuable point. When it comes to productivity, clarity is key. How can we break this goal down into a concrete task in your workspace?",
          "To stay productive, I recommend writing this down as a task in your workspace. Once it has a due date and priority, I can calculate its score and help you track it.",
          "Consistency beats intensity. How does this topic align with your high-priority items for this week?",
          "I suggest checking your Dashboard stats and compiling a Weekly Report to analyze how much focus time you can allocate to this goal."
        ];
        
        // Simple hash based on string length to select a default response
        const index = text.length % defaults.length;
        return defaults[index];
      };

      const replyText = getSmartCoachReply(userText);
      setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
      addToast('AI Coach Assist', 'Response generated by local coach intelligence.', 'info');
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReport(null);
    try {
      const data = await aiAPI.getPerformanceReport(reportPeriod);
      setReport(data || null);
    } catch (err) {
      console.warn("AI Report failed:", err);
      // Fallback mock report
      addToast('AI Notice', 'API key not configured. Generating mock report.', 'info');
      setReport({
        periodSummary: `You maintained a decent work pace during this ${reportPeriod} period. Tacking overdue items remains your primary bottleneck.`,
        productivityScore: 78,
        completionRatePct: 70,
        analysis: "Strengths: Consistent daily check-ins and structured categories. Weaknesses: Estimating effort for complex items leading to due date slippage.",
        advice: [
          "Increase granularity by breaking tasks into subtasks.",
          "Set daily reminders for overdue items.",
          "Allocate a fixed 30-minute block for backlog grooming."
        ]
      });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '6px' }}>AI Productivity Coach</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Interact with your chatbot tutor, inspect workload summaries, and compile weekly performance statistics.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Chat thread */}
        <div className="glass-card" style={{ height: '560px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" />
            AI Coach Conversation Thread
          </h3>

          {/* Messages body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary-glow)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Bot size={16} />
                  </div>
                )}
                
                <div style={{
                  background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  lineHeight: '1.5',
                  borderRadiusTopLeft: msg.role === 'assistant' ? '0px' : '12px',
                  borderRadiusTopRight: msg.role === 'user' ? '0px' : '12px',
                }}>
                  {msg.content}
                </div>

                {msg.role === 'user' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}
            
            {chatLoading && (
              <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--primary-glow)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Bot size={16} />
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Form input */}
          <form onSubmit={handleSendMessage} style={{
            display: 'flex',
            gap: '8px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px'
          }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, height: '42px' }}
              placeholder="Ask anything about focus, schedules, or procrastination..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={chatLoading}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0px 18px' }} disabled={chatLoading}>
              <Send size={16} />
            </button>
          </form>

        </div>

        {/* Right Column: Workload summary & Performance Reports */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Workload Summary Box */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lightbulb size={18} color="var(--warning)" />
              Active Workload Summary
            </h3>
            {summaryLoading ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading summary details...</p>
            ) : summary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <p style={{ color: '#cbd5e1', lineHeight: '1.5' }}>{summary.summary}</p>
                
                {summary.focalTasks && summary.focalTasks.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', marginBottom: '6px' }}>Focal Tasks:</div>
                    <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                      {summary.focalTasks.map((ft, i) => <li key={i}>{ft}</li>)}
                    </ul>
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', color: 'var(--accent)', fontStyle: 'italic', fontWeight: 500 }}>
                  💡 {summary.encouragement}
                </div>
              </div>
            ) : null}
          </div>

          {/* Performance Report Generator */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={18} color="var(--primary)" />
              Productivity Performance Report
            </h3>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <select
                className="form-input"
                style={{ flex: 1, padding: '6px 12px', fontSize: '13px' }}
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
              >
                <option value="weekly">Weekly Summary</option>
                <option value="monthly">Monthly Summary</option>
              </select>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '13px', padding: '8px 16px' }}
                onClick={handleGenerateReport}
                disabled={reportLoading}
              >
                {reportLoading ? 'Generating...' : 'Compile Report'}
              </button>
            </div>

            {report && (
              <div style={{
                background: 'rgba(0,0,0,0.12)',
                border: '1px solid var(--border-color)',
                padding: '14px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '14px' }}>{reportPeriod} Audit</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 700 }}>
                    <Award size={16} />
                    Score: {report.productivityScore}/100
                  </div>
                </div>

                <p style={{ color: '#cbd5e1', lineHeight: '1.4' }}>{report.periodSummary}</p>
                
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Analysis:</div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{report.analysis}</p>
                </div>

                {report.advice && report.advice.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Growth Suggestions:</div>
                    <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
                      {report.advice.map((adv, idx) => <li key={idx}>{adv}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3 Tailored Tips Card */}
          <div className="glass-card" style={{
            background: 'linear-gradient(135deg, rgba(22, 28, 45, 0.65) 0%, rgba(245, 158, 11, 0.03) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.1)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lightbulb size={18} color="var(--warning)" />
              Daily Focus Tips
            </h3>
            {tipsLoading ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading focus details...</p>
            ) : (
              <ul style={{
                paddingLeft: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}>
                {tips.map((tip, idx) => (
                  <li key={idx} style={{ lineHeight: '1.4' }}>
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
