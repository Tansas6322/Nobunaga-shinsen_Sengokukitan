// 全武将データ
let allBusho = [];

// 所持状況マップ { "織田信長": true, ... }
let ownedMap = {};

let allTactics = [];
let ownedTactics = {};
const OWN_TACTICS_KEY = "nobunagashinsen_owned_tactics";


const OWN_KEY = 'nobunagashinsen_owned_busho';

// 勢力ごとのカード色クラス
const FACTION_CLASS_MAP = {
  '織田': 'faction-oda',
  '豊臣': 'faction-toyotomi',
  '徳川': 'faction-tokugawa',
  '武田': 'faction-takeda',
  '上杉': 'faction-uesugi',
  '群': 'faction-gun',
  // 必要に応じてあとから足せる
};

// 回答者用：編成状態
const formation = {
  main: { busho: '', skills: ['', '', ''] },
  sub1: { busho: '', skills: ['', '', ''] },
  sub2: { busho: '', skills: ['', '', ''] }
};


// ---------- 所持情報の読み書き ----------

function loadOwned() {
  const saved = localStorage.getItem(OWN_KEY);
  if (!saved) {
    ownedMap = {};
    return;
  }
  try {
    ownedMap = JSON.parse(saved) || {};
  } catch (e) {
    console.error('所持データの読み込みに失敗しました', e);
    ownedMap = {};
  }
}

function saveOwned() {
  localStorage.setItem(OWN_KEY, JSON.stringify(ownedMap));
}

function loadOwnedTactics() {
  const saved = localStorage.getItem(OWN_TACTICS_KEY);
  ownedTactics = saved ? JSON.parse(saved) : {};
}

function saveOwnedTactics() {
  localStorage.setItem(OWN_TACTICS_KEY, JSON.stringify(ownedTactics));
}


// ---------- データ読み込み ----------

async function loadBusho() {
  try {
    const res = await fetch('busho.json');
    if (!res.ok) {
      throw new Error('busho.json の読み込みに失敗しました');
    }
    allBusho = await res.json();

    // データから「星」「勢力」の選択肢を作る
    populateFilterOptions(allBusho);

    // フィルタを適用して表示
    applyFiltersAndRender();
  } catch (e) {
    console.error(e);
    const container = document.getElementById('busho-list');
    container.innerHTML = '<div class="empty-message">データの読み込みに失敗しました。</div>';
  }
}

async function loadTactics() {
  try {
    const res = await fetch('tactics.json');
    if (!res.ok) throw new Error("tactics.json の読み込みに失敗");
    allTactics = await res.json();

    // 種類プルダウンをセット
    populateTacticsFilterOptions(allTactics);

    // フィルタ適用して表示
    applyTacticsFiltersAndRender();
  } catch (e) {
    console.error("戦法読み込みエラー", e);
  }
}


// ---------- フィルタ用選択肢の生成 ----------

function populateFilterOptions(list) {
  const starSelect = document.getElementById('filter-star');
  const factionSelect = document.getElementById('filter-faction');

  // 既存を一旦消す（先頭の「すべて」は残す）
  starSelect.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());
  factionSelect.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());

  const starSet = new Set();
  const factionSet = new Set();

  list.forEach(b => {
    if (b['星'] != null && b['星'] !== '') {
      starSet.add(String(b['星']));
    }
    if (b['勢力'] != null && b['勢力'] !== '') {
      factionSet.add(String(b['勢力']));
    }
  });

  Array.from(starSet).sort((a, b) => Number(a) - Number(b)).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    starSelect.appendChild(opt);
  });

  Array.from(factionSet).sort().forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    factionSelect.appendChild(opt);
  });
}

function populateTacticsFilterOptions(list) {
  const typeSelect = document.getElementById('tactics-filter-type');
  if (!typeSelect) return;

  // 先頭の「すべて」以外を削除
  typeSelect.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());

  const typeSet = new Set();

  list.forEach(t => {
    const type = (t['種類'] || '').toString().trim();
    if (type) typeSet.add(type);
  });

  Array.from(typeSet)
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      typeSelect.appendChild(opt);
    });
}


// ---------- 一覧描画 ----------

