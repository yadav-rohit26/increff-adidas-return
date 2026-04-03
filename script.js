const N8N_URL = 'https://n8n.omni.increff.com/webhook-test/return-sync';

const marketplaceSelect = document.getElementById('marketplace-select');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const terminalLogs = document.getElementById('terminal-logs');
const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));

dropZone.onclick = () => fileInput.click();

fileInput.onchange = () => {
    if (fileInput.files.length) {
        document.getElementById('file-label').innerHTML = `Selected File: <span class="text-primary">${fileInput.files[0].name}</span>`;
        dropZone.classList.add('drop-zone-active');
    }
};

function addLog(msg, type = "normal") {
    const p = document.createElement('p');
    p.className = `mb-1 ${type === 'warning' ? 'text-warning' : ''}`;
    p.innerText = `> ${msg}`;
    terminalLogs.appendChild(p);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

document.getElementById('submit-btn').onclick = async () => {
    const marketplace = marketplaceSelect.value;
    const file = fileInput.files[0];

    if (!marketplace || !file) {
        document.getElementById('errorMsg').innerText = "Validation Error: Please select marketplace and file.";
        errorToast.show();
        return;
    }

    document.getElementById('ui-upload').classList.add('d-none');
    document.getElementById('ui-processing').classList.remove('d-none');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('marketplace', marketplace);

    try {
        addLog(`Initiating Handshake for ${marketplace}...`);
        addLog("Parsing Batch 01 (Rows 1-200)...", "warning");
        
        const response = await fetch(N8N_URL, { method: 'POST', body: formData });
        
        addLog("Response Received. Handshake successful.", "normal");
        addLog("Compiling reconciliation XLSX...", "normal");

        if (!response.ok) throw new Error("Sync Interrupted by Server");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const dl = document.getElementById('download-btn');
        dl.href = url;
        dl.download = `RECON_${marketplace}_${Date.now()}.xlsx`;

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

// Standard DND
['dragover', 'dragleave', 'drop'].forEach(eType => {
    dropZone.addEventListener(eType, (e) => e.preventDefault());
});
dropZone.addEventListener('dragover', () => dropZone.classList.add('drop-zone-active'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-zone-active'));
dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
    }
});