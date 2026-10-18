/**
 * Route Optimizer & Smart Travel Time Estimation
 * Provides client-side Traveling Salesperson Problem (TSP) optimization,
 * realistic travel time calculation, and route metrics comparison.
 */

/**
 * Calculates Great-Circle distance between two points in kilometers using the Haversine formula
 * @param {{ lat: number|string, lng: number|string }} p1
 * @param {{ lat: number|string, lng: number|string }} p2
 * @returns {number|null} distance in km, or null if coordinates are invalid
 */
export function calculateDistanceKm(p1, p2) {
  if (!p1 || !p2) return null;
  const lat1 = parseFloat(p1.lat);
  const lng1 = parseFloat(p1.lng);
  const lat2 = parseFloat(p2.lat);
  const lng2 = parseFloat(p2.lng);

  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
    return null;
  }

  const R = 6371; // Earth radius in kilometers
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates realistic travel time (in minutes) and transit mode between two points based on distance
 * @param {number|null} distKm - distance in kilometers
 * @returns {{ timeMins: number, mode: 'walk'|'transit', distanceKm: number }}
 */
export function estimateTravelTimeMins(distKm) {
  if (distKm === null || isNaN(distKm) || distKm <= 0) {
    return { timeMins: 15, mode: 'walk', distanceKm: 0 };
  }

  const d = Math.max(0.01, distKm);

  // 1. Very short distance (< 150m): 3-5 mins walk
  if (d <= 0.15) {
    return { timeMins: 5, mode: 'walk', distanceKm: Math.round(d * 100) / 100 };
  }

  // 2. Walkable distance (0.15km - 1.2km): Walking speed ~ 4.5 km/h (75 m/min)
  if (d <= 1.2) {
    const walkMins = Math.ceil((d / 4.5) * 60);
    return {
      timeMins: Math.min(25, Math.max(5, walkMins)),
      mode: 'walk',
      distanceKm: Math.round(d * 100) / 100
    };
  }

  // 3. Transit / Driving distance (> 1.2km):
  // Average city transit/car speed 25 km/h + 8 mins baseline (station walking / waiting / traffic)
  const transitMins = Math.round(8 + (d / 25) * 60);
  // Round to nearest 5 minutes for clean scheduling
  const roundedMins = Math.max(10, Math.ceil(transitMins / 5) * 5);

  return {
    timeMins: roundedMins,
    mode: 'transit',
    distanceKm: Math.round(d * 100) / 100
  };
}

/**
 * Calculates route metrics for a sequence of places
 * @param {Array<object>} items
 * @returns {{ totalDistKm: number, totalTimeMins: number, segments: Array<object> }}
 */
export function calculateRouteMetrics(items) {
  if (!Array.isArray(items) || items.length < 2) {
    return { totalDistKm: 0, totalTimeMins: 0, segments: [] };
  }

  let totalDistKm = 0;
  let totalTimeMins = 0;
  const segments = [];

  for (let i = 0; i < items.length - 1; i++) {
    const from = items[i];
    const to = items[i + 1];
    const dist = calculateDistanceKm(from, to);

    if (dist !== null) {
      const est = estimateTravelTimeMins(dist);
      totalDistKm += dist;
      totalTimeMins += est.timeMins;
      segments.push({
        fromIndex: i,
        toIndex: i + 1,
        distKm: Math.round(dist * 10) / 10,
        timeMins: est.timeMins,
        mode: est.mode
      });
    } else {
      // Default fallback if no coordinates available for segment
      totalTimeMins += 20;
      segments.push({
        fromIndex: i,
        toIndex: i + 1,
        distKm: null,
        timeMins: 20,
        mode: 'transit'
      });
    }
  }

  return {
    totalDistKm: Math.round(totalDistKm * 10) / 10,
    totalTimeMins,
    segments
  };
}

/**
 * Evaluates the total distance for a specific permutation of coordinate indices
 * @param {Array<number>} order
 * @param {Array<{lat: number, lng: number}>} coords
 * @returns {number}
 */
function evaluatePathLength(order, coords) {
  let len = 0;
  for (let i = 0; i < order.length - 1; i++) {
    const d = calculateDistanceKm(coords[order[i]], coords[order[i + 1]]);
    len += d !== null ? d : 10;
  }
  return len;
}

/**
 * 2-Opt local search improvement for TSP
 * @param {Array<number>} tour
 * @param {Array<{lat: number, lng: number}>} coords
 * @returns {Array<number>}
 */
