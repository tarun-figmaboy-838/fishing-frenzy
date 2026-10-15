// Voice-over build tool (Node 22+, plus Chrome or Edge for the audio conversion). See docs/VOICEOVER.md.
//
//   node tools/vo_build.js script               list every line the game can show (js/lesson-data.js, js/summary.js and
//                                                the engine's feedback templates) into tools/vo_script.json. Existing
//                                                entries keep their id and spoken form; new lines get the next id and a
//                                                spoken form from the rules below (check it by hand).
//   node tools/vo_build.js xlsx out.xlsx [ids]  write a studio batch file (columns filename, text) for those ids,
//                                                default: every line that has no clip yet
//   node tools/vo_build.js build a.zip [b.zip]  take the studio's voiceovers_batch.zip files, make assets/vo/voNNN.ogg
//                                                (Ogg Opus, 32 kbps, mono) and regenerate js/vo-lines.js. Safe to re-run.
//   node tools/vo_build.js map                  regenerate js/vo-lines.js from the clips already in assets/vo/
//   node tools/vo_build.js deva d.json          store the studio's Devanagari ({ id: text }) in tools/vo_script.json
//   node tools/vo_build.js doc                  rewrite the clip table in docs/VOICEOVER.md
//
// The conversion runs in headless Chrome: decodeAudioData resamples the MP3 to 48 kHz, WebCodecs encodes Opus, and the
// packets are written into an Ogg file here (RFC 7845). No ffmpeg needed.
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib'), http = require('http'), os = require('os');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(__dirname, 'vo_script.json');
const VO_DIR = path.join(ROOT, 'assets', 'vo');
const MAP = path.join(ROOT, 'js', 'vo-lines.js');
const norm = (t) => String(t).replace(/\s+/g, ' ').trim(); // keys are the shown text with its line breaks as spaces

// ---------- numbers in words (the studio's script step can turn digits into Hindi number words) ----------
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(n) {
  if (String(n).indexOf('.') >= 0) { const [a, b] = String(n).split('.'); return words(+a) + ' point ' + b.split('').map((d) => ONES[+d]).join(' '); }
  n = +n;
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + words(n % 100) : '');
}
// the spoken form of a line: maths and symbols written out the way the voice should say them
function spoken(t) {
  return norm(t)
    .replace(/Woah/g, 'Whoa')
    .replace(/∠\s?([A-D])/g, 'angle $1')
    .replace(/\b(AB|BC|CD|AD|DC)\b/g, (m) => m[0] + ' ' + m[1])
    .replace(/(\d+(?:\.\d+)?)\s?cm\b/g, (m, n) => words(n) + ' centimetres')
    .replace(/(\d+)°/g, (m, n) => words(n) + ' degrees')
    .replace(/ = /g, ' equals ').replace(/ \+ /g, ' plus ')
    .replace(/\d+(\.\d+)?/g, (m) => words(m))
    .replace(/(^|[.!?] )([a-z])/g, (m, a, b) => a + b.toUpperCase()); // sentences start with a capital
}