function renderBushoList(list) {
  const container = document.getElementById('busho-list');
  container.innerHTML = '';

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="empty-message">該当する武将がいません。</div>';
    return;
  }

  list.forEach(b => {
    const card = document.createElement('div');

    const name = b['武将名'] || '不明';
    const seiryoku = b['勢力'] || '-';
    const kamon = b['家門'] || '-';
    const hoshi = b['星'] ?? '-';
    const cost = b['コスト'] ?? '-';

    const buyu = b['武勇'] ?? '-';
    const chiryaku = b['知略'] ?? '-';
    const tosu = b['統率'] ?? '-';
    const sokudo = b['速度'] ?? '-';
    const miryoku = b['魅力'] ?? '-';

    const owned = !!ownedMap[name];
    
// 画像フィールドが無い場合はプレースホルダー
const imgSrc = b["画像"]
  ? `images/busho/${b["画像"]}`
  : 'images/placeholder.png';
  
  // ★ 勢力に応じたクラス名
const factionClass = FACTION_CLASS_MAP[seiryoku] || '';

card.className = 'busho-card ' + factionClass + (owned ? ' owned' : '');
    card.dataset.name = name; // カードに武将名を紐づけ

card.innerHTML = `
  <div class="busho-card-main">
    <div class="busho-image-wrap">
      <img src="${imgSrc}" alt="${name}" class="busho-image">
    </div>
    <div class="busho-info">
      <div class="busho-name">${name}</div>
<div class="busho-meta">
  勢力：${seiryoku} / 家門：${kamon} / 星：${hoshi} / コスト：${cost}
</div>
      <div class="busho-stats">
        武勇：${buyu}　知略：${chiryaku}　統率：${tosu}　速度：${sokudo}　魅力：${miryoku}
      </div>
      <div class="busho-own-status">
        ${owned ? '所持中' : '未所持'}
      </div>
    </div>
  </div>
`;
card.draggable = true;
card.dataset.type = 'busho';



    container.appendChild(card);
  });
}

function renderTacticsList(list) {
  const container = document.getElementById('tactics-list');
  container.innerHTML = '';

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="empty-message">該当する戦法がありません。</div>';
    return;
  }

  list.forEach(t => {
    const name = t['戦法名'] || '不明';
    const type = t['種類'] || '-';
    const owner = t['所有者'] || '-';
    const d1 = t['伝承者1'] || '';
    const d2 = t['伝承者2'] || '';
    const chance = t['発動確率'] != null ? t['発動確率'] : '-';
    const effect = (t['戦法内容'] || '').toString();
    const hasTaishogi =
      t['大将技'] != null && t['大将技'].toString().trim() !== '';

    const owned = !!ownedTactics[name];
    
    const imgSrc = t["画像"]
  ? `images/tactics/${t["画像"]}`
  : 'images/placeholder.png';


    // 種類ごとにクラスを付けて色分け
    let typeClass = '';
    switch (type) {
      case '能動':
        typeClass = 'type-active';
        break;
      case '指揮':
        typeClass = 'type-command';
        break;
      case '突撃':
        typeClass = 'type-charge';
        break;
      case '受動':
        typeClass = 'type-passive';
        break;
      case '兵種':
        typeClass = 'type-arms';
        break;
      default:
        typeClass = '';
    }

    const card = document.createElement('div');
    card.className =
      'busho-card tactic-card ' + typeClass + (owned ? ' owned' : '');
    card.dataset.name = name;

    // 伝承者の表示
    let inheritText = '';
    if (d1 || d2) {
      const arr = [];
      if (d1) arr.push(d1);
      if (d2) arr.push(d2);
      inheritText = `伝承者：${arr.join(' / ')}`;
    }

// 戦法内容は長いので少しだけ表示（50文字に拡張）
const shortEffect =
  effect.length > 50 ? effect.slice(0, 50) + '…' : effect;

card.innerHTML = `
  <div class="tactic-card-main">
    <div class="tactic-image-wrap">
      <img src="${imgSrc}" alt="${name}" class="tactic-image">
    </div>
    <div class="tactic-info">
      <div class="busho-name">${name}</div>
      <div class="busho-meta">
        種類：${type} ／ 発動確率：${chance}
        ${hasTaishogi ? ' ／ <span class="tactics-taishogi">大将技あり</span>' : ''}
      </div>
      <div class="tactics-owners">
        所有者：${owner || '-'}${inheritText ? ' ／ ' + inheritText : ''}
      </div>
      <div class="tactics-effect">
        ${shortEffect || ''}
      </div>
      <div class="busho-own-status">
        ${owned ? '所持中' : '未所持'}
      </div>
    </div>
  </div>
`;
card.draggable = true;
card.dataset.type = 'tactic';


// ★ 追加：ホバーで全文が読めるように title を付与
// ツールチップ用の全文テキストを作る
let tooltip = effect || '';

const taishogi = (t['大将技'] || '').toString().trim();
if (taishogi) {
  // 戦法内容の下に大将技を追記
  tooltip += '\n\n【大将技】\n' + taishogi;
}

// ホバー時に「戦法内容＋大将技」が表示される
card.title = tooltip;


    container.appendChild(card);
  });
}


