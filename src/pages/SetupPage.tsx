import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wine, Database, CheckCircle, XCircle, Loader, RefreshCw, Key } from "lucide-react";

interface DiagResult {
  label: string;
  status: "ok" | "error" | "warn";
  detail: string;
}

const SEED_EMPLOYEES = [
  { id: "emp_owner_001", name: "The Owner", username: "owner", password: "haven2024", role: "Owner", hourly_rate: 25, is_active: true, avatar_initials: "TO" },
  { id: "emp_mgr_001",   name: "Line Manager", username: "manager", password: "haven2024", role: "Line Manager", hourly_rate: 20, is_active: true, avatar_initials: "LM" },
  { id: "emp_bar_001",   name: "Alex Bartender", username: "alex", password: "haven2024", role: "Bartender", hourly_rate: 15, is_active: true, avatar_initials: "AB" },
  { id: "emp_srv_001",   name: "Sam Server", username: "sam", password: "haven2024", role: "Server", hourly_rate: 12, is_active: true, avatar_initials: "SS" },
];

const SEED_JOB_TITLES = [
  { id: "jt_owner_001",  name: "Owner",        is_admin: true,  created_at: new Date().toISOString() },
  { id: "jt_mgr_001",    name: "Line Manager", is_admin: true,  created_at: new Date().toISOString() },
  { id: "jt_bar_001",    name: "Bartender",    is_admin: false, created_at: new Date().toISOString() },
  { id: "jt_srv_001",    name: "Server",       is_admin: false, created_at: new Date().toISOString() },
  { id: "jt_sec_001",    name: "Security",     is_admin: false, created_at: new Date().toISOString() },
  { id: "jt_host_001",   name: "Host",         is_admin: false, created_at: new Date().toISOString() },
];

