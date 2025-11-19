-- Add custom_tools table for user-created tools
-- Run this SQL in your Supabase SQL Editor

-- Custom tools table
CREATE TABLE IF NOT EXISTS custom_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  training_documents JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS custom_tools_created_at_idx ON custom_tools(created_at DESC);

-- Enable RLS on custom_tools table
ALTER TABLE custom_tools ENABLE ROW LEVEL SECURITY;

-- Everyone can view all custom tools (they're shared)
CREATE POLICY "Everyone can view custom tools"
  ON custom_tools FOR SELECT
  USING (true);

-- Authenticated users can insert custom tools
CREATE POLICY "Authenticated users can create custom tools"
  ON custom_tools FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only the creator can update their custom tools
CREATE POLICY "Users can update their own custom tools"
  ON custom_tools FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Only the creator can delete their custom tools
CREATE POLICY "Users can delete their own custom tools"
  ON custom_tools FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger to update updated_at on custom_tools
CREATE TRIGGER update_custom_tools_updated_at
  BEFORE UPDATE ON custom_tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

