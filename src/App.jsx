import { useState, useRef, useEffect } from 'react'
import OpenAI from 'openai'
import './App.css'

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
  const [selectedTool, setSelectedTool] = useState(TOOLS[0])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      tool: selectedTool.name,
    }

    const userInput = input
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Build conversation history with tool-specific system prompt
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
          content: userInput,
        },
      ]

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // Using GPT-4o (latest available)
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

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response from ChatGPT. Please check your API key and try again.'}`,
        tool: selectedTool.name,
      }
      setMessages((prev) => [...prev, errorMessage])
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <img src="/koops.png" alt="Koops Logo" className="logo" />
          <h1>KoopsGPT</h1>
        </div>
        <div className="tool-selector">
          <label htmlFor="tool-select">Select Tool:</label>
          <select
            id="tool-select"
            value={selectedTool.id}
            onChange={(e) => {
              const tool = TOOLS.find((t) => t.id === parseInt(e.target.value))
              setSelectedTool(tool)
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
              <div className="message-content">{message.content}</div>
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
            disabled={!input.trim() || isLoading}
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
      </main>
    </div>
  )
}

export default App

