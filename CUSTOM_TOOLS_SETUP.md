# Custom Tools Setup

## What's New

The app now supports creating custom tools! Users can:
- Create new tools with custom names and prompts
- Upload training documents (PDF, DOCX, images, text files)
- Share tools with all users (tools are visible to everyone)
- Use custom tools just like built-in tools

## Database Setup Required

**IMPORTANT**: You need to run the custom tools database schema in Supabase:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run the SQL from `database-schema-custom-tools.sql`
4. This creates the `custom_tools` table with proper security policies

## How It Works

1. **Tool 8 has been removed**
2. **Tool 7 is now "+ Add New Tool"** - clicking it opens the tool creation screen
3. **Custom tools are stored in the database** and loaded when users sign in
4. **Training documents** are included in the system prompt when using custom tools
5. **All users can see and use** custom tools created by anyone

## Features

- ✅ Create custom tools with name and prompt
- ✅ Upload multiple training documents
- ✅ Support for PDF, DOCX, images, and text files
- ✅ Tools are shared across all users
- ✅ Training documents are automatically included in conversations
- ✅ Custom tools appear in the dropdown alongside built-in tools

## Usage

1. Select "+ Add New Tool" from the tool dropdown
2. Enter a tool name
3. Write the system prompt
4. (Optional) Upload training documents
5. Click "Create Tool"
6. The new tool will appear in the dropdown and can be used immediately

## Database Schema

The `custom_tools` table stores:
- `id` - Unique identifier
- `name` - Tool name
- `prompt` - System prompt
- `training_documents` - JSON array of uploaded documents
- `created_by` - User who created it
- `created_at` / `updated_at` - Timestamps

## Security

- All users can view all custom tools (they're shared)
- Only authenticated users can create tools
- Only the creator can update/delete their tools
- Row Level Security (RLS) policies enforce these rules

