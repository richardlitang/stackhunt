/**
 * YouTube Video Embed - Lite/Facade Pattern
 * Loads thumbnail first, player only on click (~2KB vs 1.2MB)
 */

import LiteYouTubeEmbed from 'react-lite-youtube-embed';
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css';

interface Props {
  id: string;
  title: string;
  className?: string;
}

export default function VideoEmbed({ id, title, className = '' }: Props) {
  return (
    <div className={`rounded-xl overflow-hidden shadow-lg border border-slate-200 ${className}`}>
      <LiteYouTubeEmbed
        id={id}
        title={title}
        poster="maxresdefault"
        webp
      />
    </div>
  );
}
