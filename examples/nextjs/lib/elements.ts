import { z } from "zod";
import { defineElement } from "ai-sdk-elements";
import { fetchWeather } from "@/lib/weather-api";

export const weatherOutputSchema = z.object({
  city: z.string(),
  country: z.string(),
  condition: z.string(),
  temperature: z.number(),
  humidity: z.number(),
  wind: z.number(),
});

export const weatherElement = defineElement({
  name: "weather",
  description: "Display current weather for a city",
  schema: z.object({
    city: z.string(),
  }),
  outputSchema: weatherOutputSchema,
  enrich: async (input) => fetchWeather(input.city),
});

export const elements = [weatherElement];
