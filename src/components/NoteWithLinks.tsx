import type { ReactNode } from 'react';

interface Props {
  text: string;
}

export function NoteWithLinks({ text }: Props) {
  const parts: ReactNode[] = [];
  const re = /https?:\/\/[^\s]+/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a
        key={m.index}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="note-link"
        onClick={(e) => e.stopPropagation()}
      >
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
