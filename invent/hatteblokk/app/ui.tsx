import type { ReactNode } from 'react';
import type { Evidence } from '../data/content.ts';

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="iv-eyebrow">{children}</p>;
}

export function Tag({ k }: { k: Evidence }) {
  return (
    <span className="iv-tag" data-k={k}>
      {k}
    </span>
  );
}

export function Tags({ ks }: { ks: Evidence[] }) {
  return (
    <span className="iv-tags">
      {ks.map((k) => (
        <Tag key={k} k={k} />
      ))}
    </span>
  );
}

export function Callout({
  title,
  tone = 'note',
  children,
}: {
  title: string;
  tone?: 'note' | 'ok' | 'warn';
  children: ReactNode;
}) {
  return (
    <div className="iv-callout" data-t={tone}>
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  );
}

export interface Col<T> {
  key: string;
  head: string;
  num?: boolean;
  width?: string;
  cell: (row: T) => ReactNode;
}

/** The only table markup in the project. Every tabular section renders through this. */
export function DataTable<T>({ cols, rows }: { cols: Col<T>[]; rows: readonly T[] }) {
  return (
    <div className="iv-scroll">
      <table className="iv-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} className={c.num ? 'num' : undefined} style={{ width: c.width }}>
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c.key} className={c.num ? 'num' : undefined}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Stat({ k, l, d }: { k: string; l: string; d?: string }) {
  return (
    <div className="iv-card">
      <span className="k">{k}</span>
      <span className="l">{l}</span>
      {d && <span className="d">{d}</span>}
    </div>
  );
}

export function Cards({ children }: { children: ReactNode }) {
  return <div className="iv-cards">{children}</div>;
}
