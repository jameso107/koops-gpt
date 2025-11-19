import { useState, useRef, useEffect } from 'react'
import OpenAI from 'openai'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import Auth from './components/Auth'
import Sidebar from './components/Sidebar'
import { saveConversation, loadConversation, trackUserActivity } from './lib/database'
import './App.css'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
})

const TOOLS = [
  { id: 1, name: 'Tool 1', prompt: 'You are Tool 1. Help the user with Tool 1 specific tasks.' },
  { id: 2, name: 'Tool 2', prompt: 'You are Tool 2. Help the user with Tool 2 specific tasks.' },
  { id: 3, name: 'Tool 3', prompt: 'You are Tool 3. Help the user with Tool 3 specific tasks.' },
  { id: 4, name: 'Tool 4', prompt: 'You are Tool 4. Help the user with Tool 4 specific tasks.' },
  { id: 5, name: 'Tool 5', prompt: 'You are Tool 5. Help the user with Tool 5 specific tasks.' },
  { id: 6, name: 'Tool 6', prompt: 'You are Tool 6. Help the user with Tool 6 specific tasks.' },
  { id: 7, name: 'Tool 7', prompt: 'You are Tool 7. Help the user with Tool 7 specific tasks.' },
  { id: 8, name: 'Tool 8', prompt: 'You are Tool 8. Help the user with Tool 8 specific tasks.' },
]

