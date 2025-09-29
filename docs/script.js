
  const MIN = -20, MAX = 50, MID = 15;
  const labels = ['Living Room', 'Kitchen', 'Bedroom', 'Office', 'Garage', 'Basement'];

  // Sidebar toggle
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Page switching
  function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
  }

  function createGauge(temp, label) {
    const arcPath = "M 43.431,156.569 A 80 80 0 1 1 156.569,156.569";
    const dummy = document.createElementNS("http://www.w3.org/2000/svg", "path");
    dummy.setAttribute("d", arcPath);
    const arcLength = dummy.getTotalLength();
    const offset = Number.isFinite(temp) ? arcLength * (1 - (temp - MIN) / (MAX - MIN)) : arcLength;
    const color = colorForTemp(temp);
    const tempVal = Number.isFinite(temp) ? `${temp}°C` : '--';

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="gauge-label">${label}</div>
      <svg class="circle-bar" viewBox="0 0 200 200" style="width: 100%; max-width: 200px; height: auto;">
        <path class="track" d="${arcPath}" stroke-width="15" />
        <path class="progress" d="${arcPath}" stroke="${color}" stroke-width="15"
          stroke-dasharray="${arcLength}" stroke-dashoffset="${offset}" />
        <text class="tempValue" x="100" y="100" fill="${color}">${tempVal}</text>
      </svg>
    `;
    return wrapper;
  }

//second try of dynamic button handling
function generatePayload(type, values) {
  switch (type) {
    case 'TEMP':
      return '<TEMP>' + values.map(v => {
        const clamped = Math.max(-20, Math.min(50, v));
        const mapped = Math.round((clamped + 20) * 255 / 70);
        return mapped.toString(16).padStart(2, '0').toUpperCase();
      }).join('');
    case 'COL':
      const [r, g, b] = values;
      return `<COL>${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    default:
      return '<DATA>' + values.join('');
  }
}

//helper function for dynamic nfc write
function setupDynamicNFCButton2(buttonId, getPayloadFn) {
  const button = document.getElementById(buttonId);
  if (!button) {
    console.error(`Button with ID "${buttonId}" not found.`);
    return;
  }

  const modal = document.getElementById('nfcModal');
  const message = document.getElementById('nfcMessage');
  const copyBtn = document.getElementById('copyFallbackBtn');

  button.addEventListener('click', async () => {
    console.log("copyBtn:", copyBtn);
    const payload = getPayloadFn();
    modal.classList.remove('hidden');
    copyBtn.classList.add('hidden');
    message.textContent = '📶 Hold your phone near the NFC tag... 📶';

    if ('NDEFReader' in window) {
      try {
        const ndef = new NDEFReader();
        await ndef.write({ records: [{ recordType: "text", data: payload }] });
        message.textContent = '✅ NFC write successful!';
        showSuccessAndClose(button, '✅ NFC write success');
      } catch (err) {
        console.error(err);
        message.textContent = '❌ NFC write failed. Try again or use fallback.';
        copyBtn.classList.remove('hidden');
        showSuccessAndClose(button, '❌ Write failed');
      }
    } else {
      message.textContent = '⚠️ Web NFC not supported. Use the NFC-Tools app to manually create a Text Recorcd with the clipboard data';
      copyBtn.classList.remove('hidden');
    }

    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(payload);
        message.textContent = '✅ Copied to clipboard. Paste into NFC Tools.';
        copyBtn.classList.add('hidden');
        showSuccessAndClose(button, '✅ Copied');
      } catch (err) {
        console.error(err);
        message.textContent = '❌ Failed to copy. Please copy manually.';
        showSuccessAndClose(button, '❌ Copy failed');
      }
    };
  });
}

function showSuccessAndClose(button, successText = '✅ Success', restoreText = 'Write to NFC', delay = 1000) {
  const originalContent = button.innerHTML || button.textContent;

  button.disabled = true;
  // Don't change button content here

  setTimeout(() => {
    // Restore original content and enable button
    if (button.innerHTML !== undefined) {
      button.innerHTML = originalContent;
    } else {
      button.textContent = originalContent;
    }
    button.disabled = false;

    const modal = document.getElementById('nfcModal');
    if (modal) modal.classList.add('hidden');
  }, delay);
}