// ---------- 検索 + フィルタ適用 ----------

function applyFiltersAndRender() {
  const searchInput = document.getElementById('search-input');
  const starSelect = document.getElementById('filter-star');
  const factionSelect = document.getElementById('filter-faction');
  const ownedCheckbox = document.getElementById('filter-owned');

  const keyword = (searchInput?.value || '').trim();
  const lower = keyword.toLowerCase();
  const starValue = starSelect?.value || '';
  const factionValue = factionSelect?.value || '';
  const ownedOnly = ownedCheckbox?.checked || false;

  const filtered = allBusho.filter(b => {
    const name = (b['武将名'] || '').toString();
    const seiryoku = (b['勢力'] || '').toString();
    const star = b['星'] != null ? String(b['星']) : '';

    // キーワード（名前 or 勢力）
    if (keyword) {
      const nameLower = name.toLowerCase();
      const seiryokuLower = seiryoku.toLowerCase();
      if (
        !name.includes(keyword) &&
        !seiryoku.includes(keyword) &&
        !nameLower.includes(lower) &&
        !seiryokuLower.includes(lower)
      ) {
        return false;
      }
    }

    // 星フィルタ
    if (starValue && star !== starValue) {
      return false;
    }

    // 勢力フィルタ
    if (factionValue && seiryoku !== factionValue) {
      return false;
    }

    // 所持のみ
    if (ownedOnly) {
      if (!ownedMap[name]) {
        return false;
      }
    }

    return true;
  });

  renderBushoList(filtered);
}

function applyTacticsFiltersAndRender() {
  const searchInput = document.getElementById('tactics-search-input');
  const typeSelect = document.getElementById('tactics-filter-type');
  const kindSelect = document.getElementById('tactics-filter-kind');  // ★追加
  const ownedCheckbox = document.getElementById('tactics-filter-owned');

  const keyword = (searchInput?.value || '').trim();
  const lower = keyword.toLowerCase();
  const typeValue = typeSelect?.value || '';
  const kindValue = kindSelect?.value || '';          // ★追加
  const ownedOnly = ownedCheckbox?.checked || false;

  const filtered = allTactics.filter(t => {
    const name = (t['戦法名'] || '').toString();
    const owner = (t['所有者'] || '').toString();
    const d1 = (t['伝承者1'] || '').toString();
    const d2 = (t['伝承者2'] || '').toString();
    const type = (t['種類'] || '').toString();

    // キーワード（戦法名 / 所有者 / 伝承者）
    if (keyword) {
      const fields = [name, owner, d1, d2];
      const ok = fields.some(f => {
        const fl = f.toLowerCase();
        return f.includes(keyword) || fl.includes(lower);
      });
      if (!ok) return false;
    }

    // 種類フィルタ
    if (typeValue && type !== typeValue) {
      return false;
    }

    // ★区分フィルタ（固有戦法／伝承戦法）
    const hasOwner = !!owner;           // 所有者あり
    const hasInheritor = !!(d1 || d2);  // 伝承者1か2がいる

    if (kindValue === 'owner' && !hasOwner) {
      return false;
    }
    if (kindValue === 'inherit' && !hasInheritor) {
      return false;
    }

    // 所持のみ
    if (ownedOnly) {
      if (!ownedTactics[name]) {
        return false;
      }
    }

    return true;
  });

  renderTacticsList(filtered);
}


// ---------- イベント設定 ----------

function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    applyFiltersAndRender();
  });
}

