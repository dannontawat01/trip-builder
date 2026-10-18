/**
 * Translations, Country & City Data, Category Maps, and Static Configurations
 */

export const LANG_STRINGS = {
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
    gmapsHow: 'วิธีคัดลอก URL จาก Google Maps:', 
    gmaps1: 'เปิด Google Maps ค้นหาสถานที่ หรือไปที่แท็บ "บันทึกแล้ว" (Saved lists)',
    gmaps2: 'กด Share (แชร์) หรือกดจุด 3 จุด (⋮) ที่ชื่อลิสต์ → Copy link', 
    gmaps3: 'วางลิงก์ที่นี่ (รองรับทั้ง 1 สถานที่, Saved list, หรือหลายลิงก์แยกบรรทัด)', 
    gmapsFormats: 'รูปแบบที่รองรับ:',
    gmapsSavedListHint: '💡 รองรับ Google Maps Saved List! เพียงกด ⋮ ที่ชื่อรายการบันทึกแล้วแชร์ลิงก์มาวาง ระบบจะดึงสถานที่ทั้งหมดในลิสต์ให้ทันที',
    gmapsExtracting: 'กำลังดึงข้อมูลสถานที่...',
    gmapsSelectAll: 'เลือกทั้งหมด',
    gmapsDeselectAll: 'ไม่เลือกทั้งหมด',
    gmapsTargetCity: 'เลือกเมืองปลายทางที่จะนำเข้า:',
    gmapsCityGroupAll: 'ทั้งหมด',
    gmapsCityGroupOther: '📍 นอกพื้นที่หลัก / เมืองอื่นๆ',
    gmapsChooseCityForOther: 'เลือกเมืองปลายทางสำหรับสถานที่กลุ่มนี้:',
    gmapsDuplicateBadge: '⚠️ มีในระบบแล้ว',
    gmapsNewBadge: '✨ ใหม่',
    gmapsHideDuplicates: '👁️ ซ่อนรายการที่ซ้ำ',
    gmapsShowAll: '👁️ แสดงทั้งหมด',
    gmapsStatsSummary: 'พบ {total} แห่ง (ใหม่ {newCount} · มีแล้ว {dupCount})',
    gmapsSyncBtn: '🔄 ซิงก์ Google Maps',
    gmapsSyncLinkTrip: '🔗 ผูกลิสต์ Google Maps นี้ไว้กับทริปเพื่อซิงก์อัปเดตอัตโนมัติ',
    gmapsSyncNewFound: 'พบ {count} สถานที่ใหม่ใน Google Maps!',
    gmapsSyncUpToDate: 'ข้อมูลสถานที่ซิงก์ตรงกับ Google Maps ล่าสุดแล้ว ✨',
    gmapsSyncSuccess: 'ซิงก์สถานที่ใหม่เข้าทริปสำเร็จ {count} แห่ง!',
    gmapsImportDistributed: '✨ นำเข้าสถานที่ที่เลือก ({count}) แยกตามเมืองจริง',
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
    copyLink: 'คัดลอก',
    shareLinkCopied: 'คัดลอกลิงก์แชร์แล้ว!',
    itineraryCopied: 'คัดลอกข้อความแล้ว!',
    walkMaps: '🚶 เส้นทางเดิน',
    shareWalkRoute: 'แชร์เส้นทางเดิน Google Maps',
    walkRouteCopied: 'คัดลอกลิงก์เส้นทางเดินแล้ว!',
    noPlacesForRoute: 'ยังไม่มีสถานที่ในวันนี้',
    exportWalkTitle: '🗺️ เส้นทางเดิน Google Maps (แยกตามวัน)',
    stopsCount: 'จุดแวะ',
    openWalkMaps: 'เปิด Maps ↗',
    copyWalkLink: 'คัดลอกลิงก์',
    groupPlan: 'วางแผนเป็นกลุ่ม',
    groupModalTitle: '👥 วางแผนทริปเป็นกลุ่ม (Group Collaboration)',
    tabCreateRoom: '✨ สร้างห้องใหม่',
    tabJoinRoom: '🔑 เข้าร่วมด้วยรหัส',
    roomCode: 'รหัสห้อง',
    roomCodePh: 'เช่น TRIP-8821',
    roomName: 'ชื่อกลุ่ม / ชื่อทริป',
    roomNamePh: 'เช่น ทริปตะลุยโซลกับแก๊งเพื่อน',
    nickname: 'ชื่อเล่นของคุณ',
    nicknamePh: 'เช่น แบงค์, ปัง, ส้ม',
    createRoomBtn: '🚀 สร้างห้องกลุ่ม',
    joinRoomBtn: '🚀 เข้าร่วมกลุ่ม',
    leaveRoom: 'ออกจากกลุ่ม',
    confirmLeaveRoom: 'คุณต้องการออกจากห้องกลุ่มนี้และกลับสู่แผนส่วนตัวใช่หรือไม่?',
    syncRoom: 'ซิงก์ข้อมูล',
    syncingRoom: 'กำลังซิงก์...',
    syncSuccess: 'ซิงก์ข้อมูลทริปล่าสุดสำเร็จ!',
    activeRoomBanner: 'ห้องกลุ่ม',
    roomMembers: 'สมาชิกในกลุ่ม',
    roomInviteNote: 'ส่งรหัสห้องหรือลิงก์นี้ให้เพื่อน เพื่อร่วมกันจัดทริปได้ทันที',
    roomCopiedLink: 'คัดลอกลิงก์เชิญเข้ากลุ่มแล้ว!',
    copyInviteLink: 'คัดลอกลิงก์เชิญ',
    assignee: 'ผู้รับผิดชอบ',
    assigneePh: 'ระบุชื่อคนเตรียม...',
    assignToMe: 'ฉันเตรียมเอง',
    unassigned: 'ยังไม่ได้ระบุ',
    saveRoomError: 'ไม่สามารถบันทึกข้อมูลห้องได้',
    roomNotFound: 'ไม่พบรหัสห้องนี้ กรุณาตรวจสอบรหัสอีกครั้ง',
    optimizeRoute: '⚡ จัดเส้นทางสั้นที่สุด',
    optimizeModalTitle: '⚡ จัดลำดับเส้นทางให้สั้นที่สุด (Route Optimizer)',
    routeAlreadyOptimal: 'เส้นทางในวันนี้จัดเรียงอย่างเหมาะสมที่สุดอยู่แล้ว ✨',
    needMorePlacesToOptimize: 'ต้องมีสถานที่อย่างน้อย 3 แห่งขึ้นไปในการจัดลำดับ',
    beforeOptimize: 'ลำดับเดิม',
    afterOptimize: 'ลำดับใหม่ที่แนะนำ',
    distanceSaved: 'ประหยัดระยะทางได้',
    timeSaved: 'ประหยัดเวลาเดินทางได้',
    applyOptimizedRoute: '✨ นำเส้นทางนี้ไปใช้',
    keepOriginalRoute: 'คงเดิมไว้',
    optComparisonSubtitle: 'วิเคราะห์และจัดลำดับสถานที่ใหม่โดยอัลกอริทึม 2-Opt เพื่อลดระยะเดินทางรวม',
    optTotalDist: 'ระยะทางรวม',
    optTotalTime: 'เวลาเดินทางรวม',
    travelMode: '✈️ โหมดเที่ยวจริง',
    exitTravelMode: 'ออกจากโหมดเที่ยว',
    currentStop: '📍 ตอนนี้อยู่ที่นี่',
    nextStop: 'จุดถัดไป',
    checkInBtn: 'เช็กอิน / ถึงแล้ว',
    undoCheckIn: 'เลิกทำ',
    taxiCard: 'ยื่นให้คนขับแท็กซี่',
    taxiCardTitle: '🚕 ข้อมูลสำหรับคนขับแท็กซี่',
    taxiCardSubtitle: 'กรุณายื่นหน้านี้ให้คนขับรถเพื่อนำทาง',
    returnToHotel: 'นำทางกลับโรงแรม',
    allStopsCompleted: 'ยอดเยี่ยม! คุณเที่ยวครบทุกจุดของวันนี้แล้ว',
    tabBudget: 'งบประมาณ',
    budgetTitle: '💰 งบประมาณ & บันทึกค่าใช้จ่าย',
    totalBudget: 'งบประมาณรวม',
    spent: 'ใช้ไปแล้ว',
    remaining: 'คงเหลือ',
    overBudget: 'เกินงบแล้ว',
    baseCurrency: 'สกุลเงินหลัก',
    addExpenseBtn: '+ บันทึกค่าใช้จ่าย',
    expenseTitlePh: 'ชื่อรายการ เช่น ตั๋วเข้าชม, ชาบู, รถไฟใต้ดิน',
    expenseAmountPh: 'จำนวนเงิน',
    expenseCat: 'หมวดหมู่',
    expensePaidBy: 'ผู้ชำระเงิน',
    expenseSplitWith: 'ผู้ร่วมแชร์',
    expenseDay: 'วันที่',
    expenseLinkedPlace: 'ผูกกับสถานที่',
    splitBillTitle: '👥 สรุปการหารค่าใช้จ่ายกลุ่ม (Split Bill)',
    splitEqual: 'หารเท่ากัน',
    splitSummary: 'ยอดเคลียร์เงินสุทธิ',
    noExpenses: 'ยังไม่มีรายการค่าใช้จ่าย เริ่มต้นบันทึกรายการแรกได้เลย!',
    catAccommodation: '🏨 ที่พัก',
    catFood: '🍜 อาหาร & เครื่องดื่ม',
    catTransport: '🚆 การเดินทาง',
    catTicket: '🎟️ ค่าเข้าชม / ตั๋ว',
    catShopping: '🛍️ ช้อปปิ้ง',
    catOthers: '📦 อื่นๆ',
    offlineBannerMsg: '📶 กำลังใช้งานในโหมดออฟไลน์: บันทึกข้อมูลในเครื่องและใช้งาน Travel Mode ได้ตามปกติ',
    offlinePwaReady: 'พร้อมใช้งานออฟไลน์แล้ว',
    ratesTitle: 'อัตราแลกเปลี่ยน (เมื่อเทียบกับ 1 สกุลเงินหลัก)',
    allDaysOption: 'รวมทั้งทริป / ไม่ระบุวัน',
    manageRates: '⚙️ จัดการอัตราแลกเปลี่ยน',
    saveRates: 'บันทึกอัตราแลกเปลี่ยน',
    filterByDay: 'กรองตามวัน',
    allDaysFilter: 'ทั้งหมดทุกวัน',
    whoOwesWho: 'ต้องจ่ายให้',
    youPaid: 'คุณเป็นคนจ่าย',
    paidByYou: 'จ่ายโดย',
    deleteExpenseConfirm: 'ต้องการลบรายการค่าใช้จ่ายนี้หรือไม่?',
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
    gmapsHow: 'How to copy URL from Google Maps:', 
    gmaps1: 'Open Google Maps and search for a place, or go to "Saved" lists',
    gmaps2: 'Tap Share or tap 3 dots (⋮) on list name → Copy link', 
    gmaps3: 'Paste the link here (Supports single place, Saved Lists, or multiple links separated by line)', 
    gmapsFormats: 'Supported formats:',
    gmapsSavedListHint: '💡 Supports Google Maps Saved Lists! Just tap ⋮ on your saved list, share & copy link. All places will be extracted automatically.',
    gmapsExtracting: 'Extracting places data...',
    gmapsSelectAll: 'Select All',
    gmapsDeselectAll: 'Deselect All',
    gmapsImportSelected: 'Import Selected Places',
    gmapsTargetCity: 'Select destination city to import:',
    gmapsCityGroupAll: 'All',
    gmapsCityGroupOther: '📍 Out of Range / Other Cities',
    gmapsChooseCityForOther: 'Select destination city for places in this group:',
    gmapsDuplicateBadge: '⚠️ Already in trip',
    gmapsNewBadge: '✨ New',
    gmapsHideDuplicates: '👁️ Hide duplicates',
    gmapsShowAll: '👁️ Show all',
    gmapsStatsSummary: 'Found {total} places ({newCount} new · {dupCount} existing)',
    gmapsSyncBtn: '🔄 Sync Google Maps',
    gmapsSyncLinkTrip: '🔗 Link this Google Maps list to trip for auto-sync',
    gmapsSyncNewFound: 'Found {count} new places in Google Maps!',
    gmapsSyncUpToDate: 'Places are completely up to date with Google Maps ✨',
    gmapsSyncSuccess: 'Successfully synced {count} new places!',
    gmapsImportDistributed: '✨ Import Selected Places ({count}) by City',
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
    copyLink: 'Copy',
    shareLinkCopied: 'Share link copied!',
    itineraryCopied: 'Itinerary text copied!',
    walkMaps: '🚶 Walking Route',
    shareWalkRoute: 'Share Walking Route',
    walkRouteCopied: 'Walking route link copied!',
    noPlacesForRoute: 'No places in this day yet',
    exportWalkTitle: '🗺️ Google Maps Walking Routes (By Day)',
    stopsCount: 'stops',
    openWalkMaps: 'Open Maps ↗',
    copyWalkLink: 'Copy Link',
    groupPlan: 'Group Planning',
    groupModalTitle: '👥 Group Trip Collaboration',
    tabCreateRoom: '✨ Create Room',
    tabJoinRoom: '🔑 Join with Code',
    roomCode: 'Room Code',
    roomCodePh: 'e.g. TRIP-8821',
    roomName: 'Group / Trip Name',
    roomNamePh: 'e.g. Seoul Trip with Friends',
    nickname: 'Your Nickname',
    nicknamePh: 'e.g. Alex, Sam, Chris',
    createRoomBtn: '🚀 Create Room',
    joinRoomBtn: '🚀 Join Room',
    leaveRoom: 'Leave Room',
    confirmLeaveRoom: 'Do you want to leave this group room and return to your personal plan?',
    syncRoom: 'Sync Data',
    syncingRoom: 'Syncing...',
    syncSuccess: 'Trip data synced successfully!',
    activeRoomBanner: 'Group Room',
    roomMembers: 'Group Members',
    roomInviteNote: 'Share this room code or invite link with friends to plan together.',
    roomCopiedLink: 'Invite link copied!',
    copyInviteLink: 'Copy Invite Link',
    assignee: 'Assignee',
    assigneePh: 'Person preparing this...',
    assignToMe: 'Assign to me',
    unassigned: 'Unassigned',
    saveRoomError: 'Failed to save room data',
    roomNotFound: 'Room code not found. Please verify the code.',
    optimizeRoute: '⚡ Optimize Route',
    optimizeModalTitle: '⚡ Optimize Day Route (Shortest Path)',
    routeAlreadyOptimal: 'This day is already optimally ordered! ✨',
    needMorePlacesToOptimize: 'At least 3 places with coordinates required to optimize.',
    beforeOptimize: 'Current Order',
    afterOptimize: 'Recommended Order',
    distanceSaved: 'Distance saved',
    timeSaved: 'Transit time saved',
    applyOptimizedRoute: '✨ Apply Optimized Route',
    keepOriginalRoute: 'Keep Current',
    optComparisonSubtitle: 'Reordered by 2-Opt TSP algorithm to minimize backtracking and transit time',
    optTotalDist: 'Total Distance',
    optTotalTime: 'Total Transit Time',
    travelMode: '✈️ Travel Mode',
    exitTravelMode: 'Exit Travel Mode',
    currentStop: '📍 Current Stop',
    nextStop: 'Next Stop',
    checkInBtn: 'Check-in / Arrived',
    undoCheckIn: 'Undo',
    taxiCard: 'Taxi Driver Card',
    taxiCardTitle: '🚕 Taxi Driver Information',
    taxiCardSubtitle: 'Please show this screen to your driver',
    returnToHotel: 'Return to Hotel',
    allStopsCompleted: 'Awesome! All stops completed for today!',
    tabBudget: 'Budget',
    budgetTitle: '💰 Budget & Expenses',
    totalBudget: 'Total Budget',
    spent: 'Spent',
    remaining: 'Remaining',
    overBudget: 'Over Budget',
    baseCurrency: 'Base Currency',
    addExpenseBtn: '+ Add Expense',
    expenseTitlePh: 'Item name e.g. Entry ticket, BBQ dinner, Metro pass',
    expenseAmountPh: 'Amount',
    expenseCat: 'Category',
    expensePaidBy: 'Paid By',
    expenseSplitWith: 'Split With',
    expenseDay: 'Day',
    expenseLinkedPlace: 'Linked Place',
    splitBillTitle: '👥 Group Split Bill Summary',
    splitEqual: 'Split Equally',
    splitSummary: 'Net Settlements',
    noExpenses: 'No expenses recorded yet. Start by adding your first expense!',
    catAccommodation: '🏨 Accommodation',
    catFood: '🍜 Food & Dining',
    catTransport: '🚆 Transportation',
    catTicket: '🎟️ Tickets & Activities',
    catShopping: '🛍️ Shopping',
    catOthers: '📦 Others',
    offlineBannerMsg: '📶 Offline Mode: Data saved locally, Travel Mode is fully available',
    offlinePwaReady: 'Ready for offline usage',
    ratesTitle: 'Exchange Rates (Per 1 Base Currency)',
    allDaysOption: 'Whole Trip / General',
    manageRates: '⚙️ Manage Rates',
    saveRates: 'Save Rates',
    filterByDay: 'Filter by Day',
    allDaysFilter: 'All Days',
    whoOwesWho: 'owes',
    youPaid: 'You paid',
    paidByYou: 'Paid by',
    deleteExpenseConfirm: 'Are you sure you want to delete this expense?',
  }
};