const availabilityMask = new URLSearchParams(window.location.search).get('d') || '00';
const activeBits = parseInt(availabilityMask, 16);

function isButtonActive(index) {
  return (activeBits & (1 << index)) !== 0;
}

function generatePayload(type, values) {
  switch (type) {
    case 'TEMP':
      return '<TEMP>' + values.map(v => {
        const clamped = Math.max(-20, Math.min(50, v));
        const mapped = Math.round((clamped + 20) * 255 / 70);
        return mapped.toString(16).padStart(2, '0').toUpperCase();
      }).join('');
    default:
      return '<DATA>' + values.join('');
  }
}

//?active=FF
function setupMultipleNFCButtons(containerId, buttonsData) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found.`);
    return;
  }

  // Clear any existing buttons
  container.innerHTML = '';

  // Parse the active bitmask from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const activeHex = urlParams.get('active') || '0';
  const activeMask = parseInt(activeHex, 16); // Convert hex string to integer

  buttonsData.forEach((buttonData, index) => {
    const { id, imageUrl, payload } = buttonData;

    // Create button
    const button = document.createElement('div');
    button.classList.add('nfc-button');
    button.id = `nfc-btn-${id}`;

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('nfc-button-content');

    // Image
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Button ${index + 1}`;

    // Status icon
    const status = document.createElement('div');
    status.className = 'status-icon';

    // Determine if this button is active using bitmask
    const isActive = (activeMask & (1 << (id - 1))) !== 0;
    status.textContent = isActive ? '✅' : '❌';

    // Index badge
    const indexBadge = document.createElement('div');
    indexBadge.className = 'index-badge';
    indexBadge.textContent = index + 1;

    // Append everything
    contentWrapper.appendChild(img);
    contentWrapper.appendChild(status);
    contentWrapper.appendChild(indexBadge);
    button.appendChild(contentWrapper);
    container.appendChild(button);

    // Setup NFC if active
    if (isActive) {
      button.classList.add('active');
      button.style.cursor = 'pointer';
      setupDynamicNFCButton2(button.id, () => payload);
    }
  });
}



//setup stuff
document.addEventListener('DOMContentLoaded', () => {
  //setupDynamicNFCButton2('test3Btn', () => {
  //  const temps = [22, 18, 25, 30, 15, 10];
  //  return generatePayload('TEMP', temps);
  //});
});

document.addEventListener('DOMContentLoaded', () => {
  setupMultipleNFCButtons('buttonContainer', buttonsData);
});


const buttonsData = [
  {
    id: "1",
    imageUrl: "img/drink1.png",
    payload: "Drink: Mojito",
  },
  {
    id: "2",
    imageUrl: "img/drink2.png",
    payload: "Drink: Martini",
  },
  {
    id: "3",
    imageUrl: "img/drink3.png",
    payload: "Drink: Negroni",
  },
  {
    id: "4",
    imageUrl: "img/drink4.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "5",
    imageUrl: "img/drink5.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "6",
    imageUrl: "img/drink6.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "7",
    imageUrl: "img/drink7.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "8",
    imageUrl: "img/drink8.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "9",
    imageUrl: "img/drink9.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "10",
    imageUrl: "img/drink10.png",
    payload: "Drink: Daiquiri",
  },  {
    id: "11",
    imageUrl: "img/drink11.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "12",
    imageUrl: "img/drink12.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "13",
    imageUrl: "img/drink13.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "14",
    imageUrl: "img/drink14.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "15",
    imageUrl: "img/drink15.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "16",
    imageUrl: "img/drink16.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "17",
    imageUrl: "img/drink17.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "18",
    imageUrl: "img/drink18.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "19",
    imageUrl: "img/drink19.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "20",
    imageUrl: "img/drink20.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "21",
    imageUrl: "img/drink21.png",
    payload: "Drink: Daiquiri",
  },
    {
    id: "22",
    imageUrl: "img/drink22.png",
    payload: "Drink: Daiquiri",
  }
];




