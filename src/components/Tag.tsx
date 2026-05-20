import { tagColors } from '../data';

interface Props {
  label: string;
}

export function Tag({ label }: Props) {
  const style = tagColors[label] ?? { bg: '#F3F4F6', color: '#374151' };
  return (
    <span className="tag" style={{ background: style.bg, color: style.color }}>
      {label}
    </span>
  );
}
