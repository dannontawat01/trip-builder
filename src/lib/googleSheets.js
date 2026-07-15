const googleScriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || '';

export const googleSheets = googleScriptUrl ? {
  url: googleScriptUrl,
  
  async getLandmarks(cityId, email) {
    const res = await fetch(`${this.url}?action=get_landmarks&city_id=${encodeURIComponent(cityId)}&email=${encodeURIComponent(email || '')}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data || [];
  },

  async getItineraries(email) {
    const res = await fetch(`${this.url}?action=get_itineraries&email=${encodeURIComponent(email)}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data || [];
  },

  async signUp(email, password) {
    const res = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'sign_up', email, password })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  async signIn(email, password) {
    const res = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'sign_in', email, password })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  async insertLandmark(email, landmark) {
    const res = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'insert_landmark', email, landmark })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  async updateLandmark(landmark) {
    const res = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'update_landmark', landmark })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  async insertItinerary(email, itinerary) {
    const res = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'insert_itinerary', email, itinerary })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  async updateItinerary(itinerary) {
    const res = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'update_itinerary', itinerary })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  async bulkInsertLandmarks(email, landmarks) {
    const res = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'bulk_insert_landmarks', email, landmarks })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  },

  async deleteItinerary(id) {
    const res = await fetch(this.url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'delete_itinerary', id })
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  }
} : null;