export default function SetupPage() {
  const [results, setResults] = useState<DiagResult[]>([]);
  const [running, setRunning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [employeeRows, setEmployeeRows] = useState<any[]>([]);

  const runDiagnostics = async () => {
    setRunning(true);
    setResults([]);
    const out: DiagResult[] = [];

    // 1. Can we reach Supabase at all?
    try {
      const { error } = await supabase.from("employees").select("count", { count: "exact", head: true });
      if (error) {
        out.push({ label: "Supabase connection", status: "error", detail: `Error: ${error.message} (code: ${error.code})` });
      } else {
        out.push({ label: "Supabase connection", status: "ok", detail: "Connected successfully" });
      }
    } catch (e: any) {
      out.push({ label: "Supabase connection", status: "error", detail: `Network error: ${e.message}` });
    }

    // 2. How many employees exist?
    try {
      const { data, error } = await supabase.from("employees").select("*", { count: "exact" });
      if (error) {
        out.push({ label: "Employees table", status: "error", detail: `Read error: ${error.message}` });
      } else {
        const rows = data ?? [];
        setEmployeeRows(rows);
        if (rows.length === 0) {
          out.push({ label: "Employees table", status: "warn", detail: "Table is EMPTY — no employees seeded yet. Use the Seed button below." });
        } else {
          out.push({ label: "Employees table", status: "ok", detail: `${rows.length} employee(s) found: ${rows.map((r: any) => r.username).join(", ")}` });
        }
      }
    } catch (e: any) {
      out.push({ label: "Employees table", status: "error", detail: `Exception: ${e.message}` });
    }

    // 3. Try login query directly
    try {
      const { data, error } = await supabase.from("employees").select("*").eq("username", "owner").eq("password", "haven2024").eq("is_active", true).maybeSingle();
      if (error) {
        out.push({ label: "Login query (owner / haven2024)", status: "error", detail: `Query error: ${error.message}` });
      } else if (!data) {
        out.push({ label: "Login query (owner / haven2024)", status: "warn", detail: "No match — employee does not exist yet." });
      } else {
        out.push({ label: "Login query (owner / haven2024)", status: "ok", detail: `✓ Login works! Found: ${data.name} (${data.role})` });
      }
    } catch (e: any) {
      out.push({ label: "Login query (owner / haven2024)", status: "error", detail: `Exception: ${e.message}` });
    }

    // 4. Job titles
    try {
      const { data, error } = await supabase.from("job_titles").select("*");
      if (error) {
        out.push({ label: "Job titles table", status: "error", detail: `Read error: ${error.message}` });
      } else {
        const rows = data ?? [];
        if (rows.length === 0) {
          out.push({ label: "Job titles table", status: "warn", detail: "Empty — no job titles seeded." });
        } else {
          out.push({ label: "Job titles table", status: "ok", detail: `${rows.length} titles found` });
        }
      }
    } catch (e: any) {
      out.push({ label: "Job titles table", status: "error", detail: `Exception: ${e.message}` });
    }

    setResults(out);
    setRunning(false);
  };

  const seedDatabase = async () => {
    setSeeding(true);
    const errors: string[] = [];

    // Upsert job titles
    for (const jt of SEED_JOB_TITLES) {
      const { error } = await supabase.from("job_titles").upsert(jt, { onConflict: "id" });
      if (error) errors.push(`job_title ${jt.name}: ${error.message}`);
    }

    // Upsert employees
    for (const emp of SEED_EMPLOYEES) {
      const { error } = await supabase.from("employees").upsert(emp, { onConflict: "id" });
      if (error) errors.push(`employee ${emp.username}: ${error.message}`);
    }

    if (errors.length > 0) {
      alert("Some errors during seeding:\n" + errors.join("\n"));
    } else {
      setSeedDone(true);
    }

    setSeeding(false);
    // Re-run diagnostics after seeding
    await runDiagnostics();
  };

  const allOk = results.length > 0 && results.every(r => r.status === "ok");

  return (
    <div style={{ minHeight: "100vh", background: "var(--dark-900)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 640, background: "var(--dark-800, #1a1612)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 16, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "2rem 2rem 1.5rem", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wine size={22} style={{ color: "var(--gold)" }} />
          </div>
          <div>
            <h1 style={{ color: "var(--gold)", fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.05em" }}>
              Haven Setup & Diagnostics
            </h1>
            <p style={{ color: "var(--cream-muted, #9b8f7e)", fontSize: "0.8rem", marginTop: 2 }}>
              Use this page to check and fix the database connection
            </p>
          </div>
        </div>

        <div style={{ padding: "1.5rem 2rem" }}>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem" }}>
            <button
              onClick={runDiagnostics}
              disabled={running}
              style={{ flex: 1, padding: "0.75rem 1rem", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, color: "var(--gold)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {running ? <Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Database size={15} />}
              {running ? "Running..." : "Run Diagnostics"}
            </button>
            <button
              onClick={seedDatabase}
              disabled={seeding || running}
              style={{ flex: 1, padding: "0.75rem 1rem", background: seedDone ? "rgba(34,197,94,0.1)" : "rgba(201,168,76,0.15)", border: `1px solid ${seedDone ? "rgba(34,197,94,0.4)" : "rgba(201,168,76,0.4)"}`, borderRadius: 8, color: seedDone ? "#4ade80" : "var(--gold)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {seeding ? <Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> : seedDone ? <CheckCircle size={15} /> : <RefreshCw size={15} />}
              {seeding ? "Seeding..." : seedDone ? "Seeded!" : "Seed Database"}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.5rem" }}>
              {results.map((r, i) => (
                <div key={i} style={{
                  padding: "0.75rem 1rem",
                  borderRadius: 8,
                  background: r.status === "ok" ? "rgba(34,197,94,0.07)" : r.status === "error" ? "rgba(239,68,68,0.07)" : "rgba(234,179,8,0.07)",
                  border: `1px solid ${r.status === "ok" ? "rgba(34,197,94,0.2)" : r.status === "error" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)"}`,
                  display: "flex", alignItems: "flex-start", gap: 10
                }}>
                  {r.status === "ok" ? <CheckCircle size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: 1 }} />
                    : r.status === "error" ? <XCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                    : <XCircle size={16} color="#facc15" style={{ flexShrink: 0, marginTop: 1 }} />}
                  <div>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: r.status === "ok" ? "#4ade80" : r.status === "error" ? "#f87171" : "#facc15", marginBottom: 2 }}>{r.label}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--cream-muted, #9b8f7e)", lineHeight: 1.4 }}>{r.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Employee list */}
          {employeeRows.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--cream-muted, #9b8f7e)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Employees in database</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {employeeRows.map((e: any) => (
                  <div key={e.id} style={{ padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <Key size={13} style={{ color: "var(--gold)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.8rem", color: "#d4c5a9" }}>
                      <strong style={{ color: "#e8d5a3" }}>{e.username}</strong> / haven2024 — {e.name} ({e.role}) {e.is_active ? "✓" : "✗ inactive"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allOk && (
            <div style={{ padding: "1rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, marginBottom: "1.5rem" }}>
              <p style={{ color: "#4ade80", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>✓ Everything looks good!</p>
              <p style={{ color: "var(--cream-muted, #9b8f7e)", fontSize: "0.8rem" }}>You can now log in at the main page. Use <strong style={{ color: "#e8d5a3" }}>owner / haven2024</strong></p>
            </div>
          )}

          {/* Credentials reference */}
          <div style={{ padding: "1rem", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 8 }}>
            <p style={{ color: "var(--gold)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Default Credentials (all use password: haven2024)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
              {[
                { u: "owner", r: "Owner (Admin)" },
                { u: "manager", r: "Line Manager (Admin)" },
                { u: "alex", r: "Bartender" },
                { u: "sam", r: "Server" },
              ].map(c => (
                <div key={c.u} style={{ fontSize: "0.78rem", color: "var(--cream-muted, #9b8f7e)" }}>
                  <span style={{ color: "#e8d5a3", fontWeight: 600 }}>{c.u}</span> — {c.r}
                </div>
              ))}
            </div>
          </div>

          <a href="/" style={{ display: "block", marginTop: "1.25rem", textAlign: "center", padding: "0.75rem", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, color: "var(--gold)", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none" }}>
            ← Back to Login
          </a>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
