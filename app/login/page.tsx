"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    const res = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setError("Wrong password.");
    }
  }

  return (
    <main className="login">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h1>Knowledge OS</h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Enter</button>
        {error && <p className="error">{error}</p>}
      </form>
      <style jsx>{`
        .login {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #14161a;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 280px;
        }
        h1 {
          color: #e8e6e1;
          font-family: "IBM Plex Mono", monospace;
          font-size: 18px;
          margin: 0 0 8px;
        }
        input {
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #33363c;
          background: #1d2025;
          color: #e8e6e1;
        }
        button {
          padding: 10px 12px;
          border-radius: 6px;
          border: none;
          background: #d97757;
          color: #14161a;
          font-weight: 600;
          cursor: pointer;
        }
        .error {
          color: #e0684f;
          font-size: 13px;
          margin: 0;
        }
      `}</style>
    </main>
  );
}
