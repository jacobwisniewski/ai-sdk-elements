interface GeocodingResult {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly country: string;
}

interface OpenMeteoCurrentWeather {
  readonly temperature_2m: number;
  readonly relative_humidity_2m: number;
  readonly wind_speed_10m: number;
  readonly weather_code: number;
}

export type WeatherData = {
  readonly city: string;
  readonly country: string;
  readonly condition: string;
  readonly temperature: number;
  readonly humidity: number;
  readonly wind: number;
};

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const describeWeatherCode = (code: number): string =>
  WMO_CODES[code] ?? "Unknown";

const geocodeCity = async (city: string): Promise<GeocodingResult> => {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
  );
  const data = await response.json();

  if (!data.results?.length) {
    throw new Error(`City not found: ${city}`);
  }

  return data.results[0] as GeocodingResult;
};

export const fetchWeather = async (city: string): Promise<WeatherData> => {
  const geo = await geocodeCity(city);

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`,
  );
  const data = await response.json();
  const current = data.current as OpenMeteoCurrentWeather;

  return {
    city: geo.name,
    country: geo.country,
    condition: describeWeatherCode(current.weather_code),
    temperature: Math.round(current.temperature_2m),
    humidity: current.relative_humidity_2m,
    wind: Math.round(current.wind_speed_10m),
  };
};
