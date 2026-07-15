import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Perform a request that will follow the redirect to get the full Google Maps URL
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await res.text();
    const finalUrl = res.url;
    if (!finalUrl) {
      return NextResponse.json({ error: 'Failed to resolve redirect' }, { status: 400 });
    }

    // Parse coordinates and name from the final URL
    let lat = null, lng = null, name = '';

    const m2 = finalUrl.match(/place\/([^/@?]+)/);
    if (m2) {
      name = decodeURIComponent(m2[1].replace(/\+/g, ' ')).replace(/\//g, '').trim();
    }
    
    // Priority 1: !3d / !4d (Exact place coordinates)
    const m5 = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m5) {
      lat = parseFloat(m5[1]);
      lng = parseFloat(m5[2]);
    }
    // Priority 2: q=
    const m3 = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m3 && !lat) {
      lat = parseFloat(m3[1]);
      lng = parseFloat(m3[2]);
    }
    // Priority 3: ll=
    const m4 = finalUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m4 && !lat) {
      lat = parseFloat(m4[1]);
      lng = parseFloat(m4[2]);
    }
    // Priority 4: @ (Viewport map center, lowest priority)
    const m1 = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m1 && !lat) {
      lat = parseFloat(m1[1]);
      lng = parseFloat(m1[2]);
    }

    if (lat && lng) {
      let address = '';
      let category = 'อื่นๆ';
      let icon = '📍';
      let rating = null;
      let photos = [];

      // Extract rating from preview link if available in the redirected page HTML
      try {
        const previewMatch = html.match(/href="(\/maps\/preview\/place\?[^"]*)"/);
        if (previewMatch) {
          const previewPath = previewMatch[1].replace(/&amp;/g, '&');
          const previewUrl = `https://www.google.com${previewPath}`;
          const previewRes = await fetch(previewUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          if (previewRes.ok) {
            const previewText = await previewRes.text();
            const jsonStr = previewText.replace(/^\)]}'\s*/, '');
            const previewData = JSON.parse(jsonStr);
            if (previewData && previewData[6]) {
              if (previewData[6][4]) {
                const rVal = previewData[6][4][7];
                if (typeof rVal === 'number' && rVal >= 1.0 && rVal <= 5.0) {
                  rating = rVal;
                }
              }

              // Recursively extract actual photos uploaded by users or business
              const foundPhotos = [];
              function searchPhotos(obj) {
                if (!obj) return;
                if (typeof obj === 'string') {
                  if (obj.startsWith('https://lh') && obj.includes('googleusercontent.com/')) {
                    if (!obj.includes('photo.jpg') && !obj.includes('/photo.') && !obj.includes('s40-c') && !obj.includes('s44-p')) {
                      foundPhotos.push(obj);
                    }
                  }
                } else if (Array.isArray(obj)) {
                  obj.forEach(item => searchPhotos(item));
                } else if (typeof obj === 'object') {
                  Object.values(obj).forEach(val => searchPhotos(val));
                }
              }
              searchPhotos(previewData[6]);
              photos = Array.from(new Set(foundPhotos)).slice(0, 9);

              // Parse Google Maps tags to categorize place
              const categories = previewData[6][13];
              if (categories && Array.isArray(categories)) {
                const textToSearch = categories.join(' ').toLowerCase();
                if (textToSearch.includes('โรงแรม') || textToSearch.includes('ที่พัก') || textToSearch.includes('hotel') || textToSearch.includes('hostel') || textToSearch.includes('resort') || textToSearch.includes('inn') || textToSearch.includes('accommodation')) {
                  category = 'โรงแรม / ที่พัก';
                  icon = '🏨';
                } else if (textToSearch.includes('วัด') || textToSearch.includes('temple') || textToSearch.includes('shrine') || textToSearch.includes('ศาลเจ้า')) {
                  category = 'วัด';
                  icon = '🛕';
                } else if (textToSearch.includes('วัง') || textToSearch.includes('พระราชวัง') || textToSearch.includes('palace') || textToSearch.includes('castle')) {
                  category = 'พระราชวัง';
                  icon = '🏯';
                } else if (textToSearch.includes('พิพิธภัณฑ์') || textToSearch.includes('museum') || textToSearch.includes('gallery')) {
                  category = 'พิพิธภัณฑ์';
                  icon = '🏛️';
                } else if (textToSearch.includes('อาหาร') || textToSearch.includes('ภัตตาคาร') || textToSearch.includes('restaurant') || textToSearch.includes('yakiniku') || textToSearch.includes('sushi') || textToSearch.includes('ramen') || textToSearch.includes('steak') || textToSearch.includes('กริลล์') || textToSearch.includes('ชาบู') || textToSearch.includes('บุฟเฟต์') || textToSearch.includes('ปิ้งย่าง')) {
                  category = 'ร้านอาหาร';
                  icon = '🍽️';
                } else if (textToSearch.includes('คาเฟ่') || textToSearch.includes('กาแฟ') || textToSearch.includes('cafe') || textToSearch.includes('coffee') || textToSearch.includes('bar') || textToSearch.includes('pub') || textToSearch.includes('น้ำชา') || textToSearch.includes('เบเกอรี่')) {
                  category = 'คาเฟ่';
                  icon = '☕';
                } else if (textToSearch.includes('ห้าง') || textToSearch.includes('department store') || textToSearch.includes('mall') || textToSearch.includes('shopping center')) {
                  category = 'ห้างสรรพสินค้า';
                  icon = '🏢';
                } else if (textToSearch.includes('ตลาด') || textToSearch.includes('market') || textToSearch.includes('bazaar')) {
                  category = 'ตลาด';
                  icon = '🛍️';
                } else if (textToSearch.includes('ช้อปปิ้ง') || textToSearch.includes('ร้าน') || textToSearch.includes('shop') || textToSearch.includes('store') || textToSearch.includes('boutique') || textToSearch.includes('เสื้อผ้า') || textToSearch.includes('ขาย')) {
                  category = 'ช้อปปิ้ง';
                  icon = '🛍️';
                } else if (textToSearch.includes('สวน') || textToSearch.includes('ป่า') || textToSearch.includes('ธรรมชาติ') || textToSearch.includes('park') || textToSearch.includes('garden') || textToSearch.includes('forest') || textToSearch.includes('mountain') || textToSearch.includes('beach') || textToSearch.includes('lake')) {
                  category = 'ธรรมชาติ';
                  icon = '🌳';
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to scrape rating/categories from preview API:", e.message);
      }

      try {
        const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th,en`, {
          headers: {
            'User-Agent': 'TripBuilderMapQueryAgent/1.0'
          }
        });
        if (osmRes.ok) {
          const osmData = await osmRes.json();
          if (osmData.display_name) {
            address = osmData.display_name;
          }

          const osmClass = osmData.class || '';
          const osmType = osmData.type || '';
          const osmName = (osmData.name || '').toLowerCase();

          // Only use OSM fallback if Google Maps category classification yielded 'อื่นๆ'
          if (category === 'อื่นๆ') {
            if (osmClass === 'tourism' && (osmType === 'attraction' || osmType === 'museum' || osmType === 'gallery')) {
              category = 'พิพิธภัณฑ์';
              icon = '🏛️';
            } else if (osmClass === 'amenity' && (osmType === 'place_of_worship' || osmType === 'temple' || osmType === 'church' || osmType === 'shrine')) {
              category = 'วัด';
              icon = '🛕';
            } else if (osmClass === 'historic' && (osmType === 'castle' || osmType === 'palace' || osmType === 'monument')) {
              category = 'พระราชวัง';
              icon = '🏯';
            } else if (osmType === 'mall' || osmType === 'department_store' || osmName.includes('department store') || osmName.includes('mall') || osmName.includes('shopping center')) {
              category = 'ห้างสรรพสินค้า';
              icon = '🏢';
            } else if (osmClass === 'shop' || osmName.includes('uniqlo') || osmName.includes('shopping') || osmName.includes('honten')) {
              category = 'ช้อปปิ้ง';
              icon = '🛍️';
            } else if (osmClass === 'amenity' && (osmType === 'restaurant' || osmType === 'fast_food' || osmType === 'food_court')) {
              category = 'ร้านอาหาร';
              icon = '🍽️';
            } else if (osmClass === 'amenity' && (osmType === 'cafe' || osmType === 'pub' || osmType === 'bar')) {
              category = 'คาเฟ่';
              icon = '☕';
            } else if (osmClass === 'tourism' && (osmType === 'hotel' || osmType === 'hostel' || osmType === 'motel' || osmType === 'apartment' || osmName.includes('hotel') || osmName.includes('hostel') || osmName.includes('resort') || osmName.includes('inn'))) {
              category = 'โรงแรม / ที่พัก';
              icon = '🏨';
            } else if (osmClass === 'natural' || (osmClass === 'landuse' && (osmType === 'forest' || osmType === 'grass' || osmType === 'meadow' || osmType === 'recreation_ground' || osmType === 'park'))) {
              category = 'ธรรมชาติ';
              icon = '🌳';
            } else if (osmClass === 'place' || osmClass === 'highway' || osmType === 'suburb' || osmType === 'neighborhood') {
              category = 'ย่าน';
              icon = '🏡';
            }
          }
        }
      } catch (e) {
        console.error("OSM reverse geocoding failed:", e);
      }

      // Fetch hotlink-safe photos from DuckDuckGo
      let ddgPhotos = [];
      try {
        ddgPhotos = await fetchFallbackPhotos(name);
      } catch (err) {
        console.warn("Failed to fetch fallback photos from DDG:", err.message);
      }

      // Filter out Google CDN URLs which return 429 in the browser, and merge with DDG photos
      const cleanPhotos = [
        ...(ddgPhotos || []),
        ...(photos || []).filter(p => typeof p === 'string' && !p.includes('googleusercontent.com'))
      ];
      photos = cleanPhotos.slice(0, 12);

      return NextResponse.json({ name, lat, lng, address, category, icon, finalUrl, rating, photos });
    }

    return NextResponse.json({ error: 'Could not parse coordinates from resolved URL', resolvedUrl: finalUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function getVqd(query) {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const match = html.match(/vqd=([^&'"]+)/);
    if (match) return match[1];
    const match2 = html.match(/vqd\s*:\s*["']([^"']+)["']/);
    if (match2) return match2[1];
    const match3 = html.match(/vqd\s*=\s*["']([^"']+)["']/);
    if (match3) return match3[1];
  } catch (e) {
    console.warn('Error fetching vqd from DDG:', e.message);
  }
  return null;
}

async function fetchFallbackPhotos(query) {
  if (!query) return [];
  const vqd = await getVqd(query);
  if (!vqd) return [];
  
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://duckduckgo.com/'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        return data.results.slice(0, 8).map(r => r.image).filter(img => typeof img === 'string' && img.startsWith('http'));
      }
    }
  } catch (e) {
    console.warn('Error fetching photos from DDG:', e.message);
  }
  return [];
}
