// fetch a page as xml
export async function fetchAPI(URI: string, qs = {}): Promise<string> {
  const qss = new URLSearchParams(qs).toString();
  const url = `${URI}?${qss}`;
  // console.log(`fetching ${url}`);
  const response = await fetch(url);
  const asText = await response.text();
  return asText;
}
