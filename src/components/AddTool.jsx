import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import './AddTool.css'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

function AddTool({ user, onToolCreated, onCancel }) {
  const [toolName, setToolName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [trainingFiles, setTrainingFiles] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

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
          file.name.match(/\.(txt|js|jsx|ts|tsx|css|html|md|csv|json|xml|yaml|yml)$/i)) {
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

    setTrainingFiles((prev) => [...prev, ...fileData])
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index) => {
    setTrainingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!toolName.trim()) {
      setError('Please enter a tool name')
      return
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      // Prepare training documents data
      const trainingDocs = trainingFiles.map(file => ({
        name: file.name,
        type: file.type,
        content: file.content,
        isText: file.isText,
        isImage: file.isImage
      }))

      const { data, error } = await supabase
        .from('custom_tools')
        .insert({
          name: toolName.trim(),
          prompt: prompt.trim(),
          training_documents: trainingDocs,
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Notify parent component
      onToolCreated(data)
      
      // Reset form
      setToolName('')
      setPrompt('')
      setTrainingFiles([])
    } catch (error) {
      console.error('Error saving tool:', error)
      setError(error.message || 'Failed to save tool. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="add-tool-container">
      <div className="add-tool-card">
        <div className="add-tool-header">
          <h2>Create New Tool</h2>
          <button onClick={onCancel} className="add-tool-close">×</button>
        </div>

        <div className="add-tool-form">
          <div className="add-tool-field">
            <label htmlFor="tool-name">Tool Name *</label>
            <input
              id="tool-name"
              type="text"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g., My Custom Tool"
              className="add-tool-input"
            />
          </div>

          <div className="add-tool-field">
            <label htmlFor="tool-prompt">System Prompt *</label>
            <textarea
              id="tool-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the system prompt that defines how this tool should behave..."
              className="add-tool-textarea"
              rows="10"
            />
          </div>

          <div className="add-tool-field">
            <label>Training Documents (Optional)</label>
            <p className="add-tool-hint">
              Upload documents that will be used as training/knowledge for this tool. 
              These will be available in conversations using this tool.
            </p>
            
            {trainingFiles.length > 0 && (
              <div className="add-tool-files">
                {trainingFiles.map((file, index) => (
                  <div key={index} className="add-tool-file-item">
                    <span className="add-tool-file-name">📎 {file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="add-tool-remove-file"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="add-tool-file-input"
              id="add-tool-file-input"
              accept=".txt,.md,.js,.jsx,.ts,.tsx,.css,.html,.json,.csv,.xml,.yaml,.yml,.pdf,.docx,image/*,text/*"
            />
            <label htmlFor="add-tool-file-input" className="add-tool-file-label">
              📁 Upload Training Documents
            </label>
          </div>

          {error && (
            <div className="add-tool-error">
              {error}
            </div>
          )}

          <div className="add-tool-actions">
            <button
              onClick={onCancel}
              className="add-tool-button add-tool-button-cancel"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="add-tool-button add-tool-button-save"
              disabled={isSaving || !toolName.trim() || !prompt.trim()}
            >
              {isSaving ? 'Saving...' : 'Create Tool'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddTool

