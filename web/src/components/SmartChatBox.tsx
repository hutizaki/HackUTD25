import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createProject, startMockPipeline } from '@/lib/projects';
import type { Project } from '@/types/api';

interface SmartChatBoxProps {
  onProjectCreated?: (project: Project) => void;
  onPipelineStarted?: (runId: string, projectId: string) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: {
    type: 'create_project' | 'start_pipeline' | 'view_tickets';
    data?: any;
  };
}

interface QuickAction {
  icon: string;
  label: string;
  command: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: '🚀',
    label: 'New Project',
    command: '/create',
    description: 'Create a new project',
  },
  {
    icon: '⚡',
    label: 'Run Pipeline',
    command: '/run',
    description: 'Start a mock pipeline',
  },
  {
    icon: '🎫',
    label: 'View Tickets',
    command: '/tickets',
    description: 'Show all tickets',
  },
  {
    icon: '📊',
    label: 'Stats',
    command: '/stats',
    description: 'Show project statistics',
  },
];

const EXAMPLE_PROMPTS = [
  'Create a user authentication system',
  'Build a REST API for blog posts',
  'Make a real-time chat application',
  'Create a task management dashboard',
];

export function SmartChatBox({ onProjectCreated, onPipelineStarted }: SmartChatBoxProps) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date(),
      },
    ]);
  };

  const parseCommand = (text: string): { command: string; args: string } | null => {
    if (!text.startsWith('/')) return null;
    const parts = text.split(' ');
    return {
      command: parts[0],
      args: parts.slice(1).join(' '),
    };
  };

  const handleCreateProject = async (prompt: string) => {
    try {
      setIsProcessing(true);

      // Extract project name and description from prompt
      const name = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;
      const description = `Project created from chat: ${prompt}`;

      addMessage({
        type: 'assistant',
        content: `Creating project: "${name}"...`,
      });

      const project = await createProject({
        name,
        description,
        tags: ['chat-created', 'auto-generated'],
      });

      addMessage({
        type: 'system',
        content: `✅ Project "${project.name}" created successfully!`,
        action: {
          type: 'create_project',
          data: project,
        },
      });

      onProjectCreated?.(project);

      // Ask if they want to run the pipeline
      setTimeout(() => {
        addMessage({
          type: 'assistant',
          content: `Would you like to run the mock pipeline for this project? Type "yes" or "/run ${project.id}"`,
        });
      }, 500);

      return project;
    } catch (error) {
      addMessage({
        type: 'system',
        content: `❌ Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartPipeline = async (projectId: string, prompt: string) => {
    try {
      setIsProcessing(true);

      addMessage({
        type: 'assistant',
        content: `Starting mock pipeline for project...`,
      });

      const result = await startMockPipeline(projectId, prompt);

      addMessage({
        type: 'system',
        content: `🚀 Pipeline started! Run ID: ${result.runId}\n\nWatch the PM agent create tickets, DEV implement, and QA test!`,
        action: {
          type: 'start_pipeline',
          data: result,
        },
      });

      onPipelineStarted?.(result.runId, projectId);
      
      // Navigate to pipeline page
      navigate(`/projects/${projectId}/pipeline/${result.runId}`);
    } catch (error) {
      addMessage({
        type: 'system',
        content: `❌ Failed to start pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();
    setInput('');
    setShowExamples(false);

    // Add user message
    addMessage({
      type: 'user',
      content: userInput,
    });

    // Check for commands
    const command = parseCommand(userInput);

    if (command) {
      // Handle commands
      switch (command.command) {
        case '/create':
          if (!command.args) {
            addMessage({
              type: 'assistant',
              content: 'Please provide a project description. Example: /create Build a todo app',
            });
          } else {
            await handleCreateProject(command.args);
          }
          break;

        case '/run':
          if (!command.args) {
            addMessage({
              type: 'assistant',
              content: 'Please provide a project ID. Example: /run <project-id>',
            });
          } else {
            const [projectId, ...promptParts] = command.args.split(' ');
            const prompt = promptParts.join(' ') || 'Implement the project requirements';
            await handleStartPipeline(projectId, prompt);
          }
          break;

        case '/help':
          addMessage({
            type: 'assistant',
            content: `Available commands:
• /create <description> - Create a new project
• /run <project-id> [prompt] - Start mock pipeline
• /tickets - View all tickets
• /stats - Show statistics
• /help - Show this help message

Or just describe what you want to build!`,
          });
          break;

        case '/tickets':
          addMessage({
            type: 'assistant',
            content: '🎫 Ticket management coming soon! For now, check the project details page.',
          });
          break;

        case '/stats':
          addMessage({
            type: 'assistant',
            content: '📊 Statistics dashboard coming soon!',
          });
          break;

        default:
          addMessage({
            type: 'assistant',
            content: `Unknown command: ${command.command}. Type /help for available commands.`,
          });
      }
    } else {
      // Natural language processing
      const lowerInput = userInput.toLowerCase();

      if (
        lowerInput.includes('create') ||
        lowerInput.includes('build') ||
        lowerInput.includes('make') ||
        lowerInput.includes('develop')
      ) {
        // User wants to create a project
        await handleCreateProject(userInput);
      } else if (lowerInput === 'yes' && messages.length > 0) {
        // Check if last message was asking about running pipeline
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.content.includes('run the mock pipeline')) {
          // Find the last created project
          const lastProject = messages
            .reverse()
            .find((m) => m.action?.type === 'create_project');
          if (lastProject?.action?.data) {
            await handleStartPipeline(lastProject.action.data.id, lastProject.action.data.name);
          }
        }
      } else {
        // Generic response
        addMessage({
          type: 'assistant',
          content: `I can help you:
• Create projects (just describe what you want!)
• Run mock pipelines
• Manage tickets

Try: "Create a todo app" or type /help for commands`,
        });
      }
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.command + ' ');
    inputRef.current?.focus();
    setShowQuickActions(false);
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    inputRef.current?.focus();
    setShowExamples(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Chat Messages */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 max-h-96 overflow-y-auto"
          >
            <div className="space-y-3">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm">🤖</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : message.type === 'system'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {message.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">👤</span>
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Message */}
      {messages.length === 0 && (
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              What would you like to build?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Describe your project or use commands like /create, /run, /help
            </p>
          </div>
        </div>
      )}

      {/* Example Prompts */}
      {showExamples && messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-wrap gap-2"
        >
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              {example}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-2xl shadow-lg p-4 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors">
          <div className="flex items-center gap-3">
            {/* Quick Actions Button */}
            <button
              type="button"
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Quick Actions"
            >
              <svg
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
              placeholder="Message AI assistant..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:opacity-50"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions Dropdown */}
        <AnimatePresence>
          {showQuickActions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2"
            >
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.command}
                    onClick={() => handleQuickAction(action)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {action.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Hint Text */}
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Try: "Create a blog platform" or type <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">/help</code> for commands
        </p>
      </div>
    </div>
  );
}

