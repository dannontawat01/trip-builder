'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── TRANSLATIONS ───────────────────────────────────────────────────
const LANG_STRINGS = {
  th: {
    places: 'สถานที่ท่องเที่ยว', search: 'ค้นหา...', addManual: 'กรอกเอง', addAI: 'AI เพิ่ม', addGmaps: 'Google Maps',
    itinerary: 'แผนการเดินทาง', clear: 'ล้าง', export: 'ส่งออก / แชร์',
    startDate: 'วันเดินทาง', endDate: 'วันกลับ', departTime: 'เวลาออก', hotel: 'ที่พัก / โรงแรม', hotelPh: 'เช่น Myeongdong, Seoul',
    numDays: 'จำนวนวัน', aiPlanBtn: 'ให้ AI สร้างแผนการเดินทาง',
    statPlaces: 'สถานที่', statHours: 'เวลารวม', statDays: 'วัน', statCities: 'เมือง',
    nearby: 'แนะนำใกล้เคียง', nearbyEmpty: 'เพิ่มสถานที่ในแผนก่อน\nเราจะแนะนำที่ใกล้เคียงให้',
    mobPlan: 'แผน', mobPlaces: 'สถานที่', mobNearby: 'แนะนำ', mobExport: 'ส่งออก',
    close: 'ปิด', cancel: 'ยกเลิก', save: 'บันทึกสถานที่', addToDay: 'เพิ่มเข้าวัน:',
    addNew: 'เพิ่มสถานที่ใหม่', tabManual: '✏️ กรอกเอง', tabAI: '🤖 AI แนะนำ', tabGmaps: '📍 Google Maps',
    osmSearch: '🔍 ค้นหาสถานที่ (OpenStreetMap)', osmBtn: 'ค้นหา GPS', osmPh: 'พิมพ์ชื่อสถานที่ เช่น Gyeongbokgung Palace Seoul',
    fName: 'ชื่อสถานที่ *', fDesc: 'รายละเอียด', fCat: 'หมวดหมู่', fDur: 'ระยะเวลา (นาที)',
    fAddr: 'ที่อยู่', fFee: 'ค่าเข้าชม', fTransport: 'วิธีเดินทาง', fIcon: 'ไอคอน Emoji', fCity: 'เมือง',
    fImg: 'รูปภาพสถานที่', fImgOpt: '(ไม่บังคับ)', fImgPh: 'แตะเพื่ออัพโหลดรูป (JPG, PNG, WEBP)',
    aiModalTitle: '✦ ให้ AI สร้างแผนการเดินทาง', aiModalSub: 'บอก AI ว่าอยากไปไหน แล้วจะจัดแผนให้เลย',
    aiInfo: 'AI จะดึงสถานที่จากฐานข้อมูลที่มี และจัดให้เหมาะกับจำนวนวัน โดยเรียงตาม GPS ใกล้ที่พัก',
    aiHotel: 'ที่พัก / โรงแรม', aiHotelSub: '(ใช้เป็นจุดเริ่มต้น)', aiHotelPh: 'เช่น Myeongdong, Seoul หรือ ถนนนิมมาน เชียงใหม่',
    aiInterests: 'ความสนใจ', aiInterestsSub: '(เลือกได้หลายอย่าง)', aiGenerate: 'สร้างแผนการเดินทาง',
    iFood: '🍜 อาหาร', iShop: '🛍 ช้อปปิ้ง', iTemple: '🛕 วัด/ประวัติศาสตร์', iNature: '🌿 ธรรมชาติ',
    iArt: '🎨 ศิลปะ/วัฒนธรรม', iPhoto: '📸 ถ่ายรูป', iCafe: '☕ คาเฟ่', iBeach: '🏖 ชายหาด',
    exportTitle: 'ส่งออกแผนการเดินทาง', exportFmt: 'เลือกรูปแบบ PDF', exportPreview: 'Preview ข้อความ',
    exportShare: '🔗 Share Link', exportShareNote: 'ลิงก์นี้มีข้อมูลแผนทั้งหมดฝังอยู่ แชร์ให้เพื่อนเปิดได้ทันทีในเว็บเดียวกัน',
    copyText: 'คัดลอกข้อความ', downloadPDF: '⬇ ดาวน์โหลด PDF', creating: 'กำลังสร้างลิงก์...',
    pdfBeautiful: 'สีสัน layout จัดเต็ม', pdfClean: 'เรียบ พิมพ์ง่าย', pdfTimeline: 'เส้นเวลา day-by-day',
    gmapsHow: 'วิธีคัดลอก URL จาก Google Maps:', gmaps1: 'เปิด Google Maps แล้วค้นหาสถานที่',
    gmaps2: 'กด Share (แชร์) → Copy link', gmaps3: 'วางลิงก์ที่นี่', gmapsFormats: 'รูปแบบที่รองรับ:',
    detailAddr: 'ที่อยู่', detailGPS: 'พิกัด GPS', detailFee: 'ค่าเข้าชม', detailTransport: 'วิธีเดินทาง',
    copyGPS: 'คัดลอก', openMaps: 'เปิด Maps ↗', alreadyAdded: '✅ เพิ่มในแผนแล้ว', addInDay: '+ เพิ่มในแผน',
    dayLabel: 'วันที่', dragHere: 'ลากสถานที่มาวางที่นี่',
    nearbyFrom: 'แนะนำจาก', nearbySort: 'เรียงตาม GPS + ประเภท + เมือง', noNearby: 'ไม่พบสถานที่ใกล้เคียง',
    scoreTotal: 'คะแนนรวม', reasonWalk: 'เดินถึงกันได้', reasonNear: 'ใกล้กัน ขนส่งสะดวก',
    reasonCat: 'ประเภทเดียวกัน', reasonCity: 'เมืองเดียวกัน', reasonRoute: 'แนะนำในเส้นทาง',
    addBtn: '+ เพิ่มวันที่', addedBtn: 'เพิ่มแล้ว', gmapsPullBtn: 'ดึงข้อมูล',
  },
  en: {
    places: 'Attractions', search: 'Search...', addManual: 'Manual', addAI: 'AI Add', addGmaps: 'Google Maps',
    itinerary: 'Itinerary', clear: 'Clear', export: 'Export / Share',
    startDate: 'Start Date', endDate: 'End Date', departTime: 'Depart', hotel: 'Hotel / Base', hotelPh: 'e.g. Myeongdong, Seoul',
    numDays: 'Days', aiPlanBtn: '✦ AI Build Itinerary',
    statPlaces: 'Places', statHours: 'Total Time', statDays: 'Days', statCities: 'Cities',
    nearby: 'Nearby Suggestions', nearbyEmpty: 'Add places to your plan\nand we\'ll suggest nearby spots',
    mobPlan: 'Plan', mobPlaces: 'Places', mobNearby: 'Nearby', mobExport: 'Export',
    close: 'Close', cancel: 'Cancel', save: 'Save Place', addToDay: 'Add to Day:',
    addNew: 'Add New Place', tabManual: '✏️ Manual', tabAI: '🤖 AI Suggest', tabGmaps: '📍 Google Maps',
    osmSearch: '🔍 Search Place (OpenStreetMap)', osmBtn: 'Find GPS', osmPh: 'Type place name e.g. Gyeongbokgung Palace Seoul',
    fName: 'Place Name *', fDesc: 'Description', fCat: 'Category', fDur: 'Duration (min)',
    fAddr: 'Address', fFee: 'Entry Fee', fTransport: 'Getting There', fIcon: 'Emoji Icon', fCity: 'City',
    fImg: 'Place Photo', fImgOpt: '(optional)', fImgPh: 'Tap to upload photo (JPG, PNG, WEBP)',
    aiModalTitle: '✦ AI Trip Planner', aiModalSub: 'Tell AI where you want to go and it\'ll plan your trip',
    aiInfo: 'AI will pull places from the database and arrange them by day, sorted by GPS distance from your hotel.',
    aiHotel: 'Hotel / Base', aiHotelSub: '(starting point)', aiHotelPh: 'e.g. Myeongdong, Seoul',
    aiInterests: 'Interests', aiInterestsSub: '(select multiple)', aiGenerate: 'Build Itinerary',
    iFood: '🍜 Food', iShop: '🛍 Shopping', iTemple: '🛕 Temples/History', iNature: '🌿 Nature',
    iArt: '🎨 Art/Culture', iPhoto: '📸 Photography', iCafe: '☕ Café', iBeach: '🏖 Beach',
    exportTitle: 'Export Itinerary', exportFmt: 'Choose PDF Style', exportPreview: 'Text Preview',
    exportShare: '🔗 Share Link', exportShareNote: 'This link contains your full plan. Share with friends to open instantly.',
    copyText: 'Copy Text', downloadPDF: '⬇ Download PDF', creating: 'Generating link...',
    pdfBeautiful: 'Colorful full layout', pdfClean: 'Clean, easy to print', pdfTimeline: 'Timeline day-by-day',
    gmapsHow: 'How to copy URL from Google Maps:', gmaps1: 'Open Google Maps and search for the place',
    gmaps2: 'Tap Share → Copy link', gmaps3: 'Paste the link here', gmapsFormats: 'Supported formats:',
    detailAddr: 'Address', detailGPS: 'GPS Coordinates', detailFee: 'Entry Fee', detailTransport: 'Getting There',
    copyGPS: 'Copy', openMaps: 'Open Maps ↗', alreadyAdded: '✅ Already in plan', addInDay: '+ Add to Plan',
    dayLabel: 'Day', dragHere: 'Drag places here',
    nearbyFrom: 'Suggestions from', nearbySort: 'Sorted by GPS + Category + City', noNearby: 'No nearby places found',
    scoreTotal: 'Match Score', reasonWalk: 'Walkable distance', reasonNear: 'Nearby, easy transit',
    reasonCat: 'Same category', reasonCity: 'Same city', reasonRoute: 'Suggested on route',
    addBtn: '+ Add Day', addedBtn: 'Added', gmapsPullBtn: 'Extract',
  }
};

// ─── STATIC DATA ────────────────────────────────────────────────────
const COUNTRIES = [
  {
    id: 'th', name: 'ไทย', flag: '🇹🇭', cities: [
      { id: 'bkk', name: 'กรุงเทพ', emoji: '🏙', color: '#1D9E75', light: '#E1F5EE', dark: '#0F6E56' },
      { id: 'cnx', name: 'เชียงใหม่', emoji: '🌸', color: '#D4537E', light: '#FBEAF0', dark: '#993556' },
      { id: 'hkt', name: 'ภูเก็ต', emoji: '🏖', color: '#378ADD', light: '#E6F1FB', dark: '#185FA5' },
      { id: 'ptt', name: 'พัทยา', emoji: '🌊', color: '#EF9F27', light: '#FAEEDA', dark: '#854F0B' },
      { id: 'aya', name: 'อยุธยา', emoji: '🏛', color: '#7F77DD', light: '#EEEDFE', dark: '#534AB7' },
    ]
  },
  {
    id: 'kr', name: 'เกาหลี', flag: '🇰🇷', cities: [
      { id: 'sel', name: 'โซล', emoji: '🏙', color: '#E24B4A', light: '#FCEBEB', dark: '#A32D2D' },
      { id: 'bus', name: 'ปูซาน', emoji: '🌊', color: '#185FA5', light: '#E6F1FB', dark: '#0C447C' },
      { id: 'jej', name: 'เจจู', emoji: '🌋', color: '#3B6D11', light: '#EAF3DE', dark: '#27500A' },
    ]
  },
  {
    id: 'jp', name: 'ญี่ปุ่น', flag: '🇯🇵', cities: [
      { id: 'tky', name: 'โตเกียว', emoji: '🗼', color: '#E24B4A', light: '#FCEBEB', dark: '#A32D2D' },
      { id: 'kyo', name: 'เกียวโต', emoji: '⛩', color: '#854F0B', light: '#FAEEDA', dark: '#633806' },
      { id: 'osk', name: 'โอซาก้า', emoji: '🏯', color: '#7F77DD', light: '#EEEDFE', dark: '#534AB7' },
    ]
  },
];

