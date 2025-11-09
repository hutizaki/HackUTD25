import { useParams, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PipelineVisualization } from '@/components/PipelineVisualization';
import { ArrowLeft } from 'lucide-react';

function PipelinePageContent() {
  const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
  const navigate = useNavigate();

  if (!projectId || !runId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Pipeline</h2>
          <p className="text-slate-400 mb-6">Project ID or Run ID is missing</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </button>
      </div>

      <PipelineVisualization
        runId={runId}
        projectId={projectId}
        onComplete={() => {
          console.log('Pipeline completed!');
        }}
      />
    </div>
  );
}

export function PipelinePage() {
  return (
    <ProtectedRoute>
      <PipelinePageContent />
    </ProtectedRoute>
  );
}

