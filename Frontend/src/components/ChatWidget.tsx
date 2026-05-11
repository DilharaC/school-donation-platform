import { useEffect, useRef, useState } from "react";
import axios from "axios";
import botIcon from "../assets/chatbot.png";

type MessageRole = "user" | "bot";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  time: string;
}

const STORAGE_KEY = "edufund_chat_messages";
const API_URL =
  import.meta.env.VITE_CHAT_API_URL || "http://localhost:8000/api/chat";

const emojis = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "😢", "😭", "😡", "👍", "👎", "👏", "🙏", "🔥",
  "💯", "🎉", "❤️", "💙", "💚", "⭐", "✅", "❌",
];

const getTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const createMessage = (role: MessageRole, text: string): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  time: getTime(),
});

const initialBotMessage: ChatMessage = {
  id: "welcome-message",
  role: "bot",
  text: "Hello 👋 Welcome to EduFund. How can I help you with donations today?",
  time: getTime(),
};

const quickReplies = [
  "How can I donate?",
  "Show schools with high needs",
  "Show recent campaigns",
  "How much raised this month?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [initialBotMessage];
    } catch {
      return [initialBotMessage];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      setShowEmoji(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      110
    )}px`;
  }, [input]);

  const sendMessage = async (customMessage?: string) => {
    const trimmed = (customMessage || input).trim();
    if (!trimmed || loading) return;

    const userMessage = createMessage("user", trimmed);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowEmoji(false);
    setLoading(true);

    try {
      const res = await axios.post(
        API_URL,
        { message: trimmed },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const reply =
        res?.data?.reply?.trim() ||
        "I received your message, but no reply came back.";

      setMessages((prev) => [...prev, createMessage("bot", reply)]);
    } catch (error: any) {
      let errorText = "Error connecting to assistant. Please try again.";

      if (error?.code === "ECONNABORTED") {
        errorText = "Request timed out. Please try again.";
      } else if (error?.response?.data?.reply) {
        errorText = error.response.data.reply;
      } else if (error?.response?.status >= 500) {
        errorText = "Server error. Please try again later.";
      }

      setMessages((prev) => [...prev, createMessage("bot", errorText)]);
    } finally {
      setLoading(false);
    }
  };

 const addEmoji = (emoji: string) => {
  setInput((prev) => prev + emoji);
  setShowEmoji(false); // 👈 THIS LINE closes panel
  textareaRef.current?.focus();
};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const reset = [initialBotMessage];
    setMessages(reset);
    setShowEmoji(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!open && (
          <div className="pointer-events-none absolute right-[88px] top-1/2 hidden -translate-y-1/2 md:block">
            <div className="relative rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xl ring-1 ring-slate-200">
              Chat with us
              <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-white ring-1 ring-slate-200" />
            </div>
          </div>
        )}

        {!open && (
          <>
            <span className="absolute inset-0 rounded-full bg-blue-500/30 blur-2xl animate-pulse" />
            <span className="absolute inset-0 rounded-full border border-blue-300/50 animate-ping" />
          </>
        )}

        <button
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? "Close chat" : "Open chat"}
          className={`group relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 shadow-[0_18px_50px_rgba(14,165,233,0.45)] transition-all duration-300 active:scale-95 ${
            open ? "h-16 w-16 scale-95" : "h-20 w-20 hover:scale-110"
          }`}
        >
          <span className="absolute inset-0 bg-white/10" />
          <img
            src={botIcon}
            alt="Chatbot"
            className={`relative z-10 object-contain drop-shadow-xl transition-all duration-300 ${
              open ? "h-9 w-9" : "h-12 w-12"
            }`}
          />

          {!open && (
            <span className="absolute bottom-2 right-2 z-20">
              <span className="absolute inline-flex h-5 w-5 rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative block h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
            </span>
          )}
        </button>
      </div>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 z-50 flex h-[650px] w-[94vw] max-w-[410px] origin-bottom-right flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_25px_90px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 transition-all duration-300 sm:w-[410px] ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-8 scale-95 opacity-0"
        }`}
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 px-5 pb-7 pt-5 text-white">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg">
                <img src={botIcon} alt="EduFund Assistant" className="h-9 w-9" />
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
              </div>

              <div>
                <p className="text-xs font-medium text-white/80">Chat with</p>
                <h2 className="text-lg font-bold">EduFund Assistant</h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/90">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  We're online
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="rounded-full px-3 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/15"
              >
                Clear
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  setShowEmoji(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-white transition hover:bg-white/15"
              >
                ˅
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="-mt-5 flex-1 overflow-y-auto rounded-t-[28px] bg-gradient-to-b from-white via-sky-50/40 to-slate-50 px-4 py-5">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "bot" ? (
                  <div className="flex max-w-[88%] items-end gap-2">
                    <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-sky-100">
                      <img src={botIcon} alt="Bot" className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="rounded-[22px] rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow ring-1 ring-slate-100">
                        {message.text}
                      </div>
                      <span className="mt-1 block px-1 text-[10px] text-slate-400">
                        {message.time}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[82%]">
                    <div className="rounded-[22px] rounded-br-md bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-3 text-sm leading-6 text-white shadow">
                      {message.text}
                    </div>
                    <span className="mt-1 block px-1 text-right text-[10px] text-slate-400">
                      {message.time}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-sky-100">
                  <img src={botIcon} alt="Typing" className="h-5 w-5" />
                </div>
                <div className="rounded-[22px] rounded-bl-md bg-white px-4 py-3 shadow ring-1 ring-slate-100">
                  <span className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Replies */}
        <div className="border-t border-slate-100 bg-white px-3 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickReplies.map((item) => (
              <button
                key={item}
                onClick={() => sendMessage(item)}
                disabled={loading}
                className="whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="relative bg-white p-4">
          {showEmoji && (
            <div className="absolute bottom-[92px] left-4 z-50 grid w-[260px] grid-cols-6 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition hover:scale-110 hover:bg-sky-50"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-[24px] border border-slate-200 bg-white px-3 py-2 shadow-[0_8px_30px_rgba(15,23,42,0.07)]">
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmoji((prev) => !prev)}
                className="mb-2 flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:bg-slate-100"
                title="Emoji"
              >
                😊
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Enter your message..."
                className="max-h-[110px] min-h-[44px] flex-1 resize-none bg-transparent px-1 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-xl font-bold text-white shadow-[0_10px_28px_rgba(37,99,235,0.35)] transition hover:scale-105 disabled:opacity-50"
              >
                ➤
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-400">
            Powered by EduFund AI Assistant
          </p>
        </div>
      </div>
    </>
  );
}