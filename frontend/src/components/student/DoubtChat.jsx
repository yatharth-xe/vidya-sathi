import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import agentService from '../../services/agentService'
import ChatMessage from './ChatMessage'

const DoubtChat = () => {
  const { classId } = useParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    // Initial welcome message from AI Agent
    setMessages([
      {
        id: 0,
        message: 'Hello! I am your AI Tutor. Feel free to ask any doubts regarding your lectures, assignments, or textbook PDFs.',
        is_agent: true,
        timestamp: new Date().toISOString()
      }
    ])
  }, [classId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = {
      id: Date.now(),
      message: input,
      is_agent: false,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const data = await agentService.askAgent(parseInt(classId), input)
      const agentMessage = {
        id: Date.now() + 1,
        message: data.reply,
        is_agent: true,
        timestamp: data.timestamp || new Date().toISOString()
      }
      setMessages(prev => [...prev, agentMessage])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        message: 'Sorry, I couldn\'t process your request. Please try again.',
        is_agent: true,
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid hsl(var(--border-color))',
        background: 'rgba(255, 255, 255, 0.02)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(142, 70%, 45%)' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>AI Doubt Solver</span>
      </div>

      <div style={{
        flex: 1,
        padding: '1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem', alignSelf: 'flex-start' }}>
            <span style={{ animation: 'bounce 1s infinite', animationDelay: '0.1s' }}>•</span>
            <span style={{ animation: 'bounce 1s infinite', animationDelay: '0.2s' }}>•</span>
            <span style={{ animation: 'bounce 1s infinite', animationDelay: '0.3s' }}>•</span>
            <style>{`
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
              }
            `}</style>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} style={{
        padding: '0.75rem',
        borderTop: '1px solid hsl(var(--border-color))',
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(255, 255, 255, 0.01)'
      }}>
        <input
          type="text"
          className="input-field"
          placeholder="Ask a doubt..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{ padding: '0.65rem 1rem', fontSize: '0.9rem' }}
        />
        <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}>
          Send
        </button>
      </form>
    </div>
  )
}

export default DoubtChat
