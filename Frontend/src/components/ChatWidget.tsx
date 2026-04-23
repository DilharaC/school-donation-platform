import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    {
      role: "bot",
      text: "Hi 👋 I can help with donations, schools, campaigns, and receipts.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userMsg,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/api/chat", { message: userMsg });

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: res.data.reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Error connecting to assistant.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
{/* Floating Full Robot Button */}
{/* Floating Robot Button */}
{/* Floating Robot Button */}
<button
  onClick={() => setOpen(!open)}
  className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-rose-500 shadow-lg hover:bg-rose-600 transition z-50 flex items-center justify-center"
>
  {/* Full-body Robot SVG */}
  <svg
    className="h-10 w-10 animate-bounce-slow"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    fill="white"
  >
    {/* Head */}
    <rect x="20" y="4" width="24" height="14" rx="3" ry="3" fill="white" />
    <circle cx="28" cy="11" r="2" fill="rose" />
    <circle cx="36" cy="11" r="2" fill="rose" />

    {/* Body */}
    <rect x="18" y="20" width="28" height="24" rx="4" ry="4" fill="white" />

    {/* Arms */}
    <rect x="11" y="22" width="5" height="18" rx="2" ry="2" fill="white" />
    <rect x="48" y="22" width="5" height="18" rx="2" ry="2" fill="white" />

    {/* Legs */}
    <rect x="22" y="44" width="5" height="8" rx="1" ry="1" fill="white" />
    <rect x="37" y="44" width="5" height="8" rx="1" ry="1" fill="white" />

    {/* Antenna */}
    <line x1="32" y1="4" x2="32" y2="0" stroke="white" strokeWidth="2" />
    <circle cx="32" cy="0" r="1" fill="white" />
  </svg>
</button>

{/* Chat Panel */}
<div
  className={`fixed bottom-24 right-6 w-[80vw] max-w-[300px] h-[420px] bg-white rounded-2xl shadow-xl flex flex-col z-50
    transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-[120%]"}
  `}
>
  {/* Header */}
  <div className="p-2 font-bold bg-rose-500 text-white rounded-t-2xl flex justify-between items-center shadow-md">
    <div className="flex items-center gap-2">
      <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center text-rose-500 text-xs font-bold">🤖</div>
      EduFund Assistant
    </div>
    <button
      onClick={() => setOpen(false)}
      className="text-white hover:text-slate-200 text-lg"
    >
      ➤
    </button>
  </div>

  {/* Messages */}
  <div className="flex-1 overflow-y-auto p-2 space-y-1 text-sm">
    {messages.map((m, i) => (
      <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
        <div className={`p-2 rounded-xl max-w-[75%] break-words ${m.role === "user" ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-900"}`}>
          {m.text}
        </div>
        <span className="text-[9px] text-slate-400 mt-0.5">{m.time}</span>
      </div>
    ))}
    {loading && <div className="text-xs text-slate-400 animate-pulse">Typing...</div>}
    <div ref={messagesEndRef} />
  </div>

  {/* Input */}
  <div className="p-2 flex gap-2 border-t">
    <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyPress}
      className="flex-1 border rounded-lg px-2 py-1 text-sm resize-none h-9 focus:outline-rose-500"
      placeholder="Ask about donations..."
    />
    <button
      onClick={sendMessage}
      className="bg-rose-500 text-white px-3 rounded-lg hover:bg-rose-600 transition"
    >
      Send
    </button>
  </div>
</div>
    </>
  );
}