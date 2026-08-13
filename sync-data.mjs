import fs from 'node:fs/promises';

const fileId = process.env.PUBLIC_JSON_FILE_ID || '1jOV2raxmGOIb9atU0n328YcDyPfzK1-6';
const url = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
const target = new URL('./public_data.json', import.meta.url);

console.log(`Syncing public JSON from Google Drive file: ${fileId}`);

try {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data.participants)) throw new Error('Downloaded file is not the expected public JSON schema.');
  await fs.writeFile(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Synced ${data.participants.length} participants.`);
} catch (err) {
  console.warn(`WARNING: Could not download the Drive JSON: ${err.message}`);
  console.warn('Keeping the checked-in public_data.json snapshot so the demo can still build.');
}
