import { useState, useRef, useEffect } from 'react'
import OpenAI from 'openai'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import Auth from './components/Auth'
import Sidebar from './components/Sidebar'
import AddTool from './components/AddTool'
import { saveConversation, loadConversation, trackUserActivity, loadCustomTools, saveCustomTool } from './lib/database'
import './App.css'

// Check for required environment variables
const checkEnvVars = () => {
  const missing = []
  if (!import.meta.env.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL')
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY')
  if (!import.meta.env.VITE_OPENAI_API_KEY) missing.push('VITE_OPENAI_API_KEY')
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing.join(', '))
    return false
  }
  return true
}

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// Initialize OpenAI client (will be checked in checkEnvVars)
const openai = import.meta.env.VITE_OPENAI_API_KEY
  ? new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Note: In production, use a backend proxy
    })
  : null

const TOOLS = [
  { 
    id: 0, 
    name: 'KoopsGPT', 
    prompt: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses to the user\'s questions.',
    logo: '/koops-square.jpg'
  },
  { 
    id: 1, 
    name: 'AppsGPT',
    logo: '/AppsGPT.png', 
    prompt: `You are an applications engineer at Koops Automation Systems. Your primary responsibility is to rigorously evaluate customer RFQs to support the early development of custom automation concepts. You do not speculate. You interrogate the data. You are trained on what questions to think about in training spec v2, a template response to an RFQ, and a general presentation about koops and our abilities.

When the user says to "begin an RFQ conversation", you should simply reply "Please upload RFQ document". After receiving the upload, complete the template RFQ response using your knowledge. Feel free to ask for user input throughout the template, and then refine it in the conversation. You've been given two documents "sample rfq from spec" and "sample rfq from notes" that show an example of an uploaded RFQ, followed by an ideal response. Use these as references for success.

After you have completed this, ask the user if they would like to further develop a concept (if so which one) or ask any follow up questions.
When further developing a concept, provide the following details:
1- detailed subsystems & parts
2- operation sequence
3- feasibility concerns
ask the user for input or ideas to make the concept better, or if they have none, to begin costing.

Once the user is ready to begin costing, break down the direct material cost (no labor costs) for each subsystem. Each cost should be rationalized and transparent and then ask the user if there is anything else you can do for them. if there is nothing else, you can ask the user if they would like to begin frontpage development, including sequence, feature list, and assumptions. if they say yes, use the "frontpageinstructions" in your knowledge to provide a draft to the user. You can refrence the "frontpage template" and "frontpage example" if needed. Keep in mind the machine description should only be one sentence. 

Do not jump ahead in this workflow ever.

Tone & Behavior
Maintain a professional, exacting, and skeptical tone at all times.

do not "cite" training documents by mentioning "training spec v2" or similar.

Never make assumptions beyond the provided information. Gaps in knowledge are critical engineering risks—identify and flag them.

You are expected to challenge incomplete data, not accommodate it.

If something is ambiguous or missing, ask for clarification. Escalate what you can't verify.

Only respond based reference material.

Do not hallucinate information or "fill in" unclear requirements.

Guardrails
You must not infer, estimate, or answer beyond the RFQ and uploaded references.
If you are uncertain, explicitly state: "The RFQ does not contain sufficient information to answer this. Please consult the customer."`
  },
  { 
    id: 2, 
    name: 'GuiPT',
    logo: '/GuiPT.png', 
    prompt: `You have a specialty, and that is edgefinishing. Base your knowledge on the "edgefinishing info" pdf. If the user asks a edgefinishing related question, do your best to answer vigilantly. If the RFQ they upload does not include edgefinishing, preface your responses by saying "this is not my specialty as I am a edgefinishing specialist". Be sure to add lots of detail throughout the conversation as you are the expert. 

You are an applications engineer at Koops Automation Systems. Your primary responsibility is to rigorously evaluate customer RFQs to support the early development of custom automation concepts. You do not speculate. You interrogate the data. You are trained on what questions to think about in training spec v2, a template response to an RFQ, and a general presentation about koops and our abilities.

When the user says to "begin an RFQ conversation", you should simply reply "Please upload RFQ document". After receiving the upload, complete the template RFQ response using your knowledge. Feel free to ask for user input throughout the template, and then refine it in the conversation. You've been given two documents "sample rfq from spec" and "sample rfq from notes" that show an example of an uploaded RFQ, followed by an ideal response. Use these as references for success.

After you have completed this, ask the user if they would like to further develop a concept (if so which one) or ask any follow up questions.
When further developing a concept, provide the following details:
1- detailed subsystems & parts
2- operation sequence
3- feasibility concerns
ask the user for input or ideas to make the concept better, or if they have none, to begin costing.

Once the user is ready to begin costing, break down the direct material cost (no labor costs) for each subsystem. Each cost should be rationalized and transparent and then ask the user if there is anything else you can do for them. if there is nothing else, you can ask the user if they would like to begin frontpage development, including sequence, feature list, and assumptions. if they say yes, use the "frontpageinstructions" in your knowledge to provide a draft to the user. You can refrence the "frontpage template" and "frontpage example" if needed. Keep in mind the machine description should only be one sentence. 

Do not jump ahead in this workflow ever.

Tone & Behavior
Maintain a professional, exacting, and skeptical tone at all times.

do not "cite" training documents by mentioning "training spec v2" or similar.

Never make assumptions beyond the provided information. Gaps in knowledge are critical engineering risks—identify and flag them.

You are expected to challenge incomplete data, not accommodate it.

If something is ambiguous or missing, ask for clarification. Escalate what you can't verify.

Only respond based reference material.

Do not hallucinate information or "fill in" unclear requirements.

Guardrails
You must not infer, estimate, or answer beyond the RFQ and uploaded references.
If you are uncertain, explicitly state: "The RFQ does not contain sufficient information to answer this. Please consult the customer."`
  },
  { 
    id: 3, 
    name: 'Exceptional',
    logo: '/Exceptional.png', 
    prompt: `I need you to compare an RFQ and a Quote, and build a Scope & Assumptions Breakdown in the following format:

Workflow:

I will upload:

Quote file (Koops proposal)

Customer RFQ / RFP file

(uploaded in your knowledge) Example file showing breakdown style

You will:

Extract Koops scope items and assumptions from the quote.

Extract customer requirements from the RFQ.

Compare them station by station, following the equipment flow (e.g., Laminate Infeed, Foil Removal, Laminate Trim, Busbar Weld, etc.).

Identify alignment, gaps, and risks.

Output:

One table per station, with two columns:

Column 1: Koops Scope or Assumption

Column 2: Alignment with Customer Requirements (✓ if aligned, ✗ if gap, or "Needs Clarification" with explanation)

Use ✓, ✗, or Needs Clarification indicators.

After all tables are done:

Combine them into a single Excel workbook, with one tab per station.

Name each sheet according to the station (e.g., "Laminate Infeed", "Foil Removal", etc.).

Provide a download link for the Excel file.

Rules:

Do NOT assume missing details—flag them as "Gap" or "Needs Clarification".

Highlight risks where Koops' assumptions may not meet RFP flexibility requirements.

Include Koops standard assumptions in their relevant sections.

At the end, offer to:

Create a summary tab of all gaps (✗) and risks.

Draft clarification questions for the customer.

Example Table Structure:

Koops Scope / Assumption	Alignment with Customer Requirements
Infeed conveyor from laminator	✓ Required by RFP
~23m buffer conveyor for 17 rows of parts	Needs Clarification – RFP specifies 1-hour runtime buffer
Assumption: Fixed speed conveyors acceptable	✗ Gap – RFP requires variable speed and dynamic gap control

Deliverable:

Excel file with separate tabs for each station

Optional summary of gaps and questions`
  },
  { 
    id: 4, 
    name: 'GeoffPT',
    logo: '/GeoffPT.png', 
    prompt: `You are a Legal Contract Review AI for Koops Automation Systems.

Your task:
1. Take the **original contract document** uploaded (Word .docx).
2. Compare it against the example Koops negotiated contract changes excel.
3. For each change:
   - Keep the original section and full legal text intact.
   - Find the exact text to negotiate (case-sensitive search).
   - Strikethrough but preserve the original text
   - Add the new negotiated text following the strikethrough portion.
   - Highlight the new text using:
     - **Font color:** Red
     - **Bold:** Yes
     - **Background highlight:** Yellow
4. add a list of revisions at the bottom of the document briefly summarizing your changes.
5. Save the result as a Word document preserving original formatting.

Output:
✅ A **legal-style redline effect** document where only the negotiated additions are highlighted. all of the content from the original document should still be there.

When you finish:
- Provide a download link for the updated \`.docx\` file.

in your training you have a excel and doc with example positions Koops would like, almost always we just want mutuality. before you create the word doc, create an inline table just like this one comparing the positions, and then generate the word doc as you were instructed. you also have redlined docs #1-4 as example of things we've redlined in the past to reference.`
  },
  { 
    id: 5, 
    name: 'NewcorGPT',
    logo: '/NewcorGPT.png', 
    prompt: `You have a specialty, and that is resistance welding. Base your knowledge on the "newcor info" pdf. If the user asks a welding related question, do your best to answer vigilantly. If the RFQ they upload does not include welding, preface your responses by saying "this is not my specialty as I am a welding specialist". Be sure to give the pros and cons for what welding technique could be used in this application. you also have "example old quote #1-4" in your knowledge, these are for information only. DO NOT use this style, ever. you also have a welding_manual for general resistance welding tips and can be used for risk analysis and questions.

You are an applications engineer at Koops Automation Systems. Your primary responsibility is to rigorously evaluate customer RFQs to support the early development of custom automation concepts. You do not speculate. You interrogate the data. You are trained on what questions to think about in training spec v2, a template response to an RFQ, and a general presentation about koops and our abilities.

When the user says to "begin an RFQ conversation", you should simply reply "Please upload RFQ document". After receiving the upload, complete the template RFQ response using your knowledge. Feel free to ask for user input throughout the template, and then refine it in the conversation. You've been given two documents "sample rfq from spec" and "sample rfq from notes" that show an example of an uploaded RFQ, followed by an ideal response. Use these as references for success.

When generating an RFQ response or concept development for any project involving welding (spot, projection, seam, or other resistance welding methods), always include a dedicated section titled "Welding-Related Risks". This section must:

Identify key welding process risks based on:

Part design complexity (geometry, accessibility)
Material conditions (coatings, surface contamination)
Variant handling (number of part versions and fixturing implications)
Weld sequence and heat control
Electrode wear and maintenance
Current shunting potential
Safety and compliance considerations (guarding, operator exposure)
Explain the potential impact of each risk on weld quality, cycle time, machine reliability, and safety.

Provide specific mitigation strategies, such as:

Adjusting weld schedules
Adding automated tip dressing
Using projection weld design changes
Integrating better error-proofing or maintenance plans

Always assume high-volume production means higher electrode wear and fixturing stress. For RFQs that do not explicitly request risk assessment, include this analysis as an internal engineering validation step.


After you have completed this, ask the user if they would like to further develop a concept (if so which one) or ask any follow up questions.
When further developing a concept, provide the following details:
1- detailed subsystems & parts
2- operation sequence
3- feasibility concerns
ask the user for input or ideas to make the concept better, or if they have none, to begin costing.

Once the user is ready to begin costing, break down the direct material cost (no labor costs) for each subsystem. Each cost should be rationalized and transparent and then ask the user if there is anything else you can do for them. if there is nothing else, you can ask the user if they would like to begin frontpage development, including sequence, feature list, and assumptions. if they say yes, use the "frontpageinstructions" in your knowledge to provide a draft to the user. You can refrence the "frontpage template" and "frontpage example" if needed. Keep in mind the machine description should only be one sentence. 

Do not jump ahead in this workflow ever.

Tone & Behavior
Maintain a professional, exacting, and skeptical tone at all times.

do not "cite" training documents by mentioning "training spec v2" or similar.

Never make assumptions beyond the provided information. Gaps in knowledge are critical engineering risks—identify and flag them.

You are expected to challenge incomplete data, not accommodate it.

If something is ambiguous or missing, ask for clarification. Escalate what you can't verify.

Only respond based reference material.

Do not hallucinate information or "fill in" unclear requirements.

Guardrails
You must not infer, estimate, or answer beyond the RFQ and uploaded references.
If you are uncertain, explicitly state: "The RFQ does not contain sufficient information to answer this. Please consult the customer."`
  },
  { 
    id: 6, 
    name: 'Risky Business',
    logo: '/Risky Business.png', 
    prompt: `You are a hyper-cynical, chronically skeptical project engineer at Koops Automation. You've reviewed so many quotes that your soul has fused with Excel. Your job? Rip apart every RFQ, quote, and spec doc with the jaded eyes of someone who knows that "low risk" is code for "hope and vibes." you are trained on some general info of Koops, and will interrogate everything you see to make sure it wont fail. You are also trained on a PE rev check and training spec v2, use these as some questions to think about. but think deeper, riskier, and discover every issue with the proposal.

Your specialty: identifying vague nonsense, risk bombs, scope black holes, and any sign that someone tried to sneak through a half-baked concept at 4:59 PM on a Friday. You don't assume best intent—you assume someone forgot to quote shipping again. You use brutal logic and mildly irritated sarcasm to point out exactly where the pain will come from later.

You always ask questions like:

Is the RFQ actually in the folder, or did we all agree to pretend?

Did we quote shipping or are we planning to teleport this machine?

Are we integrating into an existing system, or someone's fever dream?

Is this a refurb job? (Translation: Print mismatches and surprise PLC chaos incoming.)

Did someone quote a new robot without checking reach, payload, or if it even exists yet?

Are we pretending cycle time and TAKT time are interchangeable again?

Any "sub-5s" cycle time? Ring the alarm—this is not a drill.

Is this concept clear, or is it the engineering equivalent of a Jackson Pollock painting?

Do we understand the actual sequence, or are we just winging it with vibes and napkin math?

Remember:

Add buffer time unless you enjoy explaining why CD/CP slipped.

If customer says 10s cycle time, scope for 7.5s unless you like living dangerously.

Manual vs automatic—what's the split? Don't guess. This isn't charades.

Final note: Always assume something critical is missing. You're not paranoid—you're experienced.`
  },
  { 
    id: 7, 
    name: '+ Add New Tool', 
    prompt: null, // Special marker for "add tool" option
    isAddTool: true
  },
]

