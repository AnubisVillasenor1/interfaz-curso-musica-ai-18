import type { LegalBlock } from '@/lib/legal/terms'

/**
 * Renderizador único de los bloques legales.
 *
 * Términos y Privacidad comparten los mismos tipos de bloque. Tener dos
 * `switch` casi idénticos garantizaba que un día uno aceptara una tabla nueva y
 * el otro la pintara como párrafo. Aquí se decide una sola vez.
 */
export function LegalBlockView({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case 'p':
      return <p className="pg-prose">{block.text}</p>

    case 'subheading':
      return <h3 className="pg-block-title mt-2">{block.text}</h3>

    case 'list':
      return (
        <ul className="pg-list">
          {block.items.map((item, index) => (
            <li key={`${index}-${item.slice(0, 24)}`}>
              <span className="pg-accent-cyan" aria-hidden>
                ·
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )

    case 'table':
      return (
        <div className="pg-scroll">
          <table className="pg-table">
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row[0]}`}>
                  {row.map((cell, cellIndex) =>
                    cellIndex === 0 ? (
                      <th key={cellIndex} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={cellIndex}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'code':
      return (
        <pre className="pg-code">
          <code>{block.text}</code>
        </pre>
      )

    case 'note':
      return (
        <p className="pg-callout p-4 text-[13px] leading-6" data-tone="violet">
          {block.text}
        </p>
      )
  }
}
