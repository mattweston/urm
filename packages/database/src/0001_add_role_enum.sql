-- Migration: Add PostgreSQL role enum type
-- Purpose: Support linear role hierarchy (user → member → admin)
-- 
-- This migration:
-- 1. Creates a PostgreSQL ENUM type for roles
-- 2. Alters the users table role column to use the enum type
-- 3. Sets default value to 'user'
-- 
-- Idempotent: Safe to run multiple times

-- Create the role enum type if it doesn't exist
CREATE TYPE IF NOT EXISTS role AS ENUM ('user', 'member', 'admin');

-- Alter the users table to use the enum type
-- First, we need to cast the existing varchar values to the enum type
ALTER TABLE users ALTER COLUMN role TYPE role USING role::role;

-- Set the default value
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'::role;

-- Add a comment explaining the hierarchy
COMMENT ON TYPE role IS 'Linear role hierarchy: user (1) → member (2) → admin (3). Admin inherits member+user privileges, member inherits user privileges.';
COMMENT ON COLUMN users.role IS 'User role with linear privilege hierarchy. Use hasRoleOrHigher from @urm/permissions to check authorization.';
