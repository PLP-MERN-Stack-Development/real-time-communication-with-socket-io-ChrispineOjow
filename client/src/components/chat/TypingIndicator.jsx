import clsx from 'clsx';

const TypingIndicator = ({ users = [] }) => {
  if (!users.length) return null;
  const label = users.length > 2 ? `${users.length} people are typing` : `${users.join(', ')} ${users.length === 1 ? 'is' : 'are'} typing`;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="flex items-center gap-1">
        <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
      </span>
      <span>{label}</span>
    </div>
  );
};

const Dot = ({ delay = '0ms' }) => (
  <span
    className={clsx('inline-block h-2 w-2 rounded-full bg-emerald-400')}
    style={{
      animation: 'pulse 1s infinite',
      animationDelay: delay,
    }}
  />
);

export default TypingIndicator;


