
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
    message.textContent = '📡 Hold your phone near the NFC tag...';

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
  button.disabled = true;
  button.textContent = successText;
  button.style.opacity = '0.6';

  setTimeout(() => {
    button.textContent = restoreText;
    button.disabled = false;
    button.style.opacity = '1';
    const modal = document.getElementById('nfcModal');
    if (modal) modal.classList.add('hidden');
  }, delay);
}

//setup stuff
document.addEventListener('DOMContentLoaded', () => {

  setupDynamicNFCButton2('test3Btn', () => {
    const temps = [22, 18, 25, 30, 15, 10];
    return generatePayload('TEMP', temps);
  });


});