// ---------- every line the dialogue box can show, in the order the learner first hears them ----------
function gather() {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'lesson-data.js'), 'utf8') + '\nthis.LESSON = LESSON;', ctx);
  const sum = fs.readFileSync(path.join(ROOT, 'js', 'summary.js'), 'utf8');
  const ideas = [...sum.slice(sum.indexOf('const IDEAS'), sum.indexOf('const DONE')).matchAll(/\bt: '([^']+)'/g)].map((m) => m[1]);
  const done = /const DONE = \{[^}]*\bt: '([^']+)'/.exec(sum)[1];
  const out = [], add = (line, say, opt) => { line = norm(line); if (line && !out.some((x) => x.line === line)) out.push(Object.assign({ line: line, spoken: say ? norm(say) : spoken(line) }, opt || {})); };
  const qText = (st) => st.qStatic || ((st.cfu || st.practice) && st.lines.length ? st.lines[st.lines.length - 1].t : null);
  const say = (L) => (L.keep ? add(L.s, L.s) : add(L.t, L.s ? spoken(L.s) : null));
  ctx.LESSON.steps.forEach((st) => {
    (st.lines || []).forEach(say);
    // feedback the engine builds while the task runs (js/game-engine.js checkDrag, rightTap, place1, check4)
    if (st.task === 'dragA') {
      // AD is shown to 0.1 cm. Below 5 cm the drag snaps to equal legs; A can go right until AB is 90 px (AD 7.55 cm)
      for (let v = 51; v <= 76; v++) { const cm = v % 10 ? (v / 10).toFixed(1) : String(v / 10); add('AD is ' + cm + ' cm. Keep dragging A until it shows exactly 5 cm.'); }
    }
    if (st.task === 'drag90') {
      // "∠A is 120° now. Keep dragging until it shows 90°." is said in two clips: the corner, then the angle.
      // A leg can lean up to 243 px over a 196 px height (39°-141°); within 5° of 90° the corner snaps instead
      'ABCD'.split('').forEach((k) => add('∠' + k + ' is', null, { part: 1 }));
      for (let n = 39; n <= 141; n++) if (n <= 85 || n >= 95) add(n + '° now. Keep dragging until it shows 90°.', null, { part: 1 });
    }
    if (st.rightTap) add('That angle is not 90°. Look for the square corners.');
    (st.after || []).forEach(say);
    (st.opts || []).forEach((o) => o.fb && add(o.fb));
    if (st.id === 'cfu4') {
      add('Try again! Look closely at the shapes.'); add('Watch the glowing clue. Which shape has that mark?');
      add('Some labels went back. Look for the marks: equal legs, right angles, or neither.');
    }
    if (st.ok) add(st.ok);
    // idle reminder: the question itself on checks, else the idle line, else the hint
    const needs = st.task || st.cfu || st.opts;
    if (needs && !st.auto && !st.noIdle) add(qText(st) || st.idle || (st.hint + '.'));
    if (st.summary) { ideas.forEach((t) => add(t)); add(done); }
    // screen 44's closer says its own line (js/finale.js, Voice.find)
    if (st.finale) { const f = fs.readFileSync(path.join(ROOT, 'js', 'finale.js'), 'utf8'), m = /Voice\.find\('([^']+)'\)/.exec(f); if (m) add(m[1]); }
  });
  return out;
}

function readScript() { try { return JSON.parse(fs.readFileSync(SCRIPT, 'utf8')); } catch (e) { return []; } }
function writeScript(list) { fs.writeFileSync(SCRIPT, JSON.stringify(list, null, 2) + '\n'); }

function cmdScript() {
  const old = readScript(), got = gather();
  let next = old.reduce((m, x) => Math.max(m, +x.id.slice(2)), 0);
  const list = got.map((g) => {
    const o = old.find((x) => x.line === g.line);
    if (o) return o;
    const e = { id: 'vo' + String(++next).padStart(3, '0'), line: g.line, spoken: g.spoken };
    if (g.part) e.part = 1;
    return e;
  });
  const gone = old.filter((o) => !list.includes(o));
  // ids follow the first-heard order on a fresh build
  if (!old.length) list.forEach((e, i) => { e.id = 'vo' + String(i + 1).padStart(3, '0'); });
  writeScript(list);
  console.log(list.length + ' lines (' + (list.length - old.length + gone.length) + ' new), ' + gone.length + ' no longer shown' + (gone.length ? ': ' + gone.map((g) => g.id).join(' ') : ''));
}

// ---------- zip (store-only writer, reader with inflate) ----------
function zipWrite(files) { // files: [[name, Buffer]]
  const locals = [], cents = []; let off = 0;
  files.forEach(([name, data]) => {
    const n = Buffer.from(name), crc = zlib.crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    locals.push(h, n, data); cents.push(c, n); off += 30 + n.length + data.length;
  });
  const cd = Buffer.concat(cents), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat(locals.concat([cd, e]));
}
function zipRead(buf) { // -> { name: Buffer }
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const out = {};
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    const ds = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28), raw = buf.subarray(ds, ds + size);
    if (!name.endsWith('/')) out[name] = method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    p += 46 + nl + xl + cl;
  }
  return out;
}

// ---------- studio batch file: a minimal .xlsx with inline strings ----------
function xlsx(rows) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cell = (ref, v) => '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    [['filename', 'text']].concat(rows).map((r, i) => '<row r="' + (i + 1) + '">' + cell('A' + (i + 1), r[0]) + cell('B' + (i + 1), r[1]) + '</row>').join('') + '</sheetData></worksheet>';
  const X = (s) => Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + s);
  return zipWrite([
    ['[Content_Types].xml', X('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')],
    ['_rels/.rels', X('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')],
    ['xl/workbook.xml', X('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>')],
    ['xl/_rels/workbook.xml.rels', X('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')],
    ['xl/worksheets/sheet1.xml', Buffer.from(sheet)]
  ]);
}
function cmdXlsx(out, ids) {
  const list = readScript();
  const pick = ids.length ? list.filter((e) => ids.includes(e.id)) : list.filter((e) => !fs.existsSync(path.join(VO_DIR, e.id + '.ogg')));
  fs.writeFileSync(out, xlsx(pick.map((e) => [e.id, e.spoken])));
  console.log(out + ': ' + pick.length + ' rows');
}

// ---------- Ogg Opus writer (RFC 7845). Granule positions count 48 kHz samples ----------
const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; t[i] = r >>> 0; } return t; })();
function oggCrc(b) { let c = 0; for (let i = 0; i < b.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ b[i]) & 255]) >>> 0; return c >>> 0; }
function oggPage(packets, granule, seq, flags) {
  const lace = []; packets.forEach((p) => { let n = p.length; while (n >= 255) { lace.push(255); n -= 255; } lace.push(n); });
  const h = Buffer.alloc(27 + lace.length);
  h.write('OggS', 0); h[4] = 0; h[5] = flags; h.writeBigInt64LE(BigInt(granule), 6); h.writeUInt32LE(0x564f4943, 14); h.writeUInt32LE(seq, 18); h[26] = lace.length;
  lace.forEach((v, i) => { h[27 + i] = v; });
  const page = Buffer.concat([h].concat(packets));
  page.writeUInt32LE(oggCrc(page), 22);
  return page;
}
// packets: Buffers of 20 ms (960 samples) each; samples: real length at 48 kHz; preSkip: encoder delay
function oggOpus(packets, samples, preSkip, inRate) {
  const head = Buffer.alloc(19); head.write('OpusHead', 0); head[8] = 1; head[9] = 1; head.writeUInt16LE(preSkip, 10); head.writeUInt32LE(inRate, 12);
  const vendor = Buffer.from('trapezium vo_build'), tags = Buffer.alloc(16 + vendor.length);
  tags.write('OpusTags', 0); tags.writeUInt32LE(vendor.length, 8); vendor.copy(tags, 12); tags.writeUInt32LE(0, 12 + vendor.length);
  const pages = [oggPage([head], 0, 0, 2), oggPage([tags], 0, 1, 0)];
  let seq = 2, done = 0;
  for (let i = 0; i < packets.length; i += 50) { // one second of audio per page
    const grp = packets.slice(i, i + 50); done += grp.length * 960;
    const last = i + 50 >= packets.length;
    pages.push(oggPage(grp, last ? preSkip + samples : preSkip + done, seq++, last ? 4 : 0)); // the last granule trims the padding
  }
  return Buffer.concat(pages);
}

