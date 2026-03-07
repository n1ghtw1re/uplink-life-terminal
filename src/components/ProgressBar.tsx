interface ProgressBarProps {
  value: number;
  max: number;
  width?: string;
  height?: number;
}

const ProgressBar = ({ value, max, width = '100%', height = 8 }: ProgressBarProps) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="progress-bar" style={{ width, height }}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
};

export default ProgressBar;
