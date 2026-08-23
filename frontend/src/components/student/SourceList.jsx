/**
 * SourceList — Compact, collapsible rendering of NCERT citations.
 *
 * Parses existing citation strings returned by the Student Agent
 * (e.g. "NCERT | Mathematics | Vector Algebra | Introduction | pp. 1-1"
 * with optional surrounding brackets) into scannable source rows.
 * The data itself is never modified — only presented more clearly.
 */
import React from 'react'

/** Split one raw citation string into its pipe-separated parts. */
const parseCitation = (raw) => {
  const parts = raw.replace(/^\[|\]$/g, '').split('|').map((p) => p.trim()).filter(Boolean)
  const board = parts[0] || 'NCERT'
  const subject = parts.length > 3 ? parts[1] : null
  const rest = parts.length > 3 ? parts.slice(2) : parts.slice(1)
  // Last part looks like page numbers when it starts with "pp." / "p."
  let pages = null
  if (rest.length && /^(pp?\.)\s*\d/i.test(rest[rest.length - 1])) {
    pages = rest.pop()
  }
  const chapter = rest.shift() || null
  const topic = rest.join(' · ') || null
  return { board, subject, chapter, topic, pages }
}

const SourceList = ({ citations }) => {
  if (!citations || citations.length === 0) return null

  return (
    <details className="vs-sources-panel">
      <summary aria-label={`Show ${citations.length} sources`}>
        <span className="vs-sources-title">📚 Sources</span>
        <span className="vs-sources-count">
          {citations.length} {citations.length === 1 ? 'reference' : 'references'}
        </span>
      </summary>
      <ul className="vs-source-rows">
        {citations.map((citation, idx) => {
          const { board, subject, chapter, topic, pages } = parseCitation(citation)
          return (
            <li key={idx} className="vs-source-row">
              <span className="vs-source-chip">{board}</span>
              <span className="vs-source-meta">
                <strong>{subject || chapter || 'NCERT'}</strong>
                {(topic || pages) && (
                  <small>
                    {[chapter !== (subject || chapter) ? chapter : null, topic, pages]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export default SourceList
