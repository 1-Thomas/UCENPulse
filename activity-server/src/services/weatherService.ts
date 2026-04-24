export async function getWeather(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API failed");

  const data = await res.json();

  return {
    temperature: data.current_weather?.temperature,
    weatherCode: data.current_weather?.weathercode,
  };
}