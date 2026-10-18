import { NextResponse } from 'next/server';

function classifyCategory(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('โรงแรม') || t.includes('ที่พัก') || t.includes('hotel') || t.includes('hostel') || t.includes('resort') || t.includes('inn') || t.includes('lodging') || t.includes('accommodation')) {
    return { category: 'โรงแรม / ที่พัก', icon: '🏨' };
  }
  if (t.includes('วัด') || t.includes('temple') || t.includes('shrine') || t.includes('ศาลเจ้า')) {
    return { category: 'วัด', icon: '🛕' };
  }
  if (t.includes('วัง') || t.includes('พระราชวัง') || t.includes('palace') || t.includes('castle')) {
    return { category: 'พระราชวัง', icon: '🏯' };
  }
  if (t.includes('พิพิธภัณฑ์') || t.includes('museum') || t.includes('gallery') || t.includes('art') || t.includes('หอศิลป์')) {
    return { category: 'พิพิธภัณฑ์', icon: '🏛️' };
  }
  if (t.includes('อาหาร') || t.includes('ภัตตาคาร') || t.includes('restaurant') || t.includes('yakiniku') || t.includes('sushi') || t.includes('ramen') || t.includes('steak') || t.includes('food') || t.includes('กริลล์') || t.includes('ชาบู') || t.includes('บุฟเฟต์') || t.includes('ปิ้งย่าง') || t.includes('bbq') || t.includes('izakaya') || t.includes('saizeriya') || t.includes('royal host') || t.includes('gusto') || t.includes('bamiyan') || t.includes('diner') || t.includes('kitchen') || t.includes('bistro') || t.includes('pasta') || t.includes('pizza') || t.includes('curry') || t.includes('soba') || t.includes('udon') || t.includes('tonkatsu') || t.includes('dining')) {
    return { category: 'ร้านอาหาร', icon: '🍽️' };
  }
  if (t.includes('คาเฟ่') || t.includes('กาแฟ') || t.includes('cafe') || t.includes('coffee') || t.includes('bar') || t.includes('pub') || t.includes('tea') || t.includes('น้ำชา') || t.includes('เบเกอรี่') || t.includes('bakery') || t.includes('crepe') || t.includes('crepes') || t.includes('dessert') || t.includes('sweets') || t.includes('drive-in') || t.includes('drive in') || t.includes('pancake')) {
    return { category: 'คาเฟ่', icon: '☕' };
  }
  if (t.includes('ห้าง') || t.includes('department store') || t.includes('mall') || t.includes('shopping center') || t.includes('shopping mall')) {
    return { category: 'ห้างสรรพสินค้า', icon: '🏢' };
  }
  if (t.includes('ตลาด') || t.includes('market') || t.includes('bazaar') || t.includes('night market') || t.includes('street food')) {
    return { category: 'ตลาด', icon: '🛍️' };
  }
  if (t.includes('ช้อปปิ้ง') || t.includes('ร้าน') || t.includes('shop') || t.includes('store') || t.includes('boutique') || t.includes('outlet') || t.includes('shopping') || t.includes('cas:pace') || t.includes('caspace') || t.includes('refa') || t.includes('beauty') || t.includes('cosmetics') || t.includes('fashion') || t.includes('shoes') || t.includes('sneaker') || t.includes('apparel') || t.includes('camera') || t.includes('drug') || t.includes('drugstore')) {
    return { category: 'ช้อปปิ้ง', icon: '🛍️' };
  }
  if (t.includes('สวน') || t.includes('ป่า') || t.includes('ธรรมชาติ') || t.includes('park') || t.includes('garden') || t.includes('forest') || t.includes('mountain') || t.includes('beach') || t.includes('lake') || t.includes('waterfall') || t.includes('view') || t.includes('sky')) {
    return { category: 'ธรรมชาติ', icon: '🌳' };
  }
  return { category: 'อื่นๆ', icon: '📍' };
}

