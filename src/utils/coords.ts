/** Extract [lat, lon] from a Google Maps URL. Returns null if not parseable. */
export function parseMapsCoords(url: string): [number, number] | null {
  // @lat,lon,zoom  (most common — place URLs, search results)
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return [parseFloat(atMatch[1]), parseFloat(atMatch[2])];

  // ?q=lat,lon  (simple query links)
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return [parseFloat(qMatch[1]), parseFloat(qMatch[2])];

  // !3d<lat>!4d<lon>  (data parameter encoding)
  const dataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) return [parseFloat(dataMatch[1]), parseFloat(dataMatch[2])];

  return null;
}