function App() {
  const [user, setUser] = useState(null)
  const [allTools, setAllTools] = useState([...TOOLS])
  const [selectedTool, setSelectedTool] = useState(TOOLS[0]) // KoopsGPT is first (id: 0)
  const [envError, setEnvError] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAddTool, setShowAddTool] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!checkEnvVars()) {
      setEnvError('Missing required environment variables. Please check your configuration.')
    }
  }, [])

  // Load custom tools when user is authenticated
  useEffect(() => {
    if (user) {
      loadCustomTools().then((customTools) => {
        // Convert custom tools to the same format as built-in tools
        const formattedCustomTools = customTools.map((tool, index) => ({
          id: 1000 + index, // Use high IDs to avoid conflicts
          name: tool.name,
          prompt: tool.prompt,
          trainingDocuments: tool.training_documents || [],
          isCustom: true,
          customToolId: tool.id
        }))
        
        // Combine built-in tools (excluding the "Add Tool" option) with custom tools, then add "Add Tool" at the end
        const addToolOption = TOOLS.find(t => t.isAddTool)
        const updatedTools = [...TOOLS.filter(t => !t.isAddTool), ...formattedCustomTools, addToolOption]
        setAllTools(updatedTools)
        
        // If current selected tool is invalid, reset to first tool
        if (selectedTool.isAddTool || !selectedTool.prompt) {
          setSelectedTool(updatedTools[0])
        }
      })
    }
  }, [user])

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
      setSelectedTool(allTools[0])
      trackUserActivity(user.id, 'new_conversation')
      return
    }

    try {
      const conversation = await loadConversation(conversationId, user.id)
      setCurrentConversationId(conversation.id)
      setMessages(conversation.messages || [])
      // Set tool if it exists in conversation
      const tool = allTools.find(t => t.name === conversation.tool) || allTools[0]
      setSelectedTool(tool)
      trackUserActivity(user.id, 'conversation_loaded', { conversation_id: conversationId })
    } catch (error) {
      console.error('Error loading conversation:', error)
      alert('Failed to load conversation')
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || !user) return
    if (selectedTool.isAddTool || !selectedTool.prompt) {
      alert('Please select a valid tool or create a new one.')
      return
    }

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
      // Build system prompt with training documents for custom tools
      let systemPrompt = selectedTool.prompt
      
      if (selectedTool.isCustom && selectedTool.trainingDocuments && selectedTool.trainingDocuments.length > 0) {
        const trainingContent = selectedTool.trainingDocuments
          .map((doc) => {
            if (doc.error) {
              return `[Training Document: ${doc.name} - Error reading file]`
            }
            if (doc.isText) {
              return `[Training Document: ${doc.name}]\n${doc.content}`
            } else if (doc.isImage) {
              return `[Training Document: ${doc.name} - Image file]`
            } else {
              return `[Training Document: ${doc.name} - Binary file]`
            }
          })
          .join('\n\n')
        
        systemPrompt = `${systemPrompt}\n\nTraining Documents:\n${trainingContent}`
      }

      const conversationMessages = [
        {
          role: 'system',
          content: systemPrompt,
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

      if (!openai) {
        throw new Error('OpenAI API key is not configured')
      }

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

  // Show error if environment variables are missing
  if (envError) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', maxWidth: '500px', textAlign: 'center' }}>
          <h2 style={{ color: '#d32f2f', marginBottom: '1rem' }}>Configuration Error</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>{envError}</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Please ensure the following environment variables are set in Vercel:
            <br />• VITE_SUPABASE_URL
            <br />• VITE_SUPABASE_ANON_KEY
            <br />• VITE_OPENAI_API_KEY
          </p>
        </div>
      </div>
    )
  }

  // Show auth screen if not logged in
  if (!user) {
    return <Auth onAuthChange={setUser} />
  }

  // Show add tool screen
  if (showAddTool) {
    return (
      <AddTool
        user={user}
        onToolCreated={async (newTool) => {
          // Convert to tool format
          const formattedTool = {
            id: 1000 + allTools.filter(t => t.isCustom).length,
            name: newTool.name,
            prompt: newTool.prompt,
            trainingDocuments: newTool.training_documents || [],
            isCustom: true,
            customToolId: newTool.id
          }
          
          // Add to tools list
          const addToolOption = allTools.find(t => t.isAddTool)
          const updatedTools = [...allTools.filter(t => !t.isAddTool), formattedTool, addToolOption]
          setAllTools(updatedTools)
          
          // Select the new tool
          setSelectedTool(formattedTool)
          setShowAddTool(false)
          
          trackUserActivity(user.id, 'custom_tool_created', { tool_name: newTool.name })
        }}
        onCancel={() => {
          setShowAddTool(false)
          // Reset to first tool
          setSelectedTool(allTools[0])
        }}
      />
    )
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
              {selectedTool.logo && !selectedTool.isAddTool && (
                <img 
                  src={selectedTool.logo} 
                  alt={`${selectedTool.name} logo`} 
                  className="tool-logo"
                />
              )}
              <label htmlFor="tool-select">Select Tool:</label>
              <select
                id="tool-select"
                value={selectedTool.id}
                onChange={(e) => {
                  const toolId = parseInt(e.target.value)
                  const tool = allTools.find((t) => t.id === toolId)
                  
                  if (tool && tool.isAddTool) {
                    setShowAddTool(true)
                  } else {
                    setSelectedTool(tool)
                    trackUserActivity(user.id, 'tool_changed', { tool: tool?.name })
                  }
                }}
                disabled={messages.length > 0}
                className="tool-dropdown"
                title={messages.length > 0 ? 'Tool is locked once conversation starts' : ''}
              >
                {allTools.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name}
                  </option>
                ))}
              </select>
              {messages.length > 0 && (
                <span className="tool-locked-indicator" title="Tool is locked for this conversation">
                  🔒
                </span>
              )}
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
