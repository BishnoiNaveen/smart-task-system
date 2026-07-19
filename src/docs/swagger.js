// Swagger OpenAPI 3.0 Document Specification

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Enterprise AI-Powered Smart Task & Reminder System API",
    version: "1.0.0",
    description: "Production-ready backend API documentation incorporating JWT security, task management, dynamic priority calculations, and AI features."
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Development local server"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Input your JWT Access Token (acquired from /api/auth/login) as 'Bearer <TOKEN>'."
      }
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string", nullable: true },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          dueDate: { type: "string", format: "date-time" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "COMPLETED"] },
          recurring: { type: "string", enum: ["NONE", "DAILY", "WEEKLY", "MONTHLY"] },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
          estimatedTime: { type: "number" },
          completionPct: { type: "number" },
          categoryId: { type: "string", format: "uuid", nullable: true },
          userId: { type: "string", format: "uuid" },
          priorityScore: { type: "integer", minimum: 0, maximum: 100 }
        }
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          color: { type: "string" }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    "/api/auth/register": {
      post: {
        summary: "Register new user account",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "user@domain.com" },
                  password: { type: "string", minLength: 6, example: "password123" },
                  name: { type: "string", example: "Naveen" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "User registered successfully." },
          400: { description: "Invalid payload parameters or email already registered." }
        }
      }
    },
    "/api/auth/login": {
      post: {
        summary: "Authenticate user and fetch tokens",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "user@domain.com" },
                  password: { type: "string", example: "password123" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Login successful. Access and refresh tokens returned." },
          401: { description: "Invalid credentials." }
        }
      }
    },
    "/api/auth/logout": {
      post: {
        summary: "Revoke user active sessions and logout",
        tags: ["Authentication"],
        responses: {
          200: { description: "Logout successful." },
          401: { description: "Token missing or expired." }
        }
      }
    },
    "/api/auth/refresh-token": {
      post: {
        summary: "Issue new access token using refresh token",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "New access token generated." },
          401: { description: "Refresh session expired or token is invalid." }
        }
      }
    },
    "/api/categories": {
      get: {
        summary: "List user categories",
        tags: ["Categories"],
        responses: {
          200: { description: "Success" }
        }
      },
      post: {
        summary: "Create category tag",
        tags: ["Categories"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "color"],
                properties: {
                  name: { type: "string", example: "Coding" },
                  color: { type: "string", example: "#6366f1" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Created" },
          400: { description: "Category name already exists." }
        }
      }
    },
    "/api/tasks": {
      get: {
        summary: "Get tasks list with optional search/filters",
        tags: ["Tasks"],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" }, description: "Keyword search in title/desc" },
          { name: "status", in: "query", schema: { type: "string", enum: ["TODO", "IN_PROGRESS", "COMPLETED"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] } },
          { name: "categoryId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["dueDate", "priorityScore", "createdAt"], default: "dueDate" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          200: { description: "List of decorated tasks with pagination metadata." }
        }
      },
      post: {
        summary: "Create a new task",
        tags: ["Tasks"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "dueDate", "priority"],
                properties: {
                  title: { type: "string", example: "Deploy Backend API" },
                  description: { type: "string", example: "Deploy code to Render cloud service" },
                  dueDate: { type: "string", format: "date-time", example: "2026-07-25T12:00:00Z" },
                  priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], example: "HIGH" },
                  status: { type: "string", enum: ["TODO", "IN_PROGRESS", "COMPLETED"], default: "TODO" },
                  recurring: { type: "string", enum: ["NONE", "DAILY", "WEEKLY", "MONTHLY"], default: "NONE" },
                  difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"], default: "MEDIUM" },
                  estimatedTime: { type: "number", default: 2.5 },
                  completionPct: { type: "number", default: 0.0 },
                  categoryId: { type: "string", format: "uuid", nullable: true }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Task created successfully." }
        }
      }
    },
    "/api/dashboard": {
      get: {
        summary: "Fetch aggregated dashboard statistics and AI predictions",
        tags: ["Dashboard Analytics"],
        responses: {
          200: { description: "Metrics, weekly velocity, and AI insights." }
        }
      }
    },
    "/api/ai/chat": {
      post: {
        summary: "Interact with the AI productivity chatbot",
        tags: ["AI Features"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: { type: "string", example: "How can I structure my time to complete my 5 high priority tasks?" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Chat reply returned." }
        }
      }
    },
    "/api/ai/smart-task": {
      post: {
        summary: "Generate task automatically from natural language",
        tags: ["AI Features"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: { type: "string", example: "Submit homework assignments tomorrow at 5pm, priority is high" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Parsed and created task details returned." }
        }
      }
    }
  }
};

export default swaggerDocument;
