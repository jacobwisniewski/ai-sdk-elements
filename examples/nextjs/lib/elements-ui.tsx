"use client";

import { defineElementUI } from "ai-sdk-elements";
import { weatherInputSchema, weatherOutputSchema } from "@/lib/elements";

export const weatherElementUI = defineElementUI({
  name: "weather",
  inputSchema: weatherInputSchema,
  outputSchema: weatherOutputSchema,
  render: (state) => {
    if (state.state === "loading") {
      return (
        <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          Loading weather...
        </span>
      );
    }

    if (state.state === "error") {
      return (
        <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          Failed to load weather: {state.errorText}
        </span>
      );
    }

    return (
      <span className="my-2 inline-block rounded-xl border border-zinc-200 bg-gradient-to-br from-sky-50 to-blue-50 p-4 shadow-sm">
        <span className="flex items-start justify-between gap-6">
          <span className="block">
            <span className="block text-lg font-semibold text-zinc-900">
              {state.output.city}, {state.output.country}
            </span>
            <span className="block text-sm text-zinc-500">{state.output.condition}</span>
          </span>
          <span className="block text-right">
            <span className="text-3xl font-bold text-zinc-900">{state.output.temperature}°C</span>
          </span>
        </span>
        <span className="mt-3 flex gap-4 border-t border-zinc-200/60 pt-3 text-xs text-zinc-500">
          <span>Humidity: {state.output.humidity}%</span>
          <span>Wind: {state.output.wind} km/h</span>
        </span>
      </span>
    );
  },
});

export const elementUIs = [weatherElementUI];
