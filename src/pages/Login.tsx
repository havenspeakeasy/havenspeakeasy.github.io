import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Wine, Lock, User, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);

  const runDiagnostics = async () => {
    setDiagLoading(true);
    const logs: string[] = [];
    logs.push(`⏱ ${new Date().toISOString()}`);
    logs.push(`🔗 Supabase URL: ${import.meta.env.VITE_SUPABASE_URL ?? "(not set — using hardcoded)"}`);

    // Test 1: Can we reach the employees table at all?
    const { data: rows, error: fetchErr, count } = await supabase
      .from("employees")
      .select("id, username, is_active", { count: "exact" })
      .limit(10);

    if (fetchErr) {
      logs.push(`❌ SELECT employees failed: [${fetchErr.code}] ${fetchErr.message}`);
      logs.push(`   Details: ${fetchErr.details ?? "none"}`);
      logs.push(`   Hint: ${fetchErr.hint ?? "none"}`);
    } else {
      logs.push(`✅ SELECT employees OK — total rows: ${count}`);
      if (rows && rows.length > 0) {
        logs.push(`   First ${rows.length} rows:`);
        rows.forEach(r => logs.push(`   • id=${r.id}  username="${r.username}"  active=${r.is_active}`));
      } else {
        logs.push(`   ⚠️ Table is EMPTY — no employees seeded!`);
      }
    }

    // Test 2: Try exact username lookup
    if (username.trim()) {
      const { data: found, error: lookupErr } = await supabase
        .from("employees")
        .select("id, username, password, is_active")
        .eq("username", username.trim())
        .maybeSingle();

      if (lookupErr) {
        logs.push(`❌ Username lookup failed: [${lookupErr.code}] ${lookupErr.message}`);
      } else if (!found) {
        logs.push(`⚠️ No employee found with username="${username.trim()}"`);
      } else {
        logs.push(`✅ Found employee: id=${found.id}  active=${found.is_active}`);
        logs.push(`   Password in DB: "${found.password}"`);
        logs.push(`   Password you typed: "${password}"`);
        logs.push(`   Match: ${found.password === password ? "✅ YES" : "❌ NO — MISMATCH!"}`);
      }
    } else {
      logs.push(`ℹ️ Enter a username above to test the lookup.`);
    }

    setDebugLog(logs);
    setDiagLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const emp = await login(username.trim(), password).catch((err) => {
      toast.error(err.message);
      return null;
    });
    setLoading(false);
    if (emp) {
      setUser(emp);
      toast.success(`Welcome back, ${emp.name.split(" ")[0]}!`);
      navigate("/dashboard");
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="login-card w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="logo-ring mb-4">
            <Wine className="w-8 h-8" style={{ color: "var(--gold)" }} />
          </div>
          <h1 className="text-3xl font-bold tracking-widest uppercase" style={{ color: "var(--gold)", fontFamily: "Georgia, serif" }}>
            The Haven
          </h1>
          <p className="text-sm tracking-[0.3em] uppercase mt-1" style={{ color: "var(--cream-muted)" }}>
            Speakeasy
          </p>
          <div className="divider-gold mt-4" />
          <p className="text-xs tracking-widest uppercase mt-3" style={{ color: "var(--cream-muted)" }}>
            Staff Portal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="input-group">
            <User className="input-icon" size={16} />
            <input
              className="haven-input"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="input-group">
            <Lock className="input-icon" size={16} />
            <input
              className="haven-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="haven-btn-primary mt-2" disabled={loading}>
            {loading ? "Signing in..." : "Enter the Haven"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "var(--cream-muted)" }}>
          Contact management if you've forgotten your credentials.
        </p>

        {/* Debug Panel */}
        <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(201,168,76,0.15)", paddingTop: "1rem" }}>
          <button
            type="button"
            onClick={() => setDebugOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--cream-muted)", fontSize: "0.72rem",
              letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 auto",
              opacity: 0.6,
            }}
          >
            <Bug size={13} />
            Diagnostics
            {debugOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {debugOpen && (
            <div style={{
              marginTop: "0.75rem",
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: "8px",
              padding: "0.75rem",
              fontSize: "0.7rem",
              fontFamily: "monospace",
              color: "var(--cream)",
              lineHeight: 1.7,
            }}>
              <button
                type="button"
                onClick={runDiagnostics}
                disabled={diagLoading}
                style={{
                  display: "block", width: "100%", marginBottom: "0.6rem",
                  padding: "6px 10px", borderRadius: "5px", cursor: "pointer",
                  background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)",
                  color: "var(--gold)", fontSize: "0.7rem", letterSpacing: "0.05em",
                }}
              >
                {diagLoading ? "Running..." : "▶ Run Diagnostics"}
              </button>
              {debugLog.length === 0 && (
                <p style={{ opacity: 0.5 }}>Click "Run Diagnostics" to check the database connection.</p>
              )}
              {debugLog.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}