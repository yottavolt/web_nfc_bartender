//planned for 16 pump channels / ingredients (theroreticly also 255 but only 4 dispensing at a time)
//that can result with up to 255 configurable drinks

//current design:
//16pump channels
//24 drinks

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

// Helper to check if user is on iOS
function isIOS() {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

//helper function for dynamic nfc write
function setupDynamicNFCButton2(buttonId, getPayloadFn, text) {
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
    
    // Reset click handlers and properties on action button
    copyBtn.onclick = null;
    copyBtn.removeAttribute('href');
    copyBtn.removeAttribute('target');

    // MODE 1: Web NFC Available
    if ('NDEFReader' in window) {
      message.textContent = '📶 Hold your phone near the NFC tag... 📶\n\n' + text;
      message.style.whiteSpace = 'pre-line';

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

    // MODE 2: iOS Detected -> Deep Link to NFC Helper app
    } else if (isIOS()) {
      message.textContent = '📱 Tap "Write to Tag" to launch NFC Helper on iOS.\n\n' + text;
      message.style.whiteSpace = 'pre-line';
      
      copyBtn.textContent = '📱 Write to Tag';
      copyBtn.classList.remove('hidden');

      copyBtn.onclick = () => {
        const deepLink = `nfchelper://write?payload=${encodeURIComponent(payload)}`;
        window.location.href = deepLink;
        showSuccessAndClose(button, '✅ Opened App');
      };

    // MODE 3: All other browsers/platforms -> Fallback to Clipboard
    } else {
      message.textContent = '⚠️ Web NFC not supported.\nUse NFC Tools or copy data to clipboard.\n\n' + text;
      message.style.whiteSpace = 'pre-line';
      
      copyBtn.textContent = '📋 Copy to Clipboard';
      copyBtn.classList.remove('hidden');

      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(payload);
          message.textContent = '✅ Copied to clipboard. Paste into your NFC App.';
          copyBtn.classList.add('hidden');
          showSuccessAndClose(button, '✅ Copied');
        } catch (err) {
          console.error(err);
          message.textContent = '❌ Failed to copy. Please copy manually.';
          showSuccessAndClose(button, '❌ Copy failed');
        }
      };
    }
  });
}

function showSuccessAndClose(button, successText = '✅ Success', restoreText = 'Write to NFC', delay = 1000) {
  const originalContent = button.innerHTML || button.textContent;

  button.disabled = true;

  setTimeout(() => {
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

const urlParams = new URLSearchParams(window.location.search);
const availabilityMask = urlParams.get('d');
const activeBits = availabilityMask ? parseInt(availabilityMask, 16) : null;

function isButtonActive(index) {
  if (activeBits === null) return true;
  return (activeBits & (1 << index)) !== 0;
}

//function for providing labelling inside the nfc button  //?active=FF
function setupMultipleNFCButtonswithName(containerId, buttonsData) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with ID "${containerId}" not found.`);
    return;
  }

  container.innerHTML = '';

  const urlParams = new URLSearchParams(window.location.search);
  const hasActiveParam = urlParams.has('active');
  const activeHex = urlParams.get('active') || '0';
  const activeMask = parseInt(activeHex, 16);

  buttonsData.forEach((buttonData, index) => {
    const { id, imageUrl, payload, name } = buttonData;

    // Outer button container
    const button = document.createElement('div');
    button.classList.add('nfc-button');
    button.id = `nfc-btn-${id}`;
    button.style.position = 'relative';
    button.style.display = 'inline-block';

    // Image
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Button ${index + 1}`;
    img.style.display = 'block';
    img.style.width = '100%';
    img.style.height = 'auto';

    // Optional cocktail name overlay
    if (name) {
      const nameOverlay = document.createElement('div');
      nameOverlay.textContent = name;
      Object.assign(nameOverlay.style, {
        position: 'absolute',
        top: '1px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color:  'rgba(255, 247, 232, 0.6)',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '0.9em',
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: '10',
        whiteSpace: 'nowrap'
      });
      button.appendChild(nameOverlay);
    }

    // Active status: Active by default unless ?active= parameter is passed in URL
    const isActive = !hasActiveParam || (activeMask & (1 << (id - 1))) !== 0;

    // Status icon
    const status = document.createElement('div');
    status.className = 'status-icon';
    status.textContent = isActive ? '✅' : '❌';

    // Index badge (fixed styling + absolute position)
    const indexBadge = document.createElement('div');
    indexBadge.className = 'index-badge';
    indexBadge.textContent = index + 1;
    Object.assign(indexBadge.style, {
      position: 'absolute',
      bottom: '5px',
      right: '5px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.8em',
      fontWeight: 'bold',
      zIndex: '10'
    });

    // Content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('nfc-button-content');
    contentWrapper.appendChild(img);
    contentWrapper.appendChild(status);
    contentWrapper.appendChild(indexBadge);

    button.appendChild(contentWrapper);
    container.appendChild(button);

    if (isActive) {
      button.classList.add('active');
      button.style.cursor = 'pointer';
      setupDynamicNFCButton2(button.id, () => payload, buttonsData[index].comment);
    }
  });
}

