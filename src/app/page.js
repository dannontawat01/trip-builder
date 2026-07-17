'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { googleSheets } from '@/lib/googleSheets';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./components/MapComponent'), {
  ssr: false,
  loading: () => <div className="map-loading-placeholder">กำลังโหลดแผนที่...</div>
});

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
    addNew: 'เพิ่มสถานที่ใหม่', tabManual: '✏️ กรอกเอง', tabAI: '🤖 AI แนะนำ', tabGmaps: '📍 Google Maps', tabJson: '📋 นำเข้า JSON',
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
    tabNearby: 'แนะนำใกล้เคียง',
    tabChecklist: 'สิ่งที่ต้องเตรียม',
    checklistHeader: 'รายการตรวจสอบสำหรับทริป',
    checklistAddPh: 'เพิ่มรายการใหม่...',
    checklistCategory: 'หมวดหมู่',
    checklistImportBtn: 'นำเข้าเทมเพลต',
    checklistEmpty: 'ยังไม่มีรายการ ตรวจสอบหรือนำเข้าเทมเพลตเพื่อเริ่มต้น!',
    checklistCatDocuments: '📄 เอกสาร & การเงิน',
    checklistCatClothing: '👕 เสื้อผ้า & เครื่องแต่งกาย',
    checklistCatToiletries: '🧴 อุปกรณ์ของใช้ส่วนตัว & ยา',
    checklistCatElectronics: '🔌 อุปกรณ์ไอที / ไฟฟ้า',
    checklistCatOthers: '🎒 อื่นๆ',
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
    addNew: 'Add New Place', tabManual: '✏️ Manual', tabAI: '🤖 AI Suggest', tabGmaps: '📍 Google Maps', tabJson: '📋 Import JSON',
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
    tabNearby: 'Nearby Suggestions',
    tabChecklist: 'Trip Checklist',
    checklistHeader: 'Trip Checklist',
    checklistAddPh: 'Add new item...',
    checklistCategory: 'Category',
    checklistImportBtn: 'Import Template',
    checklistEmpty: 'No items yet. Add or import templates!',
    checklistCatDocuments: '📄 Docs & Finance',
    checklistCatClothing: '👕 Clothing & Apparel',
    checklistCatToiletries: '🧴 Personal Care',
    checklistCatElectronics: '🔌 Electronics',
    checklistCatOthers: '🎒 Others',
  }
};

// ─── STATIC DATA ────────────────────────────────────────────────────
const COUNTRIES = [
  {
    id: 'th', name: { th: 'ไทย', en: 'Thailand' }, flag: '🇹🇭', cities: [
      { id: 'bkk', name: { th: 'กรุงเทพ', en: 'Bangkok' }, emoji: '🏙', color: '#1D9E75', light: '#E1F5EE', dark: '#0F6E56' },
      { id: 'cnx', name: { th: 'เชียงใหม่', en: 'Chiang Mai' }, emoji: '🌸', color: '#D4537E', light: '#FBEAF0', dark: '#993556' },
      { id: 'hkt', name: { th: 'ภูเก็ต', en: 'Phuket' }, emoji: '🏖', color: '#378ADD', light: '#E6F1FB', dark: '#185FA5' },
      { id: 'ptt', name: { th: 'พัทยา', en: 'Pattaya' }, emoji: '🌊', color: '#EF9F27', light: '#FAEEDA', dark: '#854F0B' },
      { id: 'aya', name: { th: 'อยุธยา', en: 'Ayutthaya' }, emoji: '🏛', color: '#7F77DD', light: '#EEEDFE', dark: '#534AB7' },
    ]
  },
  {
    id: 'kr', name: { th: 'เกาหลี', en: 'South Korea' }, flag: '🇰🇷', cities: [
      { id: 'sel', name: { th: 'โซล', en: 'Seoul' }, emoji: '🏙', color: '#E24B4A', light: '#FCEBEB', dark: '#A32D2D' },
      { id: 'bus', name: { th: 'ปูซาน', en: 'Busan' }, emoji: '🌊', color: '#185FA5', light: '#E6F1FB', dark: '#0C447C' },
      { id: 'jej', name: { th: 'เจจู', en: 'Jeju' }, emoji: '🌋', color: '#3B6D11', light: '#EAF3DE', dark: '#27500A' },
    ]
  },
  {
    id: 'jp', name: { th: 'ญี่ปุ่น', en: 'Japan' }, flag: '🇯🇵', cities: [
      { id: 'tky', name: { th: 'โตเกียว', en: 'Tokyo' }, emoji: '🗼', color: '#E24B4A', light: '#FCEBEB', dark: '#A32D2D' },
      { id: 'kyo', name: { th: 'เกียวโต', en: 'Kyoto' }, emoji: '⛩', color: '#854F0B', light: '#FAEEDA', dark: '#633806' },
      { id: 'osk', name: { th: 'โอซาก้า', en: 'Osaka' }, emoji: '🏯', color: '#7F77DD', light: '#EEEDFE', dark: '#534AB7' },
    ]
  },
];

const CAT_TRANSLATIONS = {
  'วัด': { th: 'วัด', en: 'Temple' },
  'พระราชวัง': { th: 'พระราชวัง', en: 'Palace' },
  'ตลาด': { th: 'ตลาด', en: 'Market' },
  'ย่าน': { th: 'ย่าน', en: 'District' },
  'พิพิธภัณฑ์': { th: 'พิพิธภัณฑ์', en: 'Museum' },
  'ธรรมชาติ': { th: 'ธรรมชาติ', en: 'Nature' },
  'ช้อปปิ้ง': { th: 'ช้อปปิ้ง', en: 'Shopping' },
  'ห้างสรรพสินค้า': { th: 'ห้างสรรพสินค้า', en: 'Department Store' },
  'ร้านอาหาร': { th: 'ร้านอาหาร', en: 'Restaurant' },
  'คาเฟ่': { th: 'คาเฟ่', en: 'Café' },
  'โรงแรม / ที่พัก': { th: 'โรงแรม / ที่พัก', en: 'Hotel / Base' },
  'วิวทิวทัศน์': { th: 'วิวทิวทัศน์', en: 'Scenic View' },
  'อื่นๆ': { th: 'อื่นๆ', en: 'Others' }
};

const translateCategory = (cat, lang) => {
  if (!cat) return lang === 'th' ? 'อื่นๆ' : 'Others';
  if (CAT_TRANSLATIONS[cat]) {
    return CAT_TRANSLATIONS[cat][lang] || cat;
  }
  for (const key in CAT_TRANSLATIONS) {
    if (CAT_TRANSLATIONS[key].en.toLowerCase() === cat.toLowerCase()) {
      return CAT_TRANSLATIONS[key][lang] || cat;
    }
  }
  return cat;
};

const getCityName = (cityObj, lang = 'th') => {
  if (!cityObj) return '';
  if (typeof cityObj.name === 'object') {
    return cityObj.name[lang] || cityObj.name.en || '';
  }
  return cityObj.name || '';
};

