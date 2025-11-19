# Supabase Setup Guide for KoopsGPT

This guide will help you set up Supabase for authentication and database storage.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: KoopsGPT (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project" and wait for it to initialize (2-3 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (this is your `VITE_SUPABASE_URL`)
   - **anon/public key** (this is your `VITE_SUPABASE_ANON_KEY`)

## Step 3: Configure Email Authentication

Email/password authentication is enabled by default in Supabase. You can optionally configure:

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Click on **Email**
3. Ensure "Enable Email provider" is turned on (it should be by default)
4. (Optional) Configure email templates, confirmation settings, etc.

**Note**: For development, you can disable email confirmation:
- Go to **Authentication** → **Settings**
- Under "Email Auth", you can toggle "Enable email confirmations" off for easier testing

## Step 4: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy and paste the contents of `database-schema.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Verify tables were created by going to **Table Editor**

## Step 5: Configure Environment Variables

Add these to your `.env` file:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_OPENAI_API_KEY=your_openai_key_here
```

## Step 6: Update Vercel Environment Variables (if deploying)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`
4. Redeploy your application

## Step 7: Test Authentication

1. Run `npm install` to install Supabase dependencies
2. Run `npm run dev`
3. Try signing up with a new email and password
4. Check Supabase **Authentication** → **Users** to see if your user was created
5. Sign in with your credentials

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env` file exists and has the correct variables
- Restart your dev server after adding environment variables

### Email confirmation issues
- If emails aren't being sent, check your Supabase project settings
- For development, you can disable email confirmation in Authentication → Settings
- Check spam folder for confirmation emails

### Database permission errors
- Make sure you ran the SQL schema file completely
- Check that RLS policies are enabled and correct
- Verify you're using the anon key (not service role key) in the frontend

### Can't see conversations
- Check browser console for errors
- Verify user is authenticated
- Check Supabase logs in dashboard

## Security Notes

- The `anon` key is safe to use in the frontend - RLS policies protect your data
- Never expose the `service_role` key in frontend code
- RLS policies ensure users can only access their own data
- All API calls are automatically secured by Supabase