function setupFilters() {
  const starSelect = document.getElementById('filter-star');
  const factionSelect = document.getElementById('filter-faction');
  const ownedCheckbox = document.getElementById('filter-owned');

  if (starSelect) {
    starSelect.addEventListener('change', applyFiltersAndRender);
  }
  if (factionSelect) {
    factionSelect.addEventListener('change', applyFiltersAndRender);
  }
  if (ownedCheckbox) {
    ownedCheckbox.addEventListener('change', applyFiltersAndRender);
  }
}

function setupTacticsSearchAndFilters() {
  const searchInput = document.getElementById('tactics-search-input');
  const typeSelect = document.getElementById('tactics-filter-type');
  const kindSelect = document.getElementById('tactics-filter-kind');   // ★追加
  const ownedCheckbox = document.getElementById('tactics-filter-owned');

  if (searchInput) {
    searchInput.addEventListener('input', applyTacticsFiltersAndRender);
  }
  if (typeSelect) {
    typeSelect.addEventListener('change', applyTacticsFiltersAndRender);
  }
  if (kindSelect) {                                                    // ★追加
    kindSelect.addEventListener('change', applyTacticsFiltersAndRender);
  }
  if (ownedCheckbox) {
    ownedCheckbox.addEventListener('change', applyTacticsFiltersAndRender);
  }
}


// カードクリックで所持切り替え
function setupCardClickHandler() {
  const container = document.getElementById('busho-list');
  container.addEventListener('click', (e) => {
    const card = e.target.closest('.busho-card');
    if (!card) return;

    const name = card.dataset.name;
    if (!name) return;

    const newValue = !ownedMap[name];
    ownedMap[name] = newValue;
    saveOwned();

    // 見た目を更新
    card.classList.toggle('owned', newValue);
    const statusEl = card.querySelector('.busho-own-status');
    if (statusEl) {
      statusEl.textContent = newValue ? '所持中' : '未所持';
    } else {
      // クラス名ミス防止で念のため
      const statusEl2 = card.querySelector('.busho-own-status');
      if (statusEl2) {
        statusEl2.textContent = newValue ? '所持中' : '未所持';
      }
    }

    // 「所持している武将のみ表示」が ON のときは再フィルタ
    const ownedCheckbox = document.getElementById('filter-owned');
    if (ownedCheckbox && ownedCheckbox.checked) {
      applyFiltersAndRender();
    }
  });
}

function setupTacticsClick() {
  const container = document.getElementById('tactics-list');
  container.addEventListener('click', (e) => {
    const card = e.target.closest('.busho-card');
    if (!card) return;

    const name = card.dataset.name;
    const newValue = !ownedTactics[name];
    ownedTactics[name] = newValue;
    saveOwnedTactics();

    // 見た目反映
    card.classList.toggle('owned', newValue);
    const s = card.querySelector('.busho-own-status');
    if (s) s.textContent = newValue ? '所持中' : '未所持';
  });
}


// ---------- 所持武将リストのテキスト生成 ----------

function generateOwnedText() {
  const textarea = document.getElementById('owned-text');
  if (!textarea) return;

  // 所持中の武将だけ抽出
  const ownedBusho = allBusho.filter(b => {
    const name = (b['武将名'] || '').toString();
    return ownedMap[name];
  });

  if (ownedBusho.length === 0) {
    textarea.value = '（所持している武将が登録されていません）';
    return;
  }

  // 並び順：星の大きい順 → 勢力 → 名前
  const sorted = [...ownedBusho].sort((a, b) => {
    const starA = Number(a['星'] || 0);
    const starB = Number(b['星'] || 0);
    if (starA !== starB) return starB - starA;

    const fA = (a['勢力'] || '').toString();
    const fB = (b['勢力'] || '').toString();
    if (fA !== fB) return fA.localeCompare(fB, 'ja');

    const nA = (a['武将名'] || '').toString();
    const nB = (b['武将名'] || '').toString();
    return nA.localeCompare(nB, 'ja');
  });

  const lines = [];
  lines.push('【信長の野望 真戦 所持武将リスト】');
  lines.push('');

  sorted.forEach(b => {
    const name = (b['武将名'] || '').toString();
    const star = b['星'] != null ? `星${b['星']}` : '';
    const faction = (b['勢力'] || '').toString();
    const cost = b['コスト'] != null ? `コスト:${b['コスト']}` : '';

    // 「・織田信長（星5／勢力: 織田／コスト:4）」みたいな形にする
    const infoParts = [];
    if (star) infoParts.push(star);
    if (faction) infoParts.push(`勢力:${faction}`);
    if (cost) infoParts.push(cost);

    const infoText = infoParts.length > 0 ? `（${infoParts.join('／')}）` : '';

    lines.push(`・${name}${infoText}`);
  });

  textarea.value = lines.join('\n');
}

