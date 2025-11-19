import jsPDF from 'jspdf'

/**
 * Generate a PDF from text content
 * @param {string} content - The text content to convert to PDF
 * @param {string} filename - The filename for the PDF
 * @param {string} title - Optional title for the PDF
 * @returns {Blob} - The PDF as a Blob
 */
export const generatePDF = (content, filename = 'document.pdf', title = null) => {
  const doc = new jsPDF()
  
  // Set font
  doc.setFont('helvetica')
  
  // Add title if provided
  if (title) {
    doc.setFontSize(18)
    doc.text(title, 14, 20)
    doc.setFontSize(12)
    doc.text('', 14, 30) // Add some space
  }
  
  // Split content into lines that fit the page width
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const maxWidth = pageWidth - (margin * 2)
  const lineHeight = 7
  let yPosition = title ? 35 : 20
  
  // Split content by newlines and process each paragraph
  const paragraphs = content.split('\n')
  
  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      yPosition += lineHeight // Add space for empty lines
      return
    }
    
    // Split long lines into multiple lines
    const lines = doc.splitTextToSize(paragraph, maxWidth)
    
    lines.forEach((line) => {
      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
      }
      
      doc.text(line, margin, yPosition)
      yPosition += lineHeight
    })
    
    // Add a small gap between paragraphs
    yPosition += 2
  })
  
  // Save the PDF
  doc.save(filename)
  
  // Also return as Blob for download link
  return doc.output('blob')
}

/**
 * Parse AI response to extract PDF content and metadata
 * Looks for special markers like [PDF_START] and [PDF_END]
 * @param {string} response - The AI response text
 * @returns {Object|null} - PDF data object or null if no PDF requested
 */
export const parsePDFRequest = (response) => {
  // Look for PDF markers
  const pdfStartMarker = /\[PDF_START(?::([^\]]+))?\]/i
  const pdfEndMarker = /\[PDF_END\]/i
  
  const startMatch = response.match(pdfStartMarker)
  const endMatch = response.match(pdfEndMarker)
  
  if (!startMatch || !endMatch) {
    return null
  }
  
  const startIndex = startMatch.index + startMatch[0].length
  const endIndex = endMatch.index
  
  // Extract PDF content
  const pdfContent = response.substring(startIndex, endIndex).trim()
  
  // Extract filename from marker if provided, otherwise generate one
  const filename = startMatch[1] 
    ? `${startMatch[1].trim()}.pdf`
    : `document_${new Date().toISOString().slice(0, 10)}.pdf`
  
  // Extract title (first line or first 50 chars)
  const title = pdfContent.split('\n')[0].substring(0, 50) || 'Document'
  
  return {
    content: pdfContent,
    filename,
    title,
    hasPDF: true
  }
}

/**
 * Clean response text by removing PDF markers
 * @param {string} response - The AI response text
 * @returns {string} - Cleaned response without PDF markers
 */
export const cleanPDFMarkers = (response) => {
  return response
    .replace(/\[PDF_START(?::[^\]]+)?\]/gi, '')
    .replace(/\[PDF_END\]/gi, '')
    .trim()
}

