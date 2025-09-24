// --- Configurable in source ---
const INGREDIENTS = [
  { name: "Vodka", pct: 0, size: 0 },
  { name: "Lime Juice", pct: 0, size: 0 },
  { name: "Triple Sec", pct: 0, size: 0 },
  { name: "Rum", pct: 0, size: 0 },
  { name: "Rum1", pct: 0, size: 0 },
];
const DRINKS_COUNT = 6;

// --- URI parsing ---
function parseURI() {
  const params = new URLSearchParams(window.location.search);
  const disabled = new Set();

  if (params.has('lock')) {
    params.get('lock').split(',').forEach(s => {
      const n = parseInt(s, 10);
      if (n > 0) disabled.add(n);
    });
  }

  INGREDIENTS.forEach((ing, i) => {
    const v = params.get(`i${i + 1}`);
    if (v !== null) ing.pct = Math.min(100, Math.max(0, parseInt(v, 10) || 0));
  });

  return { disabled };
}

// --- Drinks grid ---
function renderDrinks(disabled) {
  const grid = document.getElementById('drinksGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= DRINKS_COUNT; i++) {
    const card = document.createElement('div');
    const isDisabled = disabled.has(i);
    card.className = 'card' + (isDisabled ? ' disabled' : '');

    const img = document.createElement('img');
    img.src = `img/drink${i}.jpg`;
    img.alt = `Drink ${i}`;

    const hook = document.createElement('div');
    hook.className = 'hook ' + (isDisabled ? 'bad' : 'ok');
    hook.textContent = isDisabled ? '✕' : '✓';

    card.appendChild(img);
    card.appendChild(hook);

    if (!isDisabled) {
      card.onclick = () => alert(`Prepare Drink ${i}?`);
    }

    grid.appendChild(card);
  }
}

// --- Status bars ---
function renderStatus() {
  const bars = document.getElementById('statusBars');
  bars.innerHTML = '';
  INGREDIENTS.forEach(ing => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.width = ing.pct + '%';
    fill.textContent = `${ing.name} ${ing.pct}%`;
    bar.appendChild(fill);
    bars.appendChild(bar);
  });
}

// --- Config ---
function renderConfig() {
  const table = document.getElementById('ingredientsConfig');
  table.innerHTML = '';
  INGREDIENTS.forEach((ing, i) => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = ing.name;
    const tdReset = document.createElement('td');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `reset${i}`;
    tdReset.appendChild(cb);
    tr.appendChild(tdName);
    tr.appendChild(tdReset);
    table.appendChild(tr);
  });

  const btn = document.getElementById('btnWrite');
  btn.onclick = () => {
    const pwd = document.getElementById('cfgPassword').value;
    const out = document.getElementById('writeOutput');

    const resets = INGREDIENTS.map((ing, i) => ({
      name: ing.name,
      reset: document.getElementById(`reset${i}`).checked,
      size: ing.size || 0,
      index: i + 1
    }));

    out.textContent =
      'Password: ' + (pwd ? '(provided)' : '(empty)') + '\n' +
      resets.map(r => `${r.name} | reset=${r.reset} | size=${r.size}ml`).join('\n');

    const resetIndices = resets.filter(r => r.reset).map(r => r.index);
    const sizeEntries = resets.filter(r => !r.reset && r.size > 0).map(r => `s${r.index},${r.size}`);

    let nfcPayload = '';
    if (resetIndices.length) nfcPayload += `r=${resetIndices.join(',')}`;
    if (sizeEntries.length) nfcPayload += (nfcPayload ? ' ' : '') + sizeEntries.join(' ');

    out.textContent += '\n📝 NFC string generated:\n' + nfcPayload;

    openNFCModal(nfcPayload, (statusEl, modal) => {
      const ndef = new NDEFWriter();
      ndef.write(nfcPayload)
        .then(() => {
          statusEl.textContent = '✅ NFC write successful!';
          setTimeout(() => modal.remove(), 1500);
        })
        .catch(err => {
          statusEl.textContent = `❌ Error: ${err.message}`;
        });
    });
  };
}

// --- Tabs & sidebar ---
function initUI() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('backdrop');
  const burger = document.getElementById('burger');

  burger.onclick = () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  };
  backdrop.onclick = () => {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
  };

  document.querySelectorAll('.tab-link').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById(btn.dataset.target).classList.add('active');
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    };
  });
}

// --- NFC Modal ---
function openNFCModal(dataString, onWriteNFC) {
  const modal = document.createElement('div');
  modal.className = 'nfc-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Write to NFC</h3>
      <p id="nfcStatus">Checking NFC support...</p>
      <button id="copyFallback">📋 Copy to Clipboard</button>
      <button id="writeNow">Write Now</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.classList.add('show');

  const statusEl = modal.querySelector('#nfcStatus');
  const copyBtn = modal.querySelector('#copyFallback');
  const writeBtn = modal.querySelector('#writeNow');

  if ('NDEFWriter' in window) {
    statusEl.textContent = '📡 Tap "Write Now" and approach the NFC reader...';
    writeBtn.onclick = () => onWriteNFC(statusEl, modal);
  } else {
    statusEl.textContent = '⚠️ Web NFC not supported.\nPlease use NFC Tools app.';
    writeBtn.remove();
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(dataString).then(() => modal.remove());
    };
  }
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  const { disabled } = parseURI();
  renderDrinks(disabled);
  renderStatus();
  renderConfig();
  initUI();

  const testBtn = document.getElementById('btnTestnfc');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      const payload = '<Test>';
      openNFCModal(payload, (statusEl, modal) => {
        const ndef = new NDEFWriter();
        ndef.write(payload)
          .then(() => {
            statusEl.textContent = '✅ NFC write successful!';
            setTimeout(() => modal.remove(), 1500);
          })
          .catch(err => {
            statusEl.textContent = `❌ Error: ${err.message}`;
          });
      });
    });
  }
});
