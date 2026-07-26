import type { StepDef } from '../data/steps';

/** Soft Maskeskolen-style illustrations for the opening chapter (steps 1–3). */
export default function StartChapterArt({ step }: { step: StepDef }) {
  const chapterIdx =
    step.id === 'intro-utstyr' ? 1 : step.id === 'intro-garn' ? 2 : step.id === 'practice' ? 3 : 0;
  if (!chapterIdx) return null;

  return (
    <div className="start-chapter">
      <div className="start-chapter-badge">Startkapittel · del {chapterIdx} av 3</div>
      <div className="start-chapter-art" aria-hidden>
        {chapterIdx === 1 && <ArtKit />}
        {chapterIdx === 2 && <ArtYarnEnds />}
        {chapterIdx === 3 && <ArtPractice />}
      </div>
    </div>
  );
}

function ArtKit() {
  return (
    <svg viewBox="0 0 360 200" className="start-svg">
      <rect width="360" height="200" fill="#F7F0DF" rx="10" />
      {/* hook */}
      <path
        d="M48 130 C70 70 110 48 148 56 C170 60 178 78 164 92 C152 104 132 100 128 86"
        fill="none"
        stroke="#8A8070"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M148 56 L210 42" stroke="#8A8070" strokeWidth="7" strokeLinecap="round" />
      {/* yarn balls */}
      <circle cx="230" cy="128" r="28" fill="#F6F0E1" stroke="#C9BFA8" strokeWidth="2" />
      <circle cx="278" cy="118" r="22" fill="#BA0C2F" />
      <circle cx="312" cy="140" r="18" fill="#00205B" />
      {/* scissors */}
      <g stroke="#55503F" strokeWidth="3" fill="none" strokeLinecap="round">
        <circle cx="70" cy="158" r="8" />
        <circle cx="96" cy="158" r="8" />
        <path d="M76 152 L118 98" />
        <path d="M90 152 L118 98" />
      </g>
      <text x="24" y="36" fill="#00205B" fontFamily="Karla,sans-serif" fontSize="13" fontWeight="800" letterSpacing="1.5">
        DETTE TRENGER DU
      </text>
    </svg>
  );
}

function ArtYarnEnds() {
  return (
    <svg viewBox="0 0 360 200" className="start-svg">
      <rect width="360" height="200" fill="#F7F0DF" rx="10" />
      {/* ball */}
      <circle cx="86" cy="118" r="34" fill="#F6F0E1" stroke="#C9BFA8" strokeWidth="2" />
      {/* working yarn */}
      <path
        d="M118 108 C170 90 210 120 248 96 C280 76 300 88 318 78"
        fill="none"
        stroke="#BA0C2F"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* yarn tail */}
      <path
        d="M248 96 C236 124 220 148 198 168"
        fill="none"
        stroke="#BA0C2F"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 7"
        opacity="0.55"
      />
      {/* hook + loop */}
      <path
        d="M248 96 C268 70 300 68 318 86"
        fill="none"
        stroke="#8A8070"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="248" cy="96" r="11" fill="none" stroke="#BA0C2F" strokeWidth="5" />
      <text x="24" y="36" fill="#00205B" fontFamily="Karla,sans-serif" fontSize="13" fontWeight="800" letterSpacing="1.5">
        ARBEIDSTRÅD ≠ GARNHALE
      </text>
      <text x="200" y="58" fill="#BA0C2F" fontFamily="Karla,sans-serif" fontSize="11" fontWeight="800">
        arbeidstråd
      </text>
      <text x="168" y="186" fill="#8A8070" fontFamily="Karla,sans-serif" fontSize="11" fontWeight="800">
        garnhale (telles ikke)
      </text>
      <text x="232" y="128" fill="#00205B" fontFamily="Karla,sans-serif" fontSize="11" fontWeight="800">
        løkke på nål ≠ maske
      </text>
    </svg>
  );
}

function ArtPractice() {
  return (
    <svg viewBox="0 0 360 200" className="start-svg">
      <rect width="360" height="200" fill="#F7F0DF" rx="10" />
      {/* practice row of Vs */}
      {Array.from({ length: 8 }, (_, i) => {
        const x = 48 + i * 34;
        return (
          <g key={i} stroke="#F6F0E1" strokeWidth="5" fill="none" strokeLinecap="round">
            <path d={`M${x} 120 L${x + 10} 88 L${x + 20} 120`} />
          </g>
        );
      })}
      <g stroke="#C9BFA8" strokeWidth="2" fill="none">
        {Array.from({ length: 8 }, (_, i) => {
          const x = 48 + i * 34;
          return <path key={i} d={`M${x} 120 L${x + 10} 88 L${x + 20} 120`} />;
        })}
      </g>
      {/* hook working on last */}
      <path
        d="M290 70 C310 90 318 118 304 140"
        fill="none"
        stroke="#8A8070"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="286" cy="98" r="10" fill="none" stroke="#F6F0E1" strokeWidth="5" />
      <text x="24" y="36" fill="#00205B" fontFamily="Karla,sans-serif" fontSize="13" fontWeight="800" letterSpacing="1.5">
        ØVERAD — IKKE HATTEN
      </text>
      <text x="24" y="176" fill="#55503F" fontFamily="Karla,sans-serif" fontSize="12" fontWeight="700">
        Luftmasker → fastmasker. Skjevt? Dra opp og prøv igjen.
      </text>
    </svg>
  );
}
