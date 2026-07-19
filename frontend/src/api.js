// API Integration Layer with JWT token rotation support

let onLogoutCallback = null;

export const setOnLogout = (callback) => {
  onLogoutCallback = callback;
};

// Local token getters/setters
export const getAccessToken = () => localStorage.getItem("accessToken");
export const getRefreshToken = () => localStorage.getItem("refreshToken");
export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
};
export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

// Base Fetch Wrapper
export const apiFetch = async (url, options = {}) => {
  const accessToken = getAccessToken();
  
  // Set headers
  const headers = {
    ...options.headers,
  };
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  
  // Only set application/json if body is not FormData (which sets its own boundary)
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  const response = await fetch(url, fetchOptions);

  // If 401 and we have a refresh token, try to rotate access token
  if (response.status === 401) {
    const refreshTokenVal = getRefreshToken();
    if (refreshTokenVal) {
      try {
        const refreshResponse = await fetch("/api/auth/refresh-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refreshTokenVal }),
        });

        if (refreshResponse.ok) {
          const { accessToken: newAccessToken } = await refreshResponse.json();
          setTokens(newAccessToken);
          
          // Retry the original request with the new access token
          headers["Authorization"] = `Bearer ${newAccessToken}`;
          
          // Re-create headers inside fetchOptions with new token
          const retryOptions = {
            ...options,
            headers: {
              ...options.headers,
              "Authorization": `Bearer ${newAccessToken}`
            }
          };
          if (options.body && !(options.body instanceof FormData) && !retryOptions.headers["Content-Type"]) {
            retryOptions.headers["Content-Type"] = "application/json";
          }
          return await fetch(url, retryOptions);
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
      }
    }
    
    // If we reach here, session is completely expired
    clearTokens();
    if (onLogoutCallback) {
      onLogoutCallback();
    }
    throw new Error("Session expired. Please log in again.");
  }

  return response;
};

// Auth API Methods
export const authAPI = {
  login: async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed.");
    setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  register: async (email, password, name) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed.");
    return data;
  },

  logout: async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout request failed, cleaning local session anyway.", err);
    }
    clearTokens();
    if (onLogoutCallback) {
      onLogoutCallback();
    }
  },

  verifyEmail: async (token) => {
    const res = await fetch(`/api/auth/verify-email?token=${token}`, {
      method: "GET",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Email verification failed.");
    return data;
  },

  forgotPassword: async (email) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  },

  resetPassword: async (token, password) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Password reset failed.");
    return data;
  }
};

// Tasks API Methods
export const tasksAPI = {
  getTasks: async (params = {}) => {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        query.append(key, params[key]);
      }
    });
    const queryString = query.toString();
    const url = `/api/tasks${queryString ? `?${queryString}` : ""}`;
    const res = await apiFetch(url, { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve tasks.");
    return data;
  },

  getTaskById: async (id) => {
    const res = await apiFetch(`/api/tasks/${id}`, { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve task detail.");
    return data;
  },

  createTask: async (taskData) => {
    const res = await apiFetch("/api/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create task.");
    return data;
  },

  updateTask: async (id, taskDataOrFormData) => {
    const options = {
      method: "PUT"
    };

    if (taskDataOrFormData instanceof FormData) {
      options.body = taskDataOrFormData;
    } else {
      options.body = JSON.stringify(taskDataOrFormData);
    }

    const res = await apiFetch(`/api/tasks/${id}`, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update task.");
    return data;
  },

  deleteTask: async (id) => {
    const res = await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete task.");
    return data;
  },

  // Subtasks
  createSubtask: async (taskId, title) => {
    const res = await apiFetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create subtask.");
    return data;
  },

  toggleSubtask: async (subtaskId) => {
    const res = await apiFetch(`/api/tasks/subtasks/${subtaskId}/toggle`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to toggle subtask.");
    return data;
  }
};

// Categories API Methods
export const categoriesAPI = {
  getCategories: async () => {
    const res = await apiFetch("/api/categories", { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve categories.");
    return data;
  },

  createCategory: async (name, color) => {
    const res = await apiFetch("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create category.");
    return data;
  },

  deleteCategory: async (id) => {
    const res = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete category.");
    return data;
  }
};

// Dashboard API Methods
export const dashboardAPI = {
  getStats: async () => {
    const res = await apiFetch("/api/dashboard", { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve dashboard statistics.");
    return data;
  }
};

// AI Engine API Methods
export const aiAPI = {
  chat: async (message) => {
    const res = await apiFetch("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "AI Chat failed.");
    return data;
  },

  smartTask: async (text) => {
    const res = await apiFetch("/api/ai/smart-task", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "AI Smart Task parsing failed.");
    return data;
  },

  getTaskPriority: async (taskId) => {
    const res = await apiFetch(`/api/ai/tasks/${taskId}/priority`, { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "AI Priority analysis failed.");
    return data;
  },

  getCoachAdvice: async () => {
    const res = await apiFetch("/api/ai/coach", { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve AI coach advice.");
    return data;
  },

  getPerformanceReport: async (period = "weekly") => {
    const res = await apiFetch(`/api/ai/report?period=${period}`, { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate AI performance report.");
    return data;
  },

  getSummary: async () => {
    const res = await apiFetch("/api/ai/summary", { method: "GET" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to retrieve AI task summary.");
    return data;
  }
};
