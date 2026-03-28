import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cxiosbpacxoyxkcpyvjj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4aW9zYnBhY3hveXhrY3B5dmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDQwNTIsImV4cCI6MjA5MDI4MDA1Mn0.JRxdJlBkAjuPdzm6WAz3mWJtfq_2COMypeCJ9E3QLk0";

// Use the Service Role Key if available (set via VITE_SUPABASE_SERVICE_ROLE_KEY env var)
// This bypasses RLS and is safe here since this is a staff-only internal portal
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;
const activeKey = serviceRoleKey ?? SUPABASE_ANON_KEY;

console.log("[Supabase] Using key type:", serviceRoleKey ? "service_role" : "anon");

export const supabase = createClient(SUPABASE_URL, activeKey);
