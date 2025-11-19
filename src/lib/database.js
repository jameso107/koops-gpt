import { supabase } from './supabase'

export const saveConversation = async (userId, conversationId, messages, tool, title = null) => {
  try {
    const conversationData = {
      user_id: userId,
      messages: messages,
      tool: tool,
      updated_at: new Date().toISOString(),
    }

    if (conversationId) {
      // Update existing conversation
      if (title) conversationData.title = title
      const { data, error } = await supabase
        .from('conversations')
        .update(conversationData)
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Create new conversation
      if (title) conversationData.title = title
      else {
        // Generate title from first message
        if (messages.length > 0) {
          const firstMessage = messages[0]
          const content = typeof firstMessage.content === 'string'
            ? firstMessage.content
            : firstMessage.content?.find(item => item.type === 'text')?.text || ''
          conversationData.title = content.substring(0, 50) + (content.length > 50 ? '...' : '')
        } else {
          conversationData.title = 'New Conversation'
        }
      }
      conversationData.created_at = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single()

      if (error) throw error
      return data
    }
  } catch (error) {
    console.error('Error saving conversation:', error)
    throw error
  }
}

export const loadConversation = async (conversationId, userId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error loading conversation:', error)
    throw error
  }
}

export const trackUserActivity = async (userId, activityType, metadata = {}) => {
  try {
    const { error } = await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        activity_type: activityType,
        metadata: metadata,
        created_at: new Date().toISOString(),
      })

    if (error) throw error
  } catch (error) {
    console.error('Error tracking activity:', error)
    // Don't throw - activity tracking shouldn't break the app
  }
}

export const loadCustomTools = async () => {
  try {
    const { data, error } = await supabase
      .from('custom_tools')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading custom tools:', error)
    return []
  }
}

export const saveCustomTool = async (name, prompt, trainingDocuments, userId) => {
  try {
    const { data, error } = await supabase
      .from('custom_tools')
      .insert({
        name: name.trim(),
        prompt: prompt.trim(),
        training_documents: trainingDocuments,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error saving custom tool:', error)
    throw error
  }
}

