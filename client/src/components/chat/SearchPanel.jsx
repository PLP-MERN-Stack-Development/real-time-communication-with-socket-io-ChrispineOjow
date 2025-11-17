import { useSocketContext } from '../../context/SocketProvider.jsx';
import { format } from 'date-fns';

const SearchPanel = () => {
  const { searchResults, clearSearchResults } = useSocketContext();

  if (!searchResults.results.length) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-4 top-4 z-10 rounded-3xl border border-white/5 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <p>
          Showing {searchResults.results.length} results for <span className="text-slate-100">{searchResults.query}</span>
        </p>
        <button className="rounded-xl border border-white/10 px-2 py-1" onClick={clearSearchResults}>
          Close
        </button>
      </div>
      <div className="space-y-3">
        {searchResults.results.map((result) => (
          <div key={result.id} className="rounded-2xl border border-white/5 bg-slate-800/50 px-4 py-3 text-sm">
            <p className="text-xs text-slate-500">
              {result.senderName} • {format(new Date(result.createdAt), 'PPpp')}
            </p>
            <p className="text-slate-100">{result.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPanel;