const getCountryName = (countryObj, lang = 'th') => {
  if (!countryObj) return '';
  if (typeof countryObj.name === 'object') {
    return countryObj.name[lang] || countryObj.name.en || '';
  }
  return countryObj.name || '';
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

const CITY_COVER_IMAGES = {
  bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
  chiangmai: 'https://images.unsplash.com/photo-1548685913-fe6574340a49?auto=format&fit=crop&w=600&q=80',
  phuket: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=600&q=80',
  pattaya: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80',
  ayutthaya: 'https://images.unsplash.com/photo-1601058334419-5d3c8c7f766e?auto=format&fit=crop&w=600&q=80',
  seoul: 'https://images.unsplash.com/photo-1538669715516-5c51a140f7b0?auto=format&fit=crop&w=600&q=80',
  busan: 'https://images.unsplash.com/photo-1577971158586-fb7c6d66e855?auto=format&fit=crop&w=600&q=80',
  jeju: 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=600&q=80',
  tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=600&q=80',
  kyoto: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
  osaka: 'https://images.unsplash.com/photo-1590250596356-a6c22c075775?auto=format&fit=crop&w=600&q=80',
  travel: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'
};

const CHECKLIST_CATEGORIES = [
  { id: 'documents', label: { th: '📄 เอกสาร & การเงิน', en: '📄 Docs & Finance' }, color: '#378ADD' },
  { id: 'clothing', label: { th: '👕 เสื้อผ้า & เครื่องแต่งกาย', en: '👕 Clothing & Apparel' }, color: '#EF9F27' },
  { id: 'toiletries', label: { th: '🧴 อุปกรณ์ของใช้ส่วนตัว & ยา', en: '🧴 Personal Care' }, color: '#1D9E75' },
  { id: 'electronics', label: { th: '🔌 อุปกรณ์ไอที / ไฟฟ้า', en: '🔌 Electronics' }, color: '#7F77DD' },
  { id: 'others', label: { th: '🎒 อื่นๆ', en: '🎒 Others' }, color: '#993556' }
];

const CHECKLIST_TEMPLATES = {
  documents: [
    { text: { th: 'หนังสือเดินทาง (Passports)', en: 'Passports' } },
    { text: { th: 'ตั๋วเครื่องบิน (Flight tickets)', en: 'Flight tickets' } },
    { text: { th: 'ใบจองโรงแรม (Hotel reservations)', en: 'Hotel reservations' } },
    { text: { th: 'เงินสด / บัตร (Cash/cards)', en: 'Cash/cards' } }
  ],
  clothing: [
    { text: { th: 'ชุดชั้นใน (Underwear)', en: 'Underwear' } },
    { text: { th: 'เสื้อกันหนาว / แจ็กเก็ต (Jackets)', en: 'Jackets' } },
    { text: { th: 'เสื้อเชิ้ต / เสื้อยืด (Shirts)', en: 'Shirts' } },
    { text: { th: 'รองเท้าเดินสบาย (Comfortable shoes)', en: 'Comfortable shoes' } }
  ],
  toiletries: [
    { text: { th: 'แปรงสีฟัน (Toothbrush)', en: 'Toothbrush' } },
    { text: { th: 'ยาสามัญประจำตัว (Medicine)', en: 'Medicine' } },
    { text: { th: 'อุปกรณ์อาบน้ำ (Toiletries)', en: 'Toiletries' } }
  ],
  electronics: [
    { text: { th: 'สายชาร์จ / ที่ชาร์จ (Chargers)', en: 'Chargers' } },
    { text: { th: 'หัวแปลงปลั๊กไฟ (Universal adapters)', en: 'Universal adapters' } },
    { text: { th: 'พาวเวอร์แบงค์ (Power bank)', en: 'Power bank' } }
  ],
  others: [
    { text: { th: 'ร่ม / เสื้อกันฝน', en: 'Umbrella / Raincoat' } },
    { text: { th: 'กระเป๋าเป้ใบเล็ก', en: 'Daypack / Small Bag' } },
    { text: { th: 'ขวดน้ำพกพา', en: 'Water Bottle' } }
  ]
};

const generateChecklistId = () => {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ─── WEATHER UTILITIES ──────────────────────────────────────────────
const CITY_COORDINATES = {
  bkk: { lat: 13.7563, lng: 100.5018 },
  cnx: { lat: 18.7883, lng: 98.9853 },
  hkt: { lat: 7.8804, lng: 98.3923 },
  ptt: { lat: 12.9236, lng: 100.8824 },
  aya: { lat: 14.3532, lng: 100.5681 },
  sel: { lat: 37.5665, lng: 126.9780 },
  bus: { lat: 35.1796, lng: 129.0756 },
  jej: { lat: 33.4996, lng: 126.5312 },
  tky: { lat: 35.6762, lng: 139.6503 },
  kyo: { lat: 35.0116, lng: 135.7681 },
  osk: { lat: 34.6937, lng: 135.5023 }
};

const WEATHER_CODES = {
  0: { label: { th: 'ท้องฟ้าแจ่มใส', en: 'Clear sky' }, emoji: '☀️' },
  1: { label: { th: 'ท้องฟ้าโปร่งส่วนใหญ่', en: 'Mainly clear' }, emoji: '🌤️' },
  2: { label: { th: 'มีเมฆบางส่วน', en: 'Partly cloudy' }, emoji: '⛅' },
  3: { label: { th: 'เมฆครึ้ม', en: 'Overcast' }, emoji: '☁️' },
  45: { label: { th: 'หมอก', en: 'Fog' }, emoji: '🌫️' },
  48: { label: { th: 'หมอกน้ำค้างแข็ง', en: 'Depositing rime fog' }, emoji: '🌫️' },
  51: { label: { th: 'ฝนตกปรอยๆ ขนาดเบา', en: 'Light drizzle' }, emoji: '🌦️' },
  53: { label: { th: 'ฝนตกปรอยๆ ขนาดปานกลาง', en: 'Moderate drizzle' }, emoji: '🌦️' },
  55: { label: { th: 'ฝนตกปรอยๆ ขนาดหนาแน่น', en: 'Dense drizzle' }, emoji: '🌦️' },
  56: { label: { th: 'ฝนละอองแช่แข็ง ขนาดเบา', en: 'Light freezing drizzle' }, emoji: '🌧️' },
  57: { label: { th: 'ฝนละอองแช่แข็ง ขนาดหนาแน่น', en: 'Dense freezing drizzle' }, emoji: '🌧️' },
  61: { label: { th: 'ฝนตกเล็กน้อย', en: 'Slight rain' }, emoji: '🌧️' },
  63: { label: { th: 'ฝนตกปานกลาง', en: 'Moderate rain' }, emoji: '🌧️' },
  65: { label: { th: 'ฝนตกหนัก', en: 'Heavy rain' }, emoji: '🌧️' },
  66: { label: { th: 'ฝนแช่แข็ง ตกเล็กน้อย', en: 'Slight freezing rain' }, emoji: '🌧️' },
  67: { label: { th: 'ฝนแช่แข็ง ตกหนัก', en: 'Heavy freezing rain' }, emoji: '🌧️' },
  71: { label: { th: 'หิมะตกเล็กน้อย', en: 'Slight snow fall' }, emoji: '🌨️' },
  73: { label: { th: 'หิมะตกปานกลาง', en: 'Moderate snow fall' }, emoji: '🌨️' },
  75: { label: { th: 'หิมะตกหนัก', en: 'Heavy snow fall' }, emoji: '🌨️' },
  77: { label: { th: 'เกล็ดหิมะ', en: 'Snow grains' }, emoji: '🌨️' },
  80: { label: { th: 'ฝนไล่ช้าง ตกเล็กน้อย', en: 'Slight rain showers' }, emoji: '🌦️' },
  81: { label: { th: 'ฝนไล่ช้าง ตกปานกลาง', en: 'Moderate rain showers' }, emoji: '🌦️' },
  82: { label: { th: 'ฝนไล่ช้าง ตกรุนแรง', en: 'Violent rain showers' }, emoji: '🌧️' },
  85: { label: { th: 'หิมะไล่ช้าง ตกเล็กน้อย', en: 'Slight snow showers' }, emoji: '🌨️' },
  86: { label: { th: 'หิมะไล่ช้าง ตกหนัก', en: 'Heavy snow showers' }, emoji: '🌨️' },
  95: { label: { th: 'พายุฝนฟ้าคะนอง', en: 'Thunderstorm' }, emoji: '⛈️' },
  96: { label: { th: 'พายุฝนฟ้าคะนองพร้อมลูกเห็บตกเล็กน้อย', en: 'Thunderstorm with slight hail' }, emoji: '⛈️' },
  99: { label: { th: 'พายุฝนฟ้าคะนองพร้อมลูกเห็บตกหนัก', en: 'Thunderstorm with heavy hail' }, emoji: '⛈️' }
};

const parseDateSafe = (dateVal) => {
  if (!dateVal) return null;
  const dateStr = String(dateVal).trim();
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return null;
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + 'T00:00:00Z');
    if (!isNaN(d.getTime())) return d;
  }
  
  const dIso = new Date(dateStr);
  if (!isNaN(dIso.getTime())) return dIso;
  
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
    
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      if (year > 2400) year -= 543;
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
};

function generateMockWeather(dateStr, lat) {
  const isCold = Math.abs(lat) > 30;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);
  const codes = [0, 1, 2, 3, 61, 63, 80];
  if (isCold) {
    codes.push(71, 73);
  }
  const code = codes[absHash % codes.length];
  
  let tempBase = isCold ? 12 : 28;
  const month = parseInt(dateStr.split('-')[1]) || 6;
  const tempOffset = Math.sin((month - 4) * Math.PI / 6) * (isCold ? 12 : 4);
  const tempMax = Math.round((tempBase + tempOffset + (absHash % 5)) * 10) / 10;
  const tempMin = Math.round((tempMax - (5 + (absHash % 4))) * 10) / 10;
  
  return { code, tempMax, tempMin };
}

