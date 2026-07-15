import { GoogleGenerativeAI } from '@google/generative-ai';

const getMockPlaces = (query) => {
  const allMockPlaces = [
    { name: 'วัดพระแก้ว (Wat Phra Kaew)', cat: 'วัด', dur: 120, icon: '🛕', desc: 'วัดคู่บ้านคู่เมืองของไทย ตั้งอยู่บริเวณเกาะรัตนโกสินทร์', addr: 'Na Phra Lan Rd, Phra Nakhon, Bangkok', lat: 13.7516, lng: 100.4927, fee: 'คนไทยเข้าฟรี / ต่างชาติ 500 บาท', transport: 'MRT สนามไชย หรือ เรือด่วนเจ้าพระยา' },
    { name: 'พระบรมมหาราชวัง (Grand Palace)', cat: 'พระราชวัง', dur: 120, icon: '🏰', desc: 'พระบรมมหาราชวังที่วิจิตรงดงาม สะท้อนสถาปัตยกรรมไทยอันรุ่งเรือง', addr: 'Na Phra Lan Rd, Phra Nakhon, Bangkok', lat: 13.7500, lng: 100.4913, fee: 'คนไทยเข้าฟรี / ต่างชาติ 500 บาท', transport: 'MRT สนามไชย หรือ เรือด่วนเจ้าพระยา' },
    { name: 'วัดอรุณราชวราราม (Wat Arun)', cat: 'วัด', dur: 90, icon: '🛕', desc: 'วัดสวยงามที่มีพระปรางค์สูงเด่นสง่าริมแม่น้ำเจ้าพระยา', addr: 'Wang Doem Rd, Bangkok', lat: 13.7437, lng: 100.4889, fee: 'คนไทยฟรี / ต่างชาติ 100 บาท', transport: 'เรือข้ามฟากจากท่าเตียน' },
    { name: 'ตลาดนัดจตุจักร (Chatuchak Market)', cat: 'ช้อปปิ้ง', dur: 180, icon: '🛍', desc: 'ตลาดนัดวันหยุดที่ใหญ่ที่สุดในโลก แหล่งช้อปยอดนิยม', addr: 'Kamphaeng Phet 2 Rd, Bangkok', lat: 13.7999, lng: 100.5508, fee: 'เข้าฟรี', transport: 'BTS หมอชิต / MRT สวนจตุจักร' },
    { name: 'เยาวราช (Chinatown)', cat: 'ร้านอาหาร', dur: 120, icon: '🍜', desc: 'สวรรค์ของคนรักสตรีทฟู้ด แหล่งร้านอร่อยยามค่ำคืน', addr: 'Yaowarat Rd, Samphanthawong, Bangkok', lat: 13.7412, lng: 100.5083, fee: 'ฟรี', transport: 'MRT วัดมังกร' },
    { name: 'สยามพารากอน (Siam Paragon)', cat: 'ช้อปปิ้ง', dur: 150, icon: '🛍', desc: 'ห้างสรรพสินค้ายอดนิยมใจกลางเมือง รวบรวมแบรนด์หรู', addr: 'Rama I Rd, Pathum Wan, Bangkok', lat: 13.7461, lng: 100.5348, fee: 'ฟรี', transport: 'BTS สยาม' },
    { name: 'Myeongdong Street', cat: 'ช้อปปิ้ง', dur: 120, icon: '💄', desc: 'Shopping haven for cosmetics, fashion, and delicious Korean street foods.', addr: 'Myeongdong, Jung-gu, Seoul', lat: 37.5635, lng: 126.9846, fee: 'Free', transport: 'Subway Line 4 Myeongdong Exit 6' },
    { name: 'Gyeongbokgung Palace', cat: 'พระราชวัง', dur: 120, icon: '🏯', desc: 'The historic and largest royal palace of Joseon Dynasty, beauty at its best.', addr: 'Jongno-gu, Seoul', lat: 37.5796, lng: 126.9770, fee: '₩3,000 / Free in Hanbok', transport: 'Subway Line 3 Gyeongbokgung Exit 5' },
    { name: 'Bukchon Hanok Village', cat: 'ย่าน', dur: 90, icon: '🏡', desc: 'Charming neighborhood with preserved traditional houses dating back 600 years.', addr: 'Jongno-gu, Seoul', lat: 37.5826, lng: 126.9836, fee: 'Free', transport: 'Subway Line 3 Anguk Exit 2' }
  ];

  const q = query.toLowerCase();
  return allMockPlaces.filter(p => 
    p.name.toLowerCase().includes(q) || 
    p.cat.toLowerCase().includes(q) || 
    p.desc.toLowerCase().includes(q)
  ).slice(0, 5);
};

export async function POST(req) {
  let query = '';
  try {
    const body = await req.json();
    query = body.query || '';
  } catch (e) {
    // ignore parse error
  }

  const generateMockResponse = () => {
    const places = getMockPlaces(query);
    if (places.length === 0) {
      // Return custom placeholder if nothing matched
      return {
        places: [
          {
            name: query || 'สถานที่ตามใจชอบ',
            cat: 'อื่นๆ',
            dur: 90,
            icon: '📍',
            desc: 'สถานที่จำลองสำหรับทดสอบระบบ (กรุณาตั้งค่า API Key เพื่อใช้ AI จริง)',
            addr: 'รายละเอียดที่อยู่จำลอง',
            lat: 13.7563,
            lng: 100.5018,
            fee: 'ฟรี',
            transport: 'ขนส่งสาธารณะ'
          }
        ]
      };
    }
    return { places };
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured. Returning mock suggestion.");
      return new Response(JSON.stringify(generateMockResponse()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `You are a helpful travel assistant.
The user is asking: "${query}"
Suggest up to 4 real attractions/places that match this search. For each place, provide its name, category, ideal duration (in minutes), emoji icon, a brief description, its exact address, approximate GPS coordinates (latitude and longitude), typical admission fee, and transport instructions.
Return the result strictly as a JSON object matching this schema:
{
  "places": [
    {
      "name": "Name of Place",
      "cat": "Category (e.g. วัด, พระราชวัง, ช้อปปิ้ง, คาเฟ่, ธรรมชาติ, ร้านอาหาร)",
      "dur": number (minutes, e.g. 90, 120),
      "icon": "emoji icon",
      "desc": "Brief description in Thai",
      "addr": "Address of the place",
      "lat": number (exact latitude),
      "lng": number (exact longitude),
      "fee": "fee details in Thai",
      "transport": "how to get there in Thai"
    }
  ]
}
Format all description and instruction fields in Thai language.
Return ONLY valid JSON. No markdown wrappers.`;

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
    console.error('API Error in ai-suggest:', error);
    return new Response(JSON.stringify(generateMockResponse()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