// Parse hex string from query like ?level=FF00
function getHexLevels() {
  const urlParams = new URLSearchParams(window.location.search);
  const hexString = urlParams.get('level') || '';
  return hexString.split('').map(char => {
    const val = parseInt(char, 16);
    return isNaN(val) ? 0 : Math.max(0, Math.min(val, 15)); // Clamp between 0–15
  });
}

// Create loading bars
function setupLoadingBars(ingredients) {
  const container = document.getElementById('loading-container');
  if (!container) return;

  const levels = getHexLevels();

  ingredients.forEach((ingredient, index) => {
    const level = levels[index] ?? 0;
    const percent = Math.round((level / 15) * 100);

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'bar-wrapper';

    // Bar container
    const barContainer = document.createElement('div');
    barContainer.className = 'bar-container';

    // Fill bar (no text inside)
    const fillBar = document.createElement('div');
    fillBar.className = 'fill-bar';
    fillBar.style.width = `${percent}%`;

    // Label (centered, black text)
    const label = document.createElement('div');
    label.className = 'bar-label';
    label.textContent = `${ingredient.ingredientName} (${percent}%)`;

    // Reset checkbox (no logic)
    const resetBox = document.createElement('input');
    resetBox.type = 'checkbox';
    resetBox.className = 'reset-checkbox';
    resetBox.setAttribute('data-id', ingredient.id);
    resetBox.title = 'Reset';

    // Assemble
    barContainer.appendChild(fillBar);
    barContainer.appendChild(label);
    wrapper.appendChild(barContainer);
    wrapper.appendChild(resetBox);
    container.appendChild(wrapper);
  });
}

function generateInitPayload() {
  let dataString = "<INIT><";
  const pw = document.getElementById('userPassword');
  dataString += pw ? pw.value : '';
  dataString += "></>";
  
  for (let i = 0; i < DrinkButtons.length; i++) {
    dataString += DrinkButtons[i].recipe1;
  }
  return dataString;
}

function generateFillLevelPayload() {
  const container = document.getElementById('loading-container');
  if (!container) return '<RESET><00>';

  const checkboxes = container.querySelectorAll('.reset-checkbox');

  let bitmask = 0n;

  checkboxes.forEach((cb, index) => {
    if (cb.checked) {
      bitmask |= 1n << BigInt(index);
    }
  });

  let hexString = bitmask.toString(16).toUpperCase();

  if (hexString.length % 2 !== 0) {
    hexString = '0' + hexString;
  }

  return `<RESET><${hexString}>`;
}

//setup stuff
document.addEventListener('DOMContentLoaded', () => {
  setupMultipleNFCButtonswithName('buttonContainer', DrinkButtons);
  setupLoadingBars(Ingredients);

  setupDynamicNFCButton2("setupBtn", generateInitPayload, "Warning: Writing init string will reset Machine" );
  setupDynamicNFCButton2("resetBtn", generateFillLevelPayload, "The selected drinks will be reset" );
});

const DrinkButtons = [
  {
    id: 1,
    imageUrl: 'img/drink11.png',
    payload: '<01>',      
    name: 'Tequilla Sunrise',        
    recipe1: "<CFGD><01><00210304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
    comment: "Enjoy your drink :)"
  },
  {
    id: 2,
    imageUrl: 'img/drink1.png',
    payload: '<xx>',         
    name: 'Sex on the Beach', 
    recipe1: "<CFGD><02><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
    comment: "Tits :)"    
  },
  {
    id: 3,
    imageUrl: 'img/drink9.png',
    payload: '<xx>',
    name: 'Blue Lagoon',
    recipe1: "<CFGD><03><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 4,
    imageUrl: 'img/drink10.png',
    payload: '<xx>',
    name: 'Mai Tai',
    recipe1: "<CFGD><04><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 5,
    imageUrl: 'img/drink12.png',
    payload: '<xx>',
    name: 'Blue-Heaven',
    recipe1: "<CFGD><05><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 6,
    imageUrl: 'img/drink17.png',
    payload: '<xx>',
    name: 'Cuba-Libre',
    recipe1: "<CFGD><06><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 7,
    imageUrl: 'img/drink6.png',
    payload: '<xx>',
    name: 'Vodka-Cranberry',
    recipe1: "<CFGD><07><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 8,
    imageUrl: 'img/drinkxx.png',
    payload: '<xx>',
    name: 'EMPTY',
    recipe1: "<CFGD><08><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 9,
    imageUrl: 'img/drink15.png',
    payload: '<xx>',
    name: 'Gin Tonic',
    recipe1: "<CFGD><09><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 10,
    imageUrl: 'img/drink13.png',
    payload: '<xx>',
    name: 'Berry-Breeze',
    recipe1: "<CFGD><10><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 11,
    imageUrl: 'img/drink14.png',
    payload: '<xx>',
    name: 'Pina-Colada',
    recipe1: "<CFGD><11><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 12,
    imageUrl: 'img/drink18.png',
    payload: '<xx>',
    name: 'Southern-O',
    recipe1: "<CFGD><12><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 13,
    imageUrl: 'img/drink19.png',
    payload: '<xx>',
    name: 'BlueBerry-Cooler',
    recipe1: "<CFGD><13><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 14,
    imageUrl: 'img/drink6.png',
    payload: '<xx>',
    name: 'Southern-Berry',
    recipe1: "<CFGD><14><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 15,
    imageUrl: 'img/drink4.png',
    payload: '<xx>',
    name: 'Tequilla-Cranberry',
    recipe1: "<CFGD><15><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 16,
    imageUrl: 'img/drink9.png',
    payload: '<xx>',
    name: 'Blueberry-Smash',
    recipe1: "<CFGD><16><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 17,
    imageUrl: 'img/drink14.png',
    payload: '<xx>',
    name: 'Berry-Colada',
    recipe1: "<CFGD><17><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 18,
    imageUrl: 'img/drink16.png',
    payload: '<xx>',
    name: 'Gin-Fizz',
    recipe1: "<CFGD><18><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 19,
    imageUrl: 'img/drink18.png',
    payload: '<xx>',
    name: 'Sunset-Mock',
    recipe1: "<CFGD><19><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 20,
    imageUrl: 'img/drink20.png',
    payload: '<xx>',
    name: 'Blueberry-Tequilla',
    recipe1: "<CFGD><20><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 21,
    imageUrl: 'img/drink12.png',
    payload: '<xx>',
    name: 'Ocean-Breeze',
    recipe1: "<CFGD><21><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 22,
    imageUrl: 'img/drink14.png',
    payload: '<xx>',
    name: 'Coconut-Kiss NA',
    recipe1: "<CFGD><22><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 23,
    imageUrl: 'img/drink13.png',
    payload: '<xx>',
    name: 'Berry-Blast NA',
    recipe1: "<CFGD><23><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 24,
    imageUrl: 'img/drink1.png',
    payload: '<xx>',
    name: 'Sexy Beach NA',
    recipe1: "<CFGD><24><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 25,
    imageUrl: 'img/drink3.png',
    payload: '<xx>',
    name: 'Citrus-Refresher NA',
    recipe1: "<CFGD><25><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
  {
    id: 26,
    imageUrl: 'img/drink7.png',
    payload: '<xx>',
    name: 'Tropical-Sunset NA',
    recipe1: "<CFGD><26><01020304><00FF00FF00><01020304><00000000>><01020304><00000000></>",
  },
];

const Ingredients = [
  {
    id: 1,
    ingredientName: 'Gin',
    containersize_ml: 1200,
    flow_rate_ml_min: 300,
    metered: false
  },
  {
    id: 2,
    ingredientName: 'Weisser-Rum',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 3,
    ingredientName: 'Vodka',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 4,
    ingredientName: 'Southern-Comfort',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 5,
    ingredientName: 'Tequilla',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 6,
    ingredientName: 'Orangensaft',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 7,
    ingredientName: 'Annanassaft',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 8,
    ingredientName: 'Limettensaft',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 9,
    ingredientName: 'Cranberry-Saft',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 10,
    ingredientName: 'Heidelbeer-Saft',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 11,
    ingredientName: 'Blue-Curacao',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 12,
    ingredientName: 'Coconut-Sirup',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
  {
    id: 13,
    ingredientName: 'Grenadine-Sirup',
    containersize_ml: 600,
    flow_rate_ml_min: 150,
    metered: false
  },
];