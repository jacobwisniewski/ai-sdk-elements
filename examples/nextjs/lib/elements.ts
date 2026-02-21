import { z } from "zod";
import { defineElement } from "ai-sdk-elements";

export const weatherElement = defineElement({
  name: "weather",
  description: "Display current weather for a city",
  schema: z.object({
    city: z.string(),
  }),
  enrich: async (input) => {
    // Simulate an API call with a small delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock weather data - replace with a real API call in production
    const conditions = ["Sunny", "Partly Cloudy", "Cloudy", "Rainy", "Snowy"];
    const condition =
      conditions[Math.floor(Math.random() * conditions.length)];
    const temperature = Math.floor(Math.random() * 35) + 5;
    const humidity = Math.floor(Math.random() * 60) + 30;
    const wind = Math.floor(Math.random() * 30) + 5;

    return {
      city: input.city,
      condition,
      temperature,
      humidity,
      wind,
    };
  },
});

export const elements = [weatherElement];
