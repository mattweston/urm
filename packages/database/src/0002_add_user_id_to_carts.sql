-- Migration: Add user_id column to carts table
-- Purpose: Support authentication-based cart binding for authenticated users
-- 
-- This migration:
-- 1. Adds user_id column to carts table (optional, for authenticated users)
-- 2. Creates index on user_id for efficient lookups
-- 3. Creates composite index on (user_id, session_id) for migration operations
-- 
-- Design decisions:
-- - user_id is nullable (anonymous carts won't have user_id)
-- - session_id is kept even when user_id is set (for tracking)
-- - Both can be present in the same cart row after migration
-- 
-- Idempotent: Safe to run multiple times

-- Add user_id column if it doesn't exist
ALTER TABLE carts ADD COLUMN IF NOT EXISTS user_id varchar(255);

-- Create index on user_id for efficient lookups when fetching user's cart
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);

-- Create composite index for cart migration queries (sessionId + userId lookup)
CREATE INDEX IF NOT EXISTS idx_carts_session_user ON carts(session_id, user_id);

-- Add comment explaining the column
COMMENT ON COLUMN carts.user_id IS 'ID of the authenticated user who owns this cart. NULL for anonymous carts. Both user_id and session_id can be present after user login.';
