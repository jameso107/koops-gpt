import axios from 'axios'

/**
 * Perform a web search using SerpAPI
 * @param {string} query - Search query
 * @param {number} numResults - Number of results to return (default: 5)
 * @returns {Promise<Object>} - Search results
 */
export const searchWeb = async (query, numResults = 5) => {
  const apiKey = import.meta.env.VITE_SERPAPI_KEY
  
  if (!apiKey) {
    throw new Error('SerpAPI key not configured. Please add VITE_SERPAPI_KEY to your .env file.')
  }

  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google',
        q: query,
        api_key: apiKey,
        num: numResults
      }
    })

    const results = response.data.organic_results || []
    
    return {
      query,
      results: results.map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        position: result.position
      })),
      totalResults: response.data.search_information?.total_results || 0
    }
  } catch (error) {
    console.error('Web search error:', error)
    throw new Error(`Web search failed: ${error.response?.data?.error || error.message}`)
  }
}

/**
 * Fetch and extract text content from a URL (simple web crawling)
 * Note: This is limited by CORS. For full crawling, use a backend service.
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} - Extracted text content
 */
export const crawlWebPage = async (url) => {
  try {
    // Use a CORS proxy for fetching (you may want to set up your own backend)
    const proxyUrl = import.meta.env.VITE_CORS_PROXY_URL || 'https://api.allorigins.win/get?url='
    
    const response = await axios.get(`${proxyUrl}${encodeURIComponent(url)}`, {
      timeout: 10000
    })

    // Extract text from HTML (simple approach)
    const html = response.data.contents || response.data
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000) // Limit to 5000 characters

    return text || 'Unable to extract content from this page.'
  } catch (error) {
    console.error('Web crawl error:', error)
    throw new Error(`Failed to crawl ${url}: ${error.message}`)
  }
}

/**
 * Perform a comprehensive web search with optional crawling
 * @param {string} query - Search query
 * @param {boolean} crawlResults - Whether to crawl the top results
 * @param {number} numResults - Number of search results
 * @returns {Promise<Object>} - Combined search and crawl results
 */
export const searchAndCrawl = async (query, crawlResults = false, numResults = 5) => {
  const searchResults = await searchWeb(query, numResults)
  
  if (crawlResults && searchResults.results.length > 0) {
    const crawledData = []
    
    // Crawl top 3 results
    for (let i = 0; i < Math.min(3, searchResults.results.length); i++) {
      try {
        const content = await crawlWebPage(searchResults.results[i].link)
        crawledData.push({
          ...searchResults.results[i],
          crawledContent: content
        })
      } catch (error) {
        crawledData.push({
          ...searchResults.results[i],
          crawledContent: `Error crawling: ${error.message}`
        })
      }
    }
    
    return {
      ...searchResults,
      crawledResults: crawledData
    }
  }
  
  return searchResults
}

