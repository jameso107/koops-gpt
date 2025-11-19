# Vercel Environment Variables Setup

If you're seeing a white screen on Vercel, it's likely because environment variables aren't configured.

## Required Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables** and add:

1. **VITE_SUPABASE_URL**
   - Value: `https://ovwtmmpsogfzemdqbrpt.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92d3RtbXBzb2dmemVtZHFicnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTgzODMsImV4cCI6MjA3OTEzNDM4M30.-bBqjJt27A_T93opbHA3wXgN0Cs6AaRBihldSlZeqwo`

3. **VITE_OPENAI_API_KEY**
   - Value: Your OpenAI API key

## Important Notes

- **Environment**: Make sure to add these for **Production**, **Preview**, and **Development** (or at least Production)
- **After adding**: You need to **redeploy** your application for changes to take effect
- **Redeploy**: Go to **Deployments** → Click the three dots on the latest deployment → **Redeploy**

## How to Redeploy

1. After adding environment variables, go to **Deployments** tab
2. Find your latest deployment
3. Click the three dots (⋯) menu
4. Select **Redeploy**
5. Wait for the deployment to complete

## Verify Setup

After redeploying, the app should:
- Show an error message if env vars are missing (instead of white screen)
- Show the login screen if configured correctly
- Work normally once you sign in

