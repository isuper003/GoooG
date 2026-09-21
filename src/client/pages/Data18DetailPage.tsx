import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData18Movie, useData18Scene } from '../hooks/useData18';
import SceneDetailView from '../components/data18/SceneDetailView';
import MovieDetailView from '../components/data18/MovieDetailView';

function BackBar() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
      >
        <span>←</span>
        <span>Back</span>
      </button>
      <Link
        to="/data18"
        className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white transition-colors"
      >
        Data18 Explorer
      </Link>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      <p className="text-xs font-mono text-cyan-300 uppercase tracking-widest">Loading from Data18...</p>
    </div>
  );
}

function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-sm text-rose-300">
      <p className="font-bold">Failed to load from Data18</p>
      <p className="text-xs mt-1 opacity-80">{error instanceof Error ? error.message : 'Unknown error'}</p>
    </div>
  );
}

export function Data18ScenePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error } = useData18Scene(id);

  return (
    <div className="space-y-6">
      <BackBar />
      {isPending ? <Loading /> : error ? <ErrorState error={error} /> : <SceneDetailView key={data.id} scene={data} />}
    </div>
  );
}

export function Data18MoviePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isPending, error } = useData18Movie(slug);

  return (
    <div className="space-y-6">
      <BackBar />
      {isPending ? <Loading /> : error ? <ErrorState error={error} /> : <MovieDetailView key={data.id} movie={data} />}
    </div>
  );
}