function App() {
  const [user, setUser] = useState(null)
  const [selectedTool, setSelectedTool] = useState(TOOLS[0])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-save conversation after messages change
  useEffect(() => {
    if (user && messages.length > 0) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      // Save after 2 seconds of inactivity
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveConversation(user.id, currentConversationId, messages, selectedTool.name)
          trackUserActivity(user.id, 'conversation_saved', { conversation_id: currentConversationId })
        } catch (error) {
          console.error('Error auto-saving conversation:', error)
        }
      }, 2000)
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [messages, user, currentConversationId, selectedTool.name])

  const handleConversationSelect = async (conversationId) => {
    if (!user) return

    if (conversationId === null) {
      // New conversation
      setCurrentConversationId(null)
      setMessages([])
      setSelectedTool(TOOLS[0])
      trackUserActivity(user.id, 'new_conversation')
      return
    }

    try {
      const conversation = await loadConversation(conversationId, user.id)
      setCurrentConversationId(conversation.id)
      setMessages(conversation.messages || [])
      // Set tool if it exists in conversation
      const tool = TOOLS.find(t => t.name === conversation.tool) || TOOLS[0]
      setSelectedTool(tool)
      trackUserActivity(user.id, 'conversation_loaded', { conversation_id: conversationId })
    } catch (error) {
      console.error('Error loading conversation:', error)
      alert('Failed to load conversation')
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || !user) return

    // Separate images from other files
    const imageFiles = attachedFiles.filter(f => f.isImage && !f.error)
    const otherFiles = attachedFiles.filter(f => !f.isImage)

    // Build user message content with text and file contents
    let userContent = input.trim()
    
    if (otherFiles.length > 0) {
      const fileContents = otherFiles.map((file) => {
        if (file.error) {
          return `[File: ${file.name} - Error reading file]`
        }
        if (file.isText) {
          return `[File: ${file.name}]\n${file.content}`
        } else {
          return `[File: ${file.name} - Binary file, size: ${(file.size / 1024).toFixed(2)} KB]`
        }
      }).join('\n\n')
      
      userContent = userContent 
        ? `${userContent}\n\n${fileContents}`
        : fileContents ? `Please analyze these files:\n\n${fileContents}` : userContent
    }

    // Build message content array for OpenAI API
    let messageContent = []
    
    if (userContent) {
      messageContent.push({
        type: 'text',
        text: userContent
      })
    }
    
    if (imageFiles.length > 0) {
      imageFiles.forEach((file) => {
        if (!file.error) {
          messageContent.push({
            type: 'image_url',
            image_url: {
              url: file.content
            }
          })
        }
      })
    }
    
    if (messageContent.length === 0 && imageFiles.length > 0) {
      messageContent.push({
        type: 'text',
        text: 'Please analyze these images.'
      })
    }
    
    if (messageContent.length === 0) {
      messageContent.push({
        type: 'text',
        text: userContent || 'Please analyze these files.'
      })
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageContent.length === 1 && messageContent[0].type === 'text' 
        ? messageContent[0].text 
        : messageContent,
      tool: selectedTool.name,
      files: attachedFiles.length > 0 ? attachedFiles.map(f => ({ name: f.name, type: f.type })) : null,
    }
    
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setAttachedFiles([])
    setIsLoading(true)

    // Track activity
    trackUserActivity(user.id, 'message_sent', { 
      tool: selectedTool.name,
      has_files: attachedFiles.length > 0 
    })

    try {
      const conversationMessages = [
        {
          role: 'system',
          content: selectedTool.prompt,
        },
        ...messages
          .filter((msg) => msg.tool === selectedTool.name)
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        {
          role: 'user',
          content: userMessage.content,
        },
      ]

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 2000,
      })

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
        tool: selectedTool.name,
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      setMessages(finalMessages)

      // Save conversation with new ID if needed
      try {
        const savedConversation = await saveConversation(user.id, currentConversationId, finalMessages, selectedTool.name)
        if (!currentConversationId && savedConversation) {
          setCurrentConversationId(savedConversation.id)
        }
      } catch (error) {
        console.error('Error saving conversation:', error)
      }

      trackUserActivity(user.id, 'response_received', { tool: selectedTool.name })
    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response from ChatGPT. Please check your API key and try again.'}`,
        tool: selectedTool.name,
      }
      setMessages((prev) => [...prev, errorMessage])
      trackUserActivity(user.id, 'api_error', { error: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const extractTextFromPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += pageText + '\n\n'
      }
      
      return fullText.trim()
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }
  }

  const extractTextFromDOCX = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value
    } catch (error) {
      throw new Error(`Failed to extract text from DOCX: ${error.message}`)
    }
  }

  const readFileContent = async (file) => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = (e) => reject(e)
        reader.readAsDataURL(file)
      })
    }
    
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return await extractTextFromPDF(file)
    }
    
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.toLowerCase().endsWith('.docx')) {
      return await extractTextFromDOCX(file)
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      
      if (file.type.startsWith('text/') || 
          file.type === 'application/json' ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.js') ||
          file.name.endsWith('.jsx') ||
          file.name.endsWith('.ts') ||
          file.name.endsWith('.tsx') ||
          file.name.endsWith('.css') ||
          file.name.endsWith('.html') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.xml') ||
          file.name.endsWith('.yaml') ||
          file.name.endsWith('.yml')) {
        reader.readAsText(file)
      } else {
        reader.readAsDataURL(file)
      }
    })
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const fileData = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await readFileContent(file)
          const isImage = file.type.startsWith('image/')
          const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
          const isDOCX = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                        file.name.toLowerCase().endsWith('.docx')
          const isText = file.type.startsWith('text/') || 
                        file.type === 'application/json' ||
                        file.name.match(/\.(txt|js|jsx|ts|tsx|css|html|md|csv|json|xml|yaml|yml)$/i) ||
                        isPDF ||
                        isDOCX
          
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            content: content,
            isText: isText,
            isImage: isImage,
            isPDF: isPDF,
            isDOCX: isDOCX
          }
        } catch (error) {
          console.error('Error reading file:', error)
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            content: `Error reading file: ${error.message}`,
            isText: false,
            isImage: false,
            error: true
          }
        }
      })
    )

    setAttachedFiles((prev) => [...prev, ...fileData])
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Show auth screen if not logged in
  if (!user) {
    return <Auth onAuthChange={setUser} />
  }

  return (
    <div className="app">
      <Sidebar
        user={user}
        onSelectConversation={handleConversationSelect}
        currentConversationId={currentConversationId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="app-main">
        <header className="app-header">
          <div className="header-left">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle-button"
              title="Toggle sidebar"
            >
              ☰
            </button>
            <div className="header-content">
              <img src="/koops.png" alt="Koops Logo" className="logo" />
              <h1>KoopsGPT</h1>
            </div>
          </div>
          <div className="header-right">
            <div className="tool-selector">
              <label htmlFor="tool-select">Select Tool:</label>
              <select
                id="tool-select"
                value={selectedTool.id}
                onChange={(e) => {
                  const tool = TOOLS.find((t) => t.id === parseInt(e.target.value))
                  setSelectedTool(tool)
                  trackUserActivity(user.id, 'tool_changed', { tool: tool.name })
                }}
                className="tool-dropdown"
              >
                {TOOLS.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name}
                  </option>
                ))}
              </select>
            </div>
            <Auth onAuthChange={setUser} />
          </div>
        </header>

        <main className="chat-container">
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <h2>Welcome to KoopsGPT</h2>
                <p>Select a tool from the dropdown above and start chatting!</p>
                <p className="current-tool">Current Tool: <strong>{selectedTool.name}</strong></p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-header">
                  <span className="message-role">
                    {message.role === 'user' ? 'You' : 'KoopsGPT'}
                  </span>
                  <span className="message-tool">{message.tool}</span>
                </div>
                {message.files && message.files.length > 0 && (
                  <div className="message-files">
                    {message.files.map((file, idx) => (
                      <span key={idx} className="file-tag">
                        📎 {file.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="message-content">
                  {typeof message.content === 'string' 
                    ? message.content 
                    : Array.isArray(message.content)
                      ? message.content.map((item, idx) => 
                          item.type === 'text' ? (
                            <span key={idx}>{item.text}</span>
                          ) : item.type === 'image_url' ? (
                            <div key={idx} className="message-image">
                              <img src={item.image_url.url} alt="Uploaded" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '0.5rem' }} />
                            </div>
                          ) : null
                        )
                      : message.content
                  }
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant-message">
                <div className="message-header">
                  <span className="message-role">KoopsGPT</span>
                  <span className="message-tool">{selectedTool.name}</span>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            {attachedFiles.length > 0 && (
              <div className="attached-files">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="attached-file-item">
                    <span className="file-name">📎 {file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="remove-file-button"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="input-row">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="file-input"
                id="file-input"
                accept=".txt,.md,.js,.jsx,.ts,.tsx,.css,.html,.json,.csv,.xml,.yaml,.yml,.pdf,.docx,image/*,text/*"
              />
              <label htmlFor="file-input" className="file-input-label" title="Upload files">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${selectedTool.name}...`}
                className="message-input"
                rows="1"
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                className="send-button"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
