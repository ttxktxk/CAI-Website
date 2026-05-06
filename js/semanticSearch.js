/* semanticSearch.js — Thai-friendly Semantic Search (no backend) */

(function () {
  // ---------- Utilities ----------
  const TH_DIACRITICS = /[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g;

  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(TH_DIACRITICS, "")              // ตัดวรรณยุกต์/กำกับเสียงไทย
      .normalize("NFKC")                       // จัดรูป Unicode
      .replace(/\s+/g, " ")                    // ช่องว่างซ้ำ
      .trim();

  // ตัวแบ่งคำ (รองรับไทย): ใช้ Intl.Segmenter ถ้ามี
  const segTh = (text) => {
    const t = normalize(text);
    if (window.Intl && Intl.Segmenter) {
      const seg = new Intl.Segmenter("th", { granularity: "word" });
      return Array.from(seg.segment(t))
        .map((it) => it.segment.trim())
        .filter(Boolean);
    }
    // fallback: แบ่งด้วยอักษรไทยต่อเนื่อง + ช่องว่าง/อักขระอื่น
    const out = [];
    let buf = "";
    for (const ch of t) {
      const code = ch.charCodeAt(0);
      const isThai = code >= 0x0E00 && code <= 0x0E7F;
      if (isThai) {
        buf += ch;
      } else {
        if (buf) out.push(buf), buf = "";
        if (!/\s/.test(ch)) out.push(ch);
      }
    }
    if (buf) out.push(buf);
    return out.filter(Boolean);
  };

  // ระยะทางพิมพ์ผิดแบบ Damerau–Levenshtein (ตัดให้เร็วด้วยความยาว)
  function editDistance(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 3; // เร็ว: ต่างยาวเกินไปให้ถือว่าไกล
    const da = {};
    const al = a.length, bl = b.length;
    const maxdist = al + bl;
    const d = Array(al + 2).fill(0).map(() => Array(bl + 2).fill(0));
    const inf = al + bl;
    d[0][0] = inf;
    for (let i = 0; i <= al; i++) { d[i + 1][1] = i; d[i + 1][0] = inf; }
    for (let j = 0; j <= bl; j++) { d[1][j + 1] = j; d[0][j + 1] = inf; }
    for (let i = 1; i <= al; i++) {
      let db = 0;
      for (let j = 1; j <= bl; j++) {
        const i1 = da[b[j - 1]] || 0;
        const j1 = db;
        let cost = 1;
        if (a[i - 1] === b[j - 1]) { cost = 0; db = j; }
        d[i + 1][j + 1] = Math.min(
          d[i][j] + cost,           // subs
          d[i + 1][j] + 1,          // ins
          d[i][j + 1] + 1,          // del
          d[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) // transposition
        );
      }
      da[a[i - 1]] = i;
    }
    return d[al + 1][bl + 1];
  }

  // ---------- Domain knowledge ----------
  // คำพ้องความหมาย (เติมได้ตามต้องการ)
  const SYN = {
    "ai": ["ปัญญาประดิษฐ์", "artificial intelligence", "machine learning", "ml", "ดีพเลิร์น", "deep learning"],
    "ไมโครเซอร์วิส": ["microservices", "architecture", "distributed", "cloud-native"],
    "สมัคร": ["admission", "apply", "รับสมัคร", "คุณสมบัติ", "สมัครเรียน"],
    "ทุน": ["ทุนการศึกษา", "scholarship", "financial aid", "ทุน"],
    "อาจารย์": ["บุคลากร", "คณาจารย์", "faculty", "ผู้สอน"],
    "ผลงาน": ["projects", "โครงงาน", "กิจกรรม", "showcase"],
    "วิจัย": ["research", "บริการวิชาการ", "academic services"],
    "ญี่ปุ่น": ["japan", "work & study", "exchange", "วัฒนธรรมญี่ปุ่น"]
  };

  // ---------- Indexing ----------
  let CORPUS = [];
  let INDEX = {
    // token -> document frequency
    df: new Map(),
    // id -> { tokens: {...}, fieldTokens: {title:[], summary:[], tags:[], category:[] } }
    docs: new Map(),
    N: 0
  };

  // ดึงทุก token จากฟิลด์ต่าง ๆ พร้อมน้ำหนักฟิลด์ (สำหรับ TF-IDF/BM25-lite)
  const FIELD_WEIGHTS = { title: 3.0, tags: 1.6, category: 1.2, summary: 1.0 };

  function explodeTokensForDoc(doc) {
    const fields = {
      title: segTh(doc.title),
      summary: segTh(doc.summary || ""),
      tags: segTh((doc.tags || []).join(" ")),
      category: segTh(doc.category || "")
    };
    // นับความถี่แบบ weighted
    const tf = new Map();
    for (const [field, toks] of Object.entries(fields)) {
      const w = FIELD_WEIGHTS[field] || 1;
      toks.forEach(t => {
        if (!t) return;
        tf.set(t, (tf.get(t) || 0) + w);
      });
    }
    return { tf, fieldTokens: fields };
  }

  function buildIndex(data) {
    CORPUS = data;
    INDEX = { df: new Map(), docs: new Map(), N: data.length };
    const seen = new Map(); // token -> Set(docId) เพื่อหา df
    data.forEach((doc) => {
      const { tf, fieldTokens } = explodeTokensForDoc(doc);
      INDEX.docs.set(doc.id, { tf, fieldTokens });
      // เก็บ df
      tf.forEach((_v, token) => {
        if (!seen.has(token)) seen.set(token, new Set());
        seen.get(token).add(doc.id);
      });
    });
    // สรุป df
    seen.forEach((set, token) => INDEX.df.set(token, set.size));
  }

  // ---------- Query expand ----------
  function expandSynonyms(tokens) {
    const bag = new Set(tokens);
    tokens.forEach(t => {
      // แมปกับ key หรือค่าพ้อง
      for (const [k, arr] of Object.entries(SYN)) {
        const tn = normalize(t);
        if (tn.includes(k) || arr.some(a => tn.includes(normalize(a)))) {
          bag.add(k);
          arr.forEach(x => bag.add(x));
        }
      }
    });
    return Array.from(bag).map(normalize);
  }

  // ---------- Scoring (BM25-lite + boosts + fuzzy) ----------
  // idf แบบปลอดภัย: log(1 + N/(1+df))
  const idf = (token) => {
    const df = INDEX.df.get(token) || 0;
    return Math.log(1 + (INDEX.N / (1 + df)));
  };

  function recencyBoost(isoDate) {
    if (!isoDate) return 1.0;
    const now = new Date();
    const then = new Date(isoDate);
    const days = Math.max(0, (now - then) / 86400000); // วันที่ผ่านมา
    // ภายใน 30 วันบูสต์แรง, ค่อย ๆ ลดทอน (half-life ~ 90 วัน)
    const halfLife = 90;
    const factor = Math.pow(0.5, days / halfLife);
    // เพิ่มฐานเล็กน้อยเพื่อไม่ให้เก่าแล้วเป็น 0
    return 1.0 + 0.7 * factor;
  }

  function fuzzyTokenHit(token, hayTokens) {
    // ตรงคำ = จ่าย 1, ใกล้มาก (ระยะ <=1) = 0.6, ระยะ 2 = 0.25, อื่น ๆ = 0
    if (hayTokens.has(token)) return 1.0;
    for (const ht of hayTokens) {
      const ed = editDistance(token, ht);
      if (ed <= 1) return 0.6;
      if (ed === 2) return 0.25;
    }
    return 0;
  }

  function scoreDoc(queryTokens, doc) {
    const meta = INDEX.docs.get(doc.id);
    if (!meta) return 0;
    // รวม token ทั้งเอกสารไว้ตรวจ fuzzy/contain
    const allTokens = new Set([
      ...meta.fieldTokens.title,
      ...meta.fieldTokens.summary,
      ...meta.fieldTokens.tags,
      ...meta.fieldTokens.category
    ]);
    let s = 0;

    // BM25-lite: sum( idf * log(1+tf) * hit )
    for (const qt of queryTokens) {
      const tf = meta.tf.get(qt) || 0;
      const base = idf(qt) * Math.log(1 + (tf || 0) + 1e-9);
      const fuzzy = fuzzyTokenHit(qt, allTokens); // 0..1
      s += base * (0.7 + 0.3 * fuzzy); // ถ้าพิมพ์ผิดก็ยังได้เครดิตบ้าง
    }

    // บูสต์ field presence แบบ “มีคำทั้งหมดอยู่ใน title / tags” ให้แต้มเพิ่ม
    const allInTitle = queryTokens.every(t => meta.fieldTokens.title.includes(t));
    if (allInTitle) s *= 1.35;
    const anyInTags = queryTokens.some(t => meta.fieldTokens.tags.includes(t));
    if (anyInTags) s *= 1.15;

    // บูสต์ความสดใหม่ของข่าว/กิจกรรม
    s *= recencyBoost(doc.date);

    return s;
  }

  // ---------- Highlight ----------
  function highlight(text, queryTokens) {
    const ntext = normalize(text);
    let out = text;
    // สร้างแพทเทิร์นง่าย ๆ จากโทเคนที่ยาว >= 2 ตัวอักษร
    const pats = Array.from(new Set(queryTokens))
      .filter(t => t.length >= 2)
      .sort((a, b) => b.length - a.length); // ยาวก่อน

    pats.forEach(t => {
      const safe = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(${safe})`, "gi");
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  // ---------- Rendering & UX ----------
  function renderResults(container, items, queryTokens) {
    if (!items.length) { container.innerHTML = ""; return; }
    container.innerHTML = items.slice(0, 12).map((it, idx) => `
      <article class="result" data-idx="${idx}">
        <h4>${highlight(it.title, queryTokens)}</h4>
        <p>${highlight(it.summary || "", queryTokens)}</p>
        <div class="meta-line">
          ${it.category ? `<span class="chip">${it.category}</span>` : ""}
          ${it.date ? `<time datetime="${it.date}">${it.date}</time>` : ""}
        </div>
        ${it.href ? `<a href="${it.href}" class="btn-outline">ไปยังหน้า</a>` : ""}
      </article>
    `).join("");

    // โฟกัสแถวแรกสำหรับคีย์บอร์ด
    const first = container.querySelector('.result');
    if (first) first.classList.add('is-active');
  }

  function attachKeyboardNav(inputEl, containerEl, ranked) {
    let idx = 0;
    const rows = () => Array.from(containerEl.querySelectorAll('.result'));
    const activate = (i) => {
      rows().forEach(r => r.classList.remove('is-active'));
      const r = rows()[i];
      if (r) r.classList.add('is-active');
    };
    inputEl.addEventListener('keydown', (e) => {
      const list = rows();
      if (!list.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        idx = (idx + 1) % list.length; activate(idx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx - 1 + list.length) % list.length; activate(idx);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = ranked[idx];
        if (item && item.href) window.location.href = item.href;
      }
    });
  }

  // ---------- Debounce ----------
  const debounce = (fn, ms = 150) => {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  // ---------- Main ----------
  async function initSemanticSearch() {
    const input = document.getElementById('semanticSearchInput');
    const out = document.getElementById('searchResults');
    if (!input || !out) return;

    // โหลดข้อมูล
    let data = [];
    try {
      const r = await fetch('data/content.json', { cache: 'no-store' });
      data = await r.json();
    } catch (e) {
      console.warn('[semantic] load data failed:', e);
    }
    if (!Array.isArray(data)) data = [];
    buildIndex(data);

    const run = debounce(() => {
      const q = input.value || "";
      const nq = normalize(q);
      if (!nq) { out.innerHTML = ""; return; }
      const baseTokens = segTh(nq).filter(Boolean);
      const tokens = expandSynonyms(baseTokens);

      // ให้คะแนน
      const ranked = data
        .map(doc => ({ ...doc, _score: scoreDoc(tokens, doc) }))
        .filter(d => d._score > 0)
        .sort((a, b) => b._score - a._score);

      renderResults(out, ranked, tokens);
      attachKeyboardNav(input, out, ranked);
    }, 180);

    input.addEventListener('input', run);
  }

  document.addEventListener('DOMContentLoaded', initSemanticSearch);
})();
