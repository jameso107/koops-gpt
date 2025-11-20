import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Sidebar.css'

function Sidebar({ user, onSelectConversation, currentConversationId, isOpen, isCollapsed, onToggle, onCollapse }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewConversation = () => {
    onSelectConversation(null)
  }

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this conversation?')) return

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id)

      if (error) throw error
      await loadConversations()
      if (currentConversationId === conversationId) {
        onSelectConversation(null)
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('Failed to delete conversation')
    }
  }

  const getConversationTitle = (conversation) => {
    if (conversation.title) return conversation.title
    // Try to extract first message
    try {
      const messages = conversation.messages || []
      if (messages.length > 0) {
        const firstMessage = messages[0]
        const content = typeof firstMessage.content === 'string' 
          ? firstMessage.content 
          : firstMessage.content?.find(item => item.type === 'text')?.text || ''
        return content.substring(0, 50) + (content.length > 50 ? '...' : '')
      }
    } catch (e) {
      // Ignore
    }
    return 'New Conversation'
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onToggle} />
      <div className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!isCollapsed && <h2>Conversations</h2>}
          <button 
            onClick={onCollapse} 
            className="sidebar-collapse-button"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '☰' : '×'}
          </button>
        </div>
        {!isCollapsed && (
          <>
            <button onClick={createNewConversation} className="sidebar-new-button">
              + New Conversation
            </button>
            <div className="sidebar-conversations">
          {loading ? (
            <div className="sidebar-loading">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="sidebar-empty">No conversations yet</div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`sidebar-conversation-item ${
                  currentConversationId === conversation.id ? 'active' : ''
                }`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="sidebar-conversation-content">
                  <div className="sidebar-conversation-title">
                    {getConversationTitle(conversation)}
                  </div>
                  <div className="sidebar-conversation-meta">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => deleteConversation(conversation.id, e)}
                  className="sidebar-delete-button"
                  title="Delete conversation"
                >
                  ×
                </button>
              </div>
            ))
          )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default Sidebar