const MOCK_LANDMARKS = {
  bkk: [
    { id: 1, name: 'วัดพระแก้ว (Wat Phra Kaew)', cat: 'วัด', dur: 120, icon: '🛕', desc: 'วัดคู่บ้านคู่เมืองของไทย', addr: 'Na Phra Lan Rd, Bangkok', lat: 13.7516, lng: 100.4927, fee: 'คนไทยเข้าฟรี / ต่างชาติ 500 บาท', transport: [{i: '🚇', t: 'MRT สนามไชย ทางออก 1'}] },
    { id: 2, name: 'พระบรมมหาราชวัง (Grand Palace)', cat: 'พระราชวัง', dur: 120, icon: '🏰', desc: 'พระบรมมหาราชวังอันวิจิตร', addr: 'Na Phra Lan Rd, Bangkok', lat: 13.7500, lng: 100.4913, fee: 'รวมกับวัดพระแก้ว', transport: [{i: '🚗', t: 'แท็กซี่ หรือเรือด่วนท่าช้าง'}] },
    { id: 3, name: 'วัดอรุณฯ (Wat Arun)', cat: 'วัด', dur: 90, icon: '🛕', desc: 'พระปรางค์สีขาวโดดเด่นริมแม่น้ำเจ้าพระยา', addr: 'Wang Doem Rd, Bangkok', lat: 13.7437, lng: 100.4889, fee: 'คนไทยฟรี / ต่างชาติ 100 บาท', transport: [{i: '🛳', t: 'เรือข้ามฟากจากท่าเตียน'}] },
    { id: 4, name: 'ตลาดนัดจตุจักร (Chatuchak Market)', cat: 'ช้อปปิ้ง', dur: 180, icon: '🛍', desc: 'ตลาดนัดสุดสัปดาห์ที่ใหญ่ที่สุด', addr: 'Kamphaeng Phet 2 Rd, Bangkok', lat: 13.7999, lng: 100.5508, fee: 'ฟรี', transport: [{i: '🚇', t: 'BTS หมอชิต / MRT สวนจตุจักร'}] },
    { id: 5, name: 'สยามพารากอน (Siam Paragon)', cat: 'ช้อปปิ้ง', dur: 150, icon: '🛍', desc: 'ห้างสรรพสินค้าลักชูรีใจกลางกรุงเทพฯ', addr: 'Rama I Rd, Bangkok', lat: 13.7461, lng: 100.5348, fee: 'ฟรี', transport: [{i: '🚇', t: 'BTS สยาม'}] }
  ],
  sel: [
    { id: 101, name: 'Gyeongbokgung Palace', cat: 'พระราชวัง', dur: 120, icon: '🏯', desc: 'The largest palace of the Joseon Dynasty.', addr: '161 Sajik-ro, Jongno-gu, Seoul', lat: 37.5796, lng: 126.9770, fee: '₩3,000 / Free in Hanbok', transport: [{i: '🚇', t: 'Subway Line 3 Gyeongbokgung Exit 5'}] },
    { id: 102, name: 'Bukchon Hanok Village', cat: 'ย่าน', dur: 90, icon: '🏡', desc: 'Traditional Korean historic neighborhood.', addr: 'Gyeedong-gil, Jongno-gu, Seoul', lat: 37.5826, lng: 126.9836, fee: 'Free', transport: [{i: '🚇', t: 'Subway Line 3 Anguk Exit 2'}] },
    { id: 103, name: 'N Seoul Tower', cat: 'วิวทิวทัศน์', dur: 120, icon: '🗼', desc: 'Observatory tower on Namsan Mountain.', addr: '105 Namsangongwon-gil, Yongsan-gu, Seoul', lat: 37.5512, lng: 126.9882, fee: '₩16,000', transport: [{i: '🚌', t: 'Namsan Shuttle Bus No. 01'}] }
  ]
};

const DAY_COLORS = [
  { bg: "#EAF3DE", t: "#3B6D11", b: "#C0DD97", acc: "#639922" },
  { bg: "#E1F5EE", t: "#0F6E56", b: "#9FE1CB", acc: "#1D9E75" },
  { bg: "#E6F1FB", t: "#185FA5", b: "#B5D4F4", acc: "#378ADD" },
  { bg: "#FAEEDA", t: "#854F0B", b: "#FAC775", acc: "#EF9F27" },
  { bg: "#FBEAF0", t: "#993556", b: "#F4C0D1", acc: "#D4537E" },
  { bg: "#FCEBEB", t: "#A32D2D", b: "#F7C1C1", acc: "#E24B4A" },
  { bg: "#EEEDFE", t: "#534AB7", b: "#CECBF6", acc: "#7F77DD" },
];

const CITY_KEYWORDS = {
  bkk: 'bangkok',
  cnx: 'chiangmai',
  hkt: 'phuket',
  ptt: 'pattaya',
  aya: 'ayutthaya',
  sel: 'seoul',
  bus: 'busan',
  jej: 'jeju',
  tky: 'tokyo',
  kyo: 'kyoto',
  osk: 'osaka'
};

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>Loading...</div>}>
      <TripBuilderApp />
    </Suspense>
  );
}

