const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { packDailyYear } = require('./packer');

/**
 * AtmoSync City Seeder — Seeds popular cities for instant vault hits
 * Usage: node seed-cities.js
 */

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const OUTPUT_DIR = path.resolve(__dirname, 'v1');
const YEARS = [2023, 2024, 2025];

// Top cities — the coordinates the app will actually query
// (Open-Meteo geocoding snaps to nearest 0.1° so we round)
const CITIES = [
  // ─── India ───
  { name: 'Mumbai',        lat: 19.1, lon: 72.9 },
  { name: 'Delhi',         lat: 28.6, lon: 77.2 },
  { name: 'Bangalore',     lat: 13.0, lon: 77.6 },
  { name: 'Hyderabad',     lat: 17.4, lon: 78.5 },
  { name: 'Chennai',       lat: 13.1, lon: 80.3 },
  { name: 'Kolkata',       lat: 22.6, lon: 88.4 },
  { name: 'Pune',          lat: 18.5, lon: 73.9 },
  { name: 'Ahmedabad',     lat: 23.0, lon: 72.6 },
  { name: 'Jaipur',        lat: 26.9, lon: 75.8 },
  { name: 'Lucknow',       lat: 26.8, lon: 80.9 },
  { name: 'Ranchi',        lat: 23.3, lon: 85.3 },
  { name: 'Patna',         lat: 25.6, lon: 85.1 },
  { name: 'Bhopal',        lat: 23.3, lon: 77.4 },
  { name: 'Chandigarh',    lat: 30.7, lon: 76.8 },
  { name: 'Goa',           lat: 15.5, lon: 73.8 },
  { name: 'Kochi',         lat: 10.0, lon: 76.3 },
  { name: 'Indore',        lat: 22.7, lon: 75.9 },
  { name: 'Nagpur',        lat: 21.1, lon: 79.1 },
  { name: 'Varanasi',      lat: 25.3, lon: 83.0 },
  { name: 'Surat',         lat: 21.2, lon: 72.8 },

  // ─── International ───
  { name: 'London',        lat: 51.5, lon: -0.1 },
  { name: 'New York',      lat: 40.7, lon: -74.0 },
  { name: 'Tokyo',         lat: 35.7, lon: 139.7 },
  { name: 'Paris',         lat: 48.9, lon: 2.3 },
  { name: 'Dubai',         lat: 25.3, lon: 55.3 },
  { name: 'Singapore',     lat: 1.3,  lon: 103.8 },
  { name: 'Sydney',        lat: -33.9,lon: 151.2 },
  { name: 'Toronto',       lat: 43.7, lon: -79.4 },
  { name: 'Berlin',        lat: 52.5, lon: 13.4 },
  { name: 'Los Angeles',   lat: 34.1, lon: -118.2 },
  { name: 'San Francisco', lat: 37.8, lon: -122.4 },
  { name: 'Chicago',       lat: 41.9, lon: -87.6 },
  { name: 'Bangkok',       lat: 13.8, lon: 100.5 },
  { name: 'Seoul',         lat: 37.6, lon: 127.0 },
  { name: 'Moscow',        lat: 55.8, lon: 37.6 },
  { name: 'Cairo',         lat: 30.0, lon: 31.2 },
  { name: 'São Paulo',     lat: -23.5,lon: -46.6 },
  { name: 'Istanbul',      lat: 41.0, lon: 29.0 },
  { name: 'Jakarta',       lat: -6.2, lon: 106.8 },
  { name: 'Kathmandu',     lat: 27.7, lon: 85.3 },
];

const DAILY_PARAMS = 'temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,relative_humidity_2m_max,relative_humidity_2m_min,wind_speed_10m_max,apparent_temperature_max,uv_index_max';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function seedCity(city, year) {
  const latF = city.lat.toFixed(1);
  const lonF = city.lon.toFixed(1);
  const latInt = Math.floor(city.lat);
  const lonInt = Math.floor(city.lon);

  const dir = path.join(OUTPUT_DIR, `${latInt}`, `${lonInt}`);
  const file = path.join(dir, `${latF}_${lonF}_${year}.bin`);

  // Skip if already exists
  if (fs.existsSync(file)) {
    console.log(`  [skip] ${city.name} ${year} — already cached`);
    return true;
  }

  const url = `${ARCHIVE_URL}?latitude=${latF}&longitude=${lonF}&start_date=${year}-01-01&end_date=${year}-12-31&daily=${DAILY_PARAMS}&timezone=auto`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);

      if (res.status === 429) {
        console.warn(`  [!] Rate limited. Waiting 60s...`);
        await sleep(60000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data.daily?.time) throw new Error('No daily data');

      const packable = data.daily.time.map((_, i) => ({
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
        precipitation: data.daily.precipitation_sum[i],
        humidity: data.daily.relative_humidity_2m_mean[i],
        humidityMax: data.daily.relative_humidity_2m_max[i],
        humidityMin: data.daily.relative_humidity_2m_min[i],
        windSpeed: data.daily.wind_speed_10m_max[i],
        feelsLike: data.daily.apparent_temperature_max[i],
        uv: data.daily.uv_index_max[i],
      }));

      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, packDailyYear(packable));

      const sizeKB = (fs.statSync(file).size / 1024).toFixed(1);
      console.log(`  [✓] ${city.name} ${year} → ${sizeKB} KB`);
      return true;
    } catch (err) {
      console.error(`  [✗] ${city.name} ${year} attempt ${attempt + 1}: ${err.message}`);
      await sleep(5000);
    }
  }
  return false;
}

async function start() {
  console.log(`\n🌐 AtmoSync City Seeder`);
  console.log(`   ${CITIES.length} cities × ${YEARS.length} years = ${CITIES.length * YEARS.length} files\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const year of YEARS) {
    console.log(`\n━━━ Year ${year} ━━━`);
    for (const city of CITIES) {
      const result = await seedCity(city, year);
      if (result) success++;
      else failed++;

      // Small delay between requests to be nice to the API
      await sleep(1500);
    }
  }

  console.log(`\n━━━ Done ━━━`);
  console.log(`✓ ${success} files created/cached`);
  console.log(`✗ ${failed} failures`);
  console.log(`\nTotal vault size: run 'du -sh v1/' to check`);
  console.log(`Next: git add v1/ && git commit -m "Seed cities" && git push`);
}

start();
