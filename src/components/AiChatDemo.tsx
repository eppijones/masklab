import { useRef, useState } from 'react';
import { useApp } from '../store';

/**
 * Demo AI assistant docked in the 3D stage (bottom-right).
 * Upload UI is local-only — nothing is sent anywhere yet.
 */
export default function AiChatDemo({ docked = false }: { docked?: boolean }) {
  const open = useApp((s) => s.aiChatOpen);
  const setOpen = useApp((s) => s.setAiChatOpen);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`ai-dock ${docked ? 'in-stage' : 'floating'} ${open ? 'open' : ''}`}>
      <button
        type="button"
        className={`ai-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        title="AI-assistent (kommer snart)"
        aria-expanded={open}
      >
        <span className="ai-fab-icon" aria-hidden>
          ✦
        </span>
        <span className="ai-fab-label">AI assistent</span>
      </button>

      {open && (
        <aside className="ai-panel" role="dialog" aria-label="AI assistent">
          <div className="ai-panel-head">
            <span className="label">AI assistent</span>
            <button type="button" className="school-close" onClick={() => setOpen(false)} aria-label="Lukk">
              ×
            </button>
          </div>
          <div className="ai-panel-body">
            <p className="ai-coming">AI-chat kommer her</p>
            <p className="ai-panel-copy">
              Snart kan du spørre en hekleekspert (ChatGPT eller Claude) som kjenner denne
              oppskriften. Last gjerne opp bilde eller video av arbeidet ditt.
            </p>
            <div className="ai-upload-row">
              <button type="button" className="ai-upload-btn" onClick={() => inputRef.current?.click()}>
                Last opp bilde / video / fil
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*,.pdf,.png,.jpg,.jpeg,.heic,.mp4,.mov"
                multiple
                hidden
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  setFiles((prev) => [...prev, ...list].slice(0, 6));
                  e.target.value = '';
                }}
              />
            </div>
            {files.length > 0 && (
              <ul className="ai-file-list">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`}>
                    <span>{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="ai-demo-input">
              <input
                type="text"
                placeholder="F.eks. «Hvorfor er runden skjev?»"
                disabled
                aria-disabled
              />
              <button type="button" disabled>
                Send
              </button>
            </div>
            <p className="ai-demo-note">Demo — ingen meldinger sendes ennå.</p>
          </div>
        </aside>
      )}
    </div>
  );
}