function copyOwnedTextToClipboard() {
  const textarea = document.getElementById('owned-text');
  if (!textarea) return;

  const text = textarea.value;
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert('所持武将リストをコピーしました。ChatGPT に貼り付けて使ってください。');
    }).catch(err => {
      console.error('クリップボードへのコピーに失敗:', err);
      // 失敗時は選択させる
      textarea.select();
      document.execCommand('copy');
      alert('所持武将リストをコピーしました。ChatGPT に貼り付けて使ってください。');
    });
  } else {
    // 古いブラウザ用フォールバック
    textarea.select();
    document.execCommand('copy');
    alert('所持武将リストをコピーしました。ChatGPT に貼り付けて使ってください。');
  }
}

// ---------- 共有リンク用：現在の選択状態をまとめる ----------

function getCurrentSelectionState() {
  // 所持中の武将名
  const bushoOwned = Object.entries(ownedMap || {})
    .filter(([, v]) => v)
    .map(([name]) => name);

  // 所持中の戦法名
  const tacticsOwned = Object.entries(ownedTactics || {})
    .filter(([, v]) => v)
    .map(([name]) => name);

  // コメント
  const commentInput = document.getElementById('comment-text');
  const comment = commentInput ? commentInput.value : '';

  // b: 武将, t: 戦法, c: コメント
  return { b: bushoOwned, t: tacticsOwned, c: comment };
}

// 日本語を含む文字列を Base64 にエンコード
function encodeBase64Unicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// Base64 から日本語文字列へデコード
function decodeBase64Unicode(str) {
  return decodeURIComponent(escape(atob(str)));
}

// ---------- 共有リンクを作成してコピー ----------

function createAndCopyShareLink() {
  const input = document.getElementById('share-link');
  if (!input) return;

  const state = getCurrentSelectionState();
  const json = JSON.stringify(state);

  // 状態を Base64 でエンコードして URL の #s= に詰める
  const encoded = encodeBase64Unicode(json);
  const baseUrl = `${location.origin}${location.pathname}`;
  const url = `${baseUrl}#s=${encoded}`;

  // テキストボックスにも表示しておく（確認用）
  input.value = url;

  // クリップボードにコピー
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      alert('共有リンクをコピーしました。\nLINEやDiscordに貼り付けて回答者に送ってください。');
    }).catch(err => {
      console.error('共有リンクのコピーに失敗:', err);
      input.select();
      document.execCommand('copy');
      alert('共有リンクをコピーしました。\nLINEやDiscordに貼り付けて回答者に送ってください。');
    });
  } else {
    // 古いブラウザ用フォールバック
    input.select();
    document.execCommand('copy');
    alert('共有リンクをコピーしました。\nLINEやDiscordに貼り付けて回答者に送ってください。');
  }
}

// ボタンにイベントを付ける
function setupShareLinkButton() {
  const btn = document.getElementById('share-link-button');
  if (!btn) return;

  btn.addEventListener('click', () => {
    createAndCopyShareLink();
  });
}


function setupExportButtons() {
  const genBtn = document.getElementById('generate-owned-text');
  const copyBtn = document.getElementById('copy-owned-text');

  if (genBtn) {
    genBtn.addEventListener('click', () => {
      generateOwnedText();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyOwnedTextToClipboard();
    });
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // ボタンの active
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // コンテンツの active
      const target = tab.dataset.tab;
      contents.forEach(c => {
        if (c.id === target) c.classList.add('active');
        else c.classList.remove('active');
      });
    });
  });
}

// ---------- URL共有：ハッシュ(#s=...)から状態を復元 ----------

function applySharedStateFromUrl() {
  const hash = location.hash || '';
  if (!hash.startsWith('#s=')) {
    return;
  }
  const encoded = hash.slice(3);
  try {
    const json = decodeBase64Unicode(encoded);
    const state = JSON.parse(json);

    // いったんクリアしてからURLの状態を反映
    ownedMap = {};
    ownedTactics = {};

    (state.b || []).forEach(name => {
      ownedMap[name] = true;
    });
    (state.t || []).forEach(name => {
      ownedTactics[name] = true;
    });
    
    // コメント（あれば）
    const commentInput = document.getElementById('comment-text');
    if (commentInput && typeof state.c === 'string') {
      commentInput.value = state.c;
    }


    // ローカルにも保存しておく（回答者側のlocalStorageにも入る）
    saveOwned();
    saveOwnedTactics();
  } catch (e) {
    console.error('共有リンクの解析に失敗しました', e);
  }
}

