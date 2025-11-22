import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface User {
  userType: "donor" | "school";
  donorName?: string;
  schoolName?: string;
  email?: string;
}

interface LoginResponse {
  success: boolean;
  user?: User;
  message?: string;
}

const Login: React.FC<{ setCurrentUser: (user: User) => void }> = ({ setCurrentUser }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.defaults.baseURL = "http://localhost:8000";
    axios.defaults.withCredentials = true;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.get("/sanctum/csrf-cookie");

      const response = await axios.post<LoginResponse>("/api/login", {
        identifier,
        password,
      });

      if (response.data.success && response.data.user) {
        setCurrentUser(response.data.user);
        navigate("/");
      } else {
        setError(response.data.message || "Login failed.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f5f7fa",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 380,
          padding: 35,
          borderRadius: 14,
          background: "#ffffff",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          animation: "fadeIn 0.3s ease-in-out",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: 25,
            fontSize: 24,
            fontWeight: "bold",
            color: "#333",
          }}
        >
          Login
        </h2>

        {error && (
          <p style={{ color: "#e63946", fontSize: 14, marginBottom: 12, textAlign: "center" }}>
            {error}
          </p>
        )}

        <input
          type="text"
          placeholder="Email or Registration No"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 15,
            transition: "0.2s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#ccc")}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            border: "1px solid #ccc",
            fontSize: 15,
            transition: "0.2s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#ccc")}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            background: loading ? "#7ca6f9" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "0.2s",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default Login;