function TripBuilderApp() {
  // ─── STATES ────────────────────────────────────────────────────────
  const searchParams = useSearchParams();
  const tripParam = searchParams.get('trip');
  const [activeLang, setActiveLang] = useState('th');
  const [activeCountry, setActiveCountry] = useState('th');
  const [activeCity, setActiveCity] = useState('bkk');
  const [theme, setTheme] = useState('clean');
  
  const [nDays, setNDays] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [hotel, setHotel] = useState('');
  
  const [itin, setItin] = useState({ 1: [], 2: [], 3: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('__all__');
  
  const [landmarks, setLandmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customPlaces, setCustomPlaces] = useState({});
  
  const [lastId, setLastId] = useState(null);
  const [lastDay, setLastDay] = useState(null);
  
  // Modals state
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [activeAddTab, setActiveAddTab] = useState('manual');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('A');
  const [aiPlanModalOpen, setAiPlanModalOpen] = useState(false);
  const [editDurationModalOpen, setEditDurationModalOpen] = useState(false);
  const [editDurationTarget, setEditDurationTarget] = useState(null);
  
  // Auth states
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRegisterCode, setAuthRegisterCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Multiple plans states
  const [plansList, setPlansList] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  
  const [toastMessage, setToastMessage] = useState('');
  const [mobileTab, setMobileTab] = useState('plan');
  
  // Add modal states
  const [osmQuery, setOsmQuery] = useState('');
  const [osmResults, setOsmResults] = useState([]);
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fCat, setFCat] = useState('วัด');
  const [fDur, setFDur] = useState(90);
  const [fAddr, setFAddr] = useState('');
  const [fLat, setFLat] = useState('');
  const [fLng, setFLng] = useState('');
  const [fFee, setFFee] = useState('');
  const [fTransport, setFTransport] = useState('');
  const [fIcon, setFIcon] = useState('🏯');
  const [fCity, setFCity] = useState('bkk');

  // Editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('วัด');
  const [editDur, setEditDur] = useState(90);
  const [editAddr, setEditAddr] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editTransport, setEditTransport] = useState('');
  const [editIcon, setEditIcon] = useState('📍');
  const [editKeywords, setEditKeywords] = useState('');
  const [editSelectedImage, setEditSelectedImage] = useState('');
  
  // AI suggest states
  const [aiSuggestQuery, setAiSuggestQuery] = useState('');
  const [aiSuggestResult, setAiSuggestResult] = useState(null);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  
  // Google Maps parser state
  const [gmapsUrl, setGmapsUrl] = useState('');
  const [gmapsResult, setGmapsResult] = useState(null);

  // AI Planner states
  const [aiHotel, setAiHotel] = useState('');
  const [aiStart, setAiStart] = useState('');
  const [aiEnd, setAiEnd] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [aiPlanStatus, setAiPlanStatus] = useState('');
  const [aiPlanResult, setAiPlanResult] = useState(null);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);

  // Drag and Drop Ref tracking
  const dragItem = useRef();
  const dragOverDay = useRef();
  const dragIdx = useRef();
  const dragFromDay = useRef(); // Number or 'sidebar'

  const t = (key) => (LANG_STRINGS[activeLang] || LANG_STRINGS.en)[key] || key;
  const getCityObj = (cid) => COUNTRIES.flatMap(c => c.cities).find(c => c.id === cid) || null;
  const usedIds = () => Object.values(itin).flat().map(x => x.id);
  const getSelectedCount = (placeId) => {
    return Object.values(itin).flat().filter(x => x.id === placeId).length;
  };

  const getCoverImage = (place) => {
    if (place.cover_image) return place.cover_image;
    const cityKey = CITY_KEYWORDS[place.city_id || activeCity] || 'travel';
    const englishMatch = place.name.match(/\(([^)]+)\)/);
    let keyword = place.name;
    if (englishMatch && englishMatch[1]) {
      keyword = englishMatch[1];
    }
    const cleanKeyword = keyword.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, ',');
    return `https://loremflickr.com/400/300/${cityKey},${cleanKeyword}/all`;
  };

  const handleOpenDetail = (place) => {
    setSelectedPlace(place);
    setIsEditing(false);
    
    // Initialize edit states
    setEditName(place.name);
    setEditDesc(place.desc || '');
    setEditCat(place.cat || 'อื่นๆ');
    setEditDur(place.dur || 90);
    setEditAddr(place.addr || '');
    setEditLat(place.lat !== null && place.lat !== undefined ? place.lat : '');
    setEditLng(place.lng !== null && place.lng !== undefined ? place.lng : '');
    setEditFee(place.fee || '');
    setEditTransport(place.transport && place.transport.length > 0 ? place.transport[0].t : '');
    setEditIcon(place.icon || '📍');
    
    // Set edit keywords
    const cityObj = getCityObj(place.city_id || activeCity);
    const cityName = cityObj ? cityObj.name : '';
    const englishMatch = place.name.match(/\(([^)]+)\)/);
    let keyword = place.name;
    if (englishMatch && englishMatch[1]) {
      keyword = englishMatch[1];
    }
    const cleanKeyword = keyword.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, ',');
    setEditKeywords(cleanKeyword);
    setEditSelectedImage(place.cover_image || '');
  };

  const saveEditedPlace = (editedPlace) => {
    // 1. Update landmarks list
    setLandmarks(prev => prev.map(l => l.id === editedPlace.id ? editedPlace : l));
    
    // 2. Save to customPlaces in state and localStorage (fallback)
    const updatedCustom = { ...customPlaces };
    const cityId = editedPlace.city_id || activeCity;
    if (!updatedCustom[cityId]) updatedCustom[cityId] = [];
    
    updatedCustom[cityId] = updatedCustom[cityId].filter(p => p.id !== editedPlace.id);
    updatedCustom[cityId].push(editedPlace);
    setCustomPlaces(updatedCustom);
    localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: updatedCustom }));

    // 3. Sync edit to Supabase if connected and this is a custom place
    if (supabase && editedPlace._custom) {
      supabase.from('landmarks').update({
        name: editedPlace.name,
        cat: editedPlace.cat,
        icon: editedPlace.icon,
        description: editedPlace.desc,
        address: editedPlace.addr,
        lat: editedPlace.lat,
        lng: editedPlace.lng,
        duration_min: editedPlace.dur,
        fee: editedPlace.fee,
        transport: editedPlace.transport,
        cover_image: editedPlace.cover_image || null,
      }).eq('id', String(editedPlace.id)).then(() => {});
    }

    // 3. Update itin state to reflect changes instantly on the days grid!
    const updatedItin = { ...itin };
    Object.keys(updatedItin).forEach(day => {
      if (updatedItin[day]) {
        updatedItin[day] = updatedItin[day].map(item => {
          if (item.id === editedPlace.id) {
            return {
              ...item,
              name: editedPlace.name,
              cat: editedPlace.cat,
              dur: editedPlace.dur,
              icon: editedPlace.icon,
              city_id: editedPlace.city_id,
              cover_image: editedPlace.cover_image,
              names: editedPlace.names || {},
              lat: editedPlace.lat,
              lng: editedPlace.lng
            };
          }
          return item;
        });
      }
    });
    setItin(updatedItin);
    saveItinData(updatedItin, nDays);
    
    toast('💾 บันทึกการแก้ไขเรียบร้อย');
  };

  const handleSaveEdit = () => {
    const editedPlace = {
      ...selectedPlace,
      name: editName,
      cat: editCat,
      dur: parseInt(editDur) || 90,
      icon: editIcon,
      desc: editDesc,
      addr: editAddr,
      lat: editLat ? parseFloat(editLat) : null,
      lng: editLng ? parseFloat(editLng) : null,
      fee: editFee,
      transport: editTransport ? [{ i: '🚇', t: editTransport }] : [],
      cover_image: editSelectedImage,
      names: { ...selectedPlace.names, [activeLang]: editName }
    };
    
    saveEditedPlace(editedPlace);
    setSelectedPlace(editedPlace);
    setIsEditing(false);
  };

  const promptEditDuration = (day, idx, item) => {
    setEditDurationTarget({ day, idx, item, value: item.dur });
    setEditDurationModalOpen(true);
  };

  const handleSaveDurationQuick = () => {
    if (!editDurationTarget) return;
    const { day, idx, item, value } = editDurationTarget;
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      const updatedItin = { ...itin };
      updatedItin[day] = [...updatedItin[day]];
      updatedItin[day][idx] = { ...updatedItin[day][idx], dur: num };
      setItin(updatedItin);
      saveItinData(updatedItin, nDays);
      setEditDurationModalOpen(false);
      setEditDurationTarget(null);
      toast(activeLang === 'th' ? `💾 ปรับเวลาเที่ยวเป็น ${num} นาทีแล้ว` : `💾 Updated visit duration to ${num} minutes`);
    } else {
      toast(activeLang === 'th' ? '❌ กรุณากรอกตัวเลขที่ถูกต้อง' : '❌ Please enter a valid number');
    }
  };

  // Helper function for Toast
  const toast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2000);
  };

  // ─── INITIALIZATION EFFECTS ────────────────────────────────────────
  useEffect(() => {
    // Detect browser language
    const bl = (navigator.language || 'th').toLowerCase().slice(0, 2);
    const defaultLang = ['th', 'en'].includes(bl) ? bl : 'en';
    setActiveLang(localStorage.getItem('tb_lang') || defaultLang);
    setTheme(localStorage.getItem('tb_theme') || 'clean');
    
    // Set default date to today
    setStartDate(new Date().toISOString().split('T')[0]);
    
    // Load custom places
    try {
      const raw = localStorage.getItem('trip_builder_custom_places_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCustomPlaces(parsed.custom || {});
      }
    } catch (_) {}

    // Check initial user session & load plans
    const checkSession = async () => {
      // Debug: log Supabase connection status
      console.log('[TripBuilder] Supabase client:', supabase ? 'CONNECTED ✅' : 'NOT CONFIGURED ❌ (using Mock Mode)');
      console.log('[TripBuilder] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '(empty)');

      if (!supabase) {
        // Fallback to local mock session if no Supabase configured
        console.warn('[TripBuilder] Running in LOCAL MOCK MODE - data will not sync across browsers!');
        try {
          const storedUser = localStorage.getItem('tb_mock_user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            loadLocalMockPlans(parsedUser.email);
          } else {
            loadGuestPlan();
          }
        } catch (_) {
          loadGuestPlan();
        }
        return;
      }
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) console.error('[TripBuilder] getSession error:', sessionError);
        console.log('[TripBuilder] Session:', session ? `user=${session.user.email}` : 'no session');
        if (session?.user) {
          setUser(session.user);
          loadCloudPlans(session.user.id);
        } else {
          loadGuestPlan();
        }
      } catch (err) {
        console.error('[TripBuilder] checkSession failed:', err);
        loadGuestPlan();
      }
    };

    checkSession();

    // Listen for auth changes
    let authListener = null;
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadCloudPlans(session.user.id);
        } else {
          setUser(null);
          setPlansList([]);
          setActivePlanId(null);
          loadGuestPlan();
        }
      });
      authListener = subscription;
    }

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  const loadGuestPlan = () => {
    try {
      const raw = localStorage.getItem('trip_builder_itin_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.nDays) setNDays(parsed.nDays);
        if (parsed.start) setStartDate(parsed.start);
        if (parsed.time) setStartTime(parsed.time);
        if (parsed.hotel) setHotel(parsed.hotel);
        if (parsed.itin) {
          setItin(parsed.itin);
        }
      } else {
        setItin({ 1: [], 2: [], 3: [] });
        setNDays(3);
        setHotel('');
        setStartTime('09:00');
      }
      setActivePlanId('guest');
    } catch (_) {
      setActivePlanId('guest');
    }
  };

  const loadLocalMockPlans = (email) => {
    try {
      const raw = localStorage.getItem(`tb_mock_plans_${email}`);
      const plans = raw ? JSON.parse(raw) : [];
      setPlansList(plans);
      
      const lastActiveId = localStorage.getItem(`tb_mock_active_plan_${email}`);
      const activePlan = plans.find(p => p.id === lastActiveId) || plans[0];
      
      if (activePlan) {
        setActivePlanId(activePlan.id);
        setItin(activePlan.itin || { 1: [], 2: [], 3: [] });
        setNDays(activePlan.nDays || 3);
        setStartDate(activePlan.start || new Date().toISOString().split('T')[0]);
        setStartTime(activePlan.time || '09:00');
        setHotel(activePlan.hotel || '');
      } else {
        const defaultPlanId = `plan_${Date.now()}`;
        const newPlan = {
          id: defaultPlanId,
          name: 'My Saved Plan 1',
          city_id: activeCity,
          itin: { 1: [], 2: [], 3: [] },
          nDays: 3,
          start: new Date().toISOString().split('T')[0],
          time: '09:00',
          hotel: ''
        };
        const updatedPlans = [newPlan];
        setPlansList(updatedPlans);
        localStorage.setItem(`tb_mock_plans_${email}`, JSON.stringify(updatedPlans));
        
        setActivePlanId(defaultPlanId);
        setItin(newPlan.itin);
        setNDays(newPlan.nDays);
        setStartDate(newPlan.start);
        setStartTime(newPlan.time);
        setHotel(newPlan.hotel);
      }
    } catch (_) {}
  };

  const loadCloudPlans = async (userId) => {
    if (!supabase) return;
    console.log('[TripBuilder] loadCloudPlans for userId:', userId);
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('[TripBuilder] loadCloudPlans error:', error);
        throw error;
      }
      console.log('[TripBuilder] Loaded', data?.length, 'cloud plans');
      
      const plans = data.map(item => ({
        id: item.id,
        name: item.name,
        city_id: item.city_id,
        itin: item.itin,
        nDays: item.n_days,
        start: item.start_date,
        time: item.start_time,
        hotel: item.hotel
      }));
      
      setPlansList(plans);
      
      const lastActiveId = localStorage.getItem(`tb_active_plan_${userId}`);
      const activePlan = plans.find(p => p.id === lastActiveId) || plans[0];
      
      if (activePlan) {
        setActivePlanId(activePlan.id);
        setItin(activePlan.itin);
        setNDays(activePlan.nDays);
        setStartDate(activePlan.start);
        setStartTime(activePlan.time);
        setHotel(activePlan.hotel);
      } else {
        await handleCreatePlanCloud('My Saved Plan 1', userId);
      }
    } catch (err) {
      console.warn('Failed to load cloud plans:', err.message);
    }
  };

  const handleCreatePlanCloud = async (name, userId) => {
    if (!supabase) return;
    const defaultPlan = {
      user_id: userId,
      name: name,
      city_id: activeCity,
      country_id: activeCountry,
      start_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      hotel: '',
      n_days: 3,
      itin: { 1: [], 2: [], 3: [] }
    };
    
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert([defaultPlan])
        .select();
        
      if (error) throw error;
      
      if (data && data[0]) {
        const newPlan = {
          id: data[0].id,
          name: data[0].name,
          city_id: data[0].city_id,
          itin: data[0].itin,
          nDays: data[0].n_days,
          start: data[0].start_date,
          time: data[0].start_time,
          hotel: data[0].hotel
        };
        setPlansList(prev => [newPlan, ...prev]);
        setActivePlanId(newPlan.id);
        setItin(newPlan.itin);
        setNDays(newPlan.nDays);
        setStartDate(newPlan.start);
        setStartTime(newPlan.time);
        setHotel(newPlan.hotel);
        localStorage.setItem(`tb_active_plan_${userId}`, newPlan.id);
      }
    } catch (err) {
      console.warn('Failed to create cloud plan:', err.message);
    }
  };

  const createNewPlan = async () => {
    const planName = prompt(activeLang === 'th' ? 'กรุณากรอกชื่อแผนเดินทางใหม่:' : 'Enter name for the new plan:', `Trip Plan ${plansList.length + 1}`);
    if (!planName?.trim()) return;
    
    if (user) {
      if (!supabase) {
        const defaultPlanId = `plan_${Date.now()}`;
        const newPlan = {
          id: defaultPlanId,
          name: planName,
          city_id: activeCity,
          itin: { 1: [], 2: [], 3: [] },
          nDays: 3,
          start: new Date().toISOString().split('T')[0],
          time: '09:00',
          hotel: ''
        };
        const updatedPlans = [newPlan, ...plansList];
        setPlansList(updatedPlans);
        localStorage.setItem(`tb_mock_plans_${user.email}`, JSON.stringify(updatedPlans));
        
        setActivePlanId(defaultPlanId);
        setItin(newPlan.itin);
        setNDays(newPlan.nDays);
        setStartDate(newPlan.start);
        setStartTime(newPlan.time);
        setHotel(newPlan.hotel);
        localStorage.setItem(`tb_mock_active_plan_${user.email}`, defaultPlanId);
        toast(activeLang === 'th' ? 'สร้างแผนใหม่สำเร็จ' : 'New plan created');
      } else {
        await handleCreatePlanCloud(planName, user.id);
        toast(activeLang === 'th' ? 'สร้างแผนใหม่สำเร็จ' : 'New plan created');
      }
    } else {
      toast(activeLang === 'th' ? 'กรุณาเข้าสู่ระบบเพื่อบันทึกหลายแผน' : 'Please Sign In to save multiple plans');
      setAuthModalOpen(true);
    }
  };

  const deletePlan = async (planId, e) => {
    if (e) e.stopPropagation();
    if (plansList.length <= 1) {
      toast(activeLang === 'th' ? 'ไม่สามารถลบแผนสุดท้ายได้' : 'Cannot delete the last plan');
      return;
    }
    if (!confirm(activeLang === 'th' ? 'ต้องการลบแผนเดินทางนี้ใช่หรือไม่?' : 'Delete this plan?')) return;
    
    if (user) {
      if (!supabase) {
        const updatedPlans = plansList.filter(p => p.id !== planId);
        setPlansList(updatedPlans);
        localStorage.setItem(`tb_mock_plans_${user.email}`, JSON.stringify(updatedPlans));
        
        if (activePlanId === planId) {
          const nextPlan = updatedPlans[0];
          loadActivePlan(nextPlan.id, updatedPlans);
        }
        toast(activeLang === 'th' ? 'ลบแผนสำเร็จ' : 'Plan deleted');
      } else {
        try {
          const { error } = await supabase
            .from('itineraries')
            .delete()
            .eq('id', planId);
            
          if (error) throw error;
          
          const updatedPlans = plansList.filter(p => p.id !== planId);
          setPlansList(updatedPlans);
          
          if (activePlanId === planId) {
            const nextPlan = updatedPlans[0];
            loadActivePlan(nextPlan.id, updatedPlans);
          }
          toast(activeLang === 'th' ? 'ลบแผนสำเร็จ' : 'Plan deleted');
        } catch (err) {
          console.warn('Failed to delete cloud plan:', err.message);
        }
      }
    }
  };

  const renamePlan = async (planId, e) => {
    if (e) e.stopPropagation();
    const plan = plansList.find(p => p.id === planId);
    if (!plan) return;
    
    const newName = prompt(activeLang === 'th' ? 'กรุณากรอกชื่อใหม่:' : 'Enter new name:', plan.name);
    if (!newName?.trim() || newName === plan.name) return;
    
    if (user) {
      if (!supabase) {
        const updatedPlans = plansList.map(p => p.id === planId ? { ...p, name: newName } : p);
        setPlansList(updatedPlans);
        localStorage.setItem(`tb_mock_plans_${user.email}`, JSON.stringify(updatedPlans));
        toast(activeLang === 'th' ? 'เปลี่ยนชื่อแผนสำเร็จ' : 'Plan renamed');
      } else {
        try {
          const { error } = await supabase
            .from('itineraries')
            .update({ name: newName, updated_at: new Date().toISOString() })
            .eq('id', planId);
            
          if (error) throw error;
          
          setPlansList(prev => prev.map(p => p.id === planId ? { ...p, name: newName } : p));
          toast(activeLang === 'th' ? 'เปลี่ยนชื่อแผนสำเร็จ' : 'Plan renamed');
        } catch (err) {
          console.warn('Failed to rename cloud plan:', err.message);
        }
      }
    }
  };

  const loadActivePlan = (planId, customList = null) => {
    const list = customList || plansList;
    const plan = list.find(p => p.id === planId);
    if (!plan) return;
    
    setActivePlanId(planId);
    setItin(plan.itin || { 1: [], 2: [], 3: [] });
    setNDays(plan.nDays || 3);
    setStartDate(plan.start || new Date().toISOString().split('T')[0]);
    setStartTime(plan.time || '09:00');
    setHotel(plan.hotel || '');
    
    if (user) {
      if (!supabase) {
        localStorage.setItem(`tb_mock_active_plan_${user.email}`, planId);
      } else {
        localStorage.setItem(`tb_active_plan_${user.id}`, planId);
      }
    }
  };

  const handleSignUp = async () => {
    if (!authEmail.trim() || !authPassword.trim() || !authRegisterCode.trim()) {
      toast(activeLang === 'th' ? 'กรุณากรอกข้อมูลให้ครบถ้วน รวมถึงรหัสการสมัคร' : 'Please fill in all fields including the registration code');
      return;
    }
    if (authRegisterCode.trim() !== '8486') {
      toast(activeLang === 'th' ? 'รหัสการสมัครไม่ถูกต้อง!' : 'Invalid registration code!');
      return;
    }
    setAuthLoading(true);
    
    if (!supabase) {
      try {
        const rawUsers = localStorage.getItem('tb_mock_users') || '[]';
        const users = JSON.parse(rawUsers);
        if (users.find(u => u.email === authEmail)) {
          toast('อีเมลนี้เคยลงทะเบียนแล้ว');
          setAuthLoading(false);
          return;
        }
        const newUser = { email: authEmail, password: authPassword };
        users.push(newUser);
        localStorage.setItem('tb_mock_users', JSON.stringify(users));
        
        localStorage.setItem('tb_mock_user', JSON.stringify({ email: authEmail }));
        setUser({ email: authEmail });
        setAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        setAuthRegisterCode('');
        loadLocalMockPlans(authEmail);
        toast('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ (Mock)');
      } catch (_) {
        toast('สมัครสมาชิกล้มเหลว');
      } finally {
        setAuthLoading(false);
      }
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword
      });
      if (error) throw error;
      
      if (data?.user) {
        toast('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบได้ทันทีหากเปิดใช้งานการข้ามอีเมลยืนยัน');
        setAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        setAuthRegisterCode('');
      }
    } catch (err) {
      toast(`สมัครสมาชิกล้มเหลว: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      toast('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setAuthLoading(true);
    
    if (!supabase) {
      try {
        const rawUsers = localStorage.getItem('tb_mock_users') || '[]';
        const users = JSON.parse(rawUsers);
        const match = users.find(u => u.email === authEmail && u.password === authPassword);
        if (!match) {
          toast('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
          setAuthLoading(false);
          return;
        }
        
        localStorage.setItem('tb_mock_user', JSON.stringify({ email: authEmail }));
        setUser({ email: authEmail });
        setAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        loadLocalMockPlans(authEmail);
        toast('เข้าสู่ระบบสำเร็จ (Mock)');
      } catch (_) {
        toast('เข้าสู่ระบบล้มเหลว');
      } finally {
        setAuthLoading(false);
      }
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      });
      if (error) throw error;
      
      if (data?.user) {
        setUser(data.user);
        setAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        loadCloudPlans(data.user.id);
        toast('เข้าสู่ระบบสำเร็จ!');
      }
    } catch (err) {
      toast(`เข้าสู่ระบบล้มเหลว: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      localStorage.removeItem('tb_mock_user');
      setUser(null);
      setPlansList([]);
      setActivePlanId(null);
      loadGuestPlan();
      setUserDropdownOpen(false);
      toast('ออกจากระบบแล้ว (Mock)');
      return;
    }
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setPlansList([]);
      setActivePlanId(null);
      loadGuestPlan();
      setUserDropdownOpen(false);
      toast('ออกจากระบบแล้ว');
    } catch (err) {
      toast(`ออกจากระบบล้มเหลว: ${err.message}`);
    }
  };

  // Sync end date and sync with nDays
  useEffect(() => {
    if (startDate) {
      const ds = new Date(startDate);
      ds.setDate(ds.getDate() + nDays - 1);
      setEndDate(ds.toISOString().split('T')[0]);
    }
  }, [startDate, nDays]);

  // Load landmarks when activeCity or customPlaces changes
  useEffect(() => {
    let activeCityLandmarks = MOCK_LANDMARKS[activeCity] || [];
    
    // Mix in custom places created by user for this city (local fallback)
    const customList = customPlaces[activeCity] || [];
    
    // Filter out mock landmarks that have been overridden/edited
    const customIds = new Set(customList.map(p => p.id));
    const filteredMock = activeCityLandmarks.filter(l => !customIds.has(l.id));
    
    setLandmarks([...filteredMock, ...customList]);

    // Fetch from Supabase if connected
    const fetchLandmarks = async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
        // 1. Load public approved landmarks
        const { data: publicData, error: publicError } = await supabase
          .from('landmarks')
          .select('*')
          .eq('city_id', activeCity)
          .eq('status', 'approved');

        if (publicError) throw publicError;

        // 2. Load this user's custom places (if logged in)
        let userCustomData = [];
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: uData } = await supabase
            .from('landmarks')
            .select('*')
            .eq('city_id', activeCity)
            .eq('status', 'user_custom')
            .eq('user_id', session.user.id);
          userCustomData = uData || [];
        }

        const allData = [...(publicData || []), ...userCustomData];

        const mapItem = item => ({
          id: item.id,
          name: item.name,
          cat: item.cat || 'อื่นๆ',
          dur: item.duration_min || 90,
          icon: item.icon || '📍',
          desc: item.description || '',
          addr: item.address || '',
          lat: item.lat ? parseFloat(item.lat) : null,
          lng: item.lng ? parseFloat(item.lng) : null,
          fee: item.fee || '',
          transport: item.transport || [],
          cover_image: item.cover_image || null,
          names: item.names || {},
          descriptions: item.descriptions || {},
          city_id: item.city_id,
          _custom: item.status === 'user_custom'
        });

        // Merge Supabase data with local customList
        // Local custom places that are NOT yet in Supabase are kept (e.g. INSERT pending)
        const supaIds = new Set(allData.map(d => String(d.id)));
        const localOnlyCustom = customList.filter(p => !supaIds.has(String(p.id)));
        const merged = [...allData.map(mapItem), ...localOnlyCustom];
        if (merged.length > 0) {
          setLandmarks(merged);
        }
      } catch (err) {
        console.warn('Failed to load from Supabase:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLandmarks();
  }, [activeCity, customPlaces, user]);

  // Save itinerary to LocalStorage or Cloud
  const saveItinData = async (newItin, newNDays) => {
    try {
      const data = {
        itin: newItin,
        nDays: newNDays,
        start: startDate,
        time: startTime,
        hotel: hotel
      };
      localStorage.setItem('trip_builder_itin_v1', JSON.stringify(data));
    } catch (_) {}

    if (user && activePlanId && activePlanId !== 'guest') {
      if (!supabase) {
        const updatedPlans = plansList.map(p => {
          if (p.id === activePlanId) {
            return {
              ...p,
              itin: newItin,
              nDays: newNDays,
              start: startDate,
              time: startTime,
              hotel: hotel
            };
          }
          return p;
        });
        setPlansList(updatedPlans);
        localStorage.setItem(`tb_mock_plans_${user.email}`, JSON.stringify(updatedPlans));
      } else {
        try {
          await supabase
            .from('itineraries')
            .update({
              itin: newItin,
              n_days: newNDays,
              start_date: startDate,
              start_time: startTime,
              hotel: hotel,
              updated_at: new Date().toISOString()
            })
            .eq('id', activePlanId);
          
          setPlansList(prev => prev.map(p => {
            if (p.id === activePlanId) {
              return {
                ...p,
                itin: newItin,
                nDays: newNDays,
                start: startDate,
                time: startTime,
                hotel: hotel
              };
            }
            return p;
          }));
        } catch (err) {
          console.warn('Failed to update cloud itinerary:', err.message);
        }
      }
    }
  };

  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      saveItinData(itin, nDays);
    }, 500);
    return () => clearTimeout(timer);
  }, [itin, nDays, startDate, startTime, hotel]);

  // Sync dates from start/end input
  const handleDateSync = (startVal, endVal) => {
    if (startVal && endVal) {
      const ds = new Date(startVal);
      const de = new Date(endVal);
      if (de >= ds) {
        const diffDays = Math.round((de - ds) / 864e5) + 1;
        const days = Math.min(diffDays, 7);
        setNDays(days);
        adjustDays(days);
      }
    }
  };

  const adjustDays = (days) => {
    const newItin = { ...itin };
    // Add missing days
    for (let d = 1; d <= days; d++) {
      if (!newItin[d]) newItin[d] = [];
    }
    // Remove extra days
    Object.keys(newItin).forEach(d => {
      if (parseInt(d) > days) delete newItin[d];
    });
    setItin(newItin);
    saveItinData(newItin, days);
  };

  // Add attraction to a specific day
  const addToDay = (place, day) => {
    const currentItin = { ...itin };
    if (!currentItin[day]) currentItin[day] = [];
    
    const uniqueItinId = `${place.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    currentItin[day].push({
      id: place.id,
      itinId: uniqueItinId,
      name: place.name,
      cat: place.cat,
      dur: place.dur || 90,
      icon: place.icon,
      city_id: place.city_id || activeCity,
      names: place.names || {},
      lat: place.lat,
      lng: place.lng
    });
    
    setItin(currentItin);
    setLastId(place.id);
    setLastDay(day);
    saveItinData(currentItin, nDays);
    
    toast(`✅ ${place.name} → ${t('dayLabel')} ${day}`);
  };

  const removeItinItem = (day, idx) => {
    const currentItin = { ...itin };
    const removedItem = currentItin[day][idx];
    currentItin[day].splice(idx, 1);
    
    if (lastId === removedItem.id) {
      const allItems = Object.values(currentItin).flat();
      setLastId(allItems.length ? allItems[allItems.length - 1].id : null);
      if (!allItems.length) setLastDay(null);
    }
    
    setItin(currentItin);
    saveItinData(currentItin, nDays);
  };

  const moveItinItem = (day, idx, direction) => {
    const currentItin = { ...itin };
    const arr = currentItin[day];
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= arr.length) return;
    
    // Swap items
    const temp = arr[idx];
    arr[idx] = arr[newIdx];
    arr[newIdx] = temp;
    
    setItin(currentItin);
    saveItinData(currentItin, nDays);
  };

  const clearAll = () => {
    if (!confirm('ล้างแผนทั้งหมด?')) return;
    const cleared = {};
    for (let d = 1; d <= nDays; d++) cleared[d] = [];
    setItin(cleared);
    setLastId(null);
    setLastDay(null);
    saveItinData(cleared, nDays);
  };

  // ─── DRAG AND DROP HANDLERS ────────────────────────────────────────
  const handleDragStart = (e, item, source, index = null) => {
    dragItem.current = item;
    dragFromDay.current = source;
    dragIdx.current = index;
    e.dataTransfer.effectAllowed = source === 'sidebar' ? 'copy' : 'move';
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    dragOverDay.current = day;
  };

  const handleDrop = (e, day) => {
    e.preventDefault();
    const item = dragItem.current;
    if (!item) return;

    const currentItin = { ...itin };
    
    if (dragFromDay.current === 'sidebar') {
      const uniqueItinId = `${item.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      currentItin[day].push({
        id: item.id,
        itinId: uniqueItinId,
        name: item.name,
        cat: item.cat,
        dur: item.dur || 90,
        icon: item.icon,
        city_id: item.city_id || activeCity,
        names: item.names || {},
        lat: item.lat,
        lng: item.lng
      });
    } else {
      const fromDay = dragFromDay.current;
      currentItin[fromDay].splice(dragIdx.current, 1);
      currentItin[day].push(item);
    }

    setItin(currentItin);
    setLastId(item.id);
    setLastDay(day);
    saveItinData(currentItin, nDays);
    
    dragItem.current = null;
    dragFromDay.current = null;
    dragIdx.current = null;
  };

  // ─── GEOLOCATION / DISTANCE SCORING (NEARBY) ────────────────────────
  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  };

  const getNearbyPlaces = () => {
    if (!lastId) return [];
    const src = landmarks.find(l => l.id === lastId);
    if (!src || !src.lat) return [];

    const W_DIST = 0.60, W_CAT = 0.25, W_CITY = 0.15;
    const MAX_DIST_KM = 50;
    const used = usedIds();

    // Pool of candidates from landmarks of all loaded cities
    const pool = landmarks.filter(l => l.id !== src.id && !used.includes(l.id));

    return pool
      .map(cand => {
        let distScore = 0, distKm = null;
        if (src.lat && src.lng && cand.lat && cand.lng) {
          distKm = haversine(src.lat, src.lng, cand.lat, cand.lng);
          distScore = Math.max(0, 1 - distKm / MAX_DIST_KM);
        }
        const catScore = cand.cat === src.cat ? 1 : 0;
        const cityScore = cand.city_id === src.city_id ? 1 : 0;
        const total = distScore * W_DIST + catScore * W_CAT + cityScore * W_CITY;
        return { ...cand, distKm, distScore, catScore, cityScore, total };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  // ─── OPENSTREETMAP GEOCODING ────────────────────────────────────────
  const searchOSM = async () => {
    if (!osmQuery.trim()) return;
    setOsmResults([{ loading: true }]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(osmQuery)}&format=json&limit=5&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'th,en' } });
      const data = await res.json();
      if (!data.length) {
        setOsmResults([{ empty: true }]);
        return;
      }
      setOsmResults(data);
    } catch (e) {
      setOsmResults([{ error: true }]);
    }
  };

  const fillFromOSM = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    const name = place.name || place.display_name.split(',')[0];
    const addr = place.display_name.split(',').slice(0, 2).join(', ');
    
    setFName(name);
    setFAddr(addr);
    setFLat(lat);
    setFLng(lng);
    toast('ดึง GPS จาก OpenStreetMap สำเร็จ!');
  };

  // ─── GOOGLE MAPS LINK PARSER ────────────────────────────────────────
  const parseGmaps = () => {
    if (!gmapsUrl.trim()) return;
    let lat = null, lng = null, name = '';
    
    const m1 = gmapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m1) {
      lat = parseFloat(m1[1]);
      lng = parseFloat(m1[2]);
    }
    const m2 = gmapsUrl.match(/place\/([^/@?]+)/);
    if (m2) {
      name = decodeURIComponent(m2[1].replace(/\+/g, ' ')).replace(/\//g, '').trim();
    }
    const m3 = gmapsUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m3 && !lat) {
      lat = parseFloat(m3[1]);
      lng = parseFloat(m3[2]);
    }
    const m4 = gmapsUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m4 && !lat) {
      lat = parseFloat(m4[1]);
      lng = parseFloat(m4[2]);
    }
    const m5 = gmapsUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m5 && !lat) {
      lat = parseFloat(m5[1]);
      lng = parseFloat(m5[2]);
    }

    if (lat && lng) {
      setGmapsResult({ name, lat, lng });
    } else {
      setGmapsResult({ error: true });
    }
  };

  const fillFromMaps = (name, lat, lng) => {
    setActiveAddTab('manual');
    setFName(name || 'สถานที่จาก Google Maps');
    setFLat(lat);
    setFLng(lng);
    toast('ดึง GPS จาก Google Maps สำเร็จ!');
  };

  // ─── SAVE NEW CUSTOM PLACE ──────────────────────────────────────────
  const saveNewPlace = async () => {
    if (!fName.trim()) {
      toast('กรุณากรอกชื่อสถานที่');
      return;
    }

    const localId = Date.now();
    const localPlace = {
      id: localId,
      name: fName,
      cat: fCat,
      dur: parseInt(fDur) || 90,
      icon: fIcon || '🏯',
      desc: fDesc,
      addr: fAddr,
      lat: fLat ? parseFloat(fLat) : null,
      lng: fLng ? parseFloat(fLng) : null,
      fee: fFee,
      transport: fTransport ? [{ i: '🚇', t: fTransport }] : [],
      city_id: fCity,
      _custom: true
    };

    // Save to Supabase first (if connected + logged in) to get a stable id
    if (supabase && user) {
      try {
        const { data: sbData, error: sbErr } = await supabase.from('landmarks').insert([{
          id: String(localId),
          user_id: user.id,
          name: localPlace.name,
          cat: localPlace.cat,
          icon: localPlace.icon,
          city_id: localPlace.city_id,
          address: localPlace.addr,
          lat: localPlace.lat,
          lng: localPlace.lng,
          description: localPlace.desc,
          duration_min: localPlace.dur,
          fee: localPlace.fee,
          transport: localPlace.transport,
          status: 'user_custom'
        }]).select();
        if (sbErr) throw sbErr;
        if (sbData?.[0]) localPlace.id = sbData[0].id; // use Supabase id
      } catch (err) {
        console.warn('Failed to save custom place to Supabase:', err.message);
      }
    }

    // Also keep in local state as fallback
    const updatedCustom = { ...customPlaces };
    if (!updatedCustom[fCity]) updatedCustom[fCity] = [];
    updatedCustom[fCity].push(localPlace);
    setCustomPlaces(updatedCustom);
    localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: updatedCustom }));

    // Reset add place form
    setFName('');
    setFDesc('');
    setFAddr('');
    setFLat('');
    setFLng('');
    setFFee('');
    setFTransport('');
    setFIcon('🏯');
    setOsmQuery('');
    setOsmResults([]);
    setGmapsUrl('');
    setGmapsResult(null);
    setAddModalOpen(false);

    toast(`✅ เพิ่ม "${fName}" แล้ว`);
  };

  // ─── AI PLAN & SUGGEST ──────────────────────────────────────────────
  const handleAISuggest = async () => {
    if (!aiSuggestQuery.trim()) return;
    setAiSuggestLoading(true);
    setAiSuggestResult(null);
    try {
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiSuggestQuery })
      });
      const data = await res.json();
      if (res.ok) {
        setAiSuggestResult(data.places || []);
      } else {
        toast('AI Suggestion Failed');
      }
    } catch (_) {
      toast('Network Error');
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const addAIPlace = async (p) => {
    const targetCity = p.city || activeCity;
    const localId = Date.now() + Math.floor(Math.random() * 1000);
    const aiPlace = {
      id: localId,
      name: p.name,
      cat: p.cat || 'อื่นๆ',
      dur: p.dur || 90,
      icon: p.icon || '📍',
      desc: p.desc || '',
      addr: p.addr || '',
      lat: p.lat ? parseFloat(p.lat) : null,
      lng: p.lng ? parseFloat(p.lng) : null,
      fee: p.fee || '',
      transport: p.transport ? [{ i: '🚇', t: p.transport }] : [],
      city_id: targetCity,
      _custom: true
    };

    // Save to Supabase if logged in
    if (supabase && user) {
      try {
        const { data: sbData } = await supabase.from('landmarks').insert([{
          id: String(localId),
          user_id: user.id,
          name: aiPlace.name,
          cat: aiPlace.cat,
          icon: aiPlace.icon,
          city_id: aiPlace.city_id,
          address: aiPlace.addr,
          lat: aiPlace.lat,
          lng: aiPlace.lng,
          description: aiPlace.desc,
          duration_min: aiPlace.dur,
          fee: aiPlace.fee,
          transport: aiPlace.transport,
          status: 'user_custom'
        }]).select();
        if (sbData?.[0]) aiPlace.id = sbData[0].id;
      } catch (err) {
        console.warn('Failed to save AI place to Supabase:', err.message);
      }
    }

    const updatedCustom = { ...customPlaces };
    if (!updatedCustom[targetCity]) updatedCustom[targetCity] = [];
    updatedCustom[targetCity].push(aiPlace);
    setCustomPlaces(updatedCustom);
    localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: updatedCustom }));

    toast(`✅ เพิ่ม "${p.name}" แล้ว`);
  };

  const handleAIPlan = async () => {
    if (!aiHotel.trim()) {
      toast('กรุณากรอกที่พัก/โรงแรม');
      return;
    }
    if (!aiStart) {
      toast('กรุณาเลือกวันเดินทาง');
      return;
    }
    
    setAiPlanLoading(true);
    setAiPlanResult(null);
    setAiPlanStatus('generating');

    // Sync input dates
    setStartDate(aiStart);
    if (aiEnd) {
      setEndDate(aiEnd);
      handleDateSync(aiStart, aiEnd);
    }
    const daysCount = nDays;

    try {
      const res = await fetch('/api/ai-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel: aiHotel,
          city_id: activeCity,
          country_id: activeCountry,
          start_date: aiStart,
          num_days: daysCount,
          interests: selectedInterests
        })
      });
      const data = await res.json();
      if (res.ok && data.itin) {
        setAiPlanResult(data.itin);
        setAiPlanStatus('done');
      } else {
        setAiPlanStatus('error');
      }
    } catch (_) {
      setAiPlanStatus('error');
    } finally {
      setAiPlanLoading(false);
    }
  };

  const applyAIPlan = () => {
    if (!aiPlanResult) return;
    
    const newItin = {};
    for (let d = 1; d <= nDays; d++) {
      newItin[d] = aiPlanResult[d] || [];
    }
    
    setItin(newItin);
    setHotel(aiHotel);
    saveItinData(newItin, nDays);
    setAiPlanModalOpen(false);
    setAiPlanResult(null);
    setAiPlanStatus('');
    toast('ใส่แผน AI ในตารางแล้ว!');
  };

  // ─── EXPORT & SHARE ─────────────────────────────────────────────────
  const getFormattedItinerary = () => {
    let out = '';
    const st = startTime || '09:00';
    for (let d = 1; d <= nDays; d++) {
      const items = itin[d] || [];
      if (!items.length) continue;
      
      const dateText = startDate ? getLocalDate(d) : `${t('dayLabel')} ${d}`;
      out += `\n📅 วันที่ ${d} — ${dateText}\n${'─'.repeat(30)}\n`;
      
      let [sh, sm] = st.split(':').map(Number);
      let cur = sh * 60 + sm;
      let foodAdded = false;

      items.forEach((item, i) => {
        if (!foodAdded && cur >= 12 * 60 && i > 0) {
          out += `  🍽  พักกลางวัน\n`;
          cur += 90;
          foodAdded = true;
        }
        if (i > 0) {
          out += `  🚗  เดินทาง (~20 นาที)\n`;
          cur += 20;
        }
        const cityObj = getCityObj(item.city_id);
        out += `${toT(cur)}–${toT(cur + item.dur)}  ${item.icon} ${item.name}  [${cityObj ? cityObj.emoji + cityObj.name : ''}]\n`;
        if (item.addr) out += `  📍 ${item.addr}\n`;
        if (item.lat && item.lng) out += `  🗺 GPS: ${item.lat}, ${item.lng}\n`;
        if (item.fee) out += `  💰 ${item.fee}\n`;
        if (item.transport?.length) out += `  🚇 ${item.transport[0].t}\n`;
        out += '\n';
        cur += item.dur;
      });
    }
    return out.trim() || 'ยังไม่มีสถานที่ในแผน';
  };

  const getLocalDate = (dayNum) => {
    if (!startDate) return '';
    const dt = new Date(startDate);
    dt.setDate(dt.getDate() + dayNum - 1);
    const locale = activeLang === 'th' ? 'th-TH' : 'en-US';
    return dt.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const toT = (m) => {
    const h = Math.floor(m / 60) % 24;
    return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };

  const buildShareLink = () => {
    const data = {
      v: 1,
      itin: {},
      days: nDays,
      start: startDate,
      time: startTime,
      hotel: hotel
    };
    for (let d = 1; d <= nDays; d++) {
      const items = itin[d] || [];
      data.itin[d] = items.map(p => ({
        id: p.id,
        name: p.name,
        cat: p.cat,
        dur: p.dur,
        icon: p.icon,
        city_id: p.city_id
      }));
    }
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      return window.location.href.split('?')[0] + '?trip=' + encoded;
    } catch (_) {
      return window.location.href;
    }
  };

  const handleDownloadPDF = async () => {
    const textData = getFormattedItinerary();
    if (textData === 'ยังไม่มีสถานที่ในแผน') {
      toast('ยังไม่มีสถานที่ในแผน');
      return;
    }
    try {
      const res = await fetch('/api/ai-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: selectedStyle, itinerary: textData })
      });
      const data = await res.json();
      if (res.ok && data.html) {
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trip-itinerary-style${selectedStyle}.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast('ดาวน์โหลดสำเร็จ! เปิดในเบราว์เซอร์แล้ว Print เป็น PDF');
      } else {
        toast('ดาวน์โหลดไม่สำเร็จ');
      }
    } catch (_) {
      // Fallback plain text download
      const blob = new Blob([textData], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trip-itinerary.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast('ดาวน์โหลดเป็นไฟล์ข้อความเรียบร้อย');
    }
  };

  // Load from Share Link on startup
  useEffect(() => {
    if (!tripParam) return;
    try {
      // Replace any space characters (converted from '+' by URL parsers) back to '+'
      const cleanParam = tripParam.replace(/ /g, '+');
      const data = JSON.parse(decodeURIComponent(escape(atob(cleanParam))));
      if (data.days) setNDays(data.days);
      if (data.start) setStartDate(data.start);
      if (data.time) setStartTime(data.time);
      if (data.hotel) setHotel(data.hotel);
      
      const loadedItin = {};
      for (let d = 1; d <= (data.days || 3); d++) {
        loadedItin[d] = (data.itin && data.itin[d]) || [];
      }
      setItin(loadedItin);
      toast('โหลดแผนเดินทางจากลิงก์แบ่งปันสำเร็จ!');
    } catch (e) {
      console.warn('Share link decoding failed:', e);
    }
  }, [tripParam]);

  // ─── CALCULATE SUMMARY STATS ───────────────────────────────────────
  const getSummaryStats = () => {
    let placesCount = 0;
    let totalMinutes = 0;
    let activeDays = 0;
    const citiesSet = new Set();

    for (let d = 1; d <= nDays; d++) {
      const items = itin[d] || [];
      if (items.length) activeDays++;
      items.forEach(item => {
        placesCount++;
        totalMinutes += item.dur;
        const cityObj = getCityObj(item.city_id);
        if (cityObj) citiesSet.add(cityObj.name);
      });
    }

    const hours = (totalMinutes / 60).toFixed(1);
    const citiesStr = citiesSet.size > 0 ? Array.from(citiesSet).join(', ') : '—';
    return { placesCount, hours, activeDays, citiesStr };
  };

  const stats = getSummaryStats();
  const nearbySuggestions = getNearbyPlaces();

  // Apply visual theme to body class
  useEffect(() => {
    document.body.className = '';
    if (theme === 'colorful') document.body.classList.add('theme-colorful');
    if (theme === 'dark') document.body.classList.add('theme-dark');
    localStorage.setItem('tb_theme', theme);
  }, [theme]);

  // Set country helper
  const handleCountrySelect = (cId) => {
    setActiveCountry(cId);
    const country = COUNTRIES.find(c => c.id === cId);
    if (country && country.cities.length > 0) {
      setActiveCity(country.cities[0].id);
    }
    setFilterCat('__all__');
  };

  const getCategories = () => {
    const list = landmarks.map(l => l.cat).filter(Boolean);
    return ['__all__', ...Array.from(new Set(list))];
  };

  const filteredLandmarks = landmarks.filter(l => {
    if (filterCat !== '__all__' && l.cat !== filterCat) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const localName = ((l.names && l.names[activeLang]) || l.name).toLowerCase();
      return l.name.toLowerCase().includes(q) || localName.includes(q) || l.cat.toLowerCase().includes(q);
    }
    return true;
  });

  const cityColor = getCityObj(activeCity)?.color || '#1D9E75';

  return (
    <>
      {/* ─── TOPBAR ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="logo">
          <div className="logo-dot"></div>
          Trip Builder
        </div>
        <div className="topbar-sep" />
        
        {/* Country buttons */}
        <div className="country-row">
          {COUNTRIES.map(c => (
            <button
              key={c.id}
              className={`country-btn ${activeCountry === c.id ? 'active' : ''}`}
              style={activeCountry === c.id ? { background: getCityObj(activeCity)?.color || '#1D9E75' } : {}}
              onClick={() => handleCountrySelect(c.id)}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>
        
        <div className="topbar-sep" />

        {/* City buttons */}
        <div className="city-row">
          {(COUNTRIES.find(c => c.id === activeCountry)?.cities || []).map(c => (
            <button
              key={c.id}
              className={`city-btn ${activeCity === c.id ? 'active' : ''}`}
              style={activeCity === c.id ? { background: c.color, borderColor: c.color } : {}}
              onClick={() => {
                setActiveCity(c.id);
                setFilterCat('__all__');
              }}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        {/* Topbar Actions */}
        <div className="topbar-actions">
          <select
            className="lang-select"
            value={activeLang}
            onChange={(e) => {
              setActiveLang(e.target.value);
              localStorage.setItem('tb_lang', e.target.value);
            }}
            title="Language"
          >
            <option value="th">🇹🇭 ไทย</option>
            <option value="en">🇬🇧 EN</option>
          </select>
          
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '2px' }}>
            <button className={`theme-mode-btn ${theme === 'clean' ? 'active' : ''}`} onClick={() => setTheme('clean')} title="Clean">☀</button>
            <button className={`theme-mode-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark">🌙</button>
            <button className={`theme-mode-btn ${theme === 'colorful' ? 'active' : ''}`} onClick={() => setTheme('colorful')} title="Colorful">🎨</button>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={clearAll}>{t('clear')}</button>
          <button className="btn btn-primary btn-sm" onClick={() => setExportModalOpen(true)}>{t('export')}</button>

          {/* User Profile / Login Panel */}
          <div className="user-menu-container">
            {user ? (
              <>
                <div className="user-badge" onClick={() => setUserDropdownOpen(!userDropdownOpen)}>
                  <div className="user-avatar">
                    {user.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <span>{user.email ? user.email.split('@')[0] : 'Member'}</span>
                  <span>▼</span>
                </div>
                
                {userDropdownOpen && (
                  <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="dropdown-email">
                      📧 {user.email}
                    </div>
                    
                    <div className="plans-section-title">
                      📂 {activeLang === 'th' ? 'แผนเดินทางของฉัน' : 'My Travel Plans'}
                    </div>
                    
                    <div className="plans-list-container">
                      {plansList.map(plan => {
                        const isActive = activePlanId === plan.id;
                        return (
                          <div 
                            key={plan.id} 
                            className={`plan-item-row ${isActive ? 'active' : ''}`}
                            onClick={() => loadActivePlan(plan.id)}
                          >
                            <span className="plan-item-info">
                              {getCityObj(plan.city_id)?.emoji || '📍'} {plan.name} ({plan.nDays} วัน)
                            </span>
                            <div className="plan-item-actions">
                              <button 
                                className="plan-btn-mini rename" 
                                title={activeLang === 'th' ? 'เปลี่ยนชื่อ' : 'Rename'}
                                onClick={(e) => renamePlan(plan.id, e)}
                              >
                                ✏️
                              </button>
                              <button 
                                className="plan-btn-mini" 
                                title={activeLang === 'th' ? 'ลบ' : 'Delete'}
                                onClick={(e) => deletePlan(plan.id, e)}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={createNewPlan}
                    >
                      ➕ {activeLang === 'th' ? 'สร้างแผนใหม่' : 'New Plan'}
                    </button>
                    
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ width: '100%', justifyContent: 'center', background: 'var(--red)', borderColor: 'var(--red)' }}
                      onClick={handleSignOut}
                    >
                      🚪 {activeLang === 'th' ? 'ออกจากระบบ' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                style={{ border: '1px solid var(--border)' }}
              >
                👤 {activeLang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN LAYOUT ────────────────────────────────────────────── */}
      <div className="layout">
        
        {/* ─── SIDEBAR (ATTRACTIONS LIST) ─── */}
        <aside className={`sidebar ${mobileTab === 'places' ? 'mob-active' : ''}`}>
          <div className="sidebar-head">
            <div className="sidebar-title">{t('places')}</div>
            <div className="search-wrap">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Add Attraction options */}
            <div className="add-mode-row">
              <button className="mode-btn" onClick={() => { setAddModalOpen(true); setActiveAddTab('manual'); }}>
                <div>✏️</div>
                <span>{t('addManual')}</span>
              </button>
              <button className="mode-btn" onClick={() => { setAddModalOpen(true); setActiveAddTab('ai'); }}>
                <div>🤖</div>
                <span>{t('addAI')}</span>
              </button>
              <button className="mode-btn" onClick={() => { setAddModalOpen(true); setActiveAddTab('gmaps'); }}>
                <div>📍</div>
                <span>{t('addGmaps')}</span>
              </button>
            </div>
          </div>

          {/* Categories select */}
          <div className="cat-wrap">
            {getCategories().map(c => {
              const label = c === '__all__' ? (activeLang === 'th' ? 'ทั้งหมด' : 'All') : c;
              return (
                <button
                  key={c}
                  className={`cat-btn ${filterCat === c ? 'active' : ''}`}
                  style={filterCat === c ? { background: cityColor, borderColor: cityColor } : {}}
                  onClick={() => setFilterCat(c)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Landmarks list rendering */}
          <div className="lm-list">
            {isLoading ? (
              Array(5).fill(0).map((_, idx) => (
                <div className="lm-skeleton" key={idx}>
                  <div className="lm-skel-cover" />
                  <div className="lm-skel-body">
                    <div className="lm-skel-line" />
                    <div className="lm-skel-line short" />
                  </div>
                </div>
              ))
            ) : filteredLandmarks.length > 0 ? (
              filteredLandmarks.map(l => {
                const count = getSelectedCount(l.id);
                const isHighlighted = lastId === l.id;
                
                const coverStyle = l.cover_image
                  ? { backgroundImage: `url(${l.cover_image})` }
                  : { background: 'linear-gradient(135deg, #F1EFE8, #D3D1C7)' };

                return (
                  <div
                    key={l.id}
                    className={`lm-card ${count > 0 ? 'selected' : ''} ${isHighlighted ? 'highlight' : ''}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, l, 'sidebar')}
                    onClick={() => {
                      // For mobile touch tap-to-add
                      let targetD = null;
                      for (let d = 1; d <= nDays; d++) {
                        if (!itin[d]) itin[d] = [];
                        if (itin[d].length < 5) {
                          targetD = d;
                          break;
                        }
                      }
                      if (targetD) addToDay(l, targetD);
                      else toast('ทุกวันเต็มแล้ว (สูงสุด 5 ที่/วัน)');
                    }}
                  >
                    <button
                      className="info-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(l);
                      }}
                      title="Info"
                    >
                      ℹ
                    </button>
                    <div className="lm-cover-strip">
                      <img src={getCoverImage(l)} alt="" />
                      <span className="lm-cover-icon">{l.icon}</span>
                      {count > 0 && (
                        <span className="lm-count-badge">
                          {activeLang === 'th' ? `เลือกแล้ว ${count} ครั้ง` : `${count}x selected`}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '6px 8px' }}>
                      <div className="lm-name">{(l.names && l.names[activeLang]) || l.name}</div>
                      <div className="lm-sub">
                        <span className="badge" style={{ background: getCityObj(activeCity)?.light || '#E1F5EE', color: getCityObj(activeCity)?.dark || '#0F6E56' }}>
                          {l.cat}
                        </span>
                        <span className="lm-dur">⏱ {l.dur}m</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '20px 0', opacity: .6 }}>—</div>
            )}
          </div>
        </aside>

        {/* ─── MAIN BUILDER PANEL ─── */}
        <main className="main" style={mobileTab !== 'plan' ? { display: 'none' } : {}}>
          
          <div className="main-head">
            <div className="main-title">{t('itinerary')}</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-ghost btn-sm" onClick={clearAll}>{t('clear')}</button>
              <button className="btn btn-primary btn-sm" onClick={() => setExportModalOpen(true)}>{t('export')}</button>
            </div>
          </div>

          {/* Config row */}
          <div className="trip-bar">
            <div className="cfg">
              <label>{t('startDate')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleDateSync(e.target.value, endDate);
                }}
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', alignSelf: 'flex-end', paddingBottom: '6px' }}>→</div>
            <div className="cfg">
              <label>{t('endDate')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleDateSync(startDate, e.target.value);
                }}
              />
            </div>
            <div className="trip-bar-divider" />
            <div className="cfg">
              <label>{t('departTime')}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="trip-bar-divider" />
            <div className="cfg" style={{ flex: '1', minWidth: '140px' }}>
              <label>{t('hotel')}</label>
              <input
                type="text"
                placeholder={t('hotelPh')}
                value={hotel}
                onChange={(e) => setHotel(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div className="trip-bar-divider" />
            <div className="cfg">
              <label>{t('numDays')}</label>
              <select
                value={nDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setNDays(val);
                  adjustDays(val);
                }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
              </select>
            </div>
            <button className="ai-plan-btn" onClick={() => {
              setAiPlanModalOpen(true);
              setAiHotel(hotel);
              setAiStart(startDate);
              setAiEnd(endDate);
            }}>
              <span className="spark">✦</span>
              <span>{t('aiPlanBtn')}</span>
            </button>
          </div>

          {/* Stats bar */}
          <div className="summary-bar">
            <div>
              <div className="stat-val">{stats.placesCount}</div>
              <div className="stat-lbl">{t('statPlaces')}</div>
            </div>
            <div className="div-v" />
            <div>
              <div className="stat-val">{stats.hours} ชม.</div>
              <div className="stat-lbl">{t('statHours')}</div>
            </div>
            <div className="div-v" />
            <div>
              <div className="stat-val">{stats.activeDays}</div>
              <div className="stat-lbl">{t('statDays')}</div>
            </div>
            <div className="div-v" />
            <div>
              <div className="stat-val">{stats.citiesStr}</div>
              <div className="stat-lbl">{t('statCities')}</div>
            </div>
          </div>

          {/* Day Columns */}
          <div className="days-grid">
            {Array(nDays).fill(0).map((_, i) => {
              const day = i + 1;
              const items = itin[day] || [];
              const dayColor = DAY_COLORS[i % DAY_COLORS.length];
              
              // Calculate day duration
              const totalMin = items.reduce((s, x) => s + x.dur, 0);
              const hourCount = Math.floor(totalMin / 60);
              const minCount = totalMin % 60;
              const durationLabel = `${hourCount}h${minCount ? minCount + 'm' : ''}`;

              let [sh, sm] = startTime.split(':').map(Number);
              let currentTimeInMin = sh * 60 + sm;
              let lunchAdded = false;

              return (
                <div className="day-col" key={day}>
                  <div className="day-hd">
                    <span className="day-lbl" style={{ background: dayColor.bg, color: dayColor.t, border: `1px solid ${dayColor.b}` }}>
                      {t('dayLabel')} {day} · {getLocalDate(day)}
                    </span>
                    <span className="day-info">
                      {items.length} · {durationLabel}
                    </span>
                  </div>
                  
                  <div
                    className="day-zone drop-zone"
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDrop={(e) => handleDrop(e, day)}
                    data-day={day}
                  >
                    {items.length > 0 ? (
                      items.map((item, idx) => {
                        // Render travel separation between items
                        const isLastAdded = lastId === item.id && lastDay === day;
                        const cityObj = getCityObj(item.city_id) || { emoji: '📍', name: '', light: '#E1F5EE', dark: '#0F6E56' };

                        const htmlElements = [];

                        // Inject Lunch time placeholder
                        if (!lunchAdded && currentTimeInMin >= 12 * 60 && idx > 0) {
                          htmlElements.push(
                            <div className="travel-row" key={`lunch_${idx}`}>
                              <div className="tline" />
                              <span className="tlabel">🍽 90m พักกลางวัน</span>
                              <div className="tline" />
                            </div>
                          );
                          currentTimeInMin += 90;
                          lunchAdded = true;
                        }

                        // Inject Travel separation placeholder
                        if (idx > 0) {
                          htmlElements.push(
                            <div className="travel-row" key={`travel_${idx}`}>
                              <div className="tline" />
                              <span className="tlabel">🚗 20m เดินทาง</span>
                              <div className="tline" />
                            </div>
                          );
                          currentTimeInMin += 20;
                        }

                        const startT = toT(currentTimeInMin);
                        const endT = toT(currentTimeInMin + item.dur);
                        currentTimeInMin += item.dur;

                        htmlElements.push(
                          <div
                            key={item.itinId || `${item.id}_${day}_${idx}`}
                            className={`it-item ${isLastAdded ? 'last-added' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item, day, idx)}
                            style={{ padding: 0 }}
                          >
                            <div className="it-cover-strip">
                              <img src={getCoverImage(item)} alt="" />
                              <span className="it-cover-icon">{item.icon}</span>
                            </div>
                            <div style={{ padding: '6px 8px' }}>
                              <div className="it-top">
                                <div className="it-name" onClick={() => handleOpenDetail(landmarks.find(l => l.id === item.id) || item)}>
                                  {(item.names && item.names[activeLang]) || item.name}
                                </div>
                                <div className="it-actions">
                                  {idx > 0 && <button className="mvbtn" onClick={() => moveItinItem(day, idx, -1)}>↑</button>}
                                  {idx < items.length - 1 && <button className="mvbtn" onClick={() => moveItinItem(day, idx, 1)}>↓</button>}
                                  <button className="xbtn" onClick={() => removeItinItem(day, idx)}>✕</button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                                <div className="it-time">{startT} – {endT}</div>
                                <button
                                  className="it-dur-badge"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    promptEditDuration(day, idx, item);
                                  }}
                                  title={activeLang === 'th' ? 'แก้ไขเวลาเที่ยว' : 'Edit Visit Duration'}
                                >
                                  ⏱ {item.dur}m
                                </button>
                              </div>
                              <span className="it-chip" style={{ background: cityObj.light, color: cityObj.dark }}>
                                {cityObj.emoji} {cityObj.name}
                              </span>
                            </div>
                          </div>
                        );

                        return htmlElements;
                      })
                    ) : (
                      <div className="zone-empty">
                        <div className="zone-empty-icon">✈</div>
                        <span>{t('dragHere')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* ─── RECOMMENDATIONS PANEL ─── */}
        <aside className={`nearby ${mobileTab === 'nearby' ? 'mob-active' : ''}`}>
          <div className="nearby-head">
            <div className="nearby-title">{t('nearby')}</div>
          </div>
          <div className="nearby-body">
            {!lastId ? (
              <div className="nearby-empty">
                {t('nearbyEmpty').split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
              </div>
            ) : (
              <div>
                <div className="nearby-ctx">
                  {t('nearbyFrom')}<br />
                  <strong>{landmarks.find(l => l.id === lastId)?.icon} {landmarks.find(l => l.id === lastId)?.name}</strong>
                  <span style={{ fontSize: '9px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                    {t('nearbySort')}
                  </span>
                </div>
                
                {nearbySuggestions.length > 0 ? (
                  nearbySuggestions.map(n => (
                    <div className="n-item" key={n.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="n-name">{n.icon} {n.name}</div>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} onClick={() => handleOpenDetail(n)}>ℹ</button>
                      </div>
                      <div className="n-meta">
                        <span className="badge" style={{ background: getCityObj(n.city_id)?.light, color: getCityObj(n.city_id)?.dark }}>{n.cat}</span>
                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>⏱ {n.dur}m</span>
                        {n.distKm !== null && <span style={{ fontSize: '10px', color: 'var(--muted)' }}>📍 {n.distKm < 1 ? `${Math.round(n.distKm * 1000)}m` : `${n.distKm.toFixed(1)}km`}</span>}
                      </div>
                      
                      {/* Match Score bar */}
                      <div style={{ marginTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{t('scoreTotal')}</span>
                          <span style={{ fontSize: '11px', fontWeight: '500' }}>{Math.round(n.total * 100)}%</span>
                        </div>
                        <div className="score-bar">
                          <div style={{ height: '100%', display: 'flex', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.round(n.distScore * 60)}%`, background: '#1D9E75' }} />
                            <div style={{ width: `${Math.round(n.catScore * 25)}%`, background: '#378ADD' }} />
                            <div style={{ width: `${Math.round(n.cityScore * 15)}%`, background: '#EF9F27' }} />
                          </div>
                        </div>
                      </div>

                      <button
                        className="n-addbtn"
                        style={{ background: getCityObj(n.city_id)?.color }}
                        onClick={() => addToDay(n, lastDay || 1)}
                      >
                        {t('addBtn')} {lastDay || 1}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="nearby-empty">{t('noNearby')}</div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ─── MOBILE BOTTOM NAV ──────────────────────────────────────── */}
      <nav className="mob-nav">
        <button className={`mob-nav-btn ${mobileTab === 'plan' ? 'active' : ''}`} onClick={() => setMobileTab('plan')}>
          <span className="nav-icon">🗓</span>
          <span>{t('mobPlan')}</span>
        </button>
        <button className={`mob-nav-btn ${mobileTab === 'places' ? 'active' : ''}`} onClick={() => setMobileTab('places')}>
          <span className="nav-icon">📍</span>
          <span>{t('mobPlaces')}</span>
        </button>
        <button className={`mob-nav-btn ${mobileTab === 'nearby' ? 'active' : ''}`} onClick={() => setMobileTab('nearby')}>
          <span className="nav-icon">💡</span>
          <span>{t('mobNearby')}</span>
        </button>
        <button className="mob-nav-btn" onClick={() => setExportModalOpen(true)}>
          <span className="nav-icon">📤</span>
          <span>{t('mobExport')}</span>
        </button>
      </nav>
      
      {/* Mobile FAB */}
      <button className="mob-fab" onClick={() => { setAddModalOpen(true); setActiveAddTab('manual'); }} title="Add Attraction">➕</button>

      {/* ─── TOAST NOTIFICATION ─────────────────────────────────────── */}
      <div className={`toast ${toastMessage ? 'show' : ''}`}>{toastMessage}</div>

      {/* ─── DETAIL MODAL ───────────────────────────────────────────── */}
      {selectedPlace && (
        <div className="overlay show" onClick={() => { setSelectedPlace(null); setIsEditing(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">
                  {isEditing ? '✏️ แก้ไขข้อมูลสถานที่' : `${selectedPlace.icon} ${selectedPlace.name}`}
                </div>
                {!isEditing && (
                  <div className="chip-row">
                    <span className="chip">{getCityObj(selectedPlace.city_id || activeCity)?.emoji} {getCityObj(selectedPlace.city_id || activeCity)?.name}</span>
                    <span className="chip">{selectedPlace.cat}</span>
                    <span className="chip">⏱ {selectedPlace.dur}m</span>
                  </div>
                )}
              </div>
              <button className="modal-close" onClick={() => { setSelectedPlace(null); setIsEditing(false); }}>✕</button>
            </div>
            
            <div className="modal-body">
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">{t('fName')}</label>
                    <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('fDesc')}</label>
                    <textarea className="form-input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t('fCat')}</label>
                      <select className="form-input" value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                        <option>วัด</option>
                        <option>พระราชวัง</option>
                        <option>ตลาด</option>
                        <option>ย่าน</option>
                        <option>พิพิธภัณฑ์</option>
                        <option>ธรรมชาติ</option>
                        <option>ช้อปปิ้ง</option>
                        <option>ร้านอาหาร</option>
                        <option>คาเฟ่</option>
                        <option>วิวทิวทัศน์</option>
                        <option>อื่นๆ</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('fDur')}</label>
                      <input className="form-input" type="number" value={editDur} onChange={(e) => setEditDur(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('fAddr')}</label>
                    <input className="form-input" value={editAddr} onChange={(e) => setEditAddr(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Latitude</label>
                      <input className="form-input" type="number" step="any" value={editLat} onChange={(e) => setEditLat(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Longitude</label>
                      <input className="form-input" type="number" step="any" value={editLng} onChange={(e) => setEditLng(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('fFee')}</label>
                    <input className="form-input" value={editFee} onChange={(e) => setEditFee(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('fTransport')}</label>
                    <input className="form-input" value={editTransport} onChange={(e) => setEditTransport(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t('fIcon')}</label>
                      <input className="form-input" value={editIcon} onChange={(e) => setEditIcon(e.target.value)} maxLength={2} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">คำค้นหารูปภาพ (Image Keywords)</label>
                      <input className="form-input" value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} />
                    </div>
                  </div>

                  {/* IMAGE SELECTOR GRID */}
                  <div className="form-group">
                    <label className="form-label">เลือกรูปภาพที่ต้องการแสดง (คลิกเพื่อเลือก):</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                      {[1, 2, 3, 4, 5, 6].map(lock => {
                        const cityKey = CITY_KEYWORDS[selectedPlace.city_id || activeCity] || 'travel';
                        const url = `https://loremflickr.com/400/300/${cityKey},${editKeywords || 'travel'}/all?lock=${lock}`;
                        const isSelected = editSelectedImage === url;

                        return (
                          <div
                            key={lock}
                            onClick={() => setEditSelectedImage(url)}
                            style={{
                              position: 'relative',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: isSelected ? '3px solid var(--teal)' : '2px solid var(--border)',
                              transform: isSelected ? 'scale(0.98)' : 'none',
                              transition: 'all 0.15s'
                            }}
                          >
                            <img src={url} alt="" style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'var(--teal)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">หรือใส่ลิงก์รูปภาพอื่นๆ (Custom Image URL)</label>
                    <input
                      className="form-input"
                      placeholder="https://..."
                      value={editSelectedImage}
                      onChange={(e) => setEditSelectedImage(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                  {/* Render cover image in detail modal */}
                  <div style={{ height: '180px', borderRadius: '8px', overflow: 'hidden', position: 'relative', marginBottom: '4px' }}>
                    <img src={getCoverImage(selectedPlace)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
                      {selectedPlace.icon} {selectedPlace.name}
                    </div>
                  </div>
                  {selectedPlace.desc && (
                    <div className="detail-section">
                      <div className="detail-label">{t('fDesc')}</div>
                      <div className="detail-value">{selectedPlace.desc}</div>
                    </div>
                  )}
                  {selectedPlace.addr && (
                    <div className="detail-section">
                      <div className="detail-label">{t('detailAddr')}</div>
                      <div className="detail-value">{selectedPlace.addr}</div>
                    </div>
                  )}
                  {selectedPlace.lat && selectedPlace.lng && (
                    <div className="detail-section">
                      <div className="detail-label">{t('detailGPS')}</div>
                      <div className="gps-box">
                        <div className="gps-text">{selectedPlace.lat.toFixed(5)}° N, {selectedPlace.lng.toFixed(5)}° E</div>
                        <div className="gps-btns">
                          <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(`${selectedPlace.lat},${selectedPlace.lng}`); toast('คัดลอก GPS แล้ว'); }}>{t('copyGPS')}</button>
                          <a className="maps-link" href={`https://www.google.com/maps?q=${selectedPlace.lat},${selectedPlace.lng}`} target="_blank" rel="noreferrer">{t('openMaps')}</a>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedPlace.fee && (
                    <div className="detail-section">
                      <div className="detail-label">{t('detailFee')}</div>
                      <span className="fee-tag">💰 {selectedPlace.fee}</span>
                    </div>
                  )}
                  {selectedPlace.transport && selectedPlace.transport.length > 0 && (
                    <div className="detail-section">
                      <div className="detail-label">{t('detailTransport')}</div>
                      <div className="transport-list">
                        {selectedPlace.transport.map((tr, idx) => (
                          <div className="transport-row" key={idx}>
                            <div className="transport-icon">{tr.i}</div>
                            <div className="transport-text">{tr.t}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!isEditing && (
              <div className="add-day-wrap">
                <div className="add-day-label">{t('addToDay')}</div>
                <div className="day-picker-row">
                  {Array(nDays).fill(0).map((_, i) => {
                    const day = i + 1;
                    const full = (itin[day] || []).length >= 5;
                    const dayColor = DAY_COLORS[i % DAY_COLORS.length];
                    
                    return (
                      <button
                        key={day}
                        className="day-pick-btn"
                        style={!full ? { borderColor: dayColor.b, color: dayColor.t, background: dayColor.bg } : { opacity: 0.4, cursor: 'not-allowed' }}
                        disabled={full}
                        onClick={() => {
                          addToDay(selectedPlace, day);
                          setSelectedPlace(null);
                        }}
                      >
                        <b>{t('dayLabel')} {day}</b> ({ (itin[day] || []).length }{full ? ' · full' : ''})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="modal-foot">
              {isEditing ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>ยกเลิก</button>
                  <button className="btn btn-primary" onClick={handleSaveEdit}>บันทึก</button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => setIsEditing(true)}>✏️ แก้ไขข้อมูล</button>
                  <button className="btn btn-ghost" onClick={() => setSelectedPlace(null)}>{t('close')}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD NEW ATTRACTION MODAL ───────────────────────────────── */}
      {addModalOpen && (
        <div className="overlay show" onClick={() => setAddModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{t('addNew')}</div>
              <button className="modal-close" onClick={() => setAddModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="tab-row">
                <button className={`tab-btn ${activeAddTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveAddTab('manual')}>{t('tabManual')}</button>
                <button className={`tab-btn ${activeAddTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveAddTab('ai')}>{t('tabAI')}</button>
                <button className={`tab-btn ${activeAddTab === 'gmaps' ? 'active' : ''}`} onClick={() => setActiveAddTab('gmaps')}>{t('tabGmaps')}</button>
              </div>

              {/* MANUAL TAB */}
              {activeAddTab === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="form-group">
                    <div className="form-label">{t('osmSearch')}</div>
                    <div className="input-row">
                      <input
                        className="form-input"
                        placeholder={t('osmPh')}
                        value={osmQuery}
                        onChange={(e) => setOsmQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchOSM()}
                      />
                      <button className="btn btn-primary btn-sm" onClick={searchOSM}>{t('osmBtn')}</button>
                    </div>
                    
                    {osmResults.length > 0 && (
                      <div style={{ marginTop: '6px', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px' }}>
                        {osmResults[0].loading ? (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>กำลังค้นหา...</div>
                        ) : osmResults[0].empty ? (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>ไม่พบผลลัพธ์</div>
                        ) : osmResults[0].error ? (
                          <div style={{ fontSize: '11px', color: 'var(--red)', textAlign: 'center' }}>เกิดข้อผิดพลาด</div>
                        ) : (
                          osmResults.map((res, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                              <div style={{ fontSize: '11px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>{res.display_name}</div>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => fillFromOSM(res)}>ใช้</button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <div className="form-label">{t('fName')}</div>
                    <input className="form-input" value={fName} onChange={(e) => setFName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <div className="form-label">{t('fDesc')}</div>
                    <textarea className="form-input" value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <div className="form-label">{t('fCat')}</div>
                      <select className="form-input" value={fCat} onChange={(e) => setFCat(e.target.value)}>
                        <option>วัด</option>
                        <option>พระราชวัง</option>
                        <option>ตลาด</option>
                        <option>ย่าน</option>
                        <option>พิพิธภัณฑ์</option>
                        <option>ธรรมชาติ</option>
                        <option>ช้อปปิ้ง</option>
                        <option>ร้านอาหาร</option>
                        <option>คาเฟ่</option>
                        <option>วิวทิวทัศน์</option>
                        <option>อื่นๆ</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <div className="form-label">{t('fDur')}</div>
                      <input className="form-input" type="number" value={fDur} onChange={(e) => setFDur(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="form-label">{t('fAddr')}</div>
                    <input className="form-input" value={fAddr} onChange={(e) => setFAddr(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <div className="form-label">Latitude</div>
                      <input className="form-input" type="number" step="any" value={fLat} onChange={(e) => setFLat(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <div className="form-label">Longitude</div>
                      <input className="form-input" type="number" step="any" value={fLng} onChange={(e) => setFLng(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="form-label">{t('fFee')}</div>
                    <input className="form-input" value={fFee} onChange={(e) => setFFee(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <div className="form-label">{t('fTransport')}</div>
                    <input className="form-input" value={fTransport} onChange={(e) => setFTransport(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <div className="form-label">{t('fIcon')}</div>
                      <input className="form-input" value={fIcon} onChange={(e) => setFIcon(e.target.value)} maxLength={2} />
                    </div>
                    <div className="form-group">
                      <div className="form-label">{t('fCity')}</div>
                      <select className="form-input" value={fCity} onChange={(e) => setFCity(e.target.value)}>
                        {COUNTRIES.flatMap(co => co.cities).map(ci => (
                          <option key={ci.id} value={ci.id}>{ci.emoji} {ci.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* AI TAB */}
              {activeAddTab === 'ai' && (
                <div className="ai-box">
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>พิมพ์หาสถานที่ท่องเที่ยวที่ต้องการให้ AI แนะนำพิกัดให้ เช่น &quot;คาเฟ่วิวแม่น้ำเจ้าพระยา&quot;</div>
                  <div className="input-row">
                    <input
                      className="form-input"
                      placeholder="เช่น วัดสวยๆ ถ่ายรูปสวยในกรุงเทพ..."
                      value={aiSuggestQuery}
                      onChange={(e) => setAiSuggestQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAISuggest()}
                    />
                    <button className="btn btn-primary btn-sm" disabled={aiSuggestLoading} onClick={handleAISuggest}>
                      {aiSuggestLoading ? '...' : 'ค้นหา'}
                    </button>
                  </div>
                  
                  {aiSuggestResult && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {aiSuggestResult.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>ไม่พบผลลัพธ์</div>
                      ) : (
                        aiSuggestResult.map((place, idx) => (
                          <div key={idx} className="ai-place-row">
                            <div>
                              <div className="ai-place-name">{place.icon} {place.name}</div>
                              <div className="ai-place-sub">{place.cat} · {place.dur}น.</div>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={() => addAIPlace(place)}>+ เพิ่ม</button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* GOOGLE MAPS TAB */}
              {activeAddTab === 'gmaps' && (
                <div className="gmaps-box">
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{t('gmapsHow')}<br />1. {t('gmaps1')}<br />2. {t('gmaps2')}<br />3. {t('gmaps3')}</div>
                  <div className="input-row">
                    <input
                      className="form-input"
                      placeholder="https://maps.app.goo.gl/..."
                      value={gmapsUrl}
                      onChange={(e) => setGmapsUrl(e.target.value)}
                    />
                    <button className="btn btn-primary btn-sm" onClick={parseGmaps}>{t('gmapsPullBtn')}</button>
                  </div>
                  {gmapsResult && (
                    <div style={{ marginTop: '10px' }}>
                      {gmapsResult.error ? (
                        <div style={{ fontSize: '11px', color: 'var(--red)', background: 'var(--red-l)', padding: '6px', borderRadius: '6px' }}>ไม่พบพิกัดในลิงก์นี้ กรุณาใช้ลิงก์แบบยาว (Full link)</div>
                      ) : (
                        <div className="info-box">
                          <div style={{ fontSize: '12px', fontWeight: '500' }}>{gmapsResult.name || 'สถานที่ดึงจาก Maps'}</div>
                          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>GPS: {gmapsResult.lat.toFixed(5)}, {gmapsResult.lng.toFixed(5)}</div>
                          <button className="btn btn-primary btn-sm" style={{ marginTop: '6px' }} onClick={() => fillFromMaps(gmapsResult.name, gmapsResult.lat, gmapsResult.lng)}>กรอกในฟอร์ม →</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAddModalOpen(false)}>{t('cancel')}</button>
              {activeAddTab === 'manual' && <button className="btn btn-primary" onClick={saveNewPlace}>{t('save')}</button>}
            </div>
          </div>
        </div>
      )}

      {/* ─── EXPORT & SHARE MODAL ───────────────────────────────────── */}
      {exportModalOpen && (
        <div className="overlay show" onClick={() => setExportModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{t('exportTitle')}</div>
              <button className="modal-close" onClick={() => setExportModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <div className="form-label">{t('exportFmt')}</div>
                <div className="style-grid">
                  <div className={`style-card ${selectedStyle === 'A' ? 'active' : ''}`} onClick={() => setSelectedStyle('A')}>
                    <div className="style-icon">🎨</div>
                    <div className="style-name">Beautiful</div>
                    <div className="style-desc">{t('pdfBeautiful')}</div>
                  </div>
                  <div className={`style-card ${selectedStyle === 'B' ? 'active' : ''}`} onClick={() => setSelectedStyle('B')}>
                    <div className="style-icon">📄</div>
                    <div className="style-name">Clean</div>
                    <div className="style-desc">{t('pdfClean')}</div>
                  </div>
                  <div className={`style-card ${selectedStyle === 'C' ? 'active' : ''}`} onClick={() => setSelectedStyle('C')}>
                    <div className="style-icon">📈</div>
                    <div className="style-name">Timeline</div>
                    <div className="style-desc">{t('pdfTimeline')}</div>
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <div className="form-label">{t('exportShare')}</div>
                <div className="share-box">
                  <input
                    type="text"
                    readOnly
                    className="share-url notranslate"
                    translate="no"
                    value={buildShareLink()}
                    onClick={(e) => e.target.select()}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(buildShareLink()); toast('คัดลอกลิงก์แชร์แล้ว!'); }}>คัดลอก</button>
                </div>
                <div className="share-note">{t('exportShareNote')}</div>
              </div>
              
              <div className="form-group">
                <div className="form-label">{t('exportPreview')}</div>
                <pre className="out-box">{getFormattedItinerary()}</pre>
              </div>
            </div>
            
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setExportModalOpen(false)}>{t('close')}</button>
              <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(getFormattedItinerary()); toast('คัดลอกข้อความแล้ว!'); }}>{t('copyText')}</button>
              <button className="btn btn-primary" onClick={handleDownloadPDF}>{t('downloadPDF')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI PLANNER MODAL ───────────────────────────────────────── */}
      {aiPlanModalOpen && (
        <div className="overlay show" onClick={() => setAiPlanModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{t('aiModalTitle')}</div>
              <button className="modal-close" onClick={() => setAiPlanModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="ai-modal-info">{t('aiInfo')}</div>
              
              <div className="form-group">
                <label className="form-label">{t('aiHotel')} <span style={{ fontWeight: 'normal', color: 'var(--muted)' }}>{t('aiHotelSub')}</span></label>
                <input className="form-input" placeholder={t('aiHotelPh')} value={aiHotel} onChange={(e) => setAiHotel(e.target.value)} />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('startDate')}</label>
                  <input type="date" className="form-input" value={aiStart} onChange={(e) => setAiStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('endDate')}</label>
                  <input type="date" className="form-input" value={aiEnd} onChange={(e) => setAiEnd(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('aiInterests')} <span style={{ fontWeight: 'normal', color: 'var(--muted)' }}>{t('aiInterestsSub')}</span></label>
                <div className="interests-wrap">
                  {['🍜 อาหาร', '🛍 ช้อปปิ้ง', '🛕 วัด/ประวัติศาสตร์', '🌿 ธรรมชาติ', '🎨 ศิลปะ/วัฒนธรรม', '📸 ถ่ายรูป', '☕ คาเฟ่', '🏖 ชายหาด'].map(interest => {
                    const isActive = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        className={`interest-chip ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          if (isActive) {
                            setSelectedInterests(selectedInterests.filter(i => i !== interest));
                          } else {
                            setSelectedInterests([...selectedInterests, interest]);
                          }
                        }}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan results display */}
              {aiPlanStatus && (
                <div style={{ marginTop: '12px' }}>
                  {aiPlanStatus === 'generating' && (
                    <div className="ai-generating">
                      <div className="ai-gen-icon" style={{ fontSize: '24px', textAlign: 'center' }}>✦</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>AI กำลังคำนวณและวางเส้นทางให้คุณอยู่...</div>
                    </div>
                  )}
                  {aiPlanStatus === 'error' && (
                    <div style={{ fontSize: '11px', color: 'var(--red)', background: 'var(--red-l)', padding: '8px', borderRadius: '8px' }}>
                      เกิดข้อผิดพลาดในการสร้างแผน กรุณาลองอีกครั้ง
                    </div>
                  )}
                  {aiPlanStatus === 'done' && aiPlanResult && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '500' }}>แผนการเดินทางของคุณเสร็จเรียบร้อย!</div>
                      <div className="ai-result-preview" style={{ fontSize: '11px', background: 'var(--bg)', padding: '10px', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                        {Object.entries(aiPlanResult).map(([d, items]) => (
                          <div key={d} style={{ marginBottom: '8px' }}>
                            <b>วันทื่ {d}:</b> {items.map(it => it.name).join(' → ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAiPlanModalOpen(false)}>{t('close')}</button>
              {aiPlanStatus !== 'done' ? (
                <button className="btn btn-primary" disabled={aiPlanLoading} onClick={handleAIPlan}>
                  {aiPlanLoading ? 'กำลังสร้าง...' : t('aiGenerate')}
                </button>
              ) : (
                <button className="btn btn-primary" onClick={applyAIPlan}>ใช้แผนการเดินทางนี้</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── QUICK DURATION EDIT MODAL ───────────────────────────────── */}
      {editDurationModalOpen && editDurationTarget && (
        <div className="overlay show" onClick={() => setEditDurationModalOpen(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">⏱ {activeLang === 'th' ? 'แก้ไขเวลาเข้าชม' : 'Edit Visit Duration'}</div>
              <button className="modal-close" onClick={() => setEditDurationModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                {activeLang === 'th' 
                  ? `แก้ไขระยะเวลาเข้าชมสำหรับ "${(editDurationTarget.item.names && editDurationTarget.item.names[activeLang]) || editDurationTarget.item.name}"`
                  : `Change visit duration for "${(editDurationTarget.item.names && editDurationTarget.item.names[activeLang]) || editDurationTarget.item.name}"`}
              </p>
              <div className="form-group">
                <label className="form-label">{activeLang === 'th' ? 'ระยะเวลา (นาที):' : 'Duration (minutes):'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={editDurationTarget.value}
                    onChange={(e) => setEditDurationTarget({ ...editDurationTarget, value: e.target.value })}
                    style={{ flex: 1, fontSize: '15px', fontWeight: '500', padding: '10px' }}
                    min="1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveDurationQuick();
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)' }}>
                    {activeLang === 'th' ? 'นาที' : 'mins'}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditDurationModalOpen(false)}>{activeLang === 'th' ? 'ยกเลิก' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={handleSaveDurationQuick}>{activeLang === 'th' ? 'บันทึก' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AUTHENTICATION MODAL ────────────────────────────────────── */}
      {authModalOpen && (
        <div className="overlay show" onClick={() => setAuthModalOpen(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">
                {authMode === 'login' 
                  ? (activeLang === 'th' ? '🔑 เข้าสู่ระบบ' : '🔑 Sign In')
                  : (activeLang === 'th' ? '📝 สมัครสมาชิก' : '📝 Register')}
              </div>
              <button className="modal-close" onClick={() => setAuthModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">{activeLang === 'th' ? 'อีเมล' : 'Email Address'}</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>
              
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">{activeLang === 'th' ? 'รหัสผ่าน' : 'Password'}</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (authMode === 'login') handleSignIn();
                      else handleSignUp();
                    }
                  }}
                />
              </div>

              {authMode === 'register' && (
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="form-label">{activeLang === 'th' ? 'รหัสผ่านการสมัคร (Registration Code)' : 'Registration Code'}</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••"
                    value={authRegisterCode}
                    onChange={(e) => setAuthRegisterCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSignUp();
                      }
                    }}
                  />
                </div>
              )}
              
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px', textAlign: 'center' }}>
                {authMode === 'login' ? (
                  <>
                    {activeLang === 'th' ? 'ยังไม่มีบัญชีผู้ใช้?' : "Don't have an account?"}{' '}
                    <span 
                      style={{ color: 'var(--teal)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => { setAuthMode('register'); setAuthRegisterCode(''); }}
                    >
                      {activeLang === 'th' ? 'สมัครสมาชิกที่นี่' : 'Register here'}
                    </span>
                  </>
                ) : (
                  <>
                    {activeLang === 'th' ? 'มีบัญชีอยู่แล้ว?' : 'Already have an account?'}{' '}
                    <span 
                      style={{ color: 'var(--teal)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => { setAuthMode('login'); setAuthRegisterCode(''); }}
                    >
                      {activeLang === 'th' ? 'เข้าสู่ระบบที่นี่' : 'Sign in here'}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAuthModalOpen(false)}>
                {activeLang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button 
                className="btn btn-primary" 
                disabled={authLoading}
                onClick={authMode === 'login' ? handleSignIn : handleSignUp}
              >
                {authLoading 
                  ? (activeLang === 'th' ? 'กำลังทำงาน...' : 'Loading...')
                  : (authMode === 'login' 
                      ? (activeLang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')
                      : (activeLang === 'th' ? 'สมัครสมาชิก' : 'Register'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
