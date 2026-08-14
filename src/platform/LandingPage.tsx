import { useEffect, useState, type MouseEvent } from 'react';
import { navigate } from '../lib/router';
import { CATALOG } from './catalog';
import HatCard3D from './HatCard3D';
import HeroHat from './HeroHat';
import { hasStudioDraft } from '../studio/store';

const SHAPES: { id: string; label: string; active?: boolean }[] = [
  { id: 'boettehatt', label: 'Bøttehatt', active: true },
  { id: 'lue', label: 'Lue' },
  { id: 'armbaand', label: 'Armbånd' },
  { id: 'pannebaand', label: 'Pannebånd' },
  { id: 'bamse', label: 'Bamse' },
  { id: 'hjelm', label: 'Vikinghjelm' },
];

const SECTIONS = [
  {
    nr: '01',
    title: 'Lag din egen',
    desc: 'MASKLAB Studio: tekst, motiv og foto i egne lag — tegn rett på diagrammet og se hatten bygge seg opp i 3D mens du jobber.',
    cta: 'Åpne studio →',
    to: '/studio',
  },
  {
    nr: '02',
    title: 'Bøttehatt-oppskrifter',
    desc: "Ferdige mønstre — Helene Spilling-originalene og NORWAY'26: Home, Away og Keeper. Velg én, følg guiden, bli ferdig.",
    cta: 'Bla i galleriet →',
    to: '/oppskrifter',
  },
  {
    nr: '03',
    title: 'Helene Spilling-kolleksjonen',
    desc: 'RO RO RO-originalene som rodde VM i land — lastet ned over 30 000 ganger. Alle tre hattene, med komplett guide.',
    cta: 'Se kolleksjonen →',
    to: '/kolleksjon',
  },
];

/** The three NORGE hats plus the Helene original everything else grew from. */
const PRESETS = [
  'ro-ro-ro',
  'norway26-training',
  'norway26-black',
  'norway26-keeper',
] as const;

function go(e: MouseEvent<HTMLAnchorElement>, to: string) {
  if (to === '/studio') return; // full load — studio boots its own state
  e.preventDefault();
  navigate(to);
}

export default function LandingPage() {
  const [resume, setResume] = useState(false);

  useEffect(() => {
    setResume(hasStudioDraft());
  }, []);

  const presets = PRESETS.map((id) => CATALOG.find((p) => p.id === id)!).filter(
    Boolean,
  );

  return (
    <div className="ml-landing">
      <div className="ml-hero split">
        <div className="ml-hero-copy">
          <span className="ml-eyebrow">Interaktive 3D-heklemønstre · Norge</span>
          <h1 className="ml-hero-headline">Hekle din egen bøttehatt.</h1>
          <p className="ml-hero-lede">
            Design den i studio, <em>se den i 3D</em>, og få oppskriften — maske
            for maske.
          </p>
          <div className="ml-hero-ctas">
            <a href="/studio" className="ml-btn primary big">
              Design din egen →
            </a>
            <a
              href="/oppskrifter"
              className="ml-linkbtn"
              onClick={(e) => go(e, '/oppskrifter')}
            >
              Se de ferdige oppskriftene
            </a>
            {resume && (
              <a href="/studio" className="ml-linkbtn">
                Fortsett der du slapp
              </a>
            )}
          </div>
        </div>
        <HeroHat />
      </div>


      <div className="ml-landing-body">
        <div className="ml-block">
          <div className="ml-block-head">
            <span className="ml-block-label">… eller start fra en ferdig hatt</span>
            <span className="ml-block-note">Alt kan endres i studio</span>
          </div>
          <div className="ml-thumbs">
            {presets.map((p) => (
              <div key={p.id} className="ml-thumb-card">
                <a href={`/studio?pattern=${p.id}`} className="ml-thumb-link">
                  <HatCard3D id={p.id} />
                </a>
                <span className="ml-thumb-foot">
                  <a
                    href={`/oppskrift/${p.id}`}
                    className="ml-thumb-name"
                    title="Hekle med guide"
                  >
                    {p.name}
                  </a>
                  <a href={`/studio?pattern=${p.id}`} className="ml-thumb-open">
                    Åpne i studio →
                  </a>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ml-sections">
          {SECTIONS.map((s) => (
            <a
              key={s.nr}
              href={s.to}
              className="ml-section-card"
              onClick={(e) => go(e, s.to)}
            >
              <span className="ml-nr">{s.nr}</span>
              <span className="ml-section-title">{s.title}</span>
              <span className="ml-section-desc">{s.desc}</span>
              <span className="ml-section-cta">{s.cta}</span>
            </a>
          ))}
        </div>

        <div className="ml-block">
          <div className="ml-block-head">
            <span className="ml-block-label">Hva du kan lage</span>
            <span className="ml-block-note">Bøttehatt nå — mer kommer</span>
          </div>
          <div className="ml-shapes">
            {SHAPES.map((s) =>
              s.active ? (
                <a key={s.id} href="/studio" className="ml-shape active">
                  <span className="ml-shape-label">{s.label}</span>
                </a>
              ) : (
                <span key={s.id} className="ml-shape soon">
                  <span className="ml-shape-label">{s.label}</span>
                  <span className="ml-soon">kommer snart</span>
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
