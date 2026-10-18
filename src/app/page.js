'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { googleSheets } from '@/lib/googleSheets';
import { getGmapsWalkingRouteUrl, shareGmapsRoute } from '@/lib/gmapsRoute';
import { optimizeDayRoute, calculateDistanceKm, estimateTravelTimeMins } from '@/lib/routeOptimizer';
import dynamic from 'next/dynamic';
import OptimizedImage from './components/OptimizedImage';
import HeaderNav from './components/HeaderNav';
import {
  LANG_STRINGS,
  COUNTRIES,
  CAT_TRANSLATIONS,
  translateCategory,
  getCityName,
  getCountryName,
  DAY_COLORS,
  CITY_KEYWORDS,
  CITY_COVER_IMAGES,
  CHECKLIST_CATEGORIES,
  CHECKLIST_TEMPLATES,
  generateChecklistId,
  CITY_COORDINATES,
  WEATHER_CODES,
  getCountryOfCity
} from './constants/translations';

// ─── DYNAMIC ON-DEMAND MODALS & VIEWS (CODE-SPLIT) ───────────────────
const DetailModal = dynamic(() => import('./components/modals/DetailModal'), { ssr: false });
const AddPlaceModal = dynamic(() => import('./components/modals/AddPlaceModal'), { ssr: false });
const ExportModal = dynamic(() => import('./components/modals/ExportModal'), { ssr: false });
const AiPlanModal = dynamic(() => import('./components/modals/AiPlanModal'), { ssr: false });
const QuickEditModals = dynamic(() => import('./components/modals/QuickEditModals'), { ssr: false });
const AuthModal = dynamic(() => import('./components/modals/AuthModal'), { ssr: false });
const GroupCollabModal = dynamic(() => import('./components/modals/GroupCollabModal'), { ssr: false });
const RouteOptimizationModal = dynamic(() => import('./components/modals/RouteOptimizationModal'), { ssr: false });
const TravelModeView = dynamic(() => import('./components/TravelModeView'), {
  ssr: false,
  loading: () => <div className="travel-mode-loading">✈️ Loading Travel Mode...</div>
});
const BudgetTab = dynamic(() => import('./components/BudgetTab'), {
  ssr: false,
  loading: () => <div className="budget-loading-placeholder">💰 Loading Budget...</div>
});

const MapComponent = dynamic(() => import('./components/MapComponent'), {
  ssr: false,
  loading: () => <div className="map-loading-placeholder">กำลังโหลดแผนที่...</div>
});

// ─── APP VERSION ───────────────────────────────────────────────────
const APP_VERSION = 'v1.12.0';

