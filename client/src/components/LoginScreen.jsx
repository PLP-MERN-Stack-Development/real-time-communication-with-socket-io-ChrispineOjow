import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useSocketContext } from '../context/SocketProvider.jsx';

const colors = ['#f97316', '#16a34a', '#2563eb', '#9333ea', '#f43f5e'];

const randomColor = () => colors[Math.floor(Math.random() * colors.length)];

const LoginScreen = ({ isConnected }) => {
  const { login } = useSocketContext();
  const [form, setForm] = useState({
    username: '',
    avatarColor: randomColor(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => form.username.trim().length >= 3 && !isSubmitting, [form.username, isSubmitting]);

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (!canSubmit) return;
      setIsSubmitting(true);
      try {
        login({
          username: form.username.trim(),
          avatarColor: form.avatarColor,
        });
        setError('');
      } catch (err) {
        setError(err?.message || 'Unable to login');
        setIsSubmitting(false);
      }
    },
    [canSubmit, form.avatarColor, form.username, login],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/5 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Chat Application</p>
          <h1 className="text-3xl font-semibold text-white">Real-Time Chat</h1>
          <p className="text-sm text-slate-400">Join the conversation instantly </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Pick a username</span>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="e.g. Ada Lovelace"
              className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Avatar color</span>
            <div className="flex flex-wrap gap-3">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, avatarColor: color }))}
                  className={clsx(
                    'h-10 w-10 rounded-full border-2 border-transparent transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/40',
                    form.avatarColor === color && 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white/70',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select avatar color ${color}`}
                />
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className={clsx(
              'w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3 text-base font-semibold text-slate-950 transition focus:outline-none focus:ring-2 focus:ring-emerald-300/70 disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            {isSubmitting ? 'Connecting...' : 'Enter chat'}
          </button>
        </form>

        <div className="rounded-2xl border border-white/5 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
          Status:{' '}
          <span className={clsx(isConnected ? 'text-emerald-300' : 'text-amber-300')}>
            {isConnected ? 'Server reachable' : 'Waiting for connection'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;


