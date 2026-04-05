const N8N_URL        = 'https://n8n.omni.increff.com/webhook/return-sync';
const WEBHOOK_SECRET = 'YOUR_SECRET_HERE'; // Replace with your actual secret

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB  = 20;
const ALLOWED_MIME_TYPES = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];
const FETCH_TIMEOUT_MS   = 120_000;

// User ID: letters, digits, underscores, hyphens — 3 to 50 chars
// This allows letters, numbers, dots, @, underscores, and hyphens
const USER_ID_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ─── DOM References ───────────────────────────────────────────────────────────

const marketplaceSelect  = document.getElementById('marketplace-select');
const userIdInput        = document.getElementById('user-id');
const fileInput          = document.getElementById('file-input');
const dropZone           = document.getElementById('drop-zone');
const submitBtn          = document.getElementById('submit-btn');
const resetBtn           = document.getElementById('reset-btn');
const terminalLogs       = document.getElementById('terminal-logs');
const errorToast         = new bootstrap.Toast(document.getElementById('errorToast'));

// ─── Drop Zone: click & keyboard ─────────────────────────────────────────────

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
    }
});

// ─── File Selection ───────────────────────────────────────────────────────────

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFileSelected(fileInput.files[0]);
});

function handleFileSelected(file) {
    document.getElementById('file-label').innerHTML =
        `File Selected: <span class="text-primary">${file.name}</span>`;
    dropZone.classList.add('drop-zone-active');
    clearFieldError('file-error');
}

// ─── Drag & Drop ──────────────────────────────────────────────────────────────

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => e.preventDefault());
});

dropZone.addEventListener('dragover',  () => dropZone.classList.add('drop-zone-active'));
dropZone.addEventListener('dragenter', () => dropZone.classList.add('drop-zone-active'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-zone-active'));

dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('drop-zone-active');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
    }
});

// ─── Inline Validation Helpers ────────────────────────────────────────────────

function setFieldError(id, message) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.classList.remove('d-none');
}

function clearFieldError(id) {
    document.getElementById(id).classList.add('d-none');
}

// Clear inline errors on interaction
marketplaceSelect.addEventListener('change', () => clearFieldError('marketplace-error'));
userIdInput.addEventListener('input',        () => clearFieldError('user-id-error'));

// ─── Form Validation ──────────────────────────────────────────────────────────

function validateForm(marketplace, userId, file) {
    let valid = true;

    if (!marketplace) {
        setFieldError('marketplace-error', 'Please select a marketplace.');
        valid = false;
    }

    if (!userId) {
        setFieldError('user-id-error', 'Email ID is required.');
        valid = false;
    } else if (!USER_ID_REGEX.test(userId)) {
        setFieldError('user-id-error', 'Enter a valid User ID (3-50 chars, letters, numbers, _ or - only).');
        valid = false;
    }

    if (!file) {
        setFieldError('file-error', 'Please upload a report file.');
        valid = false;
    } else {
        const fileError = validateFile(file);
        if (fileError) {
            setFieldError('file-error', fileError);
            valid = false;
        }
    }

    return valid;
}

function validateFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return 'Invalid file type. Please upload a .csv, .xls, or .xlsx file.';
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
        return 'Invalid file type. Please upload a .csv, .xls, or .xlsx file.';
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        return `File too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    }

    return null;
}

// ─── XLSX / XLS → CSV Conversion ─────────────────────────────────────────────

/**
 * Reads a File object and returns a CSV Blob.
 * .csv files are passed through unchanged.
 * .xlsx / .xls files are parsed with SheetJS (loaded via CDN) and
 * the first sheet is serialised to CSV.
 */
function convertToCSV(file) {
    return new Promise((resolve, reject) => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();

        if (ext === '.csv') {
            resolve(new Blob([file], { type: 'text/csv' }));
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data     = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Use the first sheet
                const sheetName = workbook.SheetNames[0];
                const sheet     = workbook.Sheets[sheetName];
                const csv       = XLSX.utils.sheet_to_csv(sheet);

                resolve(new Blob([csv], { type: 'text/csv' }));
            } catch (err) {
                reject(new Error('Failed to convert file to CSV: ' + err.message));
            }
        };

        reader.onerror = () => reject(new Error('Could not read the uploaded file.'));
        reader.readAsArrayBuffer(file);
    });
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function addLog(msg) {
    const p = document.createElement('p');
    p.className = 'mb-1';
    p.innerText = `> ${msg}`;
    terminalLogs.appendChild(p);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

function showPanel(id) {
    ['ui-upload', 'ui-processing', 'ui-success'].forEach(panelId => {
        document.getElementById(panelId).classList.toggle('d-none', panelId !== id);
    });
}

function showError(message) {
    document.getElementById('errorMsg').innerText = message;
    errorToast.show();
}

function resetUI() {
    fileInput.value         = '';
    marketplaceSelect.value = '';
    userIdInput.value       = '';

    document.getElementById('file-label').textContent = 'Drag Marketplace Report or Click to Browse';
    dropZone.classList.remove('drop-zone-active');

    submitBtn.disabled    = false;
    submitBtn.textContent = 'Initialize Sync';

    ['marketplace-error', 'user-id-error', 'file-error'].forEach(clearFieldError);

    terminalLogs.innerHTML = `
        <p class="mb-1 text-secondary opacity-50">> Booting Reconciliation Engine...</p>
        <p class="mb-1 text-secondary opacity-50">> Establishing secure handshake with n8n...</p>
    `;

    showPanel('ui-upload');
}

resetBtn.addEventListener('click', resetUI);

// ─── Submit ───────────────────────────────────────────────────────────────────

submitBtn.addEventListener('click', async () => {
    const marketplace = marketplaceSelect.value;
    const userId      = userIdInput.value.trim();
    const file        = fileInput.files[0];

    if (!validateForm(marketplace, userId, file)) return;

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Processing...';

    showPanel('ui-processing');

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        addLog(`User: ${userId} | Marketplace: ${marketplace}`);
        addLog('Converting file to CSV...');

        const csvBlob     = await convertToCSV(file);
        const csvFilename = file.name.replace(/\.(xlsx|xls)$/i, '.csv');

        addLog(`Conversion complete — sending ${csvFilename} to backend...`);

        const formData = new FormData();
        formData.append('file',        csvBlob, csvFilename);
        formData.append('marketplace', marketplace);
        formData.append('userId',      userId);

        const response = await fetch(N8N_URL, {
            method:  'POST',
            body:    formData,
            signal:  controller.signal,
            headers: { 'X-Webhook-Secret': WEBHOOK_SECRET }
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`Server responded with ${response.status}`);

        addLog('Server response: 200 OK.');
        addLog('Report queued — output will be delivered via email.');

        setTimeout(() => showPanel('ui-success'), 1000);

    } catch (err) {
        clearTimeout(timeoutId);

        const message = err.name === 'AbortError'
            ? 'Request timed out. Please try again.'
            : 'Engine Error: ' + err.message;

        showError(message);

        submitBtn.disabled    = false;
        submitBtn.textContent = 'Initialize Sync';
        showPanel('ui-upload');
    }
});