// ---------- conversion in headless Chrome ----------
const PAGE = `<!doctype html><meta charset="utf-8"><title>vo</title><script>
// decode -> trim silence (keep 60 ms) -> 48 kHz mono -> Opus 32 kbps. Returns packets as base64.
window.conv = async (url) => {
  const raw = await (await fetch(url)).arrayBuffer();
  const ab = await new OfflineAudioContext(1, 1, 48000).decodeAudioData(raw);
  const d = ab.getChannelData(0), th = 0.004, pad = 0.06 * 48000;
  let a = 0, b = d.length - 1; while (a < d.length && Math.abs(d[a]) < th) a++; while (b > a && Math.abs(d[b]) < th) b--;
  const pcm = d.slice(Math.max(0, a - pad), Math.min(d.length, b + pad));
  const pk = []; let pre = 312;
  const enc = new AudioEncoder({ output: (c, m) => { if (m && m.decoderConfig && m.decoderConfig.description) pre = new DataView(m.decoderConfig.description instanceof ArrayBuffer ? m.decoderConfig.description : m.decoderConfig.description.buffer).getUint16(10, true); const u = new Uint8Array(c.byteLength); c.copyTo(u); let s = ''; u.forEach((x) => { s += String.fromCharCode(x); }); pk.push(btoa(s)); }, error: (e) => { throw e; } });
  enc.configure({ codec: 'opus', sampleRate: 48000, numberOfChannels: 1, bitrate: 32000 });
  enc.encode(new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: pcm.length, numberOfChannels: 1, timestamp: 0, data: pcm }));
  await enc.flush(); enc.close();
  return { packets: pk, samples: pcm.length, pre: pre };
};
// duration of a finished .ogg, as the browser decodes it
window.dur = async (url) => (await new OfflineAudioContext(1, 1, 48000).decodeAudioData(await (await fetch(url)).arrayBuffer())).duration;
</script>`;
async function chrome(files, job) {
  const CH = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => fs.existsSync(p));
  if (!CH) throw new Error('Chrome not found; set CHROME=/path/to/chrome');
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(PAGE); return; }
    const f = files(u); if (!f) { r.writeHead(404); r.end(); return; } r.writeHead(200); r.end(f);
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const port = 9300 + Math.floor(Math.random() * 500), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vo-'));
  const proc = spawn(CH, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, 'about:blank']);
  try {
    let ws; for (let i = 0; i < 80 && !ws; i++) { try { const j = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json(); const pg = j.find((x) => x.type === 'page'); if (pg) ws = pg.webSocketDebuggerUrl; } catch (e) {} if (!ws) await new Promise((r) => setTimeout(r, 250)); }
    const sock = new WebSocket(ws); await new Promise((r) => (sock.onopen = r));
    let id = 0; const pend = {};
    sock.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
    const send = (method, params) => new Promise((r) => { const i = ++id; pend[i] = r; sock.send(JSON.stringify({ id: i, method: method, params: params || {} })); });
    const ev = async (x) => { const d = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (d.result.exceptionDetails) throw new Error(d.result.exceptionDetails.exception.description); return d.result.result.value; };
    await send('Page.enable'); await send('Page.navigate', { url: 'http://localhost:' + srv.address().port + '/' });
    for (let i = 0; i < 40 && (await ev('typeof conv')) !== 'function'; i++) await new Promise((r) => setTimeout(r, 150));
    return await job(ev);
  } finally { proc.kill(); srv.close(); }
}

// ---------- the line -> clip map the game reads ----------
async function writeMap() {
  const list = readScript(), have = list.filter((e) => fs.existsSync(path.join(VO_DIR, e.id + '.ogg')));
  const durs = await chrome((u) => { const m = /^\/vo\/(vo\d+\.ogg)$/.exec(u); return m ? fs.readFileSync(path.join(VO_DIR, m[1])) : null; },
    async (ev) => { const o = {}; for (const e of have) o[e.id] = await ev('dur("/vo/' + e.id + '.ogg")'); return o; });
  const body = have.map((e) => '  ' + JSON.stringify(e.line) + ': [' + JSON.stringify(e.id) + ', ' + durs[e.id].toFixed(2) + '],').join('\n');
  fs.writeFileSync(MAP, '// GENERATED by tools/vo_build.js from tools/vo_script.json - do not edit by hand. See docs/VOICEOVER.md.\n' +
    '// Each line the dialogue box can show (line breaks as spaces) -> [clip in assets/vo/, seconds]\n' +
    '// eslint-disable-next-line no-unused-vars\nconst VO_LINES = {\n' + body.replace(/,$/, '') + '\n};\n');
  const missing = list.filter((e) => !durs[e.id]);
  console.log('js/vo-lines.js: ' + have.length + ' of ' + list.length + ' lines voiced, ' + (Object.values(durs).reduce((a, b) => a + b, 0) / 60).toFixed(1) + ' min');
  if (missing.length) console.log('no clip yet: ' + missing.map((e) => e.id).join(' '));
  // one file per voiced line, nothing else
  fs.readdirSync(VO_DIR).forEach((f) => { if (!list.some((e) => e.id + '.ogg' === f)) { fs.unlinkSync(path.join(VO_DIR, f)); console.log('removed unused ' + f); } });
}

