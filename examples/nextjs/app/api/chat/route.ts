import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { generateElementPrompt } from "ai-sdk-elements";
import { createElementStream } from "ai-sdk-elements/server";
import { elements } from "@/lib/elements";
import { fetchWeather } from "@/lib/weather-api";

export const maxDuration = 30;

export const POST = async (req: Request) => {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model: openai("gpt-5-mini-2025-08-07"),
        system: [
          "You are a helpful assistant that can look up real-time weather information for any city in the world.",
          "",
          generateElementPrompt(elements),
        ].join("\n"),
        messages: convertToModelMessages(messages),
        tools: {
          getWeather: tool({
            description:
              "Get current weather data for a city. Use this to look up weather information you can reference in your response text.",
            inputSchema: z.object({
              city: z.string().describe("The city to get weather for"),
            }),
            execute: async ({ city }) => fetchWeather(city),
          }),
        },
        stopWhen: stepCountIs(3),
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
