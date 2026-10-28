// Reviewer avatars and placeholder thumbnails from Google are never real place photos
const NON_PLACE_PHOTO_PATTERN = /googleusercontent\.com\/(?:a-?\/|[^?\s]*\/(?:s\d+-[a-z-]+\/)?photo\.jpg)|=s\d+-c\b|\/s(?:40|44)-/i;

export function isNonPlacePhoto(url) {
  return typeof url === 'string' && NON_PLACE_PHOTO_PATTERN.test(url);
}
