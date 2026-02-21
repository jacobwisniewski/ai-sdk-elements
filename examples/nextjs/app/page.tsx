"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMarkdownElements } from "ai-sdk-elements/react/streamdown";
import { Streamdown, type Components } from "streamdown";
import "streamdown/styles.css";
import { elementUIs } from "@/lib/elements-ui";
import { useState } from "react";

const getText = (parts: UIMessage["parts"]): string =>
  parts
    .filter(
      (p): p is Extract<typeof p, { type: "text" }> => p.type === "text",
    )
    .map((p) => p.text)
    .join("");

const Message = ({
  role,
  parts,
  isStreaming,
}: {
  role: string;
  parts: UIMessage["parts"];
  isStreaming: boolean;
}) => {
  const { processedText, components, elementNames } = useMarkdownElements({
    text: getText(parts),
    parts,
    elements: elementUIs,
  });

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-zinc-900 px-4 py-2.5 text-white">
          {getText(parts)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl bg-zinc-100 px-4 py-2.5 text-zinc-900">
        <Streamdown
          isAnimating={isStreaming}
          allowedTags={Object.fromEntries(elementNames.map((name) => [name, ["dataElementId", "dataElementState"]]))}
          components={components as Components}
        >
          {processedText}
        </Streamdown>
      </div>
    </div>
  );
};

const transport = new DefaultChatTransport({ api: "/api/chat" });

export default function Page() {
  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState("");

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col">
      <header className="border-b border-zinc-200 px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-900">
          ai-sdk-elements demo
        </h1>
        <p className="text-xs text-zinc-500">
          Ask about the weather in any city
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-400">
              Try: &quot;What&apos;s the weather in Tokyo and Paris?&quot;
            </p>
          </div>
        )}
        {messages.map((message, index) => (
          <Message
            key={message.id}
            role={message.role}
            parts={message.parts}
            isStreaming={
              isStreaming && index === messages.length - 1
            }
          />
        ))}
      </div>

      <form
        className="border-t border-zinc-200 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isStreaming) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the weather..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isStreaming ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
