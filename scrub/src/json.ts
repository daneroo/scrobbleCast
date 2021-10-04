export async function readJSON(path: string) {
  console.debug("Reading", path);
  const text = await Deno.readTextFile(path);
  return JSON.parse(text);
}
