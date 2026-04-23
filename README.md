# 🗄️ AtmoSync Vault

Pre-cached binary weather data for [AtmoSync](https://github.com/ihritikraz/atmosync). Served via GitHub's raw CDN for instant, rate-limit-free historical weather lookups.

## 📊 Coverage

| Region | Cities |
|--------|--------|
| 🇮🇳 India | Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Jaipur, Lucknow, Ranchi, Patna, Bhopal, Chandigarh, Goa, Kochi, Indore, Nagpur, Varanasi, Surat |
| 🌍 International | London, New York, Tokyo, Paris, Dubai, Singapore, Sydney, Toronto, Berlin, Los Angeles, San Francisco, Chicago, Bangkok, Seoul, Moscow, Cairo, São Paulo, Istanbul, Jakarta, Kathmandu |

**Years:** 2023, 2024, 2025  
**Total files:** 120 binary files (~768 KB)

## 📁 Structure

```
v1/
├── {latInt}/
│   └── {lonInt}/
│       └── {lat}_{lon}_{year}.bin   # 6.4 KB per file
```

## 🔧 Binary Format

Each `.bin` file stores 366 days × 9 metrics × 2 bytes = **6,588 bytes**

| Offset | Metric | Scale |
|--------|--------|-------|
| +0 | Temp Max | ×10 |
| +2 | Temp Min | ×10 |
| +4 | Precipitation | ×10 |
| +6 | Humidity Mean | ×10 |
| +8 | Humidity Max | ×10 |
| +10 | Humidity Min | ×10 |
| +12 | Wind Speed | ×10 |
| +14 | Feels Like | ×10 |
| +16 | UV Index | ×10 |

## 🌱 Seeding

```bash
npm install
node seed-cities.js    # Seeds 40 cities × 3 years
```

## 👤 Author

**Hritik Raj** — [AtmoSync](https://github.com/ihritikraz/atmosync)
