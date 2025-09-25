
  const MIN = -20, MAX = 50, MID = 15;
  const labels = ['Living Room', 'Kitchen', 'Bedroom', 'Office', 'Garage', 'Basement'];

  //update color picker
  const colorInput = document.getElementById('colorInput');
  const colorPreview = document.getElementById('colorPreview');

  function updatePreview() {
    colorPreview.style.backgroundColor = colorInput.value;
  }

colorInput.addEventListener('input', updatePreview);
updatePreview(); // initialize on load


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

  function colorForTemp(t) {
    if (!Number.isFinite(t)) return '#888';
    const hue = t <= MID
      ? 210 + (50 - 210) * ((t - MIN) / (MID - MIN))
      : 50 + (33 - 50) * ((t - MID) / (MAX - MID));
    return `hsl(${hue}, 100%, 50%)`;
  }

  function getTempsFromURL() {
    const params = new URLSearchParams(window.location.search);
    return Array.from({ length: 6 }, (_, i) => {
      const temp = parseFloat(params.get(`temp${i + 1}`));
      return Number.isFinite(temp) ? temp : null;
    });
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

  function initHome() {
    const container = document.getElementById('gaugesContainer');
    const temps = getTempsFromURL();
    container.innerHTML = '';
    for (let i = 0; i < 2; i++) {
      container.appendChild(createGauge(temps[i], labels[i]));
    }
  }


  function initConfig() {
    const container = document.getElementById('formContainer');
    container.innerHTML = '';
    labels.forEach((label, i) => {
      const group = document.createElement('div');
      group.className = 'form-group';
      group.innerHTML = `
        <label for="temp${i}">${label}</label>
        <input type="number" id="temp${i}" placeholder="Enter °C" />
      `;
      container.appendChild(group);
    });
  }

async function writeToNFC() {
try {
  const header = '<TEMP>';
  let payload = '';

  for (let i = 0; i < 6; i++) {
    const input = document.getElementById(`temp${i}`);
    let mapped = 0; // Default to 0x00 for missing/invalid input

    if (input) {
      const val = parseFloat(input.value);

      if (Number.isFinite(val)) {
        const clamped = Math.max(-20, Math.min(50, val));
        mapped = Math.round((clamped + 20) * 255 / 70);
      }
    }

    // Append 2-digit uppercase hex
    payload += mapped.toString(16).padStart(2, '0').toUpperCase();
  }

  const fullText = header + payload;

  if (!('NDEFReader' in window)) {
    alert('Web NFC unsupported. Use a compatible Android device and HTTPS.');
    return;
  }

  const ndef = new NDEFReader();
  await ndef.write({
    records: [
      {
        recordType: "text",
        data: fullText
      }
    ]
  });

  const btn = document.getElementById('writeBtn');
  btn.textContent = '✅ NFC write success';
  setTimeout(() => btn.textContent = 'Write to NFC', 2000);
} catch (err) {
  alert('❌ NFC write failed. Make sure your device supports Web NFC and uses HTTPS.');
  console.error(err);
}
}


  document.addEventListener('DOMContentLoaded', () => {
    initHome();
    initConfig();
    document.getElementById('writeBtn').addEventListener('click', writeToNFC);
  });

document.getElementById('colorOkBtn').addEventListener('click', async () => {
const btn1 = document.getElementById('colorOkBtn');
const originalText = btn1.textContent;

// Visual feedback: disable button and show loading state
btn1.disabled = true;
btn1.textContent = '⏳ Writing...';
btn1.style.opacity = '0.6';

try {
  const colorHex = document.getElementById('colorInput').value;

  const r = parseInt(colorHex.substring(1, 3), 16);
  const g = parseInt(colorHex.substring(3, 5), 16);
  const b = parseInt(colorHex.substring(5, 7), 16);

  const rgbText = `<COL>${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();

  const ndef = new NDEFReader();
  await ndef.write({
    records: [{
      recordType: "text",
      data: rgbText
    }]
  });

  btn1.textContent = '✅ NFC write success';
} catch (error) {
  console.error("❌ NFC write failed:", error);
  alert("Failed to write to NFC tag. Make sure you're using Chrome on Android with NFC enabled.");
  btn1.textContent = '❌ Write failed';
}

// Restore button after 3 seconds
setTimeout(() => {
  btn1.textContent = originalText;
  btn1.disabled = false;
  btn1.style.opacity = '1';
}, 3000);
});

//first try of nfc button
function setupNFCButton(buttonId, textToWrite) {
  const button = document.getElementById(buttonId);

  button.addEventListener('click', async () => {
    if ('NDEFReader' in window) {
      const proceed = confirm("Web NFC is available.\nMove your device near the NFC tag to write.");
      if (!proceed) return;

      try {
        const ndef = new NDEFReader();
        await ndef.write({
          records: [{ recordType: "text", data: textToWrite }]
        });

        button.textContent = '✅ NFC write success';
        setTimeout(() => button.textContent = 'Write to NFC', 2000);
      } catch (err) {
        alert("❌ NFC write failed. Make sure your device supports Web NFC and uses HTTPS.");
        console.error(err);
      }
    } else {
      const fallback = confirm("Web NFC is not supported.\nUse NFC Tools to manually write.\nClick OK to copy the text to clipboard.");
      if (fallback) {
        try {
          await navigator.clipboard.writeText(textToWrite);
          alert("✅ Text copied to clipboard. Paste it into your NFC writing app.");
        } catch (err) {
          alert("❌ Failed to copy text. Please copy manually.");
          console.error(err);
        }
      }
    }
  });
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

function setupDynamicNFCButton(buttonId, getPayloadFn) {
  const button = document.getElementById(buttonId);

  button.addEventListener('click', async () => {
    const payload = getPayloadFn();

    if ('NDEFReader' in window) {
      const proceed = confirm("✅ Web NFC is available.\nMove your device near the NFC tag to write.");
      if (!proceed) return;

      try {
        const ndef = new NDEFReader();
        await ndef.write({ records: [{ recordType: "text", data: payload }] });

        button.textContent = '✅ NFC write success';
        setTimeout(() => button.textContent = 'Write to NFC', 2000);
      } catch (err) {
        alert("❌ NFC write failed. Make sure your device supports Web NFC and uses HTTPS.");
        console.error(err);
      }
    } else {
      const fallback = confirm("⚠️ Web NFC not supported.\nUse NFC Tools to manually write.\nClick OK to copy the text to clipboard.");
      if (fallback) {
        try {
          await navigator.clipboard.writeText(payload);
          alert("✅ Text copied to clipboard. Paste it into your NFC writing app.");
        } catch (err) {
          alert("❌ Failed to copy text. Please copy manually.");
          console.error(err);
        }
      }
    }
  });
}




//setup stuff
setupNFCButton('test1Btn', '<DATA>ABC123')

setupDynamicNFCButton('test2Btn', () => {
  const temps = [22, 18, 25, 30, 15, 10]; // could be pulled from inputs
  return generatePayload('TEMP', temps);
});