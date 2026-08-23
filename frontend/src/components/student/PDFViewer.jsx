/**
 * PDFViewer — In-app PDF Viewer component with blob URL cleanup.
 *
 * Props:
 *   assignmentId {number} — ID of assignment to fetch PDF for
 *   title        {string} — Title of document
 *   filePath     {string} — Optional fallback file path info
 */
import React, { useState, useEffect } from 'react'
import studentService from '../../services/studentService'
import Loader from '../common/Loader'
import ErrorState from '../common/ErrorState'

const PDFViewer = ({ assignmentId, title, filePath, loadPdf, onDownload }) => {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let currentBlobUrl = null
    let isMounted = true

    const fetchPDF = async () => {
      if (!assignmentId || !loadPdf) {
        setLoading(false)
        if (!filePath) {
          setError('No PDF file attached to this assignment.')
        }
        return
      }

      setLoading(true)
      setError(null)

      try {
        const url = await loadPdf(assignmentId)
        if (isMounted) {
          currentBlobUrl = url
          setBlobUrl(url)
        } else {
          URL.revokeObjectURL(url)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load PDF document.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchPDF()

    return () => {
      isMounted = false
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl)
      }
    }
  }, [assignmentId, filePath, loadPdf])

  const handleDownload = () => {
    if (assignmentId && onDownload) {
      onDownload(assignmentId).catch(console.error)
    }
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '600px',
        overflow: 'hidden',
        border: '1px solid hsl(var(--color-border))',
        borderRadius: 'var(--r-lg)',
        background: 'hsl(var(--color-surface))',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'hsl(var(--color-surface-2))',
          borderBottom: '1px solid hsl(var(--color-border))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--sp-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="hsl(var(--color-primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'hsl(var(--color-text))',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {title || 'Document Resource'}
          </span>
        </div>

        {blobUrl && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleDownload}
            aria-label="Download PDF"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        )}
      </div>

      {/* PDF Content Frame */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'hsl(var(--color-surface-3, var(--color-surface)))',
          position: 'relative',
        }}
      >
        {loading ? (
          <Loader message="Loading PDF document…" />
        ) : error ? (
          <ErrorState message={error} onRetry={assignmentId ? () => setLoading(true) : undefined} />
        ) : blobUrl ? (
          <iframe
            src={blobUrl}
            title={title || 'Assignment PDF'}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '0 0 var(--r-lg) var(--r-lg)',
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--sp-6)', color: 'hsl(var(--color-text-2))' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--sp-2)' }} aria-hidden="true">📄</span>
            <p style={{ fontSize: '0.875rem' }}>No PDF resource attached to this assignment.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PDFViewer