function twoOpt(tour, coords) {
  let improved = true;
  let bestTour = [...tour];
  let bestDist = evaluatePathLength(bestTour, coords);
  let iterations = 0;
  const maxIterations = 200;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < bestTour.length - 1; i++) {
      for (let k = i + 1; k < bestTour.length; k++) {
        // Reverse sub-segment from i to k
        const newTour = [
          ...bestTour.slice(0, i),
          ...bestTour.slice(i, k + 1).reverse(),
          ...bestTour.slice(k + 1)
        ];
        const newDist = evaluatePathLength(newTour, coords);
        if (newDist < bestDist - 0.05) {
          bestTour = newTour;
          bestDist = newDist;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return bestTour;
}

/**
 * Optimizes an array of itinerary items for a single day to minimize total travel distance
 * Uses exact permutation for N <= 8, and Nearest Neighbor + 2-Opt heuristic for N > 8.
 *
 * @param {Array<object>} items
 * @param {object} [options]
 * @param {boolean} [options.keepFirst=false] - If true, keeps the first item fixed as starting point
 * @returns {{
 *   originalItems: Array<object>,
 *   optimizedItems: Array<object>,
 *   originalMetrics: { totalDistKm: number, totalTimeMins: number },
 *   optimizedMetrics: { totalDistKm: number, totalTimeMins: number },
 *   savedDistKm: number,
 *   savedDistPercent: number,
 *   savedTimeMins: number,
 *   isImproved: boolean,
 *   hasValidCoords: boolean
 * }}
 */
export function optimizeDayRoute(items, options = {}) {
  if (!Array.isArray(items) || items.length < 3) {
    const metrics = calculateRouteMetrics(items);
    return {
      originalItems: items || [],
      optimizedItems: items || [],
      originalMetrics: metrics,
      optimizedMetrics: metrics,
      savedDistKm: 0,
      savedDistPercent: 0,
      savedTimeMins: 0,
      isImproved: false,
      hasValidCoords: false
    };
  }

  // Filter items that have valid coordinates
  const itemsWithCoords = items.map((item, idx) => ({
    originalIndex: idx,
    item,
    hasCoord: !isNaN(parseFloat(item.lat)) && !isNaN(parseFloat(item.lng)),
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lng)
  }));

  const validItems = itemsWithCoords.filter(it => it.hasCoord);

  // Require at least 3 places with valid coordinates to meaningfully optimize
  if (validItems.length < 3) {
    const metrics = calculateRouteMetrics(items);
    return {
      originalItems: items,
      optimizedItems: items,
      originalMetrics: metrics,
      optimizedMetrics: metrics,
      savedDistKm: 0,
      savedDistPercent: 0,
      savedTimeMins: 0,
      isImproved: false,
      hasValidCoords: false
    };
  }

  const coords = validItems.map(it => ({ lat: it.lat, lng: it.lng }));
  const N = validItems.length;
  let bestOrder = Array.from({ length: N }, (_, i) => i);
  let bestDist = evaluatePathLength(bestOrder, coords);

  if (N <= 8) {
    // Exact exhaustive permutation search
    const permute = (arr, m = []) => {
      if (arr.length === 0) {
        const d = evaluatePathLength(m, coords);
        if (d < bestDist) {
          bestDist = d;
          bestOrder = [...m];
        }
      } else {
        for (let i = 0; i < arr.length; i++) {
          const curr = arr.slice();
          const next = curr.splice(i, 1);
          permute(curr.slice(), m.concat(next));
        }
      }
    };
    permute(Array.from({ length: N }, (_, i) => i));
  } else {
    // Nearest Neighbor heuristic
    const visited = new Set([0]);
    const nnTour = [0];
    while (nnTour.length < N) {
      const last = nnTour[nnTour.length - 1];
      let nearest = -1;
      let minD = Infinity;
      for (let j = 0; j < N; j++) {
        if (!visited.has(j)) {
          const d = calculateDistanceKm(coords[last], coords[j]) || 999;
          if (d < minD) {
            minD = d;
            nearest = j;
          }
        }
      }
      if (nearest !== -1) {
        visited.add(nearest);
        nnTour.push(nearest);
      } else {
        break;
      }
    }

    // Improve with 2-Opt local search
    bestOrder = twoOpt(nnTour, coords);
    bestDist = evaluatePathLength(bestOrder, coords);
  }

  // Map optimized order back to items
  const reorderedValidItems = bestOrder.map(orderIdx => validItems[orderIdx].item);

  // If there were any items without coordinates, append them at the end preserving their relative order
  const nonCoordItems = itemsWithCoords.filter(it => !it.hasCoord).map(it => it.item);
  const reorderedAll = [...reorderedValidItems, ...nonCoordItems];

  // Re-calculate dynamic travelTime for each consecutive item in the optimized list
  const optimizedWithTravelTimes = reorderedAll.map((item, idx) => {
    if (idx === 0) {
      // First item doesn't have an incoming travel time from another place
      return { ...item };
    }
    const prev = reorderedAll[idx - 1];
    const dist = calculateDistanceKm(prev, item);
    const est = estimateTravelTimeMins(dist);
    return {
      ...item,
      travelTime: est.timeMins,
      travelMode: est.mode,
      travelDistKm: est.distanceKm
    };
  });

  const originalMetrics = calculateRouteMetrics(items);
  const optimizedMetrics = calculateRouteMetrics(optimizedWithTravelTimes);

  const savedDistKm = Math.max(0, Math.round((originalMetrics.totalDistKm - optimizedMetrics.totalDistKm) * 10) / 10);
  const savedDistPercent = originalMetrics.totalDistKm > 0
    ? Math.round((savedDistKm / originalMetrics.totalDistKm) * 100)
    : 0;
  const savedTimeMins = Math.max(0, originalMetrics.totalTimeMins - optimizedMetrics.totalTimeMins);

  // Consider it improved if saved at least 0.3 km or 5 mins
  const isImproved = savedDistKm >= 0.3 || savedTimeMins >= 5;

  return {
    originalItems: items,
    optimizedItems: optimizedWithTravelTimes,
    originalMetrics,
    optimizedMetrics,
    savedDistKm,
    savedDistPercent,
    savedTimeMins,
    isImproved,
    hasValidCoords: true
  };
}