export const COUNTRIES = [
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

export const CAT_TRANSLATIONS = {
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

export const translateCategory = (cat, lang) => {
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

export const getCityName = (cityObj, lang = 'th') => {
  if (!cityObj) return '';
  if (typeof cityObj.name === 'object') {
    return cityObj.name[lang] || cityObj.name.en || '';
  }
  return cityObj.name || '';
};

export const getCountryName = (countryObj, lang = 'th') => {
  if (!countryObj) return '';
  if (typeof countryObj.name === 'object') {
    return countryObj.name[lang] || countryObj.name.en || '';
  }
  return countryObj.name || '';
};

export const DAY_COLORS = [
  { bg: "#EAF3DE", t: "#3B6D11", b: "#C0DD97", acc: "#639922" },
  { bg: "#E1F5EE", t: "#0F6E56", b: "#9FE1CB", acc: "#1D9E75" },
  { bg: "#E6F1FB", t: "#185FA5", b: "#B5D4F4", acc: "#378ADD" },
  { bg: "#FAEEDA", t: "#854F0B", b: "#FAC775", acc: "#EF9F27" },
  { bg: "#FBEAF0", t: "#993556", b: "#F4C0D1", acc: "#D4537E" },
  { bg: "#FCEBEB", t: "#A32D2D", b: "#F7C1C1", acc: "#E24B4A" },
  { bg: "#EEEDFE", t: "#534AB7", b: "#CECBF6", acc: "#7F77DD" },
];

export const CITY_KEYWORDS = {
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

export const CITY_COVER_IMAGES = {
  bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
  chiangmai: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=600&q=80',
  phuket: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=600&q=80',
  pattaya: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80',
  ayutthaya: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=600&q=80',
  seoul: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=600&q=80',
  busan: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?auto=format&fit=crop&w=600&q=80',
  jeju: 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=600&q=80',
  tokyo: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
  kyoto: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
  osaka: 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?auto=format&fit=crop&w=600&q=80',
  travel: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'
};

export const CATEGORY_COVER_IMAGES = {
  hotel: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=600&q=80'
  ],
  restaurant: [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80'
  ],
  cafe: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'
  ],
  shopping: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=600&q=80'
  ],
  market: [
    'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=600&q=80'
  ],
  temple: [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1570459027562-4a916cc6113f?auto=format&fit=crop&w=600&q=80'
  ],
  palace: [
    'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80'
  ],
  museum: [
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=600&q=80'
  ],
  nature: [
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80'
  ],
  general: [
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80'
  ]
};

export const BRAND_PLACE_IMAGES = {
  donki: [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Don_Quijote_Headquarters_-01.jpg/960px-Don_Quijote_Headquarters_-01.jpg',
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'
  ],
  matsumoto: [
    'https://upload.wikimedia.org/wikipedia/commons/b/ba/Matsumoto_Kiyoshi_Shin-Kyougoku_Kyoto.jpg',
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Matsumotokiyoshi_Shinsaibashi_store.jpg/960px-Matsumotokiyoshi_Shinsaibashi_store.jpg',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  ],
  uniqlo: [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Uniqlo_Ginza_2018.jpg/960px-Uniqlo_Ginza_2018.jpg',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80'
  ],
  osdrug: [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/OS_DRUG_Keihan_Senbayashi_store.jpg/960px-OS_DRUG_Keihan_Senbayashi_store.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/b/ba/Matsumoto_Kiyoshi_Shin-Kyougoku_Kyoto.jpg',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
  ],
  cosme: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80'
  ],
  bape: [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Bape_Store_Harajuku_2015.jpg/960px-Bape_Store_Harajuku_2015.jpg',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80'
  ],
  stussy: [
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80'
  ],
  tonkatsu: [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Tonkatsu_and_Cabbage.jpg/960px-Tonkatsu_and_Cabbage.jpg',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80'
  ],
  sensoji: [
    'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c2/Senso-ji%2C_Asakusa%2C_Tokyo.jpg/960px-Senso-ji%2C_Asakusa%2C_Tokyo.jpg',
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80'
  ],
  tokyotower: [
    'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'
  ],
  shibuyasky: [
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'
  ],
  skytree: [
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80'
  ],
  ichiran: [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
  ],
  yakiniku: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80'
  ],
  starbucks: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80'
  ],
  bluebottle: [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80'
  ],
  disney: [
    'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80'
  ],
  newbalance: [
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80'
  ],
  lawson: [
    'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80'
  ],
  seveneleven: [
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=600&q=80'
  ],
  familymart: [
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=600&q=80'
  ],
  ministop: [
    'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80'
  ],
  meiji: [
    'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&q=80'
  ],
  togo: [
    'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?auto=format&fit=crop&w=600&q=80'
  ],
  matsuchiyama: [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80'
  ],
  kannon: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80'
  ],
  gongcha: [
    'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=600&q=80'
  ],
  edw: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80'
  ]
};

