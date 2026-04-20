const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const pLimit = require('p-limit');
const { packDailyYear } = require('./packer');

/**
 * AtmoSync Super Seeder (Cloud Edition)
 */

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const OUTPUT_DIR = path.resolve(__dirname, 'v1');
const BATCH_SIZE = 200; // 200 is safer for URI length limits

// Priority Regions
const REGIONS = [
  { name: 'India', lat: [8, 38], lon: [68, 98] }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function seedBatch(coords, year) {
  const lats = coords.map(c => c.lat).join(',');
  const lons = coords.map(c => c.lon).join(',');
  
  const dailyParams = 'temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,relative_humidity_2m_max,relative_humidity_2m_min,wind_speed_10m_max,apparent_temperature_max,uv_index_max';
  const url = `${ARCHIVE_URL}?latitude=${lats}&longitude=${lons}&start_date=${year}-01-01&end_date=${year}-12-31&daily=${dailyParams}&timezone=auto`;

  console.log(`[YEAR ${year}] Fetching batch of ${coords.length}...`);

  while (true) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn('Rate limit hit! Sleeping for 60 seconds...');
        await sleep(60000);
        continue;
      }
      if (!res.ok) throw new Error(`API: ${res.status}`);
      
      const data = await res.json();
      const results = Array.isArray(data) ? data : [data];
      
      results.forEach((loc, idx) => {
        const c = coords[idx];
        const latInt = Math.floor(c.lat);
        const lonInt = Math.floor(c.lon);
        
        const dir = path.join(OUTPUT_DIR, `${latInt}`, `${lonInt}`);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        const file = path.join(dir, `${c.lat}_${c.lon}_${year}.bin`);
        
        const packable = loc.daily.time.map((_, i) => ({
          tempMax: loc.daily.temperature_2m_max[i],
          tempMin: loc.daily.temperature_2m_min[i],
          precipitation: loc.daily.precipitation_sum[i],
          humidity: loc.daily.relative_humidity_2m_mean[i],
          humidityMax: loc.daily.relative_humidity_2m_max[i],
          humidityMin: loc.daily.relative_humidity_2m_min[i],
          windSpeed: loc.daily.wind_speed_10m_max[i],
          feelsLike: loc.daily.apparent_temperature_max[i],
          uv: loc.daily.uv_index_max[i],
        }));

        fs.writeFileSync(file, packDailyYear(packable));
      });
      break; 
    } catch (err) {
      console.error('Batch failed:', err.message);
      await sleep(5000); 
    }
  }
}

async function start() {
  const years = [2023, 2024, 2025];
  const region = REGIONS[0];
  
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const year of years) {
    let batch = [];
    for (let lat = region.lat[0]; lat <= region.lat[1]; lat += 0.1) {
      for (let lon = region.lon[0]; lon <= region.lon[1]; lon += 0.1) {
        batch.push({ lat: parseFloat(lat.toFixed(1)), lon: parseFloat(lon.toFixed(1)) });
        if (batch.length >= BATCH_SIZE) {
          await seedBatch(batch, year);
          batch = [];
        }
      }
    }
    if (batch.length > 0) await seedBatch(batch, year);
  }
}

start();
