export async function POST(req) {
  try {
    const { style, itinerary } = await req.json();

    const lines = itinerary ? itinerary.split('\n') : [];
    let contentHtml = '';
    let currentDayHtml = '';
    
    // Parse the text-based itinerary into structured HTML
    lines.forEach(line => {
      if (line.startsWith('📅 วันที่') || line.startsWith('📅 Day')) {
        if (currentDayHtml) {
          contentHtml += `<div class="day-section">${currentDayHtml}</div>`;
        }
        currentDayHtml = `<h2>${line}</h2>`;
      } else if (line.trim().startsWith('──') || line.trim() === '') {
        // Skip separators or empty lines
      } else {
        // Parse time, place, details
        if (line.match(/^\d{2}:\d{2}/)) {
          currentDayHtml += `<div class="itin-item">
            <span class="time">${line.slice(0, 11)}</span>
            <span class="place">${line.slice(11)}</span>
          </div>`;
        } else if (line.startsWith('  📍') || line.startsWith('  Address:')) {
          currentDayHtml += `<div class="detail address">${line.replace('  📍', '').replace('  Address:', '')}</div>`;
        } else if (line.startsWith('  🗺') || line.startsWith('  GPS:')) {
          currentDayHtml += `<div class="detail gps">${line.replace('  🗺', '').replace('  GPS:', '')}</div>`;
        } else if (line.startsWith('  💰') || line.startsWith('  Fee:')) {
          currentDayHtml += `<div class="detail fee">${line.replace('  💰', '').replace('  Fee:', '')}</div>`;
        } else if (line.startsWith('  🚇') || line.startsWith('  Transit:')) {
          currentDayHtml += `<div class="detail transit">${line.replace('  🚇', '').replace('  Transit:', '')}</div>`;
        } else if (line.startsWith('  🍽') || line.startsWith('  Lunch:')) {
          currentDayHtml += `<div class="itin-item food">
            <span class="place">${line}</span>
          </div>`;
        } else if (line.startsWith('  🚗') || line.startsWith('  Travel:')) {
          currentDayHtml += `<div class="travel-sep">${line}</div>`;
        } else {
          currentDayHtml += `<div class="detail general">${line}</div>`;
        }
      }
    });
    
    if (currentDayHtml) {
      contentHtml += `<div class="day-section">${currentDayHtml}</div>`;
    }

    let css = '';
    if (style === 'A') {
      // Style A: Beautiful / Colorful
      css = `
        :root {
          --primary: #1D9E75;
          --bg: #F7F6F2;
          --card: #FFFFFF;
          --text: #1C1C1A;
          --border: #E2E0D8;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: var(--bg);
          color: var(--text);
          padding: 40px 20px;
          margin: 0;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: var(--card);
          padding: 30px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
          border: 1px solid var(--border);
        }
        h1 {
          font-family: 'Georgia', serif;
          text-align: center;
          color: var(--primary);
          margin-bottom: 30px;
        }
        .day-section {
          margin-bottom: 40px;
          border-bottom: 2px solid var(--bg);
          padding-bottom: 30px;
        }
        .day-section:last-child {
          border-bottom: none;
        }
        h2 {
          color: var(--primary);
          background: #E1F5EE;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 1.3rem;
          margin-top: 0;
        }
        .itin-item {
          display: flex;
          align-items: center;
          padding: 10px 0;
          font-weight: 500;
        }
        .itin-item.food {
          color: #EF9F27;
        }
        .time {
          width: 120px;
          font-weight: bold;
          color: #666;
        }
        .place {
          flex: 1;
          font-size: 1.1rem;
        }
        .detail {
          margin-left: 120px;
          color: #777;
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .travel-sep {
          margin-left: 120px;
          padding: 4px 10px;
          font-size: 0.85rem;
          color: #999;
          background: #fdfdfd;
          border-left: 2px dashed var(--border);
          margin-top: 5px;
          margin-bottom: 5px;
        }
      `;
    } else if (style === 'B') {
      // Style B: Clean / Printer Friendly
      css = `
        body {
          font-family: 'Times New Roman', Times, serif;
          background: #fff;
          color: #000;
          padding: 20px;
          margin: 0;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          text-align: center;
          font-size: 2rem;
          text-transform: uppercase;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .day-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        h2 {
          font-size: 1.4rem;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
          margin-top: 20px;
        }
        .itin-item {
          margin: 8px 0;
        }
        .time {
          font-weight: bold;
          margin-right: 15px;
          display: inline-block;
          width: 100px;
        }
        .place {
          font-size: 1.1rem;
          display: inline-block;
        }
        .detail {
          margin-left: 115px;
          font-size: 0.9rem;
          color: #333;
        }
        .travel-sep {
          margin-left: 115px;
          font-style: italic;
          color: #555;
          font-size: 0.85rem;
        }
      `;
    } else {
      // Style C: Timeline format
      css = `
        body {
          font-family: Arial, sans-serif;
          background: #F3F4F6;
          color: #1F2937;
          padding: 40px 20px;
          margin: 0;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: #fff;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        h1 {
          font-size: 1.8rem;
          text-align: center;
          margin-bottom: 40px;
          color: #111827;
        }
        .day-section {
          position: relative;
          border-left: 2px solid #3B82F6;
          padding-left: 20px;
          margin-left: 10px;
          margin-bottom: 30px;
        }
        h2 {
          color: #1E3A8A;
          margin-left: -32px;
          background: #EFF6FF;
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid #BFDBFE;
          font-size: 1.1rem;
        }
        .itin-item {
          margin: 15px 0;
          position: relative;
        }
        .itin-item::before {
          content: '';
          position: absolute;
          left: -26px;
          top: 6px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3B82F6;
        }
        .time {
          font-weight: bold;
          color: #3B82F6;
          display: block;
          font-size: 0.9rem;
        }
        .place {
          font-size: 1.1rem;
          font-weight: bold;
        }
        .detail {
          color: #4B5563;
          font-size: 0.85rem;
          margin-top: 2px;
        }
        .travel-sep {
          color: #9CA3AF;
          font-size: 0.8rem;
          margin: 10px 0;
        }
      `;
    }

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>Trip Itinerary Export</title>
  <style>
    ${css}
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border: none; max-width: 100%; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>แผนการเดินทางของคุณ (Trip Itinerary)</h1>
    ${contentHtml}
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ html }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error in ai-export:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