export function getBrandPlacePhotos(placeOrName) {
  if (!placeOrName) return null;
  let text = '';
  if (typeof placeOrName === 'string') {
    text = placeOrName.toLowerCase();
  } else {
    const cat = (placeOrName.cat || '').toLowerCase();
    const thName = (placeOrName.names?.th || '').toLowerCase();
    const enName = (placeOrName.names?.en || '').toLowerCase();
    const rawName = (placeOrName.name || '').toLowerCase();
    text = `${cat} ${thName} ${enName} ${rawName}`;
  }

  // 1. Don Quijote / Donki
  if (text.includes('don quijote') || text.includes('donki') || text.includes('don quixote') || text.includes('ดองกิ') || text.includes('ดองกี้') || text.includes('ドン・キホーテ') || text.includes('ドンキ')) {
    return BRAND_PLACE_IMAGES.donki;
  }
  // 2. Matsumoto Kiyoshi
  if (text.includes('matsumoto') || text.includes('kiyoshi') || text.includes('มัตสึโมโตะ') || text.includes('มัตสึโมโต') || text.includes('คิโยชิ') || text.includes('マツモトキヨシ') || text.includes('マツキヨ')) {
    return BRAND_PLACE_IMAGES.matsumoto;
  }
  // 3. UNIQLO
  if (text.includes('uniqlo') || text.includes('ยูนิโคล่') || text.includes('ยูนิโคล') || text.includes('ユニクロ')) {
    return BRAND_PLACE_IMAGES.uniqlo;
  }
  // 4. OS Drug
  if (text.includes('os drug') || text.includes('osdrug') || text.includes('โอเอสดรัก') || text.includes('โอเอส ดรัก') || text.includes('โอเอส') || text.includes('オーエスドラッグ')) {
    return BRAND_PLACE_IMAGES.osdrug;
  }
  // 5. @cosme / Cosme
  if (text.includes('@cosme') || text.includes('cosme') || text.includes('คอสเม่') || text.includes('แอดคอสเม่') || text.includes('コスメ')) {
    return BRAND_PLACE_IMAGES.cosme;
  }
  // 6. Bape Store
  if (text.includes('bape') || text.includes('bathing ape') || text.includes('เบป')) {
    return BRAND_PLACE_IMAGES.bape;
  }
  // 7. Stussy
  if (text.includes('stussy') || text.includes('stüssy') || text.includes('สตูสซี่') || text.includes('สตัสซี่')) {
    return BRAND_PLACE_IMAGES.stussy;
  }
  // 8. Tonkatsu / Marushichi
  if (text.includes('tonkatsu') || text.includes('marushichi') || text.includes('ทงคัตสึ') || text.includes('หมูทอด') || text.includes('とんかつ')) {
    return BRAND_PLACE_IMAGES.tonkatsu;
  }
  // 9. Sensoji Temple
  if (text.includes('sensoji') || text.includes('senso-ji') || text.includes('วัดอาซากุสะ') || text.includes('วัดเซนโซจิ') || text.includes('浅草寺')) {
    return BRAND_PLACE_IMAGES.sensoji;
  }
  // 10. Tokyo Tower
  if (text.includes('tokyo tower') || text.includes('โตเกียวทาวเวอร์') || text.includes('東京タワー')) {
    return BRAND_PLACE_IMAGES.tokyotower;
  }
  // 11. Shibuya Sky
  if (text.includes('shibuya sky') || text.includes('ชิบูย่า สกาย') || text.includes('ชิบูยะ สกาย') || text.includes('渋谷スカイ')) {
    return BRAND_PLACE_IMAGES.shibuyasky;
  }
  // 12. Tokyo Skytree
  if (text.includes('skytree') || text.includes('สกายทรี') || text.includes('スカイツリー')) {
    return BRAND_PLACE_IMAGES.skytree;
  }
  // 13. Ichiran Ramen
  if (text.includes('ichiran') || text.includes('ราเมงข้อสอบ') || text.includes('อิจิรัน') || text.includes('一蘭')) {
    return BRAND_PLACE_IMAGES.ichiran;
  }
  // 14. Yakiniku / Wagyu
  if (text.includes('yakiniku') || text.includes('ยากินิคุ') || text.includes('เนื้อย่าง') || text.includes('wagyu') || text.includes('วากิว') || text.includes('焼肉')) {
    return BRAND_PLACE_IMAGES.yakiniku;
  }
  // 15. Starbucks
  if (text.includes('starbucks') || text.includes('สตาร์บัคส์') || text.includes('สตาร์บัค') || text.includes('スターバックス')) {
    return BRAND_PLACE_IMAGES.starbucks;
  }
  // 16. Blue Bottle
  if (text.includes('blue bottle') || text.includes('bluebottle') || text.includes('บลูบอตเติล') || text.includes('บลูบอทเทิล') || text.includes('ブルーボトル')) {
    return BRAND_PLACE_IMAGES.bluebottle;
  }
  // 17. Disney
  if (text.includes('disney') || text.includes('ดิสนีย์') || text.includes('ディズニー')) {
    return BRAND_PLACE_IMAGES.disney;
  }
  // 18. New Balance
  if (text.includes('new balance') || text.includes('newbalance') || text.includes('นิวบาลานซ์')) {
    return BRAND_PLACE_IMAGES.newbalance;
  }
  // 19. Lawson
  if (text.includes('lawson') || text.includes('ลอว์สัน') || text.includes('ローソン')) {
    return BRAND_PLACE_IMAGES.lawson;
  }
  // 20. 7-Eleven
  if (text.includes('7-eleven') || text.includes('7 eleven') || text.includes('seven eleven') || text.includes('เซเว่น')) {
    return BRAND_PLACE_IMAGES.seveneleven;
  }
  // 21. FamilyMart
  if (text.includes('familymart') || text.includes('family mart') || text.includes('แฟมิลี่มาร์ท') || text.includes('ファミリーマート')) {
    return BRAND_PLACE_IMAGES.familymart;
  }
  // 22. Ministop
  if (text.includes('ministop') || text.includes('มินิสต็อป') || text.includes('ミニストップ')) {
    return BRAND_PLACE_IMAGES.ministop;
  }
  // 23. Meiji Shrine
  if (text.includes('meiji jingu') || text.includes('meiji shrine') || text.includes('ศาลเจ้าเมจิ') || text.includes('明治神宮')) {
    return BRAND_PLACE_IMAGES.meiji;
  }
  // 24. Togo Shrine
  if (text.includes('togo shrine') || text.includes('โทโก') || text.includes('東郷神社')) {
    return BRAND_PLACE_IMAGES.togo;
  }
  // 25. Matsuchiyama
  if (text.includes('matsuchiyama') || text.includes('มัตสึจิยามะ') || text.includes('待乳山聖天')) {
    return BRAND_PLACE_IMAGES.matsuchiyama;
  }
  // 26. Gong Cha
  if (text.includes('gong cha') || text.includes('gongcha') || text.includes('ก้องชา') || text.includes('ゴンチャ')) {
    return BRAND_PLACE_IMAGES.gongcha;
  }
  // 27. EDW
  if (text.includes('edw') || text.includes('espresso d works')) {
    return BRAND_PLACE_IMAGES.edw;
  }

  return null;
}

export function getSmartCategoryCover(place, cityId = 'tokyo') {
  if (!place) return CATEGORY_COVER_IMAGES.general[0];
  
  // 1. Direct Brand & Specific Landmark Matching
  const brandPhotos = getBrandPlacePhotos(place);
  if (brandPhotos && brandPhotos.length > 0) {
    return brandPhotos[0];
  }

  // 2. Generic Category Fallback
  const cat = (place.cat || '').toLowerCase();
  const name = ((place.names && (place.names.th || place.names.en)) || place.name || '').toLowerCase();
  const combined = `${cat} ${name}`;

  let listKey = 'general';
  
  if (combined.includes('โรงแรม') || combined.includes('ที่พัก') || combined.includes('hotel') || combined.includes('hostel') || combined.includes('resort') || combined.includes('inn') || combined.includes('ryokan') || combined.includes('เรียวกัง')) {
    listKey = 'hotel';
  } else if (combined.includes('อาหาร') || combined.includes('ภัตตาคาร') || combined.includes('restaurant') || combined.includes('food') || combined.includes('ramen') || combined.includes('sushi') || combined.includes('yakiniku') || combined.includes('ราเมง') || combined.includes('ซูชิ') || combined.includes('เนื้อย่าง') || combined.includes('kitchen') || combined.includes('dining')) {
    listKey = 'restaurant';
  } else if (combined.includes('คาเฟ่') || combined.includes('กาแฟ') || combined.includes('cafe') || combined.includes('coffee') || combined.includes('tea') || combined.includes('bakery') || combined.includes('เบเกอรี่') || combined.includes('ชา') || combined.includes('ขนม')) {
    listKey = 'cafe';
  } else if (combined.includes('ช้อปปิ้ง') || combined.includes('ร้าน') || combined.includes('shop') || combined.includes('store') || combined.includes('ห้าง') || combined.includes('mall') || combined.includes('boutique') || combined.includes('outlet') || combined.includes('mart') || combined.includes('ministop') || combined.includes('lawson') || combined.includes('7-eleven')) {
    listKey = 'shopping';
  } else if (combined.includes('ตลาด') || combined.includes('market') || combined.includes('bazaar')) {
    listKey = 'market';
  } else if (combined.includes('วัด') || combined.includes('temple') || combined.includes('ศาลเจ้า') || combined.includes('shrine') || combined.includes('เจดีย์')) {
    listKey = 'temple';
  } else if (combined.includes('วัง') || combined.includes('พระราชวัง') || combined.includes('palace') || combined.includes('castle') || combined.includes('ปราสาท')) {
    listKey = 'palace';
  } else if (combined.includes('พิพิธภัณฑ์') || combined.includes('museum') || combined.includes('gallery') || combined.includes('art') || combined.includes('หอศิลป์')) {
    listKey = 'museum';
  } else if (combined.includes('ธรรมชาติ') || combined.includes('สวน') || combined.includes('park') || combined.includes('garden') || combined.includes('forest') || combined.includes('mountain') || combined.includes('lake') || combined.includes('beach') || combined.includes('หาด')) {
    listKey = 'nature';
  }
  
  const images = CATEGORY_COVER_IMAGES[listKey] || CATEGORY_COVER_IMAGES.general;
  // Calculate deterministic index based on place name + id
  const str = String(place.id || place.name || 'place');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % images.length;
  return images[index];
}