function setupDragAndDrop() {
  // カード側：ドラッグ開始
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.busho-card');
    if (!card) return;

    const type = card.dataset.type || (card.classList.contains('tactic-card') ? 'tactic' : 'busho');
    const name = card.dataset.name;
    if (!name) return;

    e.dataTransfer.setData('text/plain', JSON.stringify({ type, name }));
  });

  // スロット側：ドラッグ受け取り
  document.querySelectorAll('.builder-drop').forEach(slot => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');

      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;

      let data;
      try {
        data = JSON.parse(dataStr);
      } catch {
        return;
      }

      const accept = slot.dataset.accept; // "busho" or "tactic"
      if (data.type !== accept) {
        return; // 種類が違うものは無視
      }

      const role = slot.dataset.role; // "main" | "sub1" | "sub2"
      const skillIndex = slot.dataset.skillIndex; // 0,1,2 or undefined

      const name = data.name;
      slot.textContent = name;

      if (!formation[role]) return;

      if (accept === 'busho') {
        // 武将をスロットにセット
        formation[role].busho = name;

        // ★ ここから：固有戦法を自動で固有スロットに入れる
        const busho = allBusho.find(b => b['武将名'] === name);
        if (busho && busho['固有戦法']) {
          const uniqueName = busho['固有戦法'];

          // 編成データに反映（skills[0]を「固有」として使う）
          formation[role].skills[0] = uniqueName;

          // 画面上の「固有：～」スロットの表示も更新
          const uniqueSlot = document.querySelector(
            `.builder-drop.slot-skill[data-role="${role}"][data-skill-index="0"]`
          );
          if (uniqueSlot) {
            uniqueSlot.textContent = uniqueName;
          }
        }
        // ★ ここまで追加
      } else {
        // 戦法（固有/伝承）をドロップしたとき
        const idx = Number(skillIndex);
        formation[role].skills[idx] = name || '';
      }
    });
  });
}

function setupBuilderExport() {
  const btn = document.getElementById('builder-copy');
  const area = document.getElementById('builder-text');
  if (!btn || !area) return;

  btn.addEventListener('click', () => {
    const lines = [];
    lines.push('【編成案】', '');

    const pushRole = (label, key) => {
      const r = formation[key];
      lines.push(`${label}：${r.busho || '-'}`);
      lines.push(` 固有：${r.skills[0] || '-'}`);
      lines.push(` 伝承：${r.skills[1] || '-'}`);
      lines.push(` 伝承：${r.skills[2] || '-'}`);
      lines.push('');
    };

    pushRole('主将', 'main');
    pushRole('副将1', 'sub1');
    pushRole('副将2', 'sub2');

    const text = lines.join('\n');
    area.value = text;
    area.select();
    document.execCommand('copy');

    alert('編成案をコピーしました');
  });
}

function setupBuilderToggle() {
  const area = document.querySelector('.build-answer-area');
  const btn = document.getElementById('builder-toggle');
  if (!area || !btn) return;

  btn.addEventListener('click', () => {
    const collapsed = area.classList.toggle('collapsed');
    // ボタンの表示切り替え（お好みで）
    btn.textContent = collapsed ? '▲' : '▼';
  });
}


// ---------- 初期化 ----------

window.addEventListener('DOMContentLoaded', () => {
  // まず localStorage から読み込み
  loadOwned();
  loadOwnedTactics();

  // もし共有リンク(#s=...)で開かれていたら、そちらの状態で上書き
  applySharedStateFromUrl();

  // 画面のイベント設定など
  setupSearch();
  setupFilters();
  setupCardClickHandler();
  setupExportButtons();
  setupShareLinkButton();
  loadBusho();
  setupTabs();

  setupTacticsClick();
  setupTacticsSearchAndFilters();
  loadTactics();
    setupDragAndDrop();
  setupBuilderExport();
    // ★ 折りたたみボタン
  setupBuilderToggle();
});