// ─── DEFAULT BUDGET CONFIG ─────────────────────────────────────────
const DEFAULT_BUDGET = {
  totalBudget: 30000,
  baseCurrency: 'THB',
  exchangeRates: {
    THB: 1.0,
    KRW: 0.027,
    JPY: 0.23,
    USD: 36.5,
    EUR: 39.5,
    TWD: 1.15
  },
  expenses: []
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

const parseTimeSafe = (timeVal) => {
  if (!timeVal) return '09:00';
  const timeStr = String(timeVal).trim();
  if (!timeStr || timeStr === 'null' || timeStr === 'undefined') return '09:00';
  
  if (timeStr.includes('T')) {
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    } catch (_) {}
  }
  
  if (/^\d{1,2}:\d{2}/.test(timeStr)) {
    const parts = timeStr.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  
  return '09:00';
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
  const bgtParam = searchParams.get('bgt');
  const roomParam = searchParams.get('room');
  const [activeRoom, setActiveRoom] = useState(null);
  const [myNickname, setMyNickname] = useState('');
  const [activeMembersList, setActiveMembersList] = useState([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState('create');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [inputRoomName, setInputRoomName] = useState('');
  const [inputNickname, setInputNickname] = useState('');
  const [isRoomSyncing, setIsRoomSyncing] = useState(false);
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
  const [startTime, setStartTimeInternal] = useState('09:00');
  const setStartTime = (val) => {
    setStartTimeInternal(parseTimeSafe(val));
  };
  const [hotel, setHotel] = useState('');
  
  const [itin, setItin] = useState({ 1: [], 2: [], 3: [] });
  const [checklist, setChecklist] = useState([]);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.warn('Service Worker registration failed:', err);
        });
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);
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
  
  // Route Optimization states
  const [optModalOpen, setOptModalOpen] = useState(false);
  const [optData, setOptData] = useState(null);
  
  // Travel Mode state
  const [travelModeOpen, setTravelModeOpen] = useState(false);
  
  // Tablet Drawer state (1025px-1280px)
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  
  // Auth states
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [plansDropdownOpen, setPlansDropdownOpen] = useState(false);

  // Multiple plans states
  const [plansList, setPlansList] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  
  const [toastMessage, setToastMessage] = useState('');
  const [mobileTab, setMobileTab] = useState('plan');
  
  // Touch & Popover states for iPad / Mobile
  const [moveDayPopover, setMoveDayPopover] = useState(null); // { itinId, fromDay, idx, item }
  const [addPlacePopover, setAddPlacePopover] = useState(null); // { landmarkId, place }
  const [touchDrag, setTouchDrag] = useState(null); // { item, source, index, x, y, name, icon }
  const [touchOverDay, setTouchOverDay] = useState(null);
  const touchStateRef = useRef({
    startX: 0,
    startY: 0,
    isDragging: false,
    timer: null,
    item: null,
    source: null,
    index: null,
  });
  
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

  const getCityFallbackImage = (place) => {
    const cityKey = place ? (CITY_KEYWORDS[place.city_id || activeCity] || 'travel') : 'travel';
    return CITY_COVER_IMAGES[cityKey] || CITY_COVER_IMAGES.travel;
  };

  const getCoverImage = (place) => {
    if (place && localCoverOverrides[place.id]) return localCoverOverrides[place.id];
    if (place && place.cover_image) return place.cover_image;
    return getCityFallbackImage(place);
  };

  const handleImageError = (e, place) => {
    const cityKey = place ? (CITY_KEYWORDS[place.city_id || activeCity] || 'travel') : 'travel';
    const cityFallback = CITY_COVER_IMAGES[cityKey] || CITY_COVER_IMAGES.travel;
    const travelFallback = CITY_COVER_IMAGES.travel;
    const svgFallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23E2E0D8"/></svg>';
    
    const currentSrc = e.target.src;
    if (currentSrc === svgFallback) {
      return;
    }
    if (currentSrc === travelFallback) {
      e.target.src = svgFallback;
      return;
    }
    if (currentSrc === cityFallback) {
      e.target.src = travelFallback;
      return;
    }
    e.target.src = cityFallback;
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

  // ─── ROUTE OPTIMIZATION HANDLERS ────────────────────────────────────
  const handleTriggerOptimize = (day) => {
    const dayItems = itin[day] || [];
    if (dayItems.length < 3) {
      toast(t('needMorePlacesToOptimize'));
      return;
    }

    // Enrich items with coordinates from global landmarks if missing
    const enrichedItems = dayItems.map(item => {
      if (item.lat && item.lng) return item;
      const actual = findLandmarkGlobally(item.id, item.city_id);
      if (actual && actual.lat && actual.lng) {
        return { ...item, lat: actual.lat, lng: actual.lng };
      }
      return item;
    });

    const result = optimizeDayRoute(enrichedItems);

    if (!result.hasValidCoords) {
      toast(t('needMorePlacesToOptimize'));
      return;
    }

    if (!result.isImproved) {
      toast(t('routeAlreadyOptimal'));
      return;
    }

    setOptData({
      day,
      ...result
    });
    setOptModalOpen(true);
  };

  const handleApplyOptimizedRoute = () => {
    if (!optData || !optData.day || !optData.optimizedItems) return;
    const { day, optimizedItems } = optData;

    const updatedItin = { ...itin };
    updatedItin[day] = optimizedItems;

    setItin(updatedItin);
    saveItinData(updatedItin, nDays);
    setOptModalOpen(false);
    setOptData(null);

    toast(activeLang === 'th'
      ? `✨ จัดเส้นทางวันที่ ${day} สำเร็จ! ประหยัดไป ${optData.savedDistKm} กม.`
      : `✨ Day ${day} route optimized! Saved ${optData.savedDistKm} km.`
    );
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
            loadGuestPlans();
          }
        } catch (_) {
          loadGuestPlans();
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
          loadGuestPlans();
        }
      } catch (err) {
        console.error('[TripBuilder] checkSession failed:', err);
        loadGuestPlans();
      }
    };

    checkSession();

    return () => {};
  }, []);

  const loadGuestPlans = () => {
    try {
      let rawPlans = localStorage.getItem('tb_guest_plans');
      let plans = rawPlans ? JSON.parse(rawPlans) : [];

      // Auto-migrate from legacy trip_builder_itin_v1 if tb_guest_plans is empty
      if (!plans || plans.length === 0) {
        const legacyItinRaw = localStorage.getItem('trip_builder_itin_v1');
        if (legacyItinRaw) {
          try {
            const parsedLegacy = JSON.parse(legacyItinRaw);
            let legacyChecklist = [];
            try {
              const localCheck = localStorage.getItem('checklist_guest') || localStorage.getItem('trip_builder_checklist_guest');
              if (localCheck) legacyChecklist = JSON.parse(localCheck);
            } catch (_) {}

            const migratedPlan = {
              id: 'guest_plan_1',
              name: activeLang === 'th' ? 'แผนการเดินทาง 1' : 'My Trip 1',
              city_id: activeCity || 'bkk',
              nDays: parsedLegacy.nDays || 3,
              start: parsedLegacy.start || new Date().toISOString().split('T')[0],
              time: parsedLegacy.time || '09:00',
              hotel: parsedLegacy.hotel || '',
              itin: parsedLegacy.itin || { 1: [], 2: [], 3: [] },
              checklist: parsedLegacy.checklist || legacyChecklist
            };
            plans = [migratedPlan];
            localStorage.setItem('tb_guest_plans', JSON.stringify(plans));
            localStorage.setItem('tb_guest_active_plan', 'guest_plan_1');
          } catch (_) {}
        }
      }

      // If still empty, create default first plan
      if (!plans || plans.length === 0) {
        const defaultPlan = {
          id: `guest_plan_${Date.now()}`,
          name: activeLang === 'th' ? 'แผนการเดินทาง 1' : 'My Trip 1',
          city_id: activeCity || 'bkk',
          nDays: 3,
          start: new Date().toISOString().split('T')[0],
          time: '09:00',
          hotel: '',
          itin: { 1: [], 2: [], 3: [] },
          checklist: []
        };
        plans = [defaultPlan];
        localStorage.setItem('tb_guest_plans', JSON.stringify(plans));
        localStorage.setItem('tb_guest_active_plan', defaultPlan.id);
      }

      setPlansList(plans);

      const activeId = localStorage.getItem('tb_guest_active_plan') || plans[0].id;
      const currentPlan = plans.find(p => p.id === activeId) || plans[0];

      setActivePlanId(currentPlan.id);
      setItin(currentPlan.itin || { 1: [], 2: [], 3: [] });
      setChecklist(currentPlan.checklist || []);
      let loadedBudget = currentPlan.budget || DEFAULT_BUDGET;
      try {
        const localBgt = localStorage.getItem(`budget_${currentPlan.id}`) || localStorage.getItem(`trip_builder_budget_${currentPlan.id}`);
        if (localBgt) loadedBudget = JSON.parse(localBgt);
      } catch (_) {}
      setBudget(loadedBudget);

      setNDays(currentPlan.nDays || 3);
      setStartDate(currentPlan.start || new Date().toISOString().split('T')[0]);
      setStartTime(currentPlan.time || '09:00');
      setHotel(currentPlan.hotel || '');
      if (currentPlan.city_id) {
        setActiveCity(currentPlan.city_id);
        setActiveCountry(getCountryOfCity(currentPlan.city_id));
      }
    } catch (err) {
      console.error('[TripBuilder] loadGuestPlans error:', err);
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

        let loadedBudget = activePlan.budget || DEFAULT_BUDGET;
        try {
          const localBgt = localStorage.getItem(`budget_${activePlan.id}`) || localStorage.getItem(`trip_builder_budget_${activePlan.id}`);
          if (localBgt) loadedBudget = JSON.parse(localBgt);
        } catch (_) {}
        setBudget(loadedBudget);
        
        setNDays(activePlan.nDays || 3);
        setStartDate(activePlan.start || new Date().toISOString().split('T')[0]);
        setStartTime(activePlan.time || '09:00');
        setHotel(activePlan.hotel || '');
        if (activePlan.city_id) {
          setActiveCity(activePlan.city_id);
          setActiveCountry(getCountryOfCity(activePlan.city_id));
        }
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
    
    let cachedPlans = null;
    let hasCache = false;
    
    // Step 1: Read and populate from plans cache on start
    try {
      const cachedDataStr = localStorage.getItem(`tb_cache_cloud_plans_${email}`);
      if (cachedDataStr) {
        cachedPlans = JSON.parse(cachedDataStr);
        if (Array.isArray(cachedPlans)) {
          hasCache = true;
          setPlansList(cachedPlans);
          
          const lastActiveId = localStorage.getItem(`tb_active_plan_${email}`);
          const activePlan = cachedPlans.find(p => p.id === lastActiveId) || cachedPlans[0];
          
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
            if (activePlan.city_id) {
              setActiveCity(activePlan.city_id);
              setActiveCountry(getCountryOfCity(activePlan.city_id));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to read from plans cache:', err);
    }

    try {
      const data = await googleSheets.getItineraries(email);
      console.log('[TripBuilder] Loaded', data?.length, 'cloud plans');
      
      const freshPlans = data.map(item => ({
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
      freshPlans.sort((a, b) => b.id.localeCompare(a.id));

      if (hasCache) {
        // Check if fresh plans are different from cached plans
        const isDifferent = JSON.stringify(freshPlans) !== JSON.stringify(cachedPlans);
        if (isDifferent) {
          setPlansList(freshPlans);
          try {
            localStorage.setItem(`tb_cache_cloud_plans_${email}`, JSON.stringify(freshPlans));
          } catch (_) {}
          
          const currentActiveId = localStorage.getItem(`tb_active_plan_${email}`);
          const freshActivePlan = freshPlans.find(p => p.id === currentActiveId);
          if (freshActivePlan) {
            setActivePlanId(freshActivePlan.id);
            setItin(freshActivePlan.itin);
            
            let loadedChecklist = freshActivePlan.checklist;
            try {
              const localCheck = localStorage.getItem(`checklist_${freshActivePlan.id}`) || localStorage.getItem(`trip_builder_checklist_${freshActivePlan.id}`);
              if (localCheck) {
                loadedChecklist = JSON.parse(localCheck);
              }
            } catch (_) {}
            setChecklist(loadedChecklist);
            
            setNDays(freshActivePlan.nDays);
            setStartDate(freshActivePlan.start);
            setStartTime(freshActivePlan.time);
            setHotel(freshActivePlan.hotel);
            if (freshActivePlan.city_id) {
              setActiveCity(freshActivePlan.city_id);
              setActiveCountry(getCountryOfCity(freshActivePlan.city_id));
            }
          } else {
            // The active plan ID is no longer valid (e.g. deleted from another client)
            const fallbackPlan = freshPlans[0];
            if (fallbackPlan) {
              setActivePlanId(fallbackPlan.id);
              try {
                localStorage.setItem(`tb_active_plan_${email}`, fallbackPlan.id);
              } catch (_) {}
              setItin(fallbackPlan.itin);
              
              let loadedChecklist = fallbackPlan.checklist;
              try {
                const localCheck = localStorage.getItem(`checklist_${fallbackPlan.id}`) || localStorage.getItem(`trip_builder_checklist_${fallbackPlan.id}`);
                if (localCheck) {
                  loadedChecklist = JSON.parse(localCheck);
                }
              } catch (_) {}
              setChecklist(loadedChecklist);
              
              setNDays(fallbackPlan.nDays);
              setStartDate(fallbackPlan.start);
              setStartTime(fallbackPlan.time);
              setHotel(fallbackPlan.hotel);
              if (fallbackPlan.city_id) {
                setActiveCity(fallbackPlan.city_id);
                setActiveCountry(getCountryOfCity(fallbackPlan.city_id));
              }
            } else {
              // No plans exist at all
              await handleCreatePlanCloud('My Saved Plan 1', email);
            }
          }
        }
      } else {
        // If there was no cached data, populate the cache and load the active plan as usual
        setPlansList(freshPlans);
        try {
          localStorage.setItem(`tb_cache_cloud_plans_${email}`, JSON.stringify(freshPlans));
        } catch (_) {}
        
        const lastActiveId = localStorage.getItem(`tb_active_plan_${email}`);
        const activePlan = freshPlans.find(p => p.id === lastActiveId) || freshPlans[0];
        
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
          if (activePlan.city_id) {
            setActiveCity(activePlan.city_id);
            setActiveCountry(getCountryOfCity(activePlan.city_id));
          }
        } else {
          await handleCreatePlanCloud('My Saved Plan 1', email);
        }
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
        setPlansList(prev => {
          const updatedPlans = [newPlan, ...prev];
          try {
            localStorage.setItem(`tb_cache_cloud_plans_${email}`, JSON.stringify(updatedPlans));
          } catch (_) {}
          return updatedPlans;
        });
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
      // Guest multi-plan creation
      const defaultPlanId = `guest_plan_${Date.now()}`;
      const newPlan = {
        id: defaultPlanId,
        name: planName,
        city_id: activeCity,
        itin: { 1: [], 2: [], 3: [] },
        checklist: [],
        budget: DEFAULT_BUDGET,
        nDays: 3,
        start: new Date().toISOString().split('T')[0],
        time: '09:00',
        hotel: ''
      };
      const updatedPlans = [newPlan, ...plansList];
      setPlansList(updatedPlans);
      try {
        localStorage.setItem('tb_guest_plans', JSON.stringify(updatedPlans));
        localStorage.setItem('tb_guest_active_plan', defaultPlanId);
      } catch (_) {}

      setActivePlanId(defaultPlanId);
      setItin(newPlan.itin);
      setChecklist(newPlan.checklist);
      setBudget(DEFAULT_BUDGET);
      setNDays(newPlan.nDays);
      setStartDate(newPlan.start);
      setStartTime(newPlan.time);
      setHotel(newPlan.hotel);
      toast(activeLang === 'th' ? 'สร้างแผนใหม่สำเร็จ' : 'New plan created');
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
          try {
            localStorage.setItem(`tb_cache_cloud_plans_${user.email}`, JSON.stringify(updatedPlans));
          } catch (_) {}
          
          if (activePlanId === planId) {
            const nextPlan = updatedPlans[0];
            if (nextPlan) {
              loadActivePlan(nextPlan.id, updatedPlans);
            }
          }
          toast(activeLang === 'th' ? 'ลบแผนสำเร็จ' : 'Plan deleted');
        } catch (err) {
          console.warn('Failed to delete cloud plan:', err.message);
        }
      }
    } else {
      const updatedPlans = plansList.filter(p => p.id !== planId);
      setPlansList(updatedPlans);
      try {
        localStorage.setItem('tb_guest_plans', JSON.stringify(updatedPlans));
      } catch (_) {}
      
      if (activePlanId === planId) {
        const nextPlan = updatedPlans[0];
        if (nextPlan) {
          loadActivePlan(nextPlan.id, updatedPlans);
        }
      }
      toast(activeLang === 'th' ? 'ลบแผนสำเร็จ' : 'Plan deleted');
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
    } else {
      const updatedPlans = plansList.map(p => p.id === planId ? { ...p, name: newName } : p);
      setPlansList(updatedPlans);
      try {
        localStorage.setItem('tb_guest_plans', JSON.stringify(updatedPlans));
      } catch (_) {}
      toast(activeLang === 'th' ? 'เปลี่ยนชื่อแผนสำเร็จ' : 'Plan renamed');
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

    let loadedBudget = plan.budget || DEFAULT_BUDGET;
    try {
      const localBgt = localStorage.getItem(`budget_${planId}`) || localStorage.getItem(`trip_builder_budget_${planId}`);
      if (localBgt) {
        loadedBudget = JSON.parse(localBgt);
      }
    } catch (_) {}
    setBudget(loadedBudget);
    
    setNDays(plan.nDays || 3);
    setStartDate(plan.start || new Date().toISOString().split('T')[0]);
    setStartTime(plan.time || '09:00');
    setHotel(plan.hotel || '');
    if (plan.city_id) {
      setActiveCity(plan.city_id);
      setActiveCountry(getCountryOfCity(plan.city_id));
    }
    
    if (user) {
      if (!googleSheets) {
        localStorage.setItem(`tb_mock_active_plan_${user.email}`, planId);
      } else {
        localStorage.setItem(`tb_active_plan_${user.email}`, planId);
      }
    } else {
      try {
        localStorage.setItem('tb_guest_active_plan', planId);
      } catch (_) {}
    }
  };

  const handleSignUp = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      toast(activeLang === 'th' ? 'กรุณากรอกอีเมลและรหัสผ่าน' : 'Please enter email and password');
      return;
    }
    setAuthLoading(true);
    
    if (!googleSheets) {
      try {
        const rawUsers = localStorage.getItem('tb_mock_users') || '[]';
        const users = JSON.parse(rawUsers);
        if (users.find(u => u.email === authEmail)) {
          toast(activeLang === 'th' ? 'อีเมลนี้เคยลงทะเบียนแล้ว' : 'Email already registered');
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
        loadLocalMockPlans(authEmail);
        toast(activeLang === 'th' ? 'สมัครสมาชิกและเข้าสู่ระบบสำเร็จ (Mock)' : 'Registered successfully (Mock)');
      } catch (_) {
        toast(activeLang === 'th' ? 'สมัครสมาชิกล้มเหลว' : 'Registration failed');
      } finally {
        setAuthLoading(false);
      }
      return;
    }
    
    try {
      const res = await googleSheets.signUp(authEmail, authPassword);
      if (res.success) {
        toast(activeLang === 'th' ? 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบได้ทันที' : 'Registered successfully! You can now sign in.');
        setAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
      }
    } catch (err) {
      toast(activeLang === 'th' ? `สมัครสมาชิกล้มเหลว: ${err.message}` : `Registration failed: ${err.message}`);
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
      loadGuestPlans();
      setUserDropdownOpen(false);
      toast('ออกจากระบบแล้ว (Mock)');
      return;
    }
    
    try {
      localStorage.removeItem('tb_sheet_user');
      setUser(null);
      setPlansList([]);
      setActivePlanId(null);
      loadGuestPlans();
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

  // Close popovers on click outside
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.move-day-popover') && !e.target.closest('.move-day-btn')) {
        setMoveDayPopover(null);
      }
      if (!e.target.closest('.lm-day-picker-popover') && !e.target.closest('.lm-card')) {
        setAddPlacePopover(null);
      }
      if (!e.target.closest('.user-dropdown') && !e.target.closest('.user-badge')) {
        setUserDropdownOpen(false);
      }
      if (!e.target.closest('.plans-menu-container')) {
        setPlansDropdownOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Load landmarks when activeCity or customPlaces changes
  useEffect(() => {
    const customList = customPlaces[activeCity] || [];
    setLandmarks(customList);

    // Fetch from Supabase if connected
    const fetchLandmarks = async () => {
      if (!googleSheets) return;

      const email = user?.email || '';
      const cacheKey = `tb_cache_landmarks_${activeCity}_${email}`;
      let cachedData = null;
      let cachedStr = null;

      try {
        cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          cachedData = JSON.parse(cachedStr);
          if (cachedData && Array.isArray(cachedData)) {
            setLandmarks(cachedData);
            setIsLoading(false);
          } else {
            setIsLoading(true);
          }
        } else {
          setIsLoading(true);
        }
      } catch (err) {
        console.warn('Failed to parse cached landmarks:', err);
        setIsLoading(true);
      }

      try {
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
        let freshRecords = [];

        if (isLoggedIn) {
          freshRecords = allData.map(mapItem);
          if (allData.length > 0) {
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
          freshRecords = [...allData.map(mapItem), ...localOnlyCustom];
        }

        const cachedCompareStr = cachedStr;
        const freshCompareStr = JSON.stringify(freshRecords);

        if (!cachedCompareStr || cachedCompareStr !== freshCompareStr) {
          setLandmarks(freshRecords);
          try {
            localStorage.setItem(cacheKey, freshCompareStr);
          } catch (_) {}
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
      const activePlan = plansList.find(p => p.id === activePlanId);
      const targetCity = (activePlanId !== 'guest' && activePlan) ? activePlan.city_id : activeCity;
      
      const coords = CITY_COORDINATES[targetCity];
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
  }, [activePlanId, plansList, activeCity, startDate, nDays]);

  // Save itinerary to LocalStorage or Cloud
  const saveItinData = async (newItin, newNDays, currentChecklist = checklist, currentBudget = budget) => {
    try {
      const data = {
        itin: newItin,
        nDays: newNDays,
        start: startDate,
        time: startTime,
        hotel: hotel,
        checklist: currentChecklist,
        budget: currentBudget
      };
      localStorage.setItem('trip_builder_itin_v1', JSON.stringify(data));
    } catch (_) {}

    // Group Room mode: sync directly to shared room
    if (activeRoom) {
      const roomCodeUpper = activeRoom.code.toUpperCase();
      const roomPlanData = {
        id: activeRoom.id || `plan_${roomCodeUpper}`,
        name: activeRoom.name || `ทริปกลุ่ม ${roomCodeUpper}`,
        city_id: activeCity,
        itin: newItin,
        n_days: newNDays,
        start_date: startDate,
        start_time: startTime,
        hotel: hotel,
        checklist: currentChecklist,
        budget: currentBudget,
        members: activeMembersList.length > 0 ? activeMembersList : [myNickname || 'Member'],
        last_updated: Date.now(),
        last_updated_by: myNickname || 'Member'
      };

      try {
        localStorage.setItem(`tb_cache_room_${roomCodeUpper}`, JSON.stringify(roomPlanData));
      } catch (_) {}

      if (googleSheets) {
        try {
          await googleSheets.updateItinerary(roomPlanData);
        } catch (err) {
          console.warn('Failed to update group room itinerary in Google Sheets:', err.message);
        }
      } else {
        try {
          const rawRooms = localStorage.getItem('tb_mock_rooms') || '{}';
          const mockRooms = JSON.parse(rawRooms);
          mockRooms[roomCodeUpper] = roomPlanData;
          localStorage.setItem('tb_mock_rooms', JSON.stringify(mockRooms));
        } catch (_) {}
      }
      return;
    }

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
              checklist: currentChecklist,
              budget: currentBudget
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
          
          setPlansList(prev => {
            const updatedPlans = prev.map(p => {
              if (p.id === activePlanId) {
                return {
                  ...p,
                  itin: newItin,
                  nDays: newNDays,
                  start: startDate,
                  time: startTime,
                  hotel: hotel,
                  checklist: currentChecklist,
                  budget: currentBudget
                };
              }
              return p;
            });
            try {
              localStorage.setItem(`tb_cache_cloud_plans_${user.email}`, JSON.stringify(updatedPlans));
            } catch (_) {}
            return updatedPlans;
          });
        } catch (err) {
          console.warn('Failed to update cloud itinerary:', err.message);
        }
      }
    }

    if (!user && activePlanId) {
      try {
        const updatedPlans = plansList.map(p => {
          if (p.id === activePlanId) {
            return {
              ...p,
              itin: newItin,
              nDays: newNDays,
              start: startDate,
              time: startTime,
              hotel: hotel,
              checklist: currentChecklist,
              budget: currentBudget
            };
          }
          return p;
        });
        setPlansList(updatedPlans);
        localStorage.setItem('tb_guest_plans', JSON.stringify(updatedPlans));
        localStorage.setItem('tb_guest_active_plan', activePlanId);
      } catch (_) {}
    }
  };

  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      saveItinData(itin, nDays, checklist, budget);
    }, 500);
    return () => clearTimeout(timer);
  }, [itin, nDays, startDate, startTime, hotel, checklist, budget]);

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

  // Sync budget state to localStorage based on active plan ID
  useEffect(() => {
    if (activePlanId) {
      try {
        localStorage.setItem(`budget_${activePlanId}`, JSON.stringify(budget));
        localStorage.setItem(`trip_builder_budget_${activePlanId}`, JSON.stringify(budget));
      } catch (_) {}
    }
  }, [activePlanId, budget]);

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

  const moveItinItemToDay = (fromDay, fromIdx, toDay) => {
    if (parseInt(fromDay) === parseInt(toDay)) return;
    const currentItin = { ...itin };
    if (!currentItin[fromDay] || !currentItin[fromDay][fromIdx]) return;
    if (!currentItin[toDay]) currentItin[toDay] = [];

    if (currentItin[toDay].length >= 5) {
      toast(`${t('dayLabel')} ${toDay} ${activeLang === 'th' ? 'เต็มแล้ว (สูงสุด 5 ที่/วัน)' : 'is full (max 5 places/day)'}`);
      return;
    }

    const [itemToMove] = currentItin[fromDay].splice(fromIdx, 1);
    currentItin[toDay].push(itemToMove);

    setItin(currentItin);
    setLastId(itemToMove.id);
    setLastDay(toDay);
    saveItinData(currentItin, nDays);

    const displayName = (itemToMove.names && itemToMove.names[activeLang]) || itemToMove.name;
    toast(`✅ ${activeLang === 'th' ? `ย้าย ${displayName} → วันที่ ${toDay} แล้ว` : `Moved ${displayName} → Day ${toDay}`}`);
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

  // ─── TOUCH DRAG HANDLERS (FOR IPAD & MOBILE) ────────────────────────
  const handleTouchStart = (e, item, source, index = null) => {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];

    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      identifier: touch.identifier,
      isDragging: false,
      item,
      source,
      index,
      timer: setTimeout(() => {
        touchStateRef.current.isDragging = true;
        setTouchDrag({
          active: true,
          item,
          source,
          index,
          x: touch.clientX,
          y: touch.clientY,
          name: (item.names && item.names[activeLang]) || item.name,
          icon: item.icon || '📍',
        });
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(20); } catch (_) {}
        }
      }, 150)
    };
  };

  const handleTouchMove = (e) => {
    if (!touchStateRef.current) return;
    const touch = Array.from(e.touches).find(t => t.identifier === touchStateRef.current.identifier);
    if (!touch) return;

    if (!touchStateRef.current.isDragging) {
      const dist = Math.hypot(
        touch.clientX - touchStateRef.current.startX,
        touch.clientY - touchStateRef.current.startY
      );
      if (dist > 8) {
        // User is scrolling, cancel drag initiation
        clearTimeout(touchStateRef.current.timer);
      }
      return;
    }

    // Actively dragging
    if (e.cancelable) e.preventDefault();

    setTouchDrag(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null);

    // Drop target detection
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const dayZone = elem?.closest('.day-zone[data-day]');
    if (dayZone) {
      const d = parseInt(dayZone.getAttribute('data-day'), 10);
      setTouchOverDay(d);
    } else {
      setTouchOverDay(null);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStateRef.current) return;
    clearTimeout(touchStateRef.current.timer);

    if (touchStateRef.current.isDragging) {
      const targetDay = touchOverDay;
      const { item, source, index } = touchStateRef.current;

      if (targetDay && item) {
        if (source === 'sidebar') {
          addToDay(item, targetDay);
        } else if (parseInt(source) !== parseInt(targetDay)) {
          moveItinItemToDay(source, index, targetDay);
        }
      }
    }

    touchStateRef.current = {
      startX: 0,
      startY: 0,
      identifier: null,
      isDragging: false,
      timer: null,
      item: null,
      source: null,
      index: null,
    };
    setTouchDrag(null);
    setTouchOverDay(null);
  };

  const handleTouchCancel = () => {
    if (touchStateRef.current) {
      clearTimeout(touchStateRef.current.timer);
      touchStateRef.current.isDragging = false;
    }
    setTouchDrag(null);
    setTouchOverDay(null);
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
          interests: selectedInterests.map(key => t(key))
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
      if (budget && (budget.totalBudget > 0 || (budget.expenses && budget.expenses.length > 0))) {
        const bgtEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(budget))));
        url += '&bgt=' + bgtEncoded;
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

  const handleExportBackup = () => {
    try {
      const backupData = {
        app: 'trip-builder',
        version: 1,
        exportedAt: new Date().toISOString(),
        plans: plansList,
        customPlaces: customPlaces
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trip-builder-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast(activeLang === 'th' ? '✅ ดาวน์โหลดไฟล์สำรองข้อมูลสำเร็จ!' : '✅ Backup downloaded successfully!');
    } catch (err) {
      console.error('[TripBuilder] Export backup error:', err);
      toast(activeLang === 'th' ? 'สำรองข้อมูลล้มเหลว' : 'Backup export failed');
    }
  };

  const handleImportBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const data = JSON.parse(content);

        if (!data || (!data.plans && !data.customPlaces)) {
          toast(activeLang === 'th' ? '❌ ไฟล์สำรองข้อมูลไม่ถูกต้อง' : '❌ Invalid backup file');
          return;
        }

        let importedPlansCount = 0;
        let importedPlacesCount = 0;

        // 1. Merge custom places
        if (data.customPlaces && typeof data.customPlaces === 'object') {
          const mergedCustom = { ...customPlaces };
          Object.keys(data.customPlaces).forEach(city => {
            if (!mergedCustom[city]) mergedCustom[city] = [];
            const existingIds = new Set(mergedCustom[city].map(p => String(p.id)));
            data.customPlaces[city].forEach(p => {
              if (!existingIds.has(String(p.id))) {
                mergedCustom[city].push(p);
                importedPlacesCount++;
              }
            });
          });
          setCustomPlaces(mergedCustom);
          try {
            localStorage.setItem('trip_builder_custom_places_v1', JSON.stringify({ custom: mergedCustom }));
          } catch (_) {}
        }

        // 2. Restore / merge plans
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          const existingIds = new Set(plansList.map(p => p.id));
          const newPlans = data.plans.map(p => {
            if (existingIds.has(p.id)) {
              return { ...p, id: `plan_imported_${Date.now()}_${Math.random().toString(36).substr(2, 4)}` };
            }
            return p;
          });
          const mergedPlans = [...newPlans, ...plansList];
          setPlansList(mergedPlans);
          importedPlansCount = newPlans.length;

          // Switch to first imported plan
          const firstPlan = newPlans[0];
          setActivePlanId(firstPlan.id);
          setItin(firstPlan.itin || { 1: [], 2: [], 3: [] });
          setChecklist(firstPlan.checklist || []);
          setNDays(firstPlan.nDays || 3);
          setStartDate(firstPlan.start || new Date().toISOString().split('T')[0]);
          setStartTime(firstPlan.time || '09:00');
          setHotel(firstPlan.hotel || '');
          if (firstPlan.city_id) {
            setActiveCity(firstPlan.city_id);
            setActiveCountry(getCountryOfCity(firstPlan.city_id));
          }

          if (!user) {
            try {
              localStorage.setItem('tb_guest_plans', JSON.stringify(mergedPlans));
              localStorage.setItem('tb_guest_active_plan', firstPlan.id);
            } catch (_) {}
          } else {
            try {
              if (!googleSheets) {
                localStorage.setItem(`tb_mock_plans_${user.email}`, JSON.stringify(mergedPlans));
                localStorage.setItem(`tb_mock_active_plan_${user.email}`, firstPlan.id);
              } else {
                localStorage.setItem(`tb_cache_cloud_plans_${user.email}`, JSON.stringify(mergedPlans));
                localStorage.setItem(`tb_active_plan_${user.email}`, firstPlan.id);
              }
            } catch (_) {}
          }
        }

        toast(
          activeLang === 'th'
            ? `✅ นำเข้าข้อมูลสำเร็จ! (${importedPlansCount} แผน, ${importedPlacesCount} สถานที่)`
            : `✅ Imported successfully! (${importedPlansCount} plans, ${importedPlacesCount} places)`
        );
      } catch (err) {
        console.error('[TripBuilder] Import failed:', err);
        toast(activeLang === 'th' ? '❌ ไม่สามารถอ่านไฟล์สำรองได้' : '❌ Failed to read backup file');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
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

  // Load budget from Share Link on startup
  useEffect(() => {
    if (!bgtParam) return;
    try {
      const cleanParam = bgtParam.replace(/ /g, '+');
      const loadedBudget = JSON.parse(decodeURIComponent(escape(atob(cleanParam))));
      if (loadedBudget && typeof loadedBudget === 'object') {
        setBudget(prev => ({ ...prev, ...loadedBudget }));
      }
    } catch (e) {
      console.warn('Budget share link decoding failed:', e);
    }
  }, [bgtParam]);

  // ─── GROUP ROOM LOGIC & HANDLERS ──────────────────────────────────
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `TRIP-${code}`;
  };

  const handleCreateRoom = async () => {
    if (!inputNickname.trim()) {
      toast(activeLang === 'th' ? 'กรุณากรอกชื่อเล่นของคุณ' : 'Please enter your nickname');
      return;
    }
    const code = (inputRoomCode.trim() || generateRoomCode()).toUpperCase();
    const roomName = inputRoomName.trim() || (activeLang === 'th' ? `ทริปกลุ่ม ${code}` : `Group Trip ${code}`);
    const nick = inputNickname.trim();

    setIsRoomSyncing(true);
    const roomKey = `room:${code}`;
    const planId = `plan_${code}_${Date.now()}`;

    const roomPlanData = {
      id: planId,
      name: roomName,
      city_id: activeCity,
      itin: itin,
      n_days: nDays,
      start_date: startDate || new Date().toISOString().split('T')[0],
      start_time: startTime || '09:00',
      hotel: hotel || '',
      checklist: checklist || [],
      members: [nick],
      host: nick,
      last_updated: Date.now(),
      last_updated_by: nick
    };

    try {
      if (googleSheets) {
        await googleSheets.insertItinerary(roomKey, roomPlanData);
      } else {
        const rawRooms = localStorage.getItem('tb_mock_rooms') || '{}';
        const mockRooms = JSON.parse(rawRooms);
        mockRooms[code] = roomPlanData;
        localStorage.setItem('tb_mock_rooms', JSON.stringify(mockRooms));
      }

      const roomObj = { code, name: roomName, id: planId, host: nick };
      setActiveRoom(roomObj);
      setMyNickname(nick);
      setActiveMembersList([nick]);
      localStorage.setItem('tb_active_room', JSON.stringify(roomObj));
      localStorage.setItem('tb_my_nickname', nick);
      localStorage.setItem(`tb_cache_room_${code}`, JSON.stringify(roomPlanData));

      setGroupModalOpen(false);
      toast(activeLang === 'th' ? `🎉 สร้างห้องกลุ่ม ${code} สำเร็จ!` : `🎉 Group room ${code} created!`);
    } catch (err) {
      console.error('Create room error:', err);
      toast(activeLang === 'th' ? `สร้างห้องไม่สำเร็จ: ${err.message}` : `Failed to create room: ${err.message}`);
    } finally {
      setIsRoomSyncing(false);
    }
  };

  const handleJoinRoom = async (codeToJoin, nicknameToUse) => {
    const code = (codeToJoin || inputRoomCode).trim().toUpperCase();
    const nick = (nicknameToUse || inputNickname).trim();

    if (!code) {
      toast(activeLang === 'th' ? 'กรุณากรอกรหัสห้อง' : 'Please enter room code');
      return;
    }
    if (!nick) {
      toast(activeLang === 'th' ? 'กรุณากรอกชื่อเล่นของคุณ' : 'Please enter your nickname');
      return;
    }

    setIsRoomSyncing(true);
    const roomKey = `room:${code}`;

    try {
      let roomPlan = null;
      if (googleSheets) {
        const cloudPlans = await googleSheets.getItineraries(roomKey);
        if (cloudPlans && cloudPlans.length > 0) {
          roomPlan = cloudPlans[0];
        }
      } else {
        const rawRooms = localStorage.getItem('tb_mock_rooms') || '{}';
        const mockRooms = JSON.parse(rawRooms);
        if (mockRooms[code]) {
          roomPlan = mockRooms[code];
        }
      }

      if (!roomPlan) {
        toast(t('roomNotFound'));
        setIsRoomSyncing(false);
        return;
      }

      const existingMembers = Array.isArray(roomPlan.members) ? roomPlan.members : [];
      const updatedMembers = existingMembers.includes(nick) ? existingMembers : [...existingMembers, nick];

      let parsedItin = roomPlan.itin;
      if (typeof parsedItin === 'string') {
        try { parsedItin = JSON.parse(parsedItin); } catch (_) { parsedItin = {}; }
      }
      if (!parsedItin || typeof parsedItin !== 'object') parsedItin = { 1: [], 2: [], 3: [] };

      let parsedChecklist = roomPlan.checklist;
      if (typeof parsedChecklist === 'string') {
        try { parsedChecklist = JSON.parse(parsedChecklist); } catch (_) { parsedChecklist = []; }
      }
      if (!Array.isArray(parsedChecklist)) parsedChecklist = [];

      setItin(parsedItin);
      setChecklist(parsedChecklist);
      setNDays(roomPlan.n_days || roomPlan.nDays || 3);
      setStartDate(roomPlan.start_date || roomPlan.start || '');
      setStartTime(roomPlan.start_time || roomPlan.time || '09:00');
      setHotel(roomPlan.hotel || '');
      if (roomPlan.city_id) {
        setActiveCity(roomPlan.city_id);
        setActiveCountry(getCountryOfCity(roomPlan.city_id));
      }

      const roomObj = {
        code,
        name: roomPlan.name || `ทริปกลุ่ม ${code}`,
        id: roomPlan.id || `plan_${code}`,
        host: roomPlan.host || updatedMembers[0]
      };
      setActiveRoom(roomObj);
      setMyNickname(nick);
      setActiveMembersList(updatedMembers);

      localStorage.setItem('tb_active_room', JSON.stringify(roomObj));
      localStorage.setItem('tb_my_nickname', nick);

      const updatedPlanData = {
        ...roomPlan,
        id: roomPlan.id || `plan_${code}`,
        name: roomPlan.name || `ทริปกลุ่ม ${code}`,
        city_id: roomPlan.city_id || activeCity,
        itin: parsedItin,
        checklist: parsedChecklist,
        members: updatedMembers,
        last_updated: Date.now(),
        last_updated_by: nick
      };
      localStorage.setItem(`tb_cache_room_${code}`, JSON.stringify(updatedPlanData));

      if (googleSheets) {
        googleSheets.updateItinerary(updatedPlanData).catch(() => {});
      } else {
        const rawRooms = localStorage.getItem('tb_mock_rooms') || '{}';
        const mockRooms = JSON.parse(rawRooms);
        mockRooms[code] = updatedPlanData;
        localStorage.setItem('tb_mock_rooms', JSON.stringify(mockRooms));
      }

      setGroupModalOpen(false);
      toast(activeLang === 'th' ? `🎉 เข้าร่วมห้อง ${code} เรียบร้อย!` : `🎉 Joined room ${code}!`);
    } catch (err) {
      console.error('Join room error:', err);
      toast(activeLang === 'th' ? `ไม่สามารถเข้าร่วมห้องได้: ${err.message}` : `Failed to join room: ${err.message}`);
    } finally {
      setIsRoomSyncing(false);
    }
  };

  const handleLeaveRoom = () => {
    if (!confirm(t('confirmLeaveRoom'))) return;
    setActiveRoom(null);
    setActiveMembersList([]);
    localStorage.removeItem('tb_active_room');
    toast(activeLang === 'th' ? 'ออกจากห้องกลุ่มแล้ว กลับสู่แผนส่วนตัว' : 'Left group room, returned to personal plan');

    if (typeof window !== 'undefined' && window.location.search.includes('room=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (user) {
      if (googleSheets) loadCloudPlans(user.email);
      else loadLocalMockPlans(user.email);
    } else {
      loadGuestPlans();
    }
  };

  const syncRoomData = async (isManual = false) => {
    if (!activeRoom) return;
    if (isManual) setIsRoomSyncing(true);
    const roomKey = `room:${activeRoom.code.toUpperCase()}`;

    try {
      let freshPlan = null;
      if (googleSheets) {
        const cloudPlans = await googleSheets.getItineraries(roomKey);
        if (cloudPlans && cloudPlans.length > 0) freshPlan = cloudPlans[0];
      } else {
        const rawRooms = localStorage.getItem('tb_mock_rooms') || '{}';
        const mockRooms = JSON.parse(rawRooms);
        if (mockRooms[activeRoom.code.toUpperCase()]) freshPlan = mockRooms[activeRoom.code.toUpperCase()];
      }

      if (freshPlan) {
        let parsedItin = freshPlan.itin;
        if (typeof parsedItin === 'string') {
          try { parsedItin = JSON.parse(parsedItin); } catch (_) { parsedItin = {}; }
        }
        let parsedChecklist = freshPlan.checklist;
        if (typeof parsedChecklist === 'string') {
          try { parsedChecklist = JSON.parse(parsedChecklist); } catch (_) { parsedChecklist = []; }
        }

        const freshDays = freshPlan.n_days || freshPlan.nDays || nDays;
        const freshHotel = freshPlan.hotel || '';
        const currentCache = localStorage.getItem(`tb_cache_room_${activeRoom.code.toUpperCase()}`);
        const freshStr = JSON.stringify({ itin: parsedItin, checklist: parsedChecklist, nDays: freshDays, hotel: freshHotel });

        let isDifferent = true;
        if (currentCache) {
          try {
            const c = JSON.parse(currentCache);
            const cachedStr = JSON.stringify({ itin: c.itin, checklist: c.checklist, nDays: c.n_days || c.nDays, hotel: c.hotel });
            if (cachedStr === freshStr) isDifferent = false;
          } catch (_) {}
        }

        if (isDifferent) {
          if (parsedItin) setItin(parsedItin);
          if (Array.isArray(parsedChecklist)) setChecklist(parsedChecklist);
          if (freshPlan.n_days || freshPlan.nDays) setNDays(freshDays);
          if (freshPlan.start_date || freshPlan.start) setStartDate(freshPlan.start_date || freshPlan.start);
          if (freshPlan.start_time || freshPlan.time) setStartTime(freshPlan.start_time || freshPlan.time);
          if (freshPlan.hotel !== undefined) setHotel(freshHotel);
          if (freshPlan.city_id && freshPlan.city_id !== activeCity) {
            setActiveCity(freshPlan.city_id);
            setActiveCountry(getCountryOfCity(freshPlan.city_id));
          }
          localStorage.setItem(`tb_cache_room_${activeRoom.code.toUpperCase()}`, JSON.stringify(freshPlan));
        }

        if (Array.isArray(freshPlan.members)) {
          setActiveMembersList(freshPlan.members);
        }

        if (isManual) {
          toast(t('syncSuccess'));
        }
      }
    } catch (err) {
      if (isManual) toast(activeLang === 'th' ? `ซิงก์ไม่สำเร็จ: ${err.message}` : `Sync failed: ${err.message}`);
    } finally {
      if (isManual) setIsRoomSyncing(false);
    }
  };

  const copyRoomInviteLink = () => {
    if (!activeRoom) return;
    const url = window.location.origin + window.location.pathname + `?room=${encodeURIComponent(activeRoom.code)}`;
    navigator.clipboard.writeText(url);
    toast(t('roomCopiedLink'));
  };

  // Group Room background auto-sync (every 25 seconds)
  useEffect(() => {
    if (!activeRoom) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncRoomData(false);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  // Handle ?room=CODE param or restore activeRoom
  useEffect(() => {
    try {
      const savedNick = localStorage.getItem('tb_my_nickname');
      if (savedNick) {
        setMyNickname(savedNick);
        setInputNickname(savedNick);
      }

      if (roomParam) {
        const code = roomParam.trim().toUpperCase();
        setInputRoomCode(code);
        setGroupModalTab('join');
        if (savedNick) {
          handleJoinRoom(code, savedNick);
        } else {
          setGroupModalOpen(true);
        }
        return;
      }

      const savedRoom = localStorage.getItem('tb_active_room');
      if (savedRoom) {
        const parsedRoom = JSON.parse(savedRoom);
        setActiveRoom(parsedRoom);
        const cached = localStorage.getItem(`tb_cache_room_${parsedRoom.code}`);
        if (cached) {
          try {
            const d = JSON.parse(cached);
            if (d.itin) setItin(d.itin);
            if (d.checklist) setChecklist(d.checklist);
            if (d.n_days || d.nDays) setNDays(d.n_days || d.nDays);
            if (d.start_date || d.start) setStartDate(d.start_date || d.start);
            if (d.start_time || d.time) setStartTime(d.start_time || d.time);
            if (d.hotel) setHotel(d.hotel);
            if (d.members) setActiveMembersList(d.members);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }, [roomParam]);

  const handleSetChecklistAssignee = (itemId, assigneeName) => {
    const updatedChecklist = checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, assignee: assigneeName };
      }
      return item;
    });
    setChecklist(updatedChecklist);
    saveItinData(itin, nDays, updatedChecklist);
  };

  const handlePromptAssignee = (itemId, currentAssignee) => {
    const promptText = activeLang === 'th' 
      ? `ระบุชื่อผู้รับผิดชอบสิ่งนี้ (พิมพ์ชื่อเล่น เช่น ${myNickname || 'แบงค์'}):`
      : `Assign this item to (e.g. ${myNickname || 'Sam'}):`;
    const name = window.prompt(promptText, currentAssignee || myNickname || '');
    if (name !== null) {
      handleSetChecklistAssignee(itemId, name.trim());
    }
  };

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

  const stats = useMemo(() => {
    return getSummaryStats();
  }, [itin, nDays, activeLang]);

  const nearbySuggestions = useMemo(() => {
    return getNearbyPlaces();
  }, [lastId, landmarks, itin]);

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

  const categoriesList = useMemo(() => {
    const list = landmarks.map(l => l.cat).filter(Boolean);
    return ['__all__', ...Array.from(new Set(list))];
  }, [landmarks]);

  const getCategories = () => categoriesList;

  const filteredLandmarks = useMemo(() => {
    return landmarks.filter(l => {
      if (filterCat !== '__all__' && l.cat !== filterCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const localName = ((l.names && l.names[activeLang]) || l.name).toLowerCase();
        return l.name.toLowerCase().includes(q) || localName.includes(q) || l.cat.toLowerCase().includes(q);
      }
      return true;
    });
  }, [landmarks, filterCat, searchQuery, activeLang]);

  const cityColor = getCityObj(activeCity)?.color || '#1D9E75';

  return (
    <>
      {isOffline && (
        <div className="offline-banner">
          <span>{t('offlineBannerMsg')}</span>
        </div>
      )}
      <div 
        className="ambient-background" 
        style={{ backgroundImage: activeCity ? `url(${CITY_COVER_IMAGES[activeCity] || CITY_COVER_IMAGES.travel})` : 'none' }} 
      />
      {/* ─── TOPBAR ─────────────────────────────────────────────────── */}
      <HeaderNav
        APP_VERSION={APP_VERSION}
        activeLang={activeLang}
        setActiveLang={setActiveLang}
        theme={theme}
        setTheme={setTheme}
        setTravelModeOpen={setTravelModeOpen}
        showMap={showMap}
        setShowMap={setShowMap}
        clearAll={clearAll}
        setExportModalOpen={setExportModalOpen}
        activeRoom={activeRoom}
        setGroupModalOpen={setGroupModalOpen}
        plansDropdownOpen={plansDropdownOpen}
        setPlansDropdownOpen={setPlansDropdownOpen}
        plansList={plansList}
        activePlanId={activePlanId}
        loadActivePlan={loadActivePlan}
        renamePlan={renamePlan}
        deletePlan={deletePlan}
        createNewPlan={createNewPlan}
        user={user}
        userDropdownOpen={userDropdownOpen}
        setUserDropdownOpen={setUserDropdownOpen}
        handleSignOut={handleSignOut}
        setAuthMode={setAuthMode}
        setAuthModalOpen={setAuthModalOpen}
        activeCountry={activeCountry}
        handleCountrySelect={handleCountrySelect}
        activeCity={activeCity}
        setActiveCity={setActiveCity}
        setFilterCat={setFilterCat}
        getCityObj={getCityObj}
        t={t}
      />

      {/* ─── ACTIVE GROUP ROOM BANNER ─────────────────────────────── */}
      {activeRoom && (
        <div className="group-room-banner">
          <div className="room-banner-left">
            <div className="room-badge-pill">
              <span className="room-indicator-dot"></span>
              <span className="room-badge-label">{t('activeRoomBanner')}:</span>
              <strong>{activeRoom.code}</strong>
            </div>
            <span className="room-title-text">{activeRoom.name}</span>
            <div className="room-members-avatars">
              {activeMembersList.map((m, idx) => (
                <span key={idx} className={`room-member-tag ${m === myNickname ? 'is-me' : ''}`} title={m}>
                  👤 {m} {m === myNickname ? `(${activeLang === 'th' ? 'ฉัน' : 'You'})` : ''}
                </span>
              ))}
            </div>
          </div>
          <div className="room-banner-actions">
            <button 
              className={`btn btn-sm ${isRoomSyncing ? 'btn-ghost is-syncing' : 'btn-ghost'}`} 
              onClick={() => syncRoomData(true)}
              disabled={isRoomSyncing}
              title={t('syncRoom')}
            >
              <span className={isRoomSyncing ? 'spin-icon' : ''}>🔄</span>
              <span className="hide-on-mobile">{isRoomSyncing ? t('syncingRoom') : t('syncRoom')}</span>
            </button>
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={copyRoomInviteLink}
              title={t('copyInviteLink')}
            >
              <span>🔗</span>
              <span className="hide-on-mobile">{t('copyInviteLink')}</span>
            </button>
            <button 
              className="btn btn-sm btn-ghost room-leave-btn" 
              onClick={handleLeaveRoom}
              title={t('leaveRoom')}
            >
              <span>🚪</span>
              <span className="hide-on-mobile">{t('leaveRoom')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN LAYOUT ────────────────────────────────────────────── */}
      <div className="layout">
        
        {/* Tablet Drawer: Backdrop */}
        {(leftDrawerOpen || rightDrawerOpen) && (
          <div
            className={`drawer-backdrop ${(leftDrawerOpen || rightDrawerOpen) ? 'visible' : ''}`}
            onClick={() => { setLeftDrawerOpen(false); setRightDrawerOpen(false); }}
          />
        )}
        
        {/* Tablet Drawer: Left Toggle Button */}
        <button
          className="drawer-toggle-left"
          onClick={() => { setLeftDrawerOpen(v => !v); setRightDrawerOpen(false); }}
          title={t('places')}
        >
          {leftDrawerOpen ? '◀' : '▶'}
        </button>
        
        {/* Tablet Drawer: Right Toggle Button */}
        <button
          className="drawer-toggle-right"
          onClick={() => { setRightDrawerOpen(v => !v); setLeftDrawerOpen(false); }}
          title={t('nearby')}
        >
          {rightDrawerOpen ? '▶' : '◀'}
        </button>

        {/* ─── SIDEBAR (ATTRACTIONS LIST) ─── */}
        <aside className={`sidebar ${mobileTab === 'places' ? 'mob-active' : ''} ${leftDrawerOpen ? 'drawer-open' : ''}`}>
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

                return (
                  <div
                    key={l.id}
                    className={`lm-card ${count > 0 ? 'selected' : ''} ${isHighlighted ? 'highlight' : ''} ${addPlacePopover?.landmarkId === l.id ? 'has-popover' : ''}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, l, 'sidebar')}
                    onTouchStart={(e) => handleTouchStart(e, l, 'sidebar', null)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchCancel}
                    onClick={() => {
                      setAddPlacePopover(prev => prev?.landmarkId === l.id ? null : { landmarkId: l.id, place: l });
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
                    {addPlacePopover?.landmarkId === l.id && (
                      <div className="lm-day-picker-popover" onClick={(e) => e.stopPropagation()}>
                        <div className="popover-title">
                          <span>{activeLang === 'th' ? 'เพิ่มลงแผน (เลือกวัน)' : 'Add to Plan (Select Day)'}</span>
                          <button className="popover-close-btn" onClick={() => setAddPlacePopover(null)}>✕</button>
                        </div>
                        <div className="popover-days-grid">
                          {Array.from({ length: nDays }, (_, i) => i + 1).map((d) => {
                            const count = (itin[d] || []).length;
                            const isFull = count >= 5;
                            const dayColor = DAY_COLORS[(d - 1) % DAY_COLORS.length];
                            return (
                              <button
                                key={d}
                                disabled={isFull}
                                className={`popover-day-btn ${isFull ? 'full' : ''}`}
                                style={!isFull ? { borderColor: dayColor.b, background: dayColor.bg, color: dayColor.t } : {}}
                                onClick={() => {
                                  addToDay(l, d);
                                  setAddPlacePopover(null);
                                }}
                              >
                                <b>{t('dayLabel')} {d}</b>
                                <span className="popover-day-sub">
                                  {isFull ? (activeLang === 'th' ? '(เต็ม)' : '(full)') : `(${count}/5)`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="lm-cover-strip">
                      <OptimizedImage
                        src={getCoverImage(l)}
                        alt={(l.names && l.names[activeLang]) || l.name || ''}
                        width={400}
                        fallbackSrc={getCityFallbackImage(l)}
                      />
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
            <div className="cfg cfg-hotel" style={{ flex: 1, minWidth: 0 }}>
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span className="day-info">
                            {items.length} · {durationLabel}
                          </span>
                          {(() => {
                            const walkUrl = getGmapsWalkingRouteUrl(items, activeLang);
                            const hasItems = items.length > 0;
                            return (
                              <div className="day-route-actions" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <button
                                  type="button"
                                  className="day-opt-btn"
                                  disabled={items.length < 3}
                                  onClick={() => handleTriggerOptimize(day)}
                                  title={items.length >= 3 ? t('optimizeRoute') : t('needMorePlacesToOptimize')}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    background: items.length >= 3 ? 'var(--amber-light, #FEF3C7)' : 'rgba(0,0,0,0.05)',
                                    color: items.length >= 3 ? 'var(--amber-dark, #92400E)' : 'var(--muted, #888)',
                                    border: '1px solid ' + (items.length >= 3 ? 'rgba(217, 119, 6, 0.3)' : 'transparent'),
                                    cursor: items.length >= 3 ? 'pointer' : 'not-allowed',
                                    lineHeight: '1.2',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>⚡</span>
                                  <span>{activeLang === 'th' ? 'จัดเส้นทาง' : 'Optimize'}</span>
                                </button>
                                <button
                                  type="button"
                                  className="day-walk-btn"
                                  disabled={!hasItems}
                                  onClick={() => {
                                    if (!walkUrl) {
                                      toast(t('noPlacesForRoute'));
                                      return;
                                    }
                                    window.open(walkUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  title={hasItems ? (activeLang === 'th' ? `เปิดเส้นทางเดินวันที่ ${day} ใน Google Maps` : `Open Day ${day} walking route in Google Maps`) : t('noPlacesForRoute')}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    background: hasItems ? 'var(--teal-light, #E1F5EE)' : 'rgba(0,0,0,0.05)',
                                    color: hasItems ? 'var(--teal, #0F6E56)' : 'var(--muted, #888)',
                                    border: '1px solid ' + (hasItems ? 'rgba(29, 158, 117, 0.3)' : 'transparent'),
                                    cursor: hasItems ? 'pointer' : 'not-allowed',
                                    lineHeight: '1.2',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <span>🚶</span>
                                  <span>Maps</span>
                                </button>
                                <button
                                  type="button"
                                  className="day-share-btn"
                                  disabled={!hasItems}
                                  onClick={async () => {
                                    if (!walkUrl) {
                                      toast(t('noPlacesForRoute'));
                                      return;
                                    }
                                    await shareGmapsRoute({
                                      url: walkUrl,
                                      title: `${t('dayLabel')} ${day} - ${t('walkMaps')}`,
                                      text: `${t('dayLabel')} ${day}: ${items.map(p => (p.names && p.names[activeLang]) || p.name).join(' ➔ ')}`,
                                      onToast: toast,
                                      copiedMsg: t('walkRouteCopied')
                                    });
                                  }}
                                  title={t('shareWalkRoute')}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    fontSize: '11px',
                                    background: hasItems ? 'var(--surface, #ffffff)' : 'transparent',
                                    border: '1px solid ' + (hasItems ? 'var(--border, #e5e7eb)' : 'transparent'),
                                    color: hasItems ? 'var(--fg, #333)' : 'var(--muted, #aaa)',
                                    cursor: hasItems ? 'pointer' : 'not-allowed',
                                    boxShadow: hasItems ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                  }}
                                >
                                  🔗
                                </button>
                              </div>
                            );
                          })()}
                        </div>
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
                        className={`day-zone drop-zone ${touchOverDay === day ? 'touch-drag-over' : ''}`}
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
                                  <span className="tlabel">{activeLang === 'th' ? '🍽 90m พักกลางวัน' : '🍽 90m Lunch Break'}</span>
                                  <div className="tline" />
                                </div>
                              );
                              currentTimeInMin += 90;
                              lunchAdded = true;
                            }

                            // Inject Travel separation placeholder
                            if (idx > 0) {
                              const prevItem = items[idx - 1];
                              let travelTime = item.travelTime;
                              let travelMode = item.travelMode;
                              let travelDistKm = item.travelDistKm;

                              if (travelTime === undefined) {
                                const dist = calculateDistanceKm(prevItem, item);
                                if (dist !== null) {
                                  const est = estimateTravelTimeMins(dist);
                                  travelTime = est.timeMins;
                                  travelMode = est.mode;
                                  travelDistKm = est.distanceKm;
                                } else {
                                  travelTime = 20;
                                  travelMode = 'transit';
                                }
                              }

                              const travelIcon = travelMode === 'walk' ? '🚶' : '🚗';
                              const distLabel = travelDistKm ? ` · ${travelDistKm}km` : '';

                              htmlElements.push(
                                <div className="travel-row" key={`travel_${idx}`}>
                                  <div className="tline" />
                                  <span 
                                    className="tlabel tlabel-interactive" 
                                    onClick={() => promptEditTravelTime(day, idx, item)}
                                    title={activeLang === 'th' ? 'คลิกเพื่อแก้ไขเวลาเดินทาง' : 'Click to edit travel time'}
                                  >
                                    {travelIcon} {travelTime}m {activeLang === 'th' ? 'เดินทาง' : 'Travel'}{distLabel}
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
                                className={`it-item ${isLastAdded ? 'last-added' : ''} ${moveDayPopover?.itinId === (item.itinId || `${item.id}_${day}_${idx}`) ? 'has-popover' : ''}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item, day, idx)}
                                onTouchStart={(e) => handleTouchStart(e, item, day, idx)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchCancel}
                              >
                                <div className="it-cover-strip">
                                  <OptimizedImage
                                    src={getCoverImage(actualLandmark)}
                                    alt={(actualLandmark.names && actualLandmark.names[activeLang]) || actualLandmark.name || ''}
                                    width={300}
                                    fallbackSrc={getCityFallbackImage(actualLandmark)}
                                  />
                                </div>
                                <div style={{ padding: '6px 8px' }}>
                                  <div className="it-top">
                                    <div className="it-name" onClick={() => handleOpenDetail(actualLandmark)}>
                                      {actualLandmark.icon && <span style={{ marginRight: '6px' }}>{actualLandmark.icon}</span>}
                                      {(actualLandmark.names && actualLandmark.names[activeLang]) || actualLandmark.name}
                                      {item.rating && <span style={{ color: '#EF9F27', fontSize: '9px', fontWeight: 'bold', marginLeft: '5px', whiteSpace: 'nowrap' }}>⭐ {item.rating}</span>}
                                    </div>
                                    <div className="it-actions">
                                      <div className="move-day-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                                        <button
                                          className="mvbtn move-day-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const itemKey = item.itinId || `${item.id}_${day}_${idx}`;
                                            setMoveDayPopover(prev => (prev?.itinId === itemKey ? null : {
                                              itinId: itemKey,
                                              fromDay: day,
                                              idx,
                                              item
                                            }));
                                          }}
                                          title={activeLang === 'th' ? 'ย้ายวัน' : 'Move to Day'}
                                        >
                                          📅
                                        </button>
                                        {moveDayPopover?.itinId === (item.itinId || `${item.id}_${day}_${idx}`) && (
                                          <div className="move-day-popover" onClick={(e) => e.stopPropagation()}>
                                            <div className="popover-title">{activeLang === 'th' ? 'ย้ายไปยังวันไหน?' : 'Move to Day:'}</div>
                                            <div className="popover-days-grid">
                                              {Array.from({ length: nDays }, (_, i) => i + 1).map((d) => {
                                                const count = (itin[d] || []).length;
                                                const isCurrent = d === day;
                                                const isFull = count >= 5 && !isCurrent;
                                                const dayColor = DAY_COLORS[(d - 1) % DAY_COLORS.length];
                                                return (
                                                  <button
                                                    key={d}
                                                    disabled={isCurrent || isFull}
                                                    className={`popover-day-btn ${isCurrent ? 'current' : ''} ${isFull ? 'full' : ''}`}
                                                    style={!isFull && !isCurrent ? { borderColor: dayColor.b, background: dayColor.bg, color: dayColor.t } : {}}
                                                    onClick={() => {
                                                      moveItinItemToDay(day, idx, d);
                                                      setMoveDayPopover(null);
                                                    }}
                                                  >
                                                    <b>{t('dayLabel')} {d}</b>
                                                    <span className="popover-day-sub">
                                                      {isCurrent ? (activeLang === 'th' ? '(วันนี้)' : '(here)') : isFull ? (activeLang === 'th' ? '(เต็ม)' : '(full)') : `(${count}/5)`}
                                                    </span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
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
        <aside className={`nearby ${mobileTab === 'nearby' ? 'mob-active' : ''} ${rightDrawerOpen ? 'drawer-open' : ''}`}>
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
            <button 
              className={`sidebar-tab-btn ${activeRightTab === 'budget' ? 'active' : ''}`}
              onClick={() => setActiveRightTab('budget')}
              id="tab-budget"
            >
              💰 {t('tabBudget')}
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
                  <div className="checklist-row">
                    <input 
                      type="text" 
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder={t('checklistAddPh')}
                      className="checklist-input"
                      id="checklist-text-input"
                    />
                    <button type="submit" className="checklist-add-btn" id="checklist-add-btn">+</button>
                  </div>
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
                              <div className="checklist-assignee-box">
                                {item.assignee ? (
                                  <span 
                                    className="checklist-assignee-tag"
                                    onClick={() => handlePromptAssignee(item.id, item.assignee)}
                                    title={t('assignee')}
                                  >
                                    👤 {item.assignee}
                                  </span>
                                ) : (
                                  <button 
                                    type="button"
                                    className="checklist-assignee-btn"
                                    onClick={() => handlePromptAssignee(item.id, '')}
                                    title={t('assignee')}
                                  >
                                    +👤 {t('assignee')}
                                  </button>
                                )}
                              </div>
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

            {activeRightTab === 'budget' && (
              <BudgetTab
                budget={budget}
                onUpdateBudget={(newBudget) => {
                  setBudget(newBudget);
                  saveItinData(itin, nDays, checklist, newBudget);
                }}
                activeLang={activeLang}
                t={t}
                itin={itin}
                nDays={nDays}
                landmarks={landmarks}
                groupMembers={activeMembersList}
                toast={toast}
              />
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
        {/* Center ADD Tab */}
        <button className="mob-nav-center-add" onClick={() => { setAddModalOpen(true); setActiveAddTab('manual'); }} title="Add Attraction">
          <span className="add-ring">➕</span>
        </button>
        <button className="mob-nav-btn travel-mob-btn" onClick={() => setTravelModeOpen(true)} style={{ color: '#0284c7', fontWeight: 'bold' }}>
          <span className="nav-icon">✈️</span>
          <span>{activeLang === 'th' ? 'เที่ยวจริง' : 'Travel'}</span>
        </button>
        <button className="mob-nav-btn" onClick={() => setExportModalOpen(true)}>
          <span className="nav-icon">📤</span>
          <span>{t('mobExport')}</span>
        </button>
      </nav>

      {/* ─── TOAST NOTIFICATION ─────────────────────────────────────── */}
      <div className={`toast ${toastMessage ? 'show' : ''}`}>{toastMessage}</div>

      {/* ─── DETAIL MODAL ───────────────────────────────────────────── */}
      <DetailModal
        selectedPlace={selectedPlace}
        setSelectedPlace={setSelectedPlace}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        activeLang={activeLang}
        activeCity={activeCity}
        getCityObj={getCityObj}
        t={t}
        editName={editName}
        setEditName={setEditName}
        editDesc={editDesc}
        setEditDesc={setEditDesc}
        editCat={editCat}
        setEditCat={setEditCat}
        editDur={editDur}
        setEditDur={setEditDur}
        editAddr={editAddr}
        setEditAddr={setEditAddr}
        editLat={editLat}
        setEditLat={setEditLat}
        editLng={editLng}
        setEditLng={setEditLng}
        editFee={editFee}
        setEditFee={setEditFee}
        editTransport={editTransport}
        setEditTransport={setEditTransport}
        editIcon={editIcon}
        setEditIcon={setEditIcon}
        editKeywords={editKeywords}
        setEditKeywords={setEditKeywords}
        searchingPhotos={searchingPhotos}
        searchedPhotos={searchedPhotos}
        editSelectedImage={editSelectedImage}
        setEditSelectedImage={setEditSelectedImage}
        getCoverImage={getCoverImage}
        getCityFallbackImage={getCityFallbackImage}
        toast={toast}
        nDays={nDays}
        itin={itin}
        addToDay={addToDay}
        handleSaveEdit={handleSaveEdit}
        handleStartEditing={handleStartEditing}
      />

      {/* ─── ADD NEW ATTRACTION MODAL ───────────────────────────────── */}
      <AddPlaceModal
        addModalOpen={addModalOpen}
        setAddModalOpen={setAddModalOpen}
        t={t}
        activeLang={activeLang}
        activeAddTab={activeAddTab}
        setActiveAddTab={setActiveAddTab}
        osmQuery={osmQuery}
        setOsmQuery={setOsmQuery}
        osmResults={osmResults}
        searchOSM={searchOSM}
        fillFromOSM={fillFromOSM}
        fName={fName}
        setFName={setFName}
        fDesc={fDesc}
        setFDesc={setFDesc}
        fCat={fCat}
        setFCat={setFCat}
        fDur={fDur}
        setFDur={setFDur}
        fAddr={fAddr}
        setFAddr={setFAddr}
        fLat={fLat}
        setFLat={setFLat}
        fLng={fLng}
        setFLng={setFLng}
        fFee={fFee}
        setFFee={setFFee}
        fTransport={fTransport}
        setFTransport={setFTransport}
        fIcon={fIcon}
        setFIcon={setFIcon}
        fRating={fRating}
        setFRating={setFRating}
        fCity={fCity}
        setFCity={setFCity}
        activeCity={activeCity}
        aiSuggestQuery={aiSuggestQuery}
        setAiSuggestQuery={setAiSuggestQuery}
        handleAISuggest={handleAISuggest}
        aiSuggestLoading={aiSuggestLoading}
        aiSuggestResult={aiSuggestResult}
        addAIPlace={addAIPlace}
        gmapsUrl={gmapsUrl}
        setGmapsUrl={setGmapsUrl}
        parseGmaps={parseGmaps}
        gmapsResult={gmapsResult}
        fillFromMaps={fillFromMaps}
        toast={toast}
        customPlaces={customPlaces}
        setCustomPlaces={setCustomPlaces}
        googleSheets={googleSheets}
        user={user}
        setAuthLoading={setAuthLoading}
        setLandmarks={setLandmarks}
        saveNewPlace={saveNewPlace}
      />

      {/* ─── EXPORT & SHARE MODAL ───────────────────────────────────── */}
      <ExportModal
        exportModalOpen={exportModalOpen}
        setExportModalOpen={setExportModalOpen}
        t={t}
        activeLang={activeLang}
        selectedStyle={selectedStyle}
        setSelectedStyle={setSelectedStyle}
        buildShareLink={buildShareLink}
        shareGmapsRoute={shareGmapsRoute}
        toast={toast}
        nDays={nDays}
        itin={itin}
        getGmapsWalkingRouteUrl={getGmapsWalkingRouteUrl}
        getFormattedItinerary={getFormattedItinerary}
        handleDownloadPDF={handleDownloadPDF}
        handleExportBackup={handleExportBackup}
        handleImportBackup={handleImportBackup}
      />

      {/* ─── AI PLANNER MODAL ───────────────────────────────────────── */}
      <AiPlanModal
        aiPlanModalOpen={aiPlanModalOpen}
        setAiPlanModalOpen={setAiPlanModalOpen}
        t={t}
        activeLang={activeLang}
        aiHotel={aiHotel}
        setAiHotel={setAiHotel}
        aiStart={aiStart}
        setAiStart={setAiStart}
        aiEnd={aiEnd}
        setAiEnd={setAiEnd}
        selectedInterests={selectedInterests}
        setSelectedInterests={setSelectedInterests}
        aiPlanStatus={aiPlanStatus}
        aiPlanLoading={aiPlanLoading}
        aiPlanResult={aiPlanResult}
        handleAIPlan={handleAIPlan}
        applyAIPlan={applyAIPlan}
      />

      {/* ─── QUICK EDIT MODALS ──────────────────────────────────────── */}
      <QuickEditModals
        editDurationModalOpen={editDurationModalOpen}
        setEditDurationModalOpen={setEditDurationModalOpen}
        editDurationTarget={editDurationTarget}
        setEditDurationTarget={setEditDurationTarget}
        handleSaveDurationQuick={handleSaveDurationQuick}
        editTravelModalOpen={editTravelModalOpen}
        setEditTravelModalOpen={setEditTravelModalOpen}
        editTravelTarget={editTravelTarget}
        setEditTravelTarget={setEditTravelTarget}
        handleSaveTravelTimeQuick={handleSaveTravelTimeQuick}
        activeLang={activeLang}
        formatMinutesToHours={formatMinutesToHours}
      />

      {/* ─── AUTHENTICATION MODAL ────────────────────────────────────── */}
      <AuthModal
        authModalOpen={authModalOpen}
        setAuthModalOpen={setAuthModalOpen}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authLoading={authLoading}
        handleSignIn={handleSignIn}
        handleSignUp={handleSignUp}
        activeLang={activeLang}
      />

      {/* ─── GROUP COLLABORATION MODAL ─────────────────────────────── */}
      <GroupCollabModal
        groupModalOpen={groupModalOpen}
        setGroupModalOpen={setGroupModalOpen}
        groupModalTab={groupModalTab}
        setGroupModalTab={setGroupModalTab}
        inputNickname={inputNickname}
        setInputNickname={setInputNickname}
        inputRoomName={inputRoomName}
        setInputRoomName={setInputRoomName}
        inputRoomCode={inputRoomCode}
        setInputRoomCode={setInputRoomCode}
        isRoomSyncing={isRoomSyncing}
        handleCreateRoom={handleCreateRoom}
        handleJoinRoom={handleJoinRoom}
        t={t}
        activeLang={activeLang}
      />

      {/* ─── ROUTE OPTIMIZATION MODAL ──────────────────────────────── */}
      <RouteOptimizationModal
        isOpen={optModalOpen}
        optData={optData}
        onClose={() => setOptModalOpen(false)}
        onApply={handleApplyOptimizedRoute}
        activeLang={activeLang}
        t={t}
      />

      {touchDrag && (
        <div
          className="touch-drag-ghost"
          style={{
            left: `${touchDrag.x}px`,
            top: `${touchDrag.y}px`,
          }}
        >
          <span className="ghost-icon">{touchDrag.icon}</span>
          <span className="ghost-name">{touchDrag.name}</span>
        </div>
      )}

      {/* ─── TRAVEL MODE FULLSCREEN VIEW ────────────────────────────── */}
      {travelModeOpen && (
        <TravelModeView
          itin={itin}
          nDays={nDays}
          activeCity={activeCity}
          activeLang={activeLang}
          hotel={hotel}
          planId={activePlanId || (user ? user.email : 'guest')}
          onClose={() => setTravelModeOpen(false)}
          findLandmarkGlobally={findLandmarkGlobally}
          t={t}
        />
      )}
    </>
  );
}
