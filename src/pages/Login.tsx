import { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Wine, Lock, User } from "lucide-react";

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
        <p className="text-center text-xs mt-3">
          <Link to="/setup" style={{ color: "rgba(201,168,76,0.5)", textDecoration: "none", fontSize: "0.7rem", letterSpacing: "0.05em" }}>⚙ Setup &amp; Diagnostics</Link>
        </p>
      </div>
    </div>
  );
}