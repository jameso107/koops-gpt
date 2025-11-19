# KoopsGPT

A ChatGPT wrapper application for Koops Automation Systems, featuring a modern React.js UI with tool selection capabilities.

## Features

- 🎨 Modern, ChatGPT-like user interface
- 🔧 Tool selection dropdown with 8 customizable tools
- 💬 Real-time chat interface with ChatGPT API integration
- 🤖 Powered by GPT-4o (OpenAI)
- 📱 Responsive design for mobile and desktop
- 🎯 Separate prompts/configurations for each tool
- 💾 Conversation history maintained per tool

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure API Key:
   - The API key is already configured in the `.env` file
   - For production, consider using a backend proxy to keep the API key secure

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment to Vercel

Deploying to Vercel is simple and free. Here are two methods:

### Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in with your GitHub account

3. **Click "Add New Project"**

4. **Import your GitHub repository** containing this project

5. **Configure Environment Variables**:
   - In the project settings, go to "Environment Variables"
   - Add a new variable:
     - **Name:** `VITE_OPENAI_API_KEY`
     - **Value:** Your OpenAI API key
   - Make sure to add it for all environments (Production, Preview, Development)

6. **Deploy!** Click "Deploy" - Vercel will automatically:
   - Detect it's a Vite project
   - Run `npm install`
   - Run `npm run build`
   - Deploy to a production URL

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Add Environment Variable**:
   ```bash
   vercel env add VITE_OPENAI_API_KEY
   ```
   (Enter your API key when prompted)

5. **Redeploy with environment variable**:
   ```bash
   vercel --prod
   ```

### Important Notes for Vercel Deployment

- ✅ Vercel automatically detects Vite projects
- ✅ The `vercel.json` file is included for explicit configuration
- ⚠️ **Security Warning**: Your API key will be exposed in the client-side bundle. Consider using Vercel Serverless Functions as a proxy for production use.
- 🔄 After adding environment variables, you may need to trigger a new deployment

## Project Structure

```
koops-gpt/
├── src/
│   ├── App.jsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── public/
│   └── koops.png        # Logo file
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
└── vite.config.js       # Vite configuration
```

## Tool Configuration

The app includes 8 tools (Tool 1 through Tool 8). Each tool has its own system prompt that is used when making ChatGPT API calls. To customize tool prompts:

1. Open `src/App.jsx`
2. Find the `TOOLS` array
3. Update the `prompt` field for each tool with your custom prompts

Each tool maintains its own conversation history, so switching between tools will show different conversation contexts.

## API Integration

The application uses the OpenAI ChatGPT API (GPT-4o model). The API key is stored in the `.env` file as `VITE_OPENAI_API_KEY`.

**Security Note:** Currently, the API key is exposed in the client-side code. For production deployments, it's recommended to:
- Create a backend API proxy to handle OpenAI requests
- Keep the API key on the server side
- Add rate limiting and authentication

## Future Enhancements

- Backend API proxy for secure API key handling
- Message history persistence (localStorage or database)
- User authentication
- Additional customization options
- Export conversation history

## License

Proprietary - Koops Automation Systems