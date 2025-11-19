# Web Search Tool Setup

The Web Search tool allows users to search the internet and crawl web pages. To enable this feature, you need to set up a web search API.

## Option 1: SerpAPI (Recommended)

SerpAPI is easy to set up and provides reliable web search results.

### Setup Steps:

1. **Sign up for SerpAPI**:
   - Go to [serpapi.com](https://serpapi.com)
   - Create a free account (100 searches/month free)
   - Get your API key from the dashboard

2. **Add API Key to Environment Variables**:
   - Add to your `.env` file:
     ```env
     VITE_SERPAPI_KEY=your_serpapi_key_here
     ```
   - For Vercel deployment, add `VITE_SERPAPI_KEY` in Vercel project settings

3. **Usage**:
   - Select "Web Search" from the tool dropdown
   - Ask questions like "search for latest AI news" or "find information about React"
   - The tool will automatically search and provide results

## Option 2: Google Custom Search API

Alternatively, you can use Google Custom Search API:

1. **Set up Google Custom Search**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a project and enable Custom Search API
   - Create a Custom Search Engine at [cse.google.com](https://cse.google.com)
   - Get your API key and Search Engine ID

2. **Update `src/lib/webSearch.js`**:
   - Modify the `searchWeb` function to use Google Custom Search API instead of SerpAPI

## Features

### Automatic Search Detection
The tool automatically detects when users want to search based on keywords like:
- "search", "find", "look up"
- "what is", "who is", "when did", "where is"
- "how to", "latest", "current", "recent"

### Manual Search Markers
Users can also use explicit markers:
- `[SEARCH:query]` - Perform a web search
- `[CRAWL:url]` - Crawl and analyze a specific webpage
- `[SEARCH_AND_CRAWL:query]` - Search and crawl top results

### Web Crawling
The tool can fetch and analyze content from web pages. Note that web crawling is limited by CORS policies. For production use, consider:
- Setting up a backend proxy server
- Using a service like ScraperAPI
- Configuring `VITE_CORS_PROXY_URL` in your `.env` file

## Limitations

- **CORS Restrictions**: Direct web crawling from the browser is limited by CORS policies. The tool uses a public CORS proxy by default, but for production, you should set up your own backend proxy.
- **Rate Limits**: Free API tiers have rate limits. Monitor your usage.
- **Content Extraction**: Simple text extraction is used. For complex pages, consider using a dedicated scraping service.

## Troubleshooting

**Error: "SerpAPI key not configured"**
- Make sure `VITE_SERPAPI_KEY` is set in your `.env` file
- Restart your development server after adding the key
- For Vercel, add the key in project settings and redeploy

**Error: "Web search failed"**
- Check your API key is valid
- Verify you haven't exceeded rate limits
- Check your internet connection

**Crawling fails**
- Some websites block CORS requests
- Try using a different URL
- Consider setting up a backend proxy for production

