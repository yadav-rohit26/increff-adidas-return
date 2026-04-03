const N8N_URL = 'https://n8n.omni.increff.com/webhook/return-sync';

const marketplaceSelect = document.getElementById('marketplace-select');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const terminalLogs = document.getElementById('terminal-logs');
const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));

dropZone.onclick = () => fileInput.click();

fileInput.onchange = () => {
    if (fileInput.files.length) {
        document.getElementById('file-label').innerHTML = `File Selected: <span class="text-primary">${fileInput.files[0].name}</span>`;
        dropZone.classList.add('drop-zone-active');
    }
};

function addLog(msg) {
    const p = document.createElement('p');
    p.className = `mb-1`;
    p.innerText = `> ${msg}`;
    terminalLogs.appendChild(p);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

document.getElementById('submit-btn').onclick = async () => {
    const marketplace = marketplaceSelect.value;
    const file = fileInput.files[0];

    if (!marketplace || !file) {
        document.getElementById('errorMsg').innerText = "Incomplete Setup: Select marketplace and upload report.";
        errorToast.show();
        return;
    }

    document.getElementById('ui-upload').classList.add('d-none');
    document.getElementById('ui-processing').classList.remove('d-none');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('marketplace', marketplace);

    try {
        addLog(`Initiating handshake with backend for ${marketplace}...`);
        addLog("Data packet sent. Waiting for processing...");
        
        const response = await fetch(N8N_URL, { method: 'POST', body: formData });
        
        if (!response.ok) throw new Error("Sync Interrupted by Server");

        addLog("Server response: 200 OK.");
        addLog("Compiling final reconciliation file...");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const dl = document.getElementById('download-btn');
        dl.href = url;
        dl.download = `INCREFF_RECON_${marketplace}_${Date.now()}.xlsx`;

        // Small delay for UX feel
        setTimeout(() => {
            document.getElementById('ui-processing').classList.add('d-none');
            document.getElementById('ui-success').classList.remove('d-none');
        }, 1000);

    } catch (err) {
        document.getElementById('errorMsg').innerText = "Engine Error: " + err.message;
        errorToast.show();
        setTimeout(() => location.reload(), 3000);
    }
};

// Drag and Drop
['dragover', 'dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => e.preventDefault());
});
dropZone.addEventListener('dragover', () => dropZone.classList.add('drop-zone-active'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-zone-active'));
dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
    }
});