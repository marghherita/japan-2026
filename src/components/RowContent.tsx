import { Tag } from './Tag';
import { NoteWithLinks } from './NoteWithLinks';

interface Props {
  text: string;
  url?: string;
  tags?: string[];
  note?: string;
}

export function RowContent({ text, url, tags, note }: Props) {
  return (
    <div className="row-content">
      <span className="row-text">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="row-title-link"
            onClick={(e) => e.stopPropagation()}
          >
            {text}
          </a>
        ) : (
          text
        )}
        {tags?.map((t) => <Tag key={t} label={t} />)}
      </span>
      {note && (
        <div className="row-note">
          <NoteWithLinks text={note} />
        </div>
      )}
    </div>
  );
}
