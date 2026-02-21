import { z } from "zod";
import { defineElement } from "ai-sdk-elements";
import { fetchWeather } from "@/lib/weather-api";

export const weatherElement = defineElement({
  name: "weather",
  description: "Display current weather for a city",
  schema: z.object({
    city: z.string(),
  }),
  enrich: async (input) => fetchWeather(input.city),
});

export const elements = [weatherElement];
