/**
 * ChatMessage — Renders user & AI Tutor chat bubbles.
 * Formats Student Agent responses with Level 1-4 visible status badges,
 * hints, citations/sources, teacher notification notice, and practice CTA.
 *
 * Agent answers are rendered as Markdown (headings, bold, lists, tables,
 * code, links) via react-markdown + remark-gfm — safe, no raw HTML injection.
 * The agent's answer text is rendered verbatim; nothing is rewritten.
 */
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import SourceList from './SourceList'

const LEVEL_CONFIG = {
  1: { label: 'Doubt Cleared', badgeClass: 'badge-success' },
  2: { label: 'Guided Help', badgeClass: 'badge-primary' },
  3: { label: 'Practice Recommended', badgeClass: 'badge-warning' },
  4: { label: 'Teacher Support Recommended', badgeClass: 'badge-amber' },
}

/* Matches full inline citation strings such as
   "[NCERT | Mathematics | Vector Algebra | Introduction | pp. 1-1]" */
const CITATION_RE = /\[NCERT[^\]]*\]/g

/**
 * Tiny rehype plugin: walks the hast tree and removes inline citation
 * strings such as "[NCERT | Physics | … | pp. 7-7]" from the rendered
 * answer. The same references are already shown in the compact 📚
 * Sources section below the answer, so showing both is redundant.
 */
const rehypeCitationChips = () => (tree) => {
  const walk = (node) => {
    if (!node.children) return
    node.children = node.children.flatMap((child) => {
      walk(child)
      if (child.type === 'text' && CITATION_RE.test(child.value)) {
        CITATION_RE.lastIndex = 0
        // Keep surrounding prose, drop the citation itself.
        return child.value.replace(CITATION_RE, '').trim() === ''
          ? []
          : [{ type: 'text', value: ' ' + child.value.replace(CITATION_RE, '').trim() }]
      }
      return [child]
    })
  }
  walk(tree)
}

/**
 * remark-math only recognizes $…$ / $$…$$ delimiters, while the NCERT
 * Student Agent emits standard LaTeX delimiters \( … \) and \[ … \].
 * This converts ONLY the delimiters so the math parser can pick them up.
 * Formula content itself is preserved exactly as returned by the agent.
 */
const normalizeMathDelimiters = (text) =>
  text
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, body) => `\n$$\n${body.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, body) => `$${body}$`)

const ChatMessage = ({ message, onStartPractice }) => {
  const isAgent = message.is_agent

  const levelInfo = message.level ? LEVEL_CONFIG[message.level] || LEVEL_CONFIG[1] : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAgent ? 'flex-start' : 'flex-end',
        margin: 'var(--sp-2) 0',
        width: '100%',
      }}
    >
      {isAgent ? (
        /* ── Assistant (tutor) bubble ─────────────────────── */
        <article className="vs-tutor-msg">
          <header className="vs-tutor-header">
            <span className="vs-tutor-avatar" aria-hidden="true">🎓</span>
            <span className="vs-tutor-name">AI Tutor</span>
            <span className="vs-tutor-header-end">
              {levelInfo && (
                <span className={`badge ${levelInfo.badgeClass} vs-level-badge`}>
                  {levelInfo.label}
                </span>
              )}
              {message.subject && (
                <span className="badge badge-neutral vs-context-badge">{message.subject}</span>
              )}
              {message.topic && (
                <span className="badge badge-neutral vs-context-badge">{message.topic}</span>
              )}
            </span>
          </header>

          {/* Answer body — verbatim Markdown + math */}
          <div className="vs-md">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeCitationChips]}
              components={{
                // Wrap tables so wide ones scroll horizontally on mobile
                table: ({ children }) => (
                  <div className="vs-md-table-wrap">{children}</div>
                ),
                a: ({ href, children: linkChildren }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {linkChildren}
                  </a>
                ),
              }}
            >
              {normalizeMathDelimiters(message.message)}
            </ReactMarkdown>
          </div>

          {/* Compact collapsible Sources */}
          <SourceList citations={message.citations} />

          {/* Progressive Hints */}
          {message.hints && message.hints.length > 0 && (
            <aside className="vs-hints">
              <span className="vs-hints-title">💡 Helpful hints</span>
              <ul>
                {message.hints.map((hint, idx) => (
                  <li key={idx}>{hint}</li>
                ))}
              </ul>
            </aside>
          )}

          {/* Teacher Intimated Neutral Notice */}
          {message.teacher_intimated && (
            <div className="alert alert-info vs-teacher-note" role="status">
              ℹ️ Your teacher has been notified that you may benefit from additional support.
            </div>
          )}

          {/* Level 3 Practice CTA */}
          {message.requires_quiz && (
            <button type="button" className="btn btn-primary btn-sm vs-practice-btn" onClick={onStartPractice}>
              Start Practice
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </article>
      ) : (
        /* ── User bubble — plain, compact, right-aligned ──── */
        <div className="vs-user-msg">{message.message}</div>
      )}

      {/* Timestamp & Sender */}
      <span className="vs-msg-meta">
        {isAgent ? 'AI Tutor' : 'You'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

export default ChatMessage
