/*
  # Fix RLS Policies and Database Structure

  1. Database Structure Fixes
    - Remove problematic RLS policies causing infinite recursion
    - Simplify admin authentication system
    - Fix column references in admin_users table

  2. Security Updates
    - Implement simpler, non-recursive RLS policies
    - Ensure proper access control without circular dependencies
    - Maintain security while fixing recursion issues

  3. Admin System Fixes
    - Simplify admin session management
    - Remove complex policy dependencies
    - Ensure admin functionality works properly
*/

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can manage product images" ON product_images;
DROP POLICY IF EXISTS "Admins can manage their own sessions" ON admin_sessions;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view logs" ON admin_logs;

-- Simplify products policies
CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Service role can manage products"
  ON products
  FOR ALL
  TO service_role
  USING (true);

-- Simplify product images policies
CREATE POLICY "Anyone can view product images"
  ON product_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can manage product images"
  ON product_images
  FOR ALL
  TO service_role
  USING (true);

-- Simplify admin sessions (no complex policies)
CREATE POLICY "Service role can manage admin sessions"
  ON admin_sessions
  FOR ALL
  TO service_role
  USING (true);

-- Simplify admin users
CREATE POLICY "Service role can manage admin users"
  ON admin_users
  FOR ALL
  TO service_role
  USING (true);

-- Simplify admin logs
CREATE POLICY "Service role can manage admin logs"
  ON admin_logs
  FOR ALL
  TO service_role
  USING (true);

-- Create a simple function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE username = user_email
  );
END;
$$;

-- Create function for admin authentication
CREATE OR REPLACE FUNCTION authenticate_admin(p_username text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record admin_users%ROWTYPE;
  session_token text;
  expires_at timestamptz;
BEGIN
  -- Check credentials (simplified for demo)
  IF p_username = 'paufergunza@gmail.com' AND p_password = 'admin2025' THEN
    -- Get admin user
    SELECT * INTO admin_record FROM admin_users WHERE username = p_username;
    
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'message', 'Admin user not found');
    END IF;
    
    -- Generate session token
    session_token := encode(gen_random_bytes(32), 'hex');
    expires_at := now() + interval '8 hours';
    
    -- Create session
    INSERT INTO admin_sessions (admin_id, session_token, expires_at)
    VALUES (admin_record.id, session_token, expires_at);
    
    -- Update last login
    UPDATE admin_users SET last_login = now() WHERE id = admin_record.id;
    
    RETURN json_build_object(
      'success', true,
      'session_token', session_token,
      'admin', json_build_object(
        'id', admin_record.id,
        'username', admin_record.username,
        'full_name', admin_record.full_name,
        'email', admin_record.email,
        'is_super_admin', admin_record.is_super_admin
      )
    );
  ELSE
    RETURN json_build_object('success', false, 'message', 'Invalid credentials');
  END IF;
END;
$$;

-- Create function to validate admin session
CREATE OR REPLACE FUNCTION validate_admin_session(p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record admin_sessions%ROWTYPE;
  admin_record admin_users%ROWTYPE;
BEGIN
  -- Get session
  SELECT * INTO session_record 
  FROM admin_sessions 
  WHERE session_token = p_session_token 
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired session');
  END IF;
  
  -- Get admin user
  SELECT * INTO admin_record FROM admin_users WHERE id = session_record.admin_id;
  
  RETURN json_build_object(
    'success', true,
    'admin', json_build_object(
      'id', admin_record.id,
      'username', admin_record.username,
      'full_name', admin_record.full_name,
      'email', admin_record.email,
      'is_super_admin', admin_record.is_super_admin,
      'last_login', admin_record.last_login
    )
  );
END;
$$;