import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple helper to get mock attractions in case AI API key is not set
const getMockPlaces = (cityId) => {
  const mockDatabase = {
    bkk: [
      { name: 'วัดพระแก้ว (Wat Phra Kaew)', cat: 'วัด', dur: 120, icon: '🛕', desc: 'วัดคู่บ้านคู่เมืองของไทย', addr: 'Na Phra Lan Rd, Bangkok', lat: 13.7516, lng: 100.4927 },
      { name: 'พระบรมมหาราชวัง (Grand Palace)', cat: 'พระราชวัง', dur: 120, icon: '🏰', desc: 'พระบรมมหาราชวังอันวิจิตร', addr: 'Na Phra Lan Rd, Bangkok', lat: 13.7500, lng: 100.4913 },
      { name: 'วัดโพธิ์ (Wat Pho)', cat: 'วัด', dur: 90, icon: '🛕', desc: 'วิหารพระพุทธไสยาสน์และนวดแผนไทย', addr: 'Sanam Chai Rd, Bangkok', lat: 13.7465, lng: 100.4933 },
      { name: 'วัดอรุณฯ (Wat Arun)', cat: 'วัด', dur: 90, icon: '🛕', desc: 'พระปรางค์วัดอรุณอันงดงามริมแม่น้ำเจ้าพระยา', addr: 'Wang Doem Rd, Bangkok', lat: 13.7437, lng: 100.4889 },
      { name: 'ตลาดนัดจตุจักร (Chatuchak Market)', cat: 'ช้อปปิ้ง', dur: 180, icon: '🛍', desc: 'ตลาดนัดสุดสัปดาห์ที่ใหญ่ที่สุด', addr: 'Kamphaeng Phet 2 Rd, Bangkok', lat: 13.7999, lng: 100.5508 },
      { name: 'จ๊อดแฟร์ (Jodd Fairs)', cat: 'ตลาด', dur: 120, icon: '🍜', desc: 'ตลาดนัดกลางคืนยอดนิยม แหล่งรวมสตรีทฟู้ด', addr: 'Rama IX Rd, Bangkok', lat: 13.7570, lng: 100.5661 },
      { name: 'เยาวราช (Chinatown BKK)', cat: 'ร้านอาหาร', dur: 120, icon: '🏮', desc: 'ถนนสายสตรีทฟู้ดชื่อดังระดับโลก', addr: 'Yaowarat Rd, Bangkok', lat: 13.7412, lng: 100.5083 },
      { name: 'สยามพารากอน (Siam Paragon)', cat: 'ช้อปปิ้ง', dur: 150, icon: '🛍', desc: 'ห้างสรรพสินค้าลักชูรีใจกลางเมือง', addr: 'Rama I Rd, Bangkok', lat: 13.7461, lng: 100.5348 }
    ],
    sel: [
      { name: 'Gyeongbokgung Palace', cat: 'พระราชวัง', dur: 120, icon: '🏯', desc: 'The largest and main royal palace of the Joseon dynasty.', addr: '161 Sajik-ro, Jongno-gu, Seoul', lat: 37.5796, lng: 126.9770 },
      { name: 'Bukchon Hanok Village', cat: 'ย่าน', dur: 90, icon: '🏡', desc: 'Traditional Korean village with historic alleys.', addr: 'Gyeedong-gil, Jongno-gu, Seoul', lat: 37.5826, lng: 126.9836 },
      { name: 'N Seoul Tower', cat: 'วิวทิวทัศน์', dur: 120, icon: '🗼', desc: 'Iconic tower offering panoramic views of the city.', addr: '105 Namsangongwon-gil, Yongsan-gu, Seoul', lat: 37.5512, lng: 126.9882 },
      { name: 'Myeongdong Shopping Street', cat: 'ช้อปปิ้ง', dur: 150, icon: '🛍', desc: 'Seoul\'s premier shopping district with street food.', addr: 'Myeongdong-gil, Jung-gu, Seoul', lat: 37.5635, lng: 126.9846 },
      { name: 'Dongdaemun Design Plaza (DDP)', cat: 'ธรรมชาติ', dur: 90, icon: '🛸', desc: 'Futuristic architectural landmark designed by Zaha Hadid.', addr: '281 Eulji-ro, Jung-gu, Seoul', lat: 37.5668, lng: 127.0094 },
      { name: 'Cheonggyecheon Stream', cat: 'ธรรมชาติ', dur: 60, icon: '🌿', desc: 'Modern public recreation space in downtown Seoul.', addr: 'Taepyeongno 1-ga, Jung-gu, Seoul', lat: 37.5693, lng: 126.9787 }
    ],
    tky: [
      { name: 'Senso-ji Temple', cat: 'วัด', dur: 90, icon: '⛩', desc: 'Tokyo\'s oldest and most significant Buddhist temple.', addr: '2-3-1 Asakusa, Taito, Tokyo', lat: 35.7148, lng: 139.7967 },
      { name: 'Meiji Jingu Shrine', cat: 'วัด', dur: 90, icon: '⛩', desc: 'Serene Shinto shrine surrounded by a dense forest.', addr: '1-1 Yoyogikamizonocho, Shibuya, Tokyo', lat: 35.6764, lng: 139.6993 },
      { name: 'Shibuya Crossing', cat: 'ย่าน', dur: 60, icon: '🚦', desc: 'The world\'s busiest pedestrian intersection.', addr: 'Dogenzaka, Shibuya, Tokyo', lat: 35.6580, lng: 139.7016 },
      { name: 'Tokyo Tower', cat: 'วิวทิวทัศน์', dur: 90, icon: '🗼', desc: 'Eiffel Tower-inspired communication and observation tower.', addr: '4-2-8 Shibakoen, Minato, Tokyo', lat: 35.6586, lng: 139.7454 },
      { name: 'Harajuku Takeshita Street', cat: 'ช้อปปิ้ง', dur: 120, icon: '🛍', desc: 'Center of Japanese youth culture and quirky fashion.', addr: '1-19 Jingumae, Shibuya, Tokyo', lat: 35.6702, lng: 139.7042 }
    ]
  };
  return mockDatabase[cityId] || mockDatabase['bkk'];
};