async function fetchWeatherForecast(lat, lng) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
      `&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error('API response not ok');
    const data = await res.json();
    
    const forecast = {};
    if (data.daily && data.daily.time) {
      data.daily.time.forEach((dateStr, index) => {
        forecast[dateStr] = {
          code: data.daily.weathercode[index],
          tempMax: data.daily.temperature_2m_max[index],
          tempMin: data.daily.temperature_2m_min[index]
        };
      });
    }
    return forecast;
  } catch (error) {
    clearTimeout(id);
    console.warn('Weather API failed, using fallback mock generator:', error);
    return null;
  }
}

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
  const chkParam = searchParams.get('chk');
  const [activeLang, setActiveLang] = useState('th');
  const [activeCountry, setActiveCountry] = useState('th');
  const [activeCity, setActiveCity] = useState('bkk');
  const [theme, setTheme] = useState('clean');
  
  const [nDays, setNDays] = useState(3);
  const [startDate, setStartDateInternal] = useState('');
  const setStartDate = (val) => {
    const d = parseDateSafe(val);
    setStartDateInternal(d ? d.toISOString().split('T')[0] : '');
  };
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [hotel, setHotel] = useState('');
  
  const [itin, setItin] = useState({ 1: [], 2: [], 3: [] });
  const [checklist, setChecklist] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState('nearby');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newChecklistCat, setNewChecklistCat] = useState('documents');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showMap, setShowMap] = useState(true);
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
  const [editTravelModalOpen, setEditTravelModalOpen] = useState(false);
  const [editTravelTarget, setEditTravelTarget] = useState(null);
  
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
  const [fGmapsUrl, setFGmapsUrl] = useState('');
  const [fRating, setFRating] = useState('');
  const [fPhotos, setFPhotos] = useState([]);

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
  const [searchedPhotos, setSearchedPhotos] = useState([]);
  const [searchingPhotos, setSearchingPhotos] = useState(false);
  const [localCoverOverrides, setLocalCoverOverrides] = useState({});
  
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

  // Weather states
  const [weatherData, setWeatherData] = useState({});

  // Drag and Drop Ref tracking
  const dragItem = useRef();
  const dragOverDay = useRef();
  const dragIdx = useRef();
  const dragFromDay = useRef(); // Number or 'sidebar'
  const lastActivePlanIdRef = useRef(activePlanId);


  const t = (key) => (LANG_STRINGS[activeLang] || LANG_STRINGS.en)[key] || key;
  const getCityObj = (cid) => COUNTRIES.flatMap(c => c.cities).find(c => c.id === cid) || null;
  const usedIds = () => Object.values(itin).flat().map(x => x.id);
  const getSelectedCount = (placeId) => {
    return Object.values(itin).flat().filter(x => x.id === placeId).length;
  };

  const getCoverImage = (place) => {
    if (place && localCoverOverrides[place.id]) return localCoverOverrides[place.id];
    if (place && place.cover_image) return place.cover_image;
    const cityKey = place ? (CITY_KEYWORDS[place.city_id || activeCity] || 'travel') : 'travel';
    return CITY_COVER_IMAGES[cityKey] || CITY_COVER_IMAGES.travel;
  };

  const findLandmarkGlobally = (id, cityId) => {
    let found = landmarks.find(l => String(l.id) === String(id));
    if (found) return found;
    
    const targetCity = cityId || activeCity;
    const cityCustomList = customPlaces[targetCity] || [];
    found = cityCustomList.find(l => String(l.id) === String(id));
    if (found) return found;
    
    return null;
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

  const handleStartEditing = async (place) => {
    setIsEditing(true);
    setSearchedPhotos([]);
    setSearchingPhotos(true);
    try {
      const res = await fetch('/api/search-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${place.name} ${getCityName(getCityObj(place.city_id || activeCity), 'en')}`.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.photos && data.photos.length > 0) {
          setSearchedPhotos(data.photos);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch photos:", e);
    } finally {
      setSearchingPhotos(false);
    }
  };

  const saveEditedPlace = async (editedPlace) => {
    // 1. Update landmarks list locally first
    setLandmarks(prev => prev.map(l => l.id === editedPlace.id ? editedPlace : l));

    // 2. Sync edit to Google Sheets if connected and this is a custom place
    if (googleSheets && editedPlace._custom) {
      try {
        await googleSheets.updateLandmark({
          id: String(editedPlace.id),
          name: editedPlace.name,
          cat: editedPlace.cat,
          icon: editedPlace.icon,
          description: editedPlace.desc,
          address: editedPlace.addr,
          lat: editedPlace.lat,
          lng: editedPlace.lng,
          duration_min: editedPlace.dur,
          fee: editedPlace.fee,
          cover_image: editedPlace.cover_image
        });
      } catch (err) {
        console.warn('Failed to update landmark in Google Sheets:', err);
      }
    }
    
    // 3. Save to customPlaces in state and localStorage (this triggers useEffect to sync with DB)
    const updatedCustom = { ...customPlaces };
    const cityId = editedPlace.city_id || activeCity;
    if (!updatedCustom[cityId]) updatedCustom[cityId] = [];
    
    updatedCustom[cityId] = updatedCustom[cityId].filter(p => p.id !== editedPlace.id);
    updatedCustom[cityId].push(editedPlace);
    setCustomPlaces(updatedCustom);
    localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: updatedCustom }));

    // Save to local cover overrides to prevent Google Sheets sync deletions
    try {
      const localCovers = JSON.parse(localStorage.getItem('trip_builder_local_covers_v1') || '{}');
      localCovers[editedPlace.id] = editedPlace.cover_image;
      localStorage.setItem('trip_builder_local_covers_v1', JSON.stringify(localCovers));
      setLocalCoverOverrides(prev => ({ ...prev, [editedPlace.id]: editedPlace.cover_image }));
    } catch (_) {}

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

  const handleAddChecklistItem = (text, category) => {
    const textVal = (typeof text === 'string') ? text : newChecklistItem;
    const catVal = (typeof category === 'string') ? category : newChecklistCat;
    
    if (!textVal || !textVal.trim()) return;
    
    const newItem = {
      id: generateChecklistId(),
      text: textVal.trim(),
      category: catVal,
      checked: false
    };
    
    setChecklist(prev => [...prev, newItem]);
    setNewChecklistItem('');
    toast(activeLang === 'th' ? `➕ เพิ่มรายการเรียบร้อย` : `➕ Added checklist item`);
  };

  const handleToggleChecklistItem = (id) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleDeleteChecklistItem = (id) => {
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  const handleImportTemplate = (type) => {
    const itemsToAdd = [];
    const existingTexts = checklist.map(item => item.text.toLowerCase());
    
    const addItemsFromCat = (cid) => {
      const templates = CHECKLIST_TEMPLATES[cid] || [];
      templates.forEach(tItem => {
        const text = tItem.text[activeLang] || tItem.text.en;
        if (!existingTexts.includes(text.toLowerCase())) {
          itemsToAdd.push({
            id: generateChecklistId(),
            text: text,
            category: cid,
            checked: false
          });
        }
      });
    };

    if (type === 'all') {
      Object.keys(CHECKLIST_TEMPLATES).forEach(cid => {
        addItemsFromCat(cid);
      });
    } else {
      addItemsFromCat(type);
    }

    if (itemsToAdd.length > 0) {
      setChecklist(prev => [...prev, ...itemsToAdd]);
      toast(activeLang === 'th' ? `📥 นำเข้ารายการแม่แบบเรียบร้อย` : `📥 Imported template items`);
    } else {
      toast(activeLang === 'th' ? `⚠️ รายการมีอยู่แล้ว` : `⚠️ Items already exist`);
    }
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

  const formatMinutesToHours = (minutesStr) => {
    const mins = parseInt(minutesStr);
    if (isNaN(mins) || mins < 0) return '';
    if (mins === 0) return activeLang === 'th' ? '0 นาที' : '0 mins';
    
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hrs > 0) {
      if (remainingMins > 0) {
        return activeLang === 'th' 
          ? `~ ${hrs} ชม. ${remainingMins} นาที (${mins} นาที)` 
          : `~ ${hrs}h ${remainingMins}m (${mins} mins)`;
      } else {
        return activeLang === 'th' 
          ? `~ ${hrs} ชม. (${mins} นาที)` 
          : `~ ${hrs}h (${mins} mins)`;
      }
    }
    
    return activeLang === 'th' ? `~ ${mins} นาที` : `~ ${mins} mins`;
  };

  const promptEditTravelTime = (day, idx, item) => {
    const travelTime = item.travelTime !== undefined ? item.travelTime : 20;
    setEditTravelTarget({ day, idx, item, value: String(travelTime) });
    setEditTravelModalOpen(true);
  };

  const handleSaveTravelTimeQuick = () => {
    if (!editTravelTarget) return;
    const { day, idx, item, value } = editTravelTarget;
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) {
      const updatedItin = { ...itin };
      updatedItin[day] = [...updatedItin[day]];
      updatedItin[day][idx] = { ...updatedItin[day][idx], travelTime: num };
      setItin(updatedItin);
      saveItinData(updatedItin, nDays);
      setEditTravelModalOpen(false);
      setEditTravelTarget(null);
      toast(activeLang === 'th' ? `💾 ปรับเวลาเดินทางเป็น ${num} นาทีแล้ว` : `💾 Updated travel time to ${num} minutes`);
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

    // Load local cover overrides
    try {
      const rawCovers = localStorage.getItem('trip_builder_local_covers_v1');
      if (rawCovers) {
        setLocalCoverOverrides(JSON.parse(rawCovers));
      }
    } catch (_) {}

    // Check initial user session & load plans
    const checkSession = async () => {
      // Debug: log Google Sheets connection status
      console.log('[TripBuilder] Google Sheets client:', googleSheets ? 'CONNECTED ✅' : 'NOT CONFIGURED ❌ (using Mock Mode)');
      console.log('[TripBuilder] GOOGLE_SCRIPT_URL:', process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || '(empty)');

      if (!googleSheets) {
        // Fallback to local mock session if no Google Sheets configured
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
        const storedUser = localStorage.getItem('tb_sheet_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          loadCloudPlans(parsedUser.email);
        } else {
          loadGuestPlan();
        }
      } catch (err) {
        console.error('[TripBuilder] checkSession failed:', err);
        loadGuestPlan();
      }
    };

    checkSession();

    return () => {};
  }, []);

  const loadGuestPlan = () => {
    try {
      const raw = localStorage.getItem('trip_builder_itin_v1');
      let loadedChecklist = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.nDays) setNDays(parsed.nDays);
        if (parsed.start) setStartDate(parsed.start);
        if (parsed.time) setStartTime(parsed.time);
        if (parsed.hotel) setHotel(parsed.hotel);
        if (parsed.itin) {
          setItin(parsed.itin);
        }
        if (parsed.checklist) {
          loadedChecklist = parsed.checklist;
        }
      } else {
        setItin({ 1: [], 2: [], 3: [] });
        setNDays(3);
        setHotel('');
        setStartTime('09:00');
      }
      try {
        const localCheck = localStorage.getItem('checklist_guest') || localStorage.getItem('trip_builder_checklist_guest');
        if (localCheck) {
          loadedChecklist = JSON.parse(localCheck);
        }
      } catch (_) {}
      setChecklist(loadedChecklist);
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
        
        let loadedChecklist = activePlan.checklist || [];
        try {
          const localCheck = localStorage.getItem(`checklist_${activePlan.id}`) || localStorage.getItem(`trip_builder_checklist_${activePlan.id}`);
          if (localCheck) {
            loadedChecklist = JSON.parse(localCheck);
          }
        } catch (_) {}
        setChecklist(loadedChecklist);
        
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
          checklist: [],
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
        
        let loadedChecklist = newPlan.checklist;
        try {
          const localCheck = localStorage.getItem(`checklist_${defaultPlanId}`) || localStorage.getItem(`trip_builder_checklist_${defaultPlanId}`);
          if (localCheck) {
            loadedChecklist = JSON.parse(localCheck);
          }
        } catch (_) {}
        setChecklist(loadedChecklist);
        
        setNDays(newPlan.nDays);
        setStartDate(newPlan.start);
        setStartTime(newPlan.time);
        setHotel(newPlan.hotel);
      }
    } catch (_) {}
  };

  const loadCloudPlans = async (email) => {
    if (!googleSheets) return;
    console.log('[TripBuilder] loadCloudPlans for email:', email);
    try {
      const data = await googleSheets.getItineraries(email);
      console.log('[TripBuilder] Loaded', data?.length, 'cloud plans');
      
      const plans = data.map(item => ({
        id: item.id,
        name: item.name,
        city_id: item.city_id,
        itin: item.itin,
        checklist: item.checklist || [],
        nDays: item.n_days,
        start: item.start_date,
        time: item.start_time,
        hotel: item.hotel
      }));
      
      // Sort by ID descending locally as fallback for ordering
      plans.sort((a, b) => b.id.localeCompare(a.id));

      setPlansList(plans);
      
      const lastActiveId = localStorage.getItem(`tb_active_plan_${email}`);
      const activePlan = plans.find(p => p.id === lastActiveId) || plans[0];
      
      if (activePlan) {
        setActivePlanId(activePlan.id);
        setItin(activePlan.itin);
        
        let loadedChecklist = activePlan.checklist;
        try {
          const localCheck = localStorage.getItem(`checklist_${activePlan.id}`) || localStorage.getItem(`trip_builder_checklist_${activePlan.id}`);
          if (localCheck) {
            loadedChecklist = JSON.parse(localCheck);
          }
        } catch (_) {}
        setChecklist(loadedChecklist);
        
        setNDays(activePlan.nDays);
        setStartDate(activePlan.start);
        setStartTime(activePlan.time);
        setHotel(activePlan.hotel);
      } else {
        await handleCreatePlanCloud('My Saved Plan 1', email);
      }
    } catch (err) {
      console.warn('Failed to load cloud plans:', err.message);
    }
  };

  const handleCreatePlanCloud = async (name, email) => {
    if (!googleSheets) return;
    const defaultPlan = {
      name: name,
      city_id: activeCity,
      country_id: activeCountry,
      start_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      hotel: '',
      n_days: 3,
      itin: { 1: [], 2: [], 3: [] },
      checklist: []
    };
    
    try {
      const res = await googleSheets.insertItinerary(email, defaultPlan);
      if (res.success && res.id) {
        const newPlan = {
          id: res.id,
          name: defaultPlan.name,
          city_id: defaultPlan.city_id,
          itin: defaultPlan.itin,
          checklist: defaultPlan.checklist,
          nDays: defaultPlan.n_days,
          start: defaultPlan.start_date,
          time: defaultPlan.start_time,
          hotel: defaultPlan.hotel
        };
        setPlansList(prev => [newPlan, ...prev]);
        setActivePlanId(newPlan.id);
        setItin(newPlan.itin);
        setChecklist(newPlan.checklist);
        setNDays(newPlan.nDays);
        setStartDate(newPlan.start);
        setStartTime(newPlan.time);
        setHotel(newPlan.hotel);
        localStorage.setItem(`tb_active_plan_${email}`, newPlan.id);
      }
    } catch (err) {
      console.warn('Failed to create cloud plan:', err.message);
    }
  };

  const createNewPlan = async () => {
    const planName = prompt(activeLang === 'th' ? 'กรุณากรอกชื่อแผนเดินทางใหม่:' : 'Enter name for the new plan:', `Trip Plan ${plansList.length + 1}`);
    if (!planName?.trim()) return;
    
    if (user) {
      if (!googleSheets) {
        const defaultPlanId = `plan_${Date.now()}`;
        const newPlan = {
          id: defaultPlanId,
          name: planName,
          city_id: activeCity,
          itin: { 1: [], 2: [], 3: [] },
          checklist: [],
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
        setChecklist(newPlan.checklist);
        setNDays(newPlan.nDays);
        setStartDate(newPlan.start);
        setStartTime(newPlan.time);
        setHotel(newPlan.hotel);
        localStorage.setItem(`tb_mock_active_plan_${user.email}`, defaultPlanId);
        toast(activeLang === 'th' ? 'สร้างแผนใหม่สำเร็จ' : 'New plan created');
      } else {
        await handleCreatePlanCloud(planName, user.email);
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
      if (!googleSheets) {
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
          await googleSheets.deleteItinerary(planId);
          
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
      if (!googleSheets) {
        const updatedPlans = plansList.map(p => p.id === planId ? { ...p, name: newName } : p);
        setPlansList(updatedPlans);
        localStorage.setItem(`tb_mock_plans_${user.email}`, JSON.stringify(updatedPlans));
        toast(activeLang === 'th' ? 'เปลี่ยนชื่อแผนสำเร็จ' : 'Plan renamed');
      } else {
        try {
          await googleSheets.updateItinerary({
            id: planId,
            name: newName,
            start_date: plan.start,
            start_time: plan.time,
            hotel: plan.hotel,
            n_days: plan.nDays,
            itin: plan.itin,
            checklist: plan.checklist || []
          });
          
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
    
    let loadedChecklist = plan.checklist || [];
    try {
      const localCheck = localStorage.getItem(`checklist_${planId}`) || localStorage.getItem(`trip_builder_checklist_${planId}`);
      if (localCheck) {
        loadedChecklist = JSON.parse(localCheck);
      }
    } catch (_) {}
    setChecklist(loadedChecklist);
    
    setNDays(plan.nDays || 3);
    setStartDate(plan.start || new Date().toISOString().split('T')[0]);
    setStartTime(plan.time || '09:00');
    setHotel(plan.hotel || '');
    
    if (user) {
      if (!googleSheets) {
        localStorage.setItem(`tb_mock_active_plan_${user.email}`, planId);
      } else {
        localStorage.setItem(`tb_active_plan_${user.email}`, planId);
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
    
    if (!googleSheets) {
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
      const res = await googleSheets.signUp(authEmail, authPassword);
      if (res.success) {
        toast('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบได้ทันที');
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
    
    if (!googleSheets) {
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
      const res = await googleSheets.signIn(authEmail, authPassword);
      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem('tb_sheet_user', JSON.stringify(res.user));
        setAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        loadCloudPlans(res.user.email);
        toast('เข้าสู่ระบบสำเร็จ!');
      }
    } catch (err) {
      toast(`เข้าสู่ระบบล้มเหลว: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!googleSheets) {
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
      localStorage.removeItem('tb_sheet_user');
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
    try {
      const ds = parseDateSafe(startDate);
      if (ds) {
        ds.setUTCDate(ds.getUTCDate() + nDays - 1);
        setEndDate(ds.toISOString().split('T')[0]);
      }
    } catch (_) {}
  }, [startDate, nDays]);

  // Load landmarks when activeCity or customPlaces changes
  useEffect(() => {
    const customList = customPlaces[activeCity] || [];
    setLandmarks(customList);

    // Fetch from Supabase if connected
    const fetchLandmarks = async () => {
      if (!googleSheets) return;
      setIsLoading(true);
      try {
        const email = user?.email || '';
        const allData = await googleSheets.getLandmarks(activeCity, email);

        const mapItem = item => {
          const localList = customPlaces[activeCity] || [];
          const localItem = localList.find(p => String(p.id) === String(item.id));
          return {
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
            cover_image: item.cover_image || (localItem ? localItem.cover_image : null),
            names: item.names || {},
            descriptions: item.descriptions || {},
            city_id: item.city_id,
            _custom: item.status === 'user_custom'
          };
        };

        const isLoggedIn = !!user;
        if (isLoggedIn) {
          if (allData.length > 0) {
            setLandmarks(allData.map(mapItem));
            setCustomPlaces(prev => {
              if (!prev[activeCity] || prev[activeCity].length === 0) return prev;
              const cleaned = { ...prev };
              delete cleaned[activeCity];
              try {
                localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: cleaned }));
              } catch (_) {}
              return cleaned;
            });
          }
        } else {
          const sheetIds = new Set(allData.map(d => String(d.id)));
          const localOnlyCustom = customList.filter(p => !sheetIds.has(String(p.id)));
          const merged = [...allData.map(mapItem), ...localOnlyCustom];
          if (merged.length > 0) setLandmarks(merged);
        }
      } catch (err) {
        console.warn('Failed to load from Google Sheets:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLandmarks();

  }, [activeCity, customPlaces, user]);

  // Load weather when activeCity or dates change
  useEffect(() => {
    let active = true;
    const loadWeather = async () => {
      const coords = CITY_COORDINATES[activeCity];
      if (!coords) return;
      
      const data = await fetchWeatherForecast(coords.lat, coords.lng);
      
      if (!active) return;
      
      const newWeatherData = {};
      const datesList = [];
      if (startDate && nDays > 0) {
        try {
          const dBase = parseDateSafe(startDate);
          if (dBase) {
            for (let i = 0; i < nDays; i++) {
              const d = new Date(dBase.getTime());
              d.setUTCDate(d.getUTCDate() + i);
              datesList.push(d.toISOString().split('T')[0]);
            }
          }
        } catch (_) {}
      }
      
      datesList.forEach(dateStr => {
        if (data && data[dateStr] !== undefined && data[dateStr] !== null) {
          newWeatherData[dateStr] = data[dateStr];
        } else {
          newWeatherData[dateStr] = generateMockWeather(dateStr, coords.lat);
        }
      });
      
      setWeatherData(newWeatherData);
    };
    
    loadWeather();
    
    return () => {
      active = false;
    };
  }, [activeCity, startDate, nDays]);

  // Save itinerary to LocalStorage or Cloud
  const saveItinData = async (newItin, newNDays, currentChecklist = checklist) => {
    try {
      const data = {
        itin: newItin,
        nDays: newNDays,
        start: startDate,
        time: startTime,
        hotel: hotel,
        checklist: currentChecklist
      };
      localStorage.setItem('trip_builder_itin_v1', JSON.stringify(data));
    } catch (_) {}

    if (user && activePlanId && activePlanId !== 'guest') {
      if (!googleSheets) {
        const updatedPlans = plansList.map(p => {
          if (p.id === activePlanId) {
            return {
              ...p,
              itin: newItin,
              nDays: newNDays,
              start: startDate,
              time: startTime,
              hotel: hotel,
              checklist: currentChecklist
            };
          }
          return p;
        });
        setPlansList(updatedPlans);
        localStorage.setItem(`tb_mock_plans_${user.email}`, JSON.stringify(updatedPlans));
      } else {
        try {
          await googleSheets.updateItinerary({
            id: activePlanId,
            itin: newItin,
            n_days: newNDays,
            start_date: startDate,
            start_time: startTime,
            hotel: hotel,
            checklist: currentChecklist
          });
          
          setPlansList(prev => prev.map(p => {
            if (p.id === activePlanId) {
              return {
                ...p,
                itin: newItin,
                nDays: newNDays,
                start: startDate,
                time: startTime,
                hotel: hotel,
                checklist: currentChecklist
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
      saveItinData(itin, nDays, checklist);
    }, 500);
    return () => clearTimeout(timer);
  }, [itin, nDays, startDate, startTime, hotel, checklist]);

  // Sync checklist state to localStorage based on active plan ID
  useEffect(() => {
    if (activePlanId) {
      if (lastActivePlanIdRef.current !== activePlanId) {
        lastActivePlanIdRef.current = activePlanId;
        return;
      }
      try {
        localStorage.setItem(`checklist_${activePlanId}`, JSON.stringify(checklist));
        localStorage.setItem(`trip_builder_checklist_${activePlanId}`, JSON.stringify(checklist));
      } catch (_) {}
    }
  }, [activePlanId, checklist]);

  // Sync dates from start/end input
  const handleDateSync = (startVal, endVal) => {
    if (startVal && endVal) {
      try {
        const ds = parseDateSafe(startVal);
        const de = parseDateSafe(endVal);
        if (ds && de && de >= ds) {
          const diffDays = Math.round((de - ds) / 864e5) + 1;
          const days = Math.min(diffDays, 7);
          setNDays(days);
          adjustDays(days);
        }
      } catch (_) {}
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
      cover_image: place.cover_image || null,
      photos: place.photos || [],
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
  const parseGmaps = async () => {
    if (!gmapsUrl.trim()) return;

    setGmapsResult(null); // Clear previous result
    try {
      const res = await fetch('/api/resolve-gmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: gmapsUrl.trim() })
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        setGmapsResult({ 
          name: data.name, 
          lat: data.lat, 
          lng: data.lng,
          address: data.address,
          category: data.category,
          icon: data.icon,
          rating: data.rating,
          gmaps_url: data.finalUrl || gmapsUrl.trim(),
          photos: data.photos || []
        });
      } else {
        setGmapsResult({ error: true });
      }
    } catch (e) {
      setGmapsResult({ error: true });
    }
  };

  const fillFromMaps = (name, lat, lng, address = '', category = 'อื่นๆ', icon = '📍', gmapsUrl = '', rating = null, photos = []) => {
    setActiveAddTab('manual');
    setFName(name || 'สถานที่จาก Google Maps');
    setFLat(lat);
    setFLng(lng);
    if (address) setFAddr(address);
    if (category) setFCat(category);
    if (icon) setFIcon(icon);
    if (gmapsUrl) setFGmapsUrl(gmapsUrl);
    setFRating(rating ? String(rating) : '');
    setFPhotos(photos || []);

    // Auto-detect closest city based on coordinates
    const cityCoords = {
      bkk: [13.7563, 100.5018],
      cnx: [18.7883, 98.9853],
      hkt: [7.8804, 98.3922],
      ptt: [12.9236, 100.8824],
      aya: [14.3532, 100.5681],
      sel: [37.5665, 126.9780],
      bus: [35.1796, 129.0756],
      jej: [33.4996, 126.5312],
      tky: [35.6762, 139.6503],
      kyo: [35.0116, 135.7681],
      osk: [34.6937, 135.5023],
    };

    if (lat && lng) {
      let closestCity = 'bkk';
      let minDistance = Infinity;
      Object.entries(cityCoords).forEach(([cityId, coords]) => {
        const dy = coords[0] - parseFloat(lat);
        const dx = coords[1] - parseFloat(lng);
        const dist = dy * dy + dx * dx;
        if (dist < minDistance) {
          minDistance = dist;
          closestCity = cityId;
        }
      });
      setFCity(closestCity);
    }

    toast('ดึงข้อมูลจาก Google Maps สำเร็จ!');
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
      gmaps_url: fGmapsUrl || null,
      rating: fRating ? parseFloat(fRating) : null,
      cover_image: fPhotos.length > 0 ? fPhotos[0] : null,
      photos: fPhotos || [],
      _custom: true
    };

    // Save to Google Sheets first (if connected + logged in) to get a stable id
    if (googleSheets && user) {
      try {
        const res = await googleSheets.insertLandmark(user.email, {
          id: String(localId),
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
          status: 'user_custom',
          cover_image: localPlace.cover_image
        });
        if (res.success && res.id) localPlace.id = res.id;
      } catch (err) {
        console.warn('Failed to save custom place to Google Sheets:', err.message);
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
    setFGmapsUrl('');
    setFRating('');
    setFPhotos([]);
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
      cover_image: p.cover_image || (p.photos && p.photos.length > 0 ? p.photos[0] : null),
      photos: p.photos || [],
      _custom: true
    };

    // Save to Google Sheets if logged in
    if (googleSheets && user) {
      try {
        const res = await googleSheets.insertLandmark(user.email, {
          id: String(localId),
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
          status: 'user_custom',
          cover_image: aiPlace.cover_image
        });
        if (res.success && res.id) aiPlace.id = res.id;
      } catch (err) {
        console.warn('Failed to save AI place to Google Sheets:', err.message);
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
      out += activeLang === 'th' ? `\n📅 วันที่ ${d} — ${dateText}\n${'─'.repeat(30)}\n` : `\n📅 Day ${d} — ${dateText}\n${'─'.repeat(30)}\n`;
      
      let [sh, sm] = st.split(':').map(Number);
      let cur = sh * 60 + sm;
      let foodAdded = false;

      items.forEach((item, i) => {
        if (!foodAdded && cur >= 12 * 60 && i > 0) {
          out += activeLang === 'th' ? `  🍽  พักกลางวัน\n` : `  🍽  Lunch Break\n`;
          cur += 90;
          foodAdded = true;
        }
        if (i > 0) {
          const travelTime = item.travelTime !== undefined ? item.travelTime : 20;
          out += activeLang === 'th' ? `  🚗  เดินทาง (~${travelTime} นาที)\n` : `  🚗  Travel (~${travelTime} mins)\n`;
          cur += travelTime;
        }
        const cityObj = getCityObj(item.city_id);
        out += `${toT(cur)}–${toT(cur + item.dur)}  ${item.icon} ${item.name}  [${cityObj ? cityObj.emoji + getCityName(cityObj, activeLang) : ''}]\n`;
        if (item.addr) out += `  📍 ${item.addr}\n`;
        if (item.lat && item.lng) out += `  🗺 GPS: ${item.lat}, ${item.lng}\n`;
        if (item.fee) out += `  💰 ${item.fee}\n`;
        if (item.transport?.length) out += `  🚇 ${item.transport[0].t}\n`;
        out += '\n';
        cur += item.dur;
      });
    }
    return out.trim() || (activeLang === 'th' ? 'ยังไม่มีสถานที่ในแผน' : 'No places in itinerary yet');
  };

  const getLocalDate = (dayNum) => {
    try {
      const dt = parseDateSafe(startDate);
      if (!dt) return '';
      dt.setUTCDate(dt.getUTCDate() + dayNum - 1);
      const locale = activeLang === 'th' ? 'th-TH' : 'en-US';
      return dt.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC'
      });
    } catch (_) {
      return '';
    }
  };

  const toT = (m) => {
    if (isNaN(m)) return '--:--';
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
      let url = window.location.href.split('?')[0] + '?trip=' + encoded;
      if (checklist && checklist.length > 0) {
        const chkEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(checklist))));
        url += '&chk=' + chkEncoded;
      }
      return url;
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

  // Load checklist from Share Link on startup
  useEffect(() => {
    if (!chkParam) return;
    try {
      const cleanParam = chkParam.replace(/ /g, '+');
      const loadedChecklist = JSON.parse(decodeURIComponent(escape(atob(cleanParam))));
      if (Array.isArray(loadedChecklist)) {
        setChecklist(loadedChecklist);
      }
    } catch (e) {
      console.warn('Checklist share link decoding failed:', e);
    }
  }, [chkParam]);

  // ─── CALCULATE SUMMARY STATS ───────────────────────────────────────
  const getSummaryStats = () => {
    let placesCount = 0;
    let totalMinutes = 0;
    let activeDays = 0;
    const citiesSet = new Set();

    for (let d = 1; d <= nDays; d++) {
      const items = itin[d] || [];
      if (items.length) activeDays++;
      items.forEach((item, idx) => {
        placesCount++;
        totalMinutes += item.dur;
        if (idx > 0) {
          totalMinutes += item.travelTime !== undefined ? item.travelTime : 20;
        }
        const cityObj = getCityObj(item.city_id);
        if (cityObj) citiesSet.add(getCityName(cityObj, activeLang));
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
        <div className="topbar-main-row">
          <div className="logo">
            <div className="logo-dot"></div>
            Trip Builder
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
            
            <div className="theme-toggle-container" style={{ display: 'flex', gap: '2px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '2px' }}>
              <button className={`theme-mode-btn ${theme === 'clean' ? 'active' : ''}`} onClick={() => setTheme('clean')} title="Clean">☀</button>
              <button className={`theme-mode-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark">🌙</button>
              <button className={`theme-mode-btn ${theme === 'colorful' ? 'active' : ''}`} onClick={() => setTheme('colorful')} title="Colorful">🎨</button>
            </div>

            <div className="topbar-action-group">
              <button className={`btn btn-sm ${showMap ? 'btn-primary' : 'btn-ghost'} topbar-map-btn`} onClick={() => setShowMap(!showMap)}>
                <span className="map-btn-icon">🗺️</span>
                <span className="map-btn-text"> {activeLang === 'th' ? 'แผนที่' : 'Map'}</span>
              </button>
              <button className="btn btn-ghost btn-sm topbar-clear-btn" onClick={clearAll}>{t('clear')}</button>
              <button className="btn btn-primary btn-sm topbar-export-btn" onClick={() => setExportModalOpen(true)}>{t('export')}</button>
            </div>

            {/* User Profile / Login Panel */}
            <div className="user-menu-container">
              {user ? (
                <>
                  <div className="user-badge" onClick={() => setUserDropdownOpen(!userDropdownOpen)}>
                    <div className="user-avatar">
                      {user.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <span className="user-badge-name">{user.email ? user.email.split('@')[0] : 'Member'}</span>
                    <span className="user-badge-arrow"> ▼</span>
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
                  className="btn btn-ghost btn-sm topbar-signin-btn" 
                  onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                  style={{ border: '1px solid var(--border)' }}
                >
                  <span>👤</span>
                  <span className="signin-btn-text"> {activeLang === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="topbar-sep desktop-sep-1" />

        <div className="topbar-sub-row">
          {/* Country buttons */}
          <div className="country-row">
            {COUNTRIES.map(c => (
              <button
                key={c.id}
                className={`country-btn ${activeCountry === c.id ? 'active' : ''}`}
                style={activeCountry === c.id ? { background: getCityObj(activeCity)?.color || '#1D9E75' } : {}}
                onClick={() => handleCountrySelect(c.id)}
              >
                {c.flag} {getCountryName(c, activeLang)}
              </button>
            ))}
          </div>
          
          <div className="topbar-sep sub-sep" />

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
                {c.emoji} {getCityName(c, activeLang)}
              </button>
            ))}
          </div>
        </div>

        <div className="topbar-sep desktop-sep-2" />
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
              const label = c === '__all__' ? (activeLang === 'th' ? 'ทั้งหมด' : 'All') : translateCategory(c, activeLang);
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
                      {count > 0 && (
                        <span className="lm-count-badge">
                          {activeLang === 'th' ? `เลือกแล้ว ${count} ครั้ง` : `${count}x selected`}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div className="lm-name">
                        {l.icon && <span style={{ marginRight: '6px' }}>{l.icon}</span>}
                        {(l.names && l.names[activeLang]) || l.name}
                      </div>
                      <div className="lm-sub">
                        <span className="badge" style={{ background: getCityObj(activeCity)?.light || '#E1F5EE', color: getCityObj(activeCity)?.dark || '#0F6E56' }}>
                          {translateCategory(l.cat, activeLang)}
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
            <div className="cfg cfg-start-date">
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
            <div className="trip-bar-arrow">→</div>
            <div className="cfg cfg-end-date">
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
            <div className="cfg cfg-depart-time">
              <label>{t('departTime')}</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="trip-bar-divider" />
            <div className="cfg cfg-hotel" style={{ flex: '1', minWidth: '140px' }}>
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
            <div className="cfg cfg-num-days">
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
              <div className="stat-val">{stats.hours} {activeLang === 'th' ? 'ชม.' : 'hrs'}</div>
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
          <div style={{ padding: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text)', margin: '10px 0', textAlign: 'center', fontFamily: 'monospace' }}>
            [DEBUG] City: {activeCity} | Date: {startDate || 'EMPTY'} | Days: {nDays} | Weather Keys: {Object.keys(weatherData).join(', ') || 'NONE'}
          </div>

          <div className={`builder-split-layout ${showMap ? 'has-map' : ''}`}>
            <div className="days-grid-wrapper">
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

                  let [sh, sm] = (startTime || '09:00').split(':').map(Number);
                  if (isNaN(sh) || isNaN(sm)) {
                    sh = 9;
                    sm = 0;
                  }
                  let currentTimeInMin = sh * 60 + sm;
                  let lunchAdded = false;

                  return (
                    <div className="day-col" key={day}>
                      <div className="day-hd">
                        <span className="day-lbl" style={{ background: dayColor.bg, color: dayColor.t, border: `1px solid ${dayColor.b}` }}>
                          {t('dayLabel')} {day} · {getLocalDate(day)}
                        </span>
                        {(() => {
                          try {
                            const dObj = parseDateSafe(startDate);
                            if (!dObj) return null;
                            dObj.setUTCDate(dObj.getUTCDate() + (day - 1));
                            const dateStr = dObj.toISOString().split('T')[0];
                            const weather = weatherData[dateStr];
                            if (!weather) return null;
                            const codeInfo = WEATHER_CODES[weather.code] || { label: { th: 'ไม่ระบุ', en: 'Unknown' }, emoji: '❓' };
                            const label = codeInfo.label[activeLang] || codeInfo.label.th;
                            return (
                              <div 
                                className="day-weather-badge" 
                                id={`weather-badge-day-${day}`}
                                title={label}
                              >
                                <span className="weather-emoji">{codeInfo.emoji}</span>
                                <span className="weather-temp">{weather.tempMin}° - {weather.tempMax}°C</span>
                              </div>
                            );
                          } catch (e) {
                            return null;
                          }
                        })()}
                        <span className="day-info">
                          {items.length} · {durationLabel}
                        </span>
                      </div>

                      {/* Smart Alert Banner */}
                      {(() => {
                        try {
                          const dObj = parseDateSafe(startDate);
                          if (!dObj) return null;
                          dObj.setUTCDate(dObj.getUTCDate() + (day - 1));
                          const dateStr = dObj.toISOString().split('T')[0];
                          const weather = weatherData[dateStr];
                          if (weather && weather.code >= 50) {
                            const outdoorCategories = ['วัด', 'ธรรมชาติ', 'วิวทิวทัศน์', 'ชายหาด', 'ตลาด', 'ย่าน', 'temple', 'nature', 'scenic view', 'beach', 'market', 'district'];
                            const hasOutdoorLandmark = items.some(item => {
                              const actualLandmark = findLandmarkGlobally(item.id, item.city_id) || item;
                              const category = (actualLandmark.cat || '').trim().toLowerCase();
                              return outdoorCategories.some(cat => cat.toLowerCase() === category);
                            });
                            
                            if (hasOutdoorLandmark) {
                              const codeInfo = WEATHER_CODES[weather.code] || { label: { th: 'ฝนตก', en: 'Rainy' }, emoji: '🌧️' };
                              const weatherTextTh = codeInfo.label.th || 'ฝนตก';
                              const weatherTextEn = codeInfo.label.en || 'Rainy';
                              return (
                                <div className="day-weather-alert" id={`weather-alert-day-${day}`}>
                                  <span className="day-weather-alert-icon">⚠️</span>
                                  <div className="day-weather-alert-text">
                                    <span className="day-weather-alert-th">
                                      วันนี้อาจมี{weatherTextTh} แต่มีกิจกรรมกลางแจ้งในแผน กรุณาเตรียมร่มหรือพิจารณาเปลี่ยนไปสถานที่ในร่มแทน
                                    </span>
                                    <span className="day-weather-alert-en">
                                      {weatherTextEn} expected today with outdoor activities planned. Please bring an umbrella or consider indoor alternatives.
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                          }
                        } catch (e) {
                          console.warn('Failed to render weather alert:', e);
                        }
                        return null;
                      })()}
                      
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
                              const travelTime = item.travelTime !== undefined ? item.travelTime : 20;
                              htmlElements.push(
                                <div className="travel-row" key={`travel_${idx}`}>
                                  <div className="tline" />
                                  <span 
                                    className="tlabel tlabel-interactive" 
                                    onClick={() => promptEditTravelTime(day, idx, item)}
                                    title={activeLang === 'th' ? 'คลิกเพื่อแก้ไขเวลาเดินทาง' : 'Click to edit travel time'}
                                  >
                                    🚗 {travelTime}m {activeLang === 'th' ? 'เดินทาง' : 'Travel'}
                                  </span>
                                  <div className="tline" />
                                </div>
                              );
                              currentTimeInMin += travelTime;
                            }

                            const startT = toT(currentTimeInMin);
                            const endT = toT(currentTimeInMin + item.dur);
                            currentTimeInMin += item.dur;
                            const actualLandmark = findLandmarkGlobally(item.id, item.city_id) || item;

                            htmlElements.push(
                              <div
                                key={item.itinId || `${item.id}_${day}_${idx}`}
                                className={`it-item ${isLastAdded ? 'last-added' : ''}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item, day, idx)}
                              >
                                <div className="it-cover-strip">
                                  <img src={getCoverImage(actualLandmark)} alt="" />
                                </div>
                                <div style={{ padding: '6px 8px' }}>
                                  <div className="it-top">
                                    <div className="it-name" onClick={() => handleOpenDetail(actualLandmark)}>
                                      {actualLandmark.icon && <span style={{ marginRight: '6px' }}>{actualLandmark.icon}</span>}
                                      {(actualLandmark.names && actualLandmark.names[activeLang]) || actualLandmark.name}
                                      {item.rating && <span style={{ color: '#EF9F27', fontSize: '9px', fontWeight: 'bold', marginLeft: '5px', whiteSpace: 'nowrap' }}>⭐ {item.rating}</span>}
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
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                    <span className="it-chip" style={{ background: cityObj.light, color: cityObj.dark }}>
                                      {cityObj.emoji} {getCityName(cityObj, activeLang)}
                                    </span>
                                    <a
                                      href={item.gmaps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.names && item.names[activeLang]) || item.name)}+${item.lat},${item.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={activeLang === 'th' ? 'เปิดใน Google Maps' : 'Open in Google Maps'}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '9px', color: 'var(--teal)', fontWeight: '600', textDecoration: 'underline' }}
                                    >
                                      🗺️ Maps
                                    </a>
                                  </div>
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
            </div>

            {showMap && (
              <div className="map-sidebar-wrapper">
                <MapComponent
                  itin={itin}
                  nDays={nDays}
                  activeCity={activeCity}
                  activeLang={activeLang}
                />
              </div>
            )}
          </div>
        </main>

        {/* ─── RECOMMENDATIONS PANEL ─── */}
        <aside className={`nearby ${mobileTab === 'nearby' ? 'mob-active' : ''}`}>
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab-btn ${activeRightTab === 'nearby' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('nearby')}
              id="tab-nearby"
            >
              💡 {t('tabNearby')}
            </button>
            <button 
              className={`sidebar-tab-btn ${activeRightTab === 'checklist' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('checklist')}
              id="tab-checklist"
            >
              📋 {t('tabChecklist')}
            </button>
          </div>
          <div className="nearby-body">
            {activeRightTab === 'nearby' ? (
              !lastId ? (
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
                          <span className="badge" style={{ background: getCityObj(n.city_id)?.light, color: getCityObj(n.city_id)?.dark }}>
                            {translateCategory(n.cat, activeLang)}
                          </span>
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
              )
            ) : (
              <div>
                {/* Form to add new item */}
                <form onSubmit={(e) => { e.preventDefault(); handleAddChecklistItem(newChecklistItem, newChecklistCat); }} className="checklist-add-form">
                  <input 
                    type="text" 
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder={t('checklistAddPh')}
                    className="checklist-input"
                    id="checklist-text-input"
                  />
                  <select 
                    value={newChecklistCat} 
                    onChange={(e) => setNewChecklistCat(e.target.value)}
                    className="checklist-cat-select"
                    id="checklist-category-select"
                  >
                    {CHECKLIST_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label[activeLang] || cat.label.en}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="checklist-add-btn" id="checklist-add-btn">+</button>
                </form>

                {/* Template selector */}
                <div className="checklist-templates">
                  <select 
                    value={selectedTemplate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleImportTemplate(val);
                        setSelectedTemplate('');
                      }
                    }}
                    className="checklist-template-select"
                    id="checklist-template-select"
                  >
                    <option value="">📋 {t('checklistImportBtn')}...</option>
                    <option value="all">🌟 {activeLang === 'th' ? 'นำเข้าทั้งหมด' : 'Import All'}</option>
                    {CHECKLIST_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label[activeLang] || cat.label.en}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item lists grouped by category */}
                {(() => {
                  const groupedItems = CHECKLIST_CATEGORIES.reduce((acc, cat) => {
                    acc[cat.id] = checklist.filter(item => item.category === cat.id);
                    return acc;
                  }, {});

                  return CHECKLIST_CATEGORIES.map(cat => {
                    const items = groupedItems[cat.id] || [];
                    if (items.length === 0) return null;
                    return (
                      <div key={cat.id} className="checklist-group">
                        <div className="checklist-group-title" style={{ color: cat.color }}>
                          {cat.label[activeLang] || cat.label.en} ({items.length})
                        </div>
                        <div className="checklist-items-list">
                          {items.map(item => (
                            <div key={item.id} className={`checklist-item ${item.checked ? 'checked' : ''}`}>
                              <label className="checklist-item-label" htmlFor={`checklist-checkbox-${item.id}`}>
                                <input 
                                  type="checkbox" 
                                  checked={item.checked} 
                                  onChange={() => handleToggleChecklistItem(item.id)}
                                  className="checklist-checkbox"
                                  id={`checklist-checkbox-${item.id}`}
                                />
                                <span className="checklist-text">{item.text}</span>
                              </label>
                              <button 
                                onClick={() => handleDeleteChecklistItem(item.id)} 
                                className="checklist-delete-btn"
                                title={activeLang === 'th' ? 'ลบ' : 'Delete'}
                                id={`checklist-delete-${item.id}`}
                              >
                                🗑️
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}

                {checklist.length === 0 && (
                  <div className="checklist-empty">
                    {t('checklistEmpty')}
                  </div>
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
                  {isEditing ? (activeLang === 'th' ? '✏️ แก้ไขข้อมูลสถานที่' : '✏️ Edit Place Info') : `${selectedPlace.icon} ${(selectedPlace.names && selectedPlace.names[activeLang]) || selectedPlace.name}`}
                </div>
                {!isEditing && (
                  <div className="chip-row">
                    <span className="chip">{getCityObj(selectedPlace.city_id || activeCity)?.emoji} {getCityName(getCityObj(selectedPlace.city_id || activeCity), activeLang)}</span>
                    <span className="chip">{translateCategory(selectedPlace.cat, activeLang)}</span>
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
                        <option value="วัด">{activeLang === 'th' ? 'วัด' : 'Temple'}</option>
                        <option value="พระราชวัง">{activeLang === 'th' ? 'พระราชวัง' : 'Palace'}</option>
                        <option value="ตลาด">{activeLang === 'th' ? 'ตลาด' : 'Market'}</option>
                        <option value="ย่าน">{activeLang === 'th' ? 'ย่าน' : 'District'}</option>
                        <option value="พิพิธภัณฑ์">{activeLang === 'th' ? 'พิพิธภัณฑ์' : 'Museum'}</option>
                        <option value="ธรรมชาติ">{activeLang === 'th' ? 'ธรรมชาติ' : 'Nature'}</option>
                        <option value="ช้อปปิ้ง">{activeLang === 'th' ? 'ช้อปปิ้ง' : 'Shopping'}</option>
                        <option value="ร้านอาหาร">{activeLang === 'th' ? 'ร้านอาหาร' : 'Restaurant'}</option>
                        <option value="คาเฟ่">{activeLang === 'th' ? 'คาเฟ่' : 'Café'}</option>
                        <option value="วิวทิวทัศน์">{activeLang === 'th' ? 'วิวทิวทัศน์' : 'Scenic View'}</option>
                        <option value="อื่นๆ">{activeLang === 'th' ? 'อื่นๆ' : 'Others'}</option>
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
                      {searchingPhotos ? (
                        <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '15px 0', fontSize: '12px', color: 'var(--muted)' }}>
                          🔄 กำลังค้นหาภาพจริงของสถานที่...
                        </div>
                      ) : (() => {
                        const placePhotos = (selectedPlace.photos && selectedPlace.photos.length > 0)
                          ? selectedPlace.photos
                          : searchedPhotos;
                        const displayUrls = placePhotos.length > 0 
                          ? placePhotos.slice(0, 6) 
                          : [1, 2, 3, 4, 5, 6].map(lock => {
                              const cityKey = CITY_KEYWORDS[selectedPlace.city_id || activeCity] || 'travel';
                              return `https://picsum.photos/seed/${cityKey}-${lock}/400/300`;
                            });

                        return displayUrls.map((url, idx) => {
                          const isSelected = editSelectedImage === url;

                          return (
                            <div
                              key={idx}
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
                        });
                      })()}
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
                      {selectedPlace.icon} {(selectedPlace.names && selectedPlace.names[activeLang]) || selectedPlace.name}
                    </div>
                  </div>
                  {((selectedPlace.descriptions && selectedPlace.descriptions[activeLang]) || selectedPlace.desc) && (
                    <div className="detail-section">
                      <div className="detail-label">{t('fDesc')}</div>
                      <div className="detail-value">{(selectedPlace.descriptions && selectedPlace.descriptions[activeLang]) || selectedPlace.desc}</div>
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
                  <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => handleStartEditing(selectedPlace)}>✏️ แก้ไขข้อมูล</button>
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
                <button className={`tab-btn ${activeAddTab === 'json' ? 'active' : ''}`} onClick={() => setActiveAddTab('json')}>{t('tabJson')}</button>
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
                        <option value="วัด">{activeLang === 'th' ? 'วัด' : 'Temple'}</option>
                        <option value="พระราชวัง">{activeLang === 'th' ? 'พระราชวัง' : 'Palace'}</option>
                        <option value="ตลาด">{activeLang === 'th' ? 'ตลาด' : 'Market'}</option>
                        <option value="ย่าน">{activeLang === 'th' ? 'ย่าน' : 'District'}</option>
                        <option value="พิพิธภัณฑ์">{activeLang === 'th' ? 'พิพิธภัณฑ์' : 'Museum'}</option>
                        <option value="ธรรมชาติ">{activeLang === 'th' ? 'ธรรมชาติ' : 'Nature'}</option>
                        <option value="ช้อปปิ้ง">{activeLang === 'th' ? 'ช้อปปิ้ง' : 'Shopping'}</option>
                        <option value="ห้างสรรพสินค้า">{activeLang === 'th' ? 'ห้างสรรพสินค้า' : 'Department Store'}</option>
                        <option value="ร้านอาหาร">{activeLang === 'th' ? 'ร้านอาหาร' : 'Restaurant'}</option>
                        <option value="คาเฟ่">{activeLang === 'th' ? 'คาเฟ่' : 'Café'}</option>
                        <option value="โรงแรม / ที่พัก">{activeLang === 'th' ? 'โรงแรม / ที่พัก' : 'Hotel / Base'}</option>
                        <option value="วิวทิวทัศน์">{activeLang === 'th' ? 'วิวทิวทัศน์' : 'Scenic View'}</option>
                        <option value="อื่นๆ">{activeLang === 'th' ? 'อื่นๆ' : 'Others'}</option>
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
                      <div className="form-label">{activeLang === 'th' ? 'คะแนนรีวิว (0 - 5)' : 'Rating (0 - 5)'}</div>
                      <input className="form-input" type="number" min="0" max="5" step="0.1" value={fRating} onChange={(e) => setFRating(e.target.value)} placeholder="เช่น 4.5" />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <div className="form-label">{t('fCity')}</div>
                    <select className="form-input" value={fCity} onChange={(e) => setFCity(e.target.value)}>
                      {COUNTRIES.flatMap(co => co.cities).map(ci => (
                        <option key={ci.id} value={ci.id}>{ci.emoji} {getCityName(ci, activeLang)}</option>
                      ))}
                    </select>
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
                              <div className="ai-place-sub">{translateCategory(place.cat, activeLang)} · {place.dur}{activeLang === 'th' ? 'น.' : 'm'}</div>
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
                          <button className="btn btn-primary btn-sm" style={{ marginTop: '6px' }} onClick={() => fillFromMaps(gmapsResult.name, gmapsResult.lat, gmapsResult.lng, gmapsResult.address, gmapsResult.category, gmapsResult.icon, gmapsResult.gmaps_url, gmapsResult.rating, gmapsResult.photos)}>กรอกในฟอร์ม →</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* JSON IMPORT TAB */}
              {activeAddTab === 'json' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                    {activeLang === 'th' 
                      ? 'วางข้อความ JSON ที่ได้จาก Google Maps Console Script ของคุณ เพื่อนำเข้าข้อมูลทั้งหมดทีเดียว:' 
                      : 'Paste the JSON array extracted from Google Maps Console Script to import all places at once:'}
                  </div>
                  
                  <div className="form-group">
                    <div className="form-label">{activeLang === 'th' ? 'เลือกเมืองที่ต้องการนำเข้าสถานที่ *:' : 'Select Target City *:'}</div>
                    <select className="form-input" id="bulk-import-city" defaultValue={activeCity}>
                      {COUNTRIES.map(country => 
                        country.cities.map(city => (
                          <option key={city.id} value={city.id}>
                            {country.flag} {city.emoji} {getCityName(city, activeLang)} ({city.id})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <textarea
                    className="form-input"
                    rows={6}
                    placeholder='[{"name": "APA HOTEL...", "address": "...", "lat": 35.69, "lng": 139.66}, ...]'
                    id="bulk-json-input"
                    style={{ fontFamily: 'monospace', fontSize: '11px' }}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={async () => {
                      const input = document.getElementById('bulk-json-input');
                      if (!input || !input.value.trim()) return;
                      try {
                        const parsed = JSON.parse(input.value.trim());
                        if (!Array.isArray(parsed)) {
                          toast(activeLang === 'th' ? 'ข้อมูลต้องอยู่ในรูปแบบ Array [ ... ]' : 'Data must be a JSON Array');
                          return;
                        }
                        
                        setAuthLoading(true);
                        let successCount = 0;
                        const targetCity = document.getElementById('bulk-import-city')?.value || activeCity;
                        const customList = [...(customPlaces[targetCity] || [])];
                        
                        const landmarksToInsert = [];
                        const placesObjList = [];
                        
                        for (let i = 0; i < parsed.length; i++) {
                          const item = parsed[i];
                          if (!item.name) continue;
                          
                          const localId = `lm_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}`;
                          const placeObj = {
                            id: localId,
                            name: item.name,
                            cat: 'อื่นๆ',
                            dur: 90,
                            icon: '📍',
                            desc: item.description || item.address || '',
                            addr: item.address || '',
                            lat: item.lat ? parseFloat(item.lat) : null,
                            lng: item.lng ? parseFloat(item.lng) : null,
                            fee: '',
                            transport: [],
                            cover_image: null,
                            names: {},
                            descriptions: {},
                            city_id: targetCity,
                            _custom: true
                          };
                          
                          placesObjList.push(placeObj);
                          
                          landmarksToInsert.push({
                            id: String(localId),
                            name: placeObj.name,
                            cat: placeObj.cat,
                            icon: placeObj.icon,
                            city_id: placeObj.city_id,
                            address: placeObj.addr,
                            lat: placeObj.lat,
                            lng: placeObj.lng,
                            description: placeObj.desc,
                            duration_min: placeObj.dur,
                            fee: placeObj.fee,
                            transport: placeObj.transport,
                            status: 'user_custom'
                          });
                        }

                        if (googleSheets && user && landmarksToInsert.length > 0) {
                          try {
                            const res = await googleSheets.bulkInsertLandmarks(user.email, landmarksToInsert);
                            if (res.success) {
                              successCount = landmarksToInsert.length;
                            }
                          } catch (err) {
                            console.warn('Failed to save to Google Sheets:', err);
                          }
                        } else {
                          successCount = landmarksToInsert.length;
                        }

                        if (successCount > 0) {
                          const finalCustomList = [...customList, ...placesObjList];
                          const updatedCustom = { ...customPlaces, [targetCity]: finalCustomList };
                          setCustomPlaces(updatedCustom);
                          localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: updatedCustom }));
                          
                          // Force refresh landmarks state if current active city matches
                          if (targetCity === activeCity) {
                            setLandmarks(prev => {
                              const sheetIds = new Set(placesObjList.map(d => String(d.id)));
                              const filteredPrev = prev.filter(p => !sheetIds.has(String(p.id)));
                              return [...filteredPrev, ...placesObjList.map(item => ({
                                ...item,
                                dur: item.dur || 90,
                                icon: item.icon || '📍',
                                _custom: true
                              }))];
                            });
                          }
                        }
                        
                        toast(activeLang === 'th' ? `นำเข้าสำเร็จ ${successCount} รายการ! กรุณารอสักครู่ขณะระบบดึงข้อมูลใหม่...` : `Imported ${successCount} places! Refreshing...`);
                        setAddModalOpen(false);
                        
                        if (googleSheets && user) {
                          setTimeout(() => {
                            window.location.reload();
                          }, 1500);
                        }
                      } catch (e) {
                        toast(activeLang === 'th' ? 'JSON ไม่ถูกต้อง: ' + e.message : 'Invalid JSON: ' + e.message);
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                  >
                    {activeLang === 'th' ? 'นำเข้าสถานที่ทั้งหมด' : 'Import All Places'}
                  </button>
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

      {/* ─── QUICK TRAVEL TIME EDIT MODAL ────────────────────────────── */}
      {editTravelModalOpen && editTravelTarget && (
        <div className="overlay show" onClick={() => setEditTravelModalOpen(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">🚗 {activeLang === 'th' ? 'แก้ไขเวลาเดินทาง' : 'Edit Travel Time'}</div>
              <button className="modal-close" onClick={() => setEditTravelModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                {activeLang === 'th' 
                  ? `แก้ไขระยะเวลาเดินทางไปยัง "${(editTravelTarget.item.names && editTravelTarget.item.names[activeLang]) || editTravelTarget.item.name}"`
                  : `Change travel time to "${(editTravelTarget.item.names && editTravelTarget.item.names[activeLang]) || editTravelTarget.item.name}"`}
              </p>
              <div className="form-group">
                <label className="form-label">{activeLang === 'th' ? 'ระยะเวลาเดินทาง (นาที):' : 'Travel Duration (minutes):'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={editTravelTarget.value}
                    onChange={(e) => setEditTravelTarget({ ...editTravelTarget, value: e.target.value })}
                    style={{ flex: 1, fontSize: '15px', fontWeight: '500', padding: '10px' }}
                    min="0"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTravelTimeQuick();
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--muted)' }}>
                    {activeLang === 'th' ? 'นาที' : 'mins'}
                  </span>
                </div>
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: 'var(--teal)', 
                  background: 'var(--teal-l)', 
                  padding: '8px 12px', 
                  borderRadius: '8px',
                  display: editTravelTarget.value ? 'block' : 'none'
                }}>
                  {formatMinutesToHours(editTravelTarget.value)}
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditTravelModalOpen(false)}>{activeLang === 'th' ? 'ยกเลิก' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={handleSaveTravelTimeQuick}>{activeLang === 'th' ? 'บันทึก' : 'Save'}</button>
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