export const CHECKLIST_CATEGORIES = [
  { id: 'documents', label: { th: '📄 เอกสาร & การเงิน', en: '📄 Docs & Finance' }, color: '#378ADD' },
  { id: 'clothing', label: { th: '👕 เสื้อผ้า & เครื่องแต่งกาย', en: '👕 Clothing & Apparel' }, color: '#EF9F27' },
  { id: 'toiletries', label: { th: '🧴 อุปกรณ์ของใช้ส่วนตัว & ยา', en: '🧴 Personal Care' }, color: '#1D9E75' },
  { id: 'electronics', label: { th: '🔌 อุปกรณ์ไอที / ไฟฟ้า', en: '🔌 Electronics' }, color: '#7F77DD' },
  { id: 'others', label: { th: '🎒 อื่นๆ', en: '🎒 Others' }, color: '#993556' }
];

export const CHECKLIST_TEMPLATES = {
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

export const generateChecklistId = () => {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const CITY_COORDINATES = {
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

export const WEATHER_CODES = {
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

export const getCountryOfCity = (cityId) => {
  if (['bkk', 'cnx', 'hkt', 'ptt', 'aya'].includes(cityId)) return 'th';
  if (['sel', 'bus', 'jej'].includes(cityId)) return 'kr';
  if (['tky', 'kyo', 'osk'].includes(cityId)) return 'jp';
  return 'th';
};
