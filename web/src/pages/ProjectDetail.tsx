import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getProject, updateProject, deleteProject } from '@/lib/projects';
import type { Project, UpdateProjectInput } from '@/types/api';

type Tab = 'home' | 'code' | 'marketing' | 'analytics' | 'settings';

function ProjectDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');

  useEffect(() => {
    if (!id) {
      setError('Project ID is required');
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProject(id);
        setProject(data);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('404') || err.message.includes('not found')) {
            setError('Project not found');
          } else if (err.message.includes('403') || err.message.includes('forbidden')) {
            setError('You do not have permission to view this project');
          } else {
            setError(err.message || 'Failed to load project');
          }
        } else {
          setError('Failed to load project');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
        <LoadingSpinner message="Loading project..." />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Project not found'}
          </h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Project Details Header */}
        <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              {/* Project Name */}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {project.name}
              </h1>
              {/* Description */}
              {project.description && (
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Last Updated */}
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {new Date(project.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-2">
              {/* Home Tab */}
              <button
                onClick={() => setActiveTab('home')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'home'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Home
              </button>
              <button
                disabled
                className="w-full text-left px-4 py-2 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
              >
                Tasks
              </button>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

              {/* Development Tab (disabled) */}
              <button
                disabled
                className="w-full text-left px-4 py-2 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
              >
                Development
              </button>
              {/* Development Subtabs */}
              <div className="pl-6 space-y-1">
                <button
                  disabled
                  className="w-full text-left px-4 py-2 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50 text-sm"
                >
                  Code
                </button>
                <button
                  disabled
                  className="w-full text-left px-4 py-2 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50 text-sm"
                >
                  Deployment
                </button>
                <button
                  disabled
                  className="w-full text-left px-4 py-2 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50 text-sm"
                >
                  Access Tokens
                </button>
              </div>
              <button
                disabled
                className="w-full text-left px-4 py-2 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
              >
                Marketing and Sales
              </button>
              <button
                disabled
                className="w-full text-left px-4 py-2 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
              >
                Analytics and Insights
              </button>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

              {/* Settings Tab */}
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Project Settings
              </button>
              <button
                disabled
                className="w-full text-left px-4 py-2 rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
              >
                Collaborators
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              {activeTab === 'home' && <HomeTab />}
              {activeTab === 'settings' && (
                <SettingsTab
                  project={project}
                  onUpdate={(updatedProject) => setProject(updatedProject)}
                  onDelete={() => navigate('/dashboard')}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Home Tab Component
function HomeTab() {
  return (
    <div className="flex flex-col h-full">
      {/* ChatGPT-style Chat Interface */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-full max-w-3xl mx-auto">
          {/* Chat Icon/Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center opacity-50">
              <svg
                className="w-8 h-8 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              How can I help you today?
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Chatbot terminal coming soon...
            </p>
          </div>

          {/* Example Prompts (ChatGPT-style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            <button
              disabled
              className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-50 cursor-not-allowed"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Generate code
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create a new feature
              </p>
            </button>
            <button
              disabled
              className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-50 cursor-not-allowed"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Analyze project
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Get insights and recommendations
              </p>
            </button>
            <button
              disabled
              className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-50 cursor-not-allowed"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deploy application
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Launch your project
              </p>
            </button>
            <button
              disabled
              className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-50 cursor-not-allowed"
            >
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Create marketing content
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generate promotional materials
              </p>
            </button>
          </div>

          {/* Disabled Input Area */}
          <div className="relative">
            <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-2xl shadow-lg p-4 opacity-50">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    disabled
                    placeholder="Message AI assistant..."
                    className="w-full bg-transparent text-gray-500 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none cursor-not-allowed"
                  />
                </div>
                <button
                  disabled
                  className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({
  project,
  onUpdate,
  onDelete,
}: {
  project: Project;
  onUpdate: (project: Project) => void;
  onDelete: () => void;
}) {
  const [formData, setFormData] = useState<UpdateProjectInput>({
    name: project.name,
    description: project.description || '',
    tags: project.tags || [],
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name?.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    try {
      const updatedProject = await updateProject(project.id, {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        tags: formData.tags && formData.tags.length > 0 ? formData.tags : undefined,
      });
      onUpdate(updatedProject);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(project.id);
      onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tag],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCancel = () => {
    setFormData({
      name: project.name,
      description: project.description || '',
      tags: project.tags || [],
    });
    setTagInput('');
    setError(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Project Settings
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter project name"
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Description
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter project description (optional)"
            disabled={loading}
          />
        </div>

        {/* Tags */}
        <div>
          <label
            htmlFor="tags"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter tag and press Enter"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={loading || !tagInput.trim()}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          {formData.tags && formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    disabled={loading}
                    className="hover:text-blue-600 dark:hover:text-blue-300 disabled:opacity-50"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Save/Cancel Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.name?.trim()}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Delete Section */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Danger Zone
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Once you delete a project, there is no going back. Please be certain.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading || deleting}
            className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Project
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Project'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectDetail() {
  return (
    <ProtectedRoute>
      <ProjectDetailContent />
    </ProtectedRoute>
  );
}