async function cmdBuild(zips) {
  const list = readScript(), mp3 = {};
  zips.forEach((z) => { const files = zipRead(fs.readFileSync(z)); Object.keys(files).forEach((n) => { const m = /(vo\d+)\.mp3$/.exec(n); if (m) mp3[m[1]] = files[n]; }); });
  const ids = Object.keys(mp3).filter((id) => list.some((e) => e.id === id)).sort();
  fs.mkdirSync(VO_DIR, { recursive: true });
  await chrome((u) => { const m = /^\/in\/(vo\d+)\.mp3$/.exec(u); return m ? mp3[m[1]] : null; }, async (ev) => {
    for (const id of ids) {
      const r = await ev('conv("/in/' + id + '.mp3")');
      fs.writeFileSync(path.join(VO_DIR, id + '.ogg'), oggOpus(r.packets.map((b) => Buffer.from(b, 'base64')), r.samples, r.pre, 24000));
    }
  });
  console.log('converted ' + ids.length + ' clips');
  await writeMap();
}

// ---------- docs/VOICEOVER.md: the clip table between its markers ----------
function cmdDeva(file) { // { id: devanagari } as logged from the studio's script step
  const d = JSON.parse(fs.readFileSync(file, 'utf8')), list = readScript();
  list.forEach((e) => { if (d[e.id]) e.devanagari = d[e.id]; });
  writeScript(list);
  console.log('devanagari for ' + list.filter((e) => e.devanagari).length + ' of ' + list.length + ' lines');
}
function cmdDoc() {
  const DOC = path.join(ROOT, 'docs', 'VOICEOVER.md'), list = readScript(), durs = {};
  for (const m of fs.readFileSync(MAP, 'utf8').matchAll(/\["(vo\d+)", ([\d.]+)\]/g)) durs[m[1]] = m[2];
  const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|');
  const rows = list.map((e) => '| ' + e.id + ' | ' + cell(e.line) + (e.part ? ' *(part)*' : '') + ' | ' + (e.spoken === e.line ? '=' : cell(e.spoken)) + ' | ' + cell(e.devanagari) + ' | ' + (durs[e.id] || '') + ' |');
  const table = '| Clip | Line as shown | Spoken as | Devanagari sent to the voice | s |\n|---|---|---|---|---|\n' + rows.join('\n');
  const t = fs.readFileSync(DOC, 'utf8'), a = '<!-- table:start -->', b = '<!-- table:end -->';
  fs.writeFileSync(DOC, t.slice(0, t.indexOf(a) + a.length) + '\n' + table + '\n' + t.slice(t.indexOf(b)));
  console.log('docs/VOICEOVER.md: ' + list.length + ' rows');
}

const [cmd, ...args] = process.argv.slice(2);
(async () => {
  if (cmd === 'script') cmdScript();
  else if (cmd === 'deva') cmdDeva(args[0]);
  else if (cmd === 'doc') cmdDoc();
  else if (cmd === 'xlsx') cmdXlsx(args[0], args.slice(1));
  else if (cmd === 'build') await cmdBuild(args);
  else if (cmd === 'map') await writeMap();
  else console.log('usage: node tools/vo_build.js script | xlsx out.xlsx [ids] | build zip [zip...] | map | deva d.json | doc');
})().catch((e) => { console.error(e); process.exit(1); });
