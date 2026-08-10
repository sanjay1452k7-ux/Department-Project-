import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';

const GREETING = {
  role: 'assistant',
  content:
    "Hi! Ask me which hackathons you're eligible for, when a deadline is, who won something — or how to use any part of HackTrack.",
};

const PROMPTS = [
  'Which hackathons am I eligible for?',
  "When's the deadline for the Bhashini one?",
  'How do I turn on notifications?',
];

/** Floating assistant available across every student screen. */
export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const location = useLocation();
  // The hackathon detail screen pins its own Register bar above the tab bar, so
  // the button lifts clear of it rather than covering the primary action.
  const raised = /^\/hackathons\//.test(location.pathname);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setInput('');
    // Keep the prior turns (minus the canned greeting) so follow-ups have context.
    const history = messages.filter((m) => m !== GREETING);
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setBusy(true);
    try {
      const { answer } = await api.post('/chat', { question, history });
      setMessages((m) => [...m, { role: 'assistant', content: answer }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: `Sorry — I could not answer that (${err.message}).` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the HackTrack assistant"
        className={`fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg transition active:scale-95 ${
          raised ? 'bottom-44' : 'bottom-20'
        }`}
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-end sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} aria-hidden />

      <div className="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl animate-slide-up sm:h-[600px] sm:max-w-sm sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-900">HackTrack assistant</p>
            <p className="text-[11px] text-slate-500">Answers about hackathons and the app</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'rounded-br-md bg-brand-600 text-white'
                    : 'rounded-bl-md bg-white text-slate-800 shadow-sm'
                }`}
              >
                {m.content}
              </p>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <p className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm text-slate-400 shadow-sm">
                Thinking…
              </p>
            </div>
          )}
          {messages.length === 1 && (
            <div className="space-y-2 pt-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-600"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 border-t border-slate-200 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <input
            className="field flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            disabled={busy}
          />
          <button type="submit" className="btn-primary px-4" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