export async function POST(req) {
  try {
    const { hotel, city_id, country_id, start_date, num_days, interests } = await req.json();

    // Setup fallback mock plan
    const generateMockPlan = () => {
      const placesPool = getMockPlaces(city_id);
      const itin = {};
      let mockPlaceIdx = 0;
      
      for (let day = 1; day <= num_days; day++) {
        itin[day] = [];
        // Add 2-3 places per day
        const placesCount = Math.min(3, placesPool.length);
        for (let i = 0; i < placesCount; i++) {
          const basePlace = placesPool[mockPlaceIdx % placesPool.length];
          itin[day].push({
            id: 99000 + day * 10 + i,
            name: `${basePlace.name} (Mock Day ${day})`,
            cat: basePlace.cat,
            dur: basePlace.dur,
            icon: basePlace.icon,
            desc: basePlace.desc,
            addr: basePlace.addr,
            lat: basePlace.lat,
            lng: basePlace.lng,
            fee: 'Mock Fee',
            transport: 'เดินทางด้วยรถไฟฟ้า/รถยนต์'
          });
          mockPlaceIdx++;
        }
      }
      return { itin };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured. Returning mock plan.");
      return new Response(JSON.stringify(generateMockPlan()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Call Gemini API
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a professional travel planner. Create a day-by-day travel itinerary for ${num_days} days.
Starting Hotel: ${hotel}
City: ${city_id}
Country: ${country_id}
Interests: ${interests ? interests.join(', ') : 'any'}
Start Date: ${start_date || 'today'}

Generate a structured itinerary day-by-day. For each day, include 2 to 4 recommended attractions. The places should be sorted logically by distance from the hotel and each other (geographical flow).
Return the result strictly as a JSON object matching this schema:
{
  "itin": {
    "1": [
      {
        "id": number (starting from 95000),
        "name": "Name of Place",
        "cat": "Category (e.g., วัด, พระราชวัง, ช้อปปิ้ง, คาเฟ่, ธรรมชาติ, ร้านอาหาร)",
        "dur": number (duration in minutes, e.g. 90, 120),
        "icon": "appropriate emoji, e.g. ⛩, 🛍",
        "desc": "Short description of what to do there in Thai",
        "addr": "Address",
        "lat": number (approximate latitude, must be correct for the city),
        "lng": number (approximate longitude, must be correct for the city),
        "fee": "admission fee details, e.g., ฟรี or amount in local currency",
        "transport": "getting there info, e.g., Metro Line 1"
      }
    ],
    "2": [ ... ]
  }
}
Format all descriptions, category names, and transport notes in Thai language.
Return ONLY valid JSON. No markdown backticks, no wrap text.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    let jsonText = result.response.text().trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    }
    const parsedData = JSON.parse(jsonText);

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error in ai-plan:', error);
    return new Response(JSON.stringify(generateMockPlan()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
