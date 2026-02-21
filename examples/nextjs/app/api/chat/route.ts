import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { generateElementPrompt } from "ai-sdk-elements";
import { createElementStream } from "ai-sdk-elements/server";
import { elements } from "@/lib/elements";

export const maxDuration = 30;

export const POST = async (req: Request) => {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model: openai("gpt-4o-mini"),
        system: [
          "You are a helpful weather assistant.",
          "When a user asks about the weather in a city, use the weather element to display it.",
          "You can show weather for multiple cities at once.",
          "",
          generateElementPrompt(elements),
        ].join("\n"),
        messages: convertToModelMessages(messages),
      });

      const elementStream = createElementStream({
        source: result.toUIMessageStream(),
        elements,
        deps: {},
      });

      writer.merge(elementStream);
    },
  });

  return createUIMessageStreamResponse({ stream });
};
