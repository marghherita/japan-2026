const CITIES = {
  osaka: { lat: 34.6937, lon: 135.5023 },
  kyoto: { lat: 35.0116, lon: 135.7681 },
  tokyo: { lat: 35.6762, lon: 139.6503 },
};

const HOURLY_SLOTS = [6, 9, 12, 15, 18, 21];

function wmoIcon(code) {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "❄️";
  return "⛈️";
}

export async function fetchAllWeather() {
  const results = {};

  await Promise.all(
    Object.entries(CITIES).map(async ([city, { lat, lon }]) => {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,precipitation_probability_max,weathercode` +
        `&hourly=temperature_2m,precipitation_probability,weathercode` +
        `&timezone=Asia%2FTokyo&forecast_days=16`;

      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      data.daily.time.forEach((date, i) => {
        results[`${date}_${city}`] = {
          icon: wmoIcon(data.daily.weathercode[i]),
          temp: Math.round(data.daily.temperature_2m_max[i]),
          rain: data.daily.precipitation_probability_max[i] ?? 0,
        };
      });

      data.hourly.time.forEach((datetime, i) => {
        const [date, timeStr] = datetime.split("T");
        const hour = parseInt(timeStr);
        if (!HOURLY_SLOTS.includes(hour)) return;

        const key = `${date}_${city}_hourly`;
        if (!results[key]) results[key] = [];
        results[key].push({
          hour: timeStr,
          icon: wmoIcon(data.hourly.weathercode[i]),
          temp: Math.round(data.hourly.temperature_2m[i]),
          rain: data.hourly.precipitation_probability[i] ?? 0,
        });
      });
    })
  );

  return results;
}