async function resolvePlacelist(html, finalUrl) {
  const preloadMatch = html.match(/href="(\/maps\/preview\/entitylist\/getlist\?[^"]+)"/);
  if (!preloadMatch) return null;

  const preloadUrl = `https://www.google.com${preloadMatch[1].replace(/&amp;/g, '&')}`;
  const entityRes = await fetch(preloadUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.google.com/maps/'
    }
  });

  if (!entityRes.ok) return null;
  const entityText = await entityRes.text();
  const jsonStr = entityText.replace(/^\)]}'\s*/, '');
  const data = JSON.parse(jsonStr);

  const listTitle = data[0]?.[4] || 'Google Maps Saved List';
  const listIcon = data[0]?.[14] || '📍';

  let rawPlaces = null;
  function searchPlaces(obj) {
    if (!obj || rawPlaces) return;
    if (Array.isArray(obj)) {
      if (obj.length > 5 && obj.every(it => Array.isArray(it) && typeof it[2] === 'string')) {
        rawPlaces = obj;
        return;
      }
      for (const item of obj) searchPlaces(item);
    }
  }
  searchPlaces(data);

  if (!rawPlaces || rawPlaces.length === 0) return null;

  const places = [];
  for (let i = 0; i < rawPlaces.length; i++) {
    const item = rawPlaces[i];
    const name = item[2] || '';
    const note = item[3] || '';
    let address = '';
    let lat = null;
    let lng = null;

    if (Array.isArray(item[1])) {
      address = item[1][4] || item[1][2] || '';
      if (Array.isArray(item[1][5]) && item[1][5].length >= 4) {
        lat = item[1][5][2];
        lng = item[1][5][3];
      }
    }

    if (name && lat && lng) {
      const { category, icon } = classifyCategory(`${name} ${note} ${address}`);
      
      // Search for place photos embedded inside item
      const foundPhotos = [];
      function searchPhotosInItem(obj) {
        if (!obj) return;
        if (typeof obj === 'string') {
          if (
            (obj.startsWith('https://lh') || obj.startsWith('http://lh') || obj.includes('googleusercontent.com') || obj.includes('ggpht.com')) &&
            !obj.includes('s40-c') && !obj.includes('s44-p') && !obj.includes('photo.jpg') && !obj.includes('/photo.')
          ) {
            let cleanUrl = obj;
            if (cleanUrl.includes('=')) {
              cleanUrl = cleanUrl.replace(/=[wshedcptb0-9-]+$/i, '=w800-h500-k-no');
            } else {
              cleanUrl = cleanUrl + '=w800-h500-k-no';
            }
            foundPhotos.push(cleanUrl);
          }
        } else if (Array.isArray(obj)) {
          obj.forEach(searchPhotosInItem);
        } else if (typeof obj === 'object') {
          Object.values(obj).forEach(searchPhotosInItem);
        }
      }
      searchPhotosInItem(item);
      const photos = Array.from(new Set(foundPhotos)).slice(0, 6);
      const cover_image = photos[0] || null;

      places.push({
        name,
        lat,
        lng,
        address,
        note,
        category,
        icon,
        rating: null,
        photos,
        cover_image
      });
    }
  }

  return {
    isList: true,
    listTitle,
    listIcon,
    count: places.length,
    places
  };
}

async function resolveSingleUrl(targetUrl) {
  const res = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const html = await res.text();
  const finalUrl = res.url;
  if (!finalUrl) {
    return { error: 'Failed to resolve redirect' };
  }

  // Check if it's a shared placelist
  if (html.includes('/maps/preview/entitylist/getlist') || finalUrl.includes('/placelists/list/') || finalUrl.includes('!11m1!2s') || finalUrl.includes('!11m2!2s')) {
    const listResult = await resolvePlacelist(html, finalUrl);
    if (listResult) return listResult;
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
    let { category, icon } = classifyCategory(name);
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

            const categories = previewData[6][13];
            if (categories && Array.isArray(categories)) {
              const classified = classifyCategory(categories.join(' '));
              if (classified.category !== 'อื่นๆ') {
                category = classified.category;
                icon = classified.icon;
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
      }
    } catch (e) {
      console.error("OSM reverse geocoding failed:", e);
    }

    let ddgPhotos = [];
    try {
      ddgPhotos = await fetchFallbackPhotos(name);
    } catch (err) {
      console.warn("Failed to fetch fallback photos from DDG:", err.message);
    }

    const cleanPhotos = [
      ...(ddgPhotos || []),
      ...(photos || []).filter(p => typeof p === 'string' && !p.includes('googleusercontent.com'))
    ];
    photos = cleanPhotos.slice(0, 12);

    return {
      isList: false,
      name,
      lat,
      lng,
      address,
      category,
      icon,
      finalUrl,
      rating,
      photos
    };
  }

  return { error: 'Could not parse coordinates from resolved URL', resolvedUrl: finalUrl };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rawInput = body.url || (Array.isArray(body.urls) ? body.urls.join('\n') : '');
    if (!rawInput || typeof rawInput !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract all URLs from the input text
    const extractedUrls = rawInput.match(/https?:\/\/[^\s"'<>\(\)]+/g) || [];
    if (extractedUrls.length === 0) {
      return NextResponse.json({ error: 'No valid URL found in input' }, { status: 400 });
    }

    // Case 1: Exactly 1 URL provided
    if (extractedUrls.length === 1) {
      const singleRes = await resolveSingleUrl(extractedUrls[0]);
      if (singleRes.error) {
        return NextResponse.json(singleRes, { status: 400 });
      }
      return NextResponse.json(singleRes);
    }

    // Case 2: Multiple URLs provided (Bulk import)
    const uniqueUrls = Array.from(new Set(extractedUrls)).slice(0, 50); // Cap at 50 URLs
    const resolvedPlaces = [];

    for (const u of uniqueUrls) {
      try {
        const res = await resolveSingleUrl(u);
        if (res && !res.error) {
          if (res.isList && Array.isArray(res.places)) {
            resolvedPlaces.push(...res.places);
          } else if (res.lat && res.lng) {
            resolvedPlaces.push(res);
          }
        }
      } catch (err) {
        console.warn(`Failed to resolve bulk URL ${u}:`, err.message);
      }
    }

    if (resolvedPlaces.length === 0) {
      return NextResponse.json({ error: 'Could not resolve any places from provided URLs' }, { status: 400 });
    }

    return NextResponse.json({
      isList: true,
      isMultiUrl: true,
      listTitle: 'สถานที่นำเข้าพร้อมกัน',
      listIcon: '📍',
      count: resolvedPlaces.length,
      places: resolvedPlaces
    });
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
