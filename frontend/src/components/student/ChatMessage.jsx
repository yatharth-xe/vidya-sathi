import React from 'react'

const ChatMessage = ({ message }) => {
  const isAgent = message.is_agent

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isAgent ? 'flex-start' : 'flex-end',
      margin: '0.75rem 0',
      width: '100%'
    }}>
      <div style={{
        maxWidth: '80%',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        borderBottomLeftRadius: isAgent ? '0px' : '12px',
        borderBottomRightRadius: isAgent ? '12px' : '0px',
        background: isAgent ? 'rgba(255, 255, 255, 0.04)' : 'linear-gradient(135deg, hsl(262, 83%, 58%) 0%, hsl(190, 95%, 45%) 100%)',
        border: isAgent ? '1px solid hsl(var(--border-color))' : 'none',
        color: '#fff',
        fontSize: '0.9rem',
        lineHeight: '1.4'
      }}>
        {message.message}
      </div>
      <span style={{
        fontSize: '0.7rem',
        color: 'hsl(var(--text-muted))',
        marginTop: '0.25rem',
        padding: '0 0.25rem'
      }}>
        {isAgent ? 'AI Tutor' : 'You'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

export default ChatMessage
