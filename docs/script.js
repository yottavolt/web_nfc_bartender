document.getElementById("burger").addEventListener("click", () => {
  const nav = document.getElementById("navMenu");
  nav.classList.toggle("hidden");
});

function showTab(tabId) {
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");
}

async function writeToNFC() {
  const text = document.getElementById("nfcText").value;
  if (!text) {
    alert("Please enter text to write.");
    return;
  }

  if ("NDEFWriter" in window) {
    try {
      const writer = new NDEFWriter();
      alert("Approach an NFC tag to write...");
      await writer.write({ records: [{ recordType: "text", data: text }] });
      alert("NFC tag written successfully!");
    } catch (err) {
      alert("Failed to write to NFC tag: " + err);
    }
  } else {
    // Fallback for unsupported devices
    navigator.clipboard.writeText(text)
      .then(() => alert("Web NFC not supported. Text copied to clipboard. Use NFC Tools app to write manually."))
      .catch(() => alert("Clipboard copy failed. Please copy manually."));
  }
}
