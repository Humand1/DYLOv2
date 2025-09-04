// Variables globales
let selectedFiles = [];
let folders = [];
let users = {};
let selectedFolder = null;

// API Key hardcodeada
const HARDCODED_API_KEY = 'NTQxMDcyMzpkMjJNc3RyNEh1VEtQSEl3NTJTSldlR1liaHI2R0dCVQ==';

// Elementos del DOM
const loadFoldersBtn = document.getElementById('loadFolders');
const loadUsersBtn = document.getElementById('loadUsers');
const folderSearchInput = document.getElementById('folderSearch');
const folderSelect = document.getElementById('folderSelect');
const folderInfo = document.getElementById('folderInfo');
const selectedFolderName = document.getElementById('selectedFolderName');
const prefixInput = document.getElementById('prefix');
const prefixPreview = document.getElementById('prefixPreview');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFilesBtn = document.getElementById('selectFiles');
const fileList = document.getElementById('fileList');
const selectedFilesUl = document.getElementById('selectedFiles');
const processBtn = document.getElementById('processBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');
const logArea = document.getElementById('logArea');
const clearLogBtn = document.getElementById('clearLog');
const downloadLogBtn = document.getElementById('downloadLog');
const statusText = document.getElementById('statusText');
const folderStatus = document.getElementById('folderStatus');
const userStatus = document.getElementById('userStatus');
const fileStatus = document.getElementById('fileStatus');
const confirmModal = document.getElementById('confirmModal');
const confirmContent = document.getElementById('confirmContent');
const confirmYesBtn = document.getElementById('confirmYes');
const confirmNoBtn = document.getElementById('confirmNo');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Folder management
    loadFoldersBtn.addEventListener('click', loadFolders);
    loadUsersBtn.addEventListener('click', loadUsers);
    folderSearchInput.addEventListener('input', filterFolders);
    folderSelect.addEventListener('change', selectFolder);
    
    // Prefix preview
    prefixInput.addEventListener('input', updatePrefixPreview);
    
    // File selection
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Process button
    processBtn.addEventListener('click', showConfirmModal);
    
    // Log controls
    clearLogBtn.addEventListener('click', clearLog);
    downloadLogBtn.addEventListener('click', downloadLog);
    
    // Modal controls
    confirmYesBtn.addEventListener('click', processDocuments);
    confirmNoBtn.addEventListener('click', hideConfirmModal);
    
    // Initial log
    addLog('Aplicación iniciada correctamente', 'info');
    updateStatus('Listo');
}


async function loadFolders() {
    try {
        updateStatus('Cargando carpetas...');
        addLog('Cargando carpetas disponibles desde Redash...', 'info');
        
        // Mostrar loading en el botón
        const originalText = loadFoldersBtn.innerHTML;
        loadFoldersBtn.innerHTML = '<span class="loading"></span> Cargando...';
        loadFoldersBtn.disabled = true;
        
        const response = await fetch('/api/folders');
        const data = await response.json();
        
        if (response.ok) {
            folders = data;
            populateFolderSelect();
            updateFolderStatus(folders.length);
            addLog(`✅ Se cargaron ${folders.length} carpetas exitosamente`, 'success');
            updateStatus('Carpetas cargadas');
        } else {
            throw new Error(data.detail || 'Error al cargar carpetas');
        }
    } catch (error) {
        addLog(`❌ Error al cargar carpetas: ${error.message}`, 'error');
        updateStatus('Error al cargar carpetas');
    } finally {
        loadFoldersBtn.innerHTML = '<i class="fas fa-sync"></i> Cargar Carpetas';
        loadFoldersBtn.disabled = false;
    }
}

async function loadUsers() {
    try {
        updateStatus('Cargando usuarios...');
        addLog('Cargando usuarios con RFC desde Redash...', 'info');
        
        // Mostrar loading en el botón
        const originalText = loadUsersBtn.innerHTML;
        loadUsersBtn.innerHTML = '<span class="loading"></span> Cargando...';
        loadUsersBtn.disabled = true;
        
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (response.ok) {
            users = data;
            updateUserStatus(data.total_users);
            addLog(`✅ Se cargaron ${data.total_users} usuarios con RFC válido`, 'success');
            
            // Mostrar algunos ejemplos
            if (data.users_sample && Object.keys(data.users_sample).length > 0) {
                addLog('Ejemplos de usuarios cargados:', 'info');
                Object.entries(data.users_sample).forEach(([rfc, username]) => {
                    addLog(`  RFC: ${rfc} → Usuario: ${username}`, 'info');
                });
            }
            
            updateStatus('Usuarios cargados');
        } else {
            throw new Error(data.detail || 'Error al cargar usuarios');
        }
    } catch (error) {
        addLog(`❌ Error al cargar usuarios: ${error.message}`, 'error');
        updateStatus('Error al cargar usuarios');
    } finally {
        loadUsersBtn.innerHTML = '<i class="fas fa-users"></i> Cargar Usuarios';
        loadUsersBtn.disabled = false;
    }
}

function populateFolderSelect() {
    folderSelect.innerHTML = '';
    
    if (folders.length === 0) {
        folderSelect.innerHTML = '<option value="">No hay carpetas disponibles</option>';
        return;
    }
    
    folderSelect.innerHTML = '<option value="">Seleccione una carpeta...</option>';
    
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.folder_id;
        option.textContent = `${folder.folder_name} (ID: ${folder.folder_id})`;
        folderSelect.appendChild(option);
    });
}

function filterFolders() {
    const searchTerm = folderSearchInput.value.toLowerCase();
    
    folderSelect.innerHTML = '';
    
    if (folders.length === 0) {
        folderSelect.innerHTML = '<option value="">No hay carpetas disponibles</option>';
        return;
    }
    
    folderSelect.innerHTML = '<option value="">Seleccione una carpeta...</option>';
    
    const filteredFolders = folders.filter(folder => 
        folder.folder_name.toLowerCase().includes(searchTerm) ||
        folder.folder_id.toString().includes(searchTerm)
    );
    
    filteredFolders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.folder_id;
        option.textContent = `${folder.folder_name} (ID: ${folder.folder_id})`;
        folderSelect.appendChild(option);
    });
}

function selectFolder() {
    const folderId = folderSelect.value;
    
    if (!folderId) {
        selectedFolder = null;
        folderInfo.style.display = 'none';
        updateProcessButton();
        return;
    }
    
    selectedFolder = folders.find(f => f.folder_id === folderId);
    
    if (selectedFolder) {
        selectedFolderName.textContent = selectedFolder.folder_name;
        folderInfo.style.display = 'block';
        addLog(`Carpeta seleccionada: ${selectedFolder.folder_name}`, 'info');
        updateProcessButton();
    }
}

function updatePrefixPreview() {
    const prefix = prefixInput.value.trim();
    prefixPreview.textContent = prefix ? `${prefix}_[USERNAME].pdf` : '[USERNAME].pdf';
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFiles(files);
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    addFiles(files);
}

function addFiles(files) {
    // Filtrar solo archivos PDF
    const pdfFiles = files.filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
        addLog('⚠️ No se seleccionaron archivos PDF válidos', 'warning');
        return;
    }
    
    // Reemplazar archivos anteriores
    selectedFiles = pdfFiles;
    
    updateFileList();
    updateFileStatus(selectedFiles.length);
    updateProcessButton();
    
    addLog(`📁 Se seleccionaron ${selectedFiles.length} archivo(s) PDF`, 'info');
    selectedFiles.forEach(file => {
        addLog(`  - ${file.name} (${formatFileSize(file.size)})`, 'info');
    });
}

function updateFileList() {
    if (selectedFiles.length === 0) {
        fileList.style.display = 'none';
        return;
    }
    
    fileList.style.display = 'block';
    selectedFilesUl.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <i class="fas fa-file-pdf"></i>
            <span>${file.name}</span>
            <small>(${formatFileSize(file.size)})</small>
        `;
        selectedFilesUl.appendChild(li);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateProcessButton() {
    const hasFolder = selectedFolder !== null;
    const hasFiles = selectedFiles.length > 0;
    const hasUsers = users.total_users > 0;
    
    processBtn.disabled = !(hasFolder && hasFiles && hasUsers);
}

function showConfirmModal() {
    const signatureStatus = document.querySelector('input[name="signatureStatus"]:checked').value;
    const prefix = prefixInput.value.trim();
    
    let content = `
        <p><strong>Resumen del procesamiento:</strong></p>
        <ul>
            <li><strong>Carpeta destino:</strong> ${selectedFolder.folder_name}</li>
            <li><strong>Archivos a procesar:</strong> ${selectedFiles.length}</li>
            <li><strong>Prefijo:</strong> ${prefix || 'Ninguno'}</li>
            <li><strong>Estado de firma:</strong> ${signatureStatus === 'PENDING' ? 'Requiere firma' : 'No requiere firma'}</li>
            <li><strong>Usuarios cargados:</strong> ${users.total_users}</li>
        </ul>
        <p><strong>¿Desea continuar con el procesamiento?</strong></p>
    `;
    
    if (signatureStatus === 'PENDING') {
        content += '<p class="result-error"><strong>NOTA:</strong> Se requiere firma pero no se han configurado coordenadas de firma. Los documentos se subirán sin coordenadas específicas.</p>';
    }
    
    confirmContent.innerHTML = content;
    confirmModal.style.display = 'flex';
}

function hideConfirmModal() {
    confirmModal.style.display = 'none';
}

async function processDocuments() {
    hideConfirmModal();
    
    try {
        updateStatus('Procesando documentos...');
        addLog('🚀 Iniciando procesamiento de documentos...', 'info');
        
        // Mostrar sección de progreso
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
        
        // Deshabilitar botón de proceso
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="loading"></span> Procesando...';
        
        // Preparar datos del formulario
        const formData = new FormData();
        
        // Agregar archivos
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        // Agregar otros datos
        formData.append('folder_id', selectedFolder.folder_id);
        formData.append('api_key', HARDCODED_API_KEY);
        formData.append('signature_status', document.querySelector('input[name="signatureStatus"]:checked').value);
        
        const prefix = prefixInput.value.trim();
        if (prefix) {
            formData.append('prefix', prefix);
        }
        
        // Actualizar progreso
        updateProgress(10, 'Subiendo archivos al servidor...');
        
        // Realizar la solicitud
        const response = await fetch('/api/upload-documents', {
            method: 'POST',
            body: formData
        });
        
        updateProgress(50, 'Procesando archivos en el servidor...');
        
        const result = await response.json();
        
        updateProgress(100, 'Procesamiento completado');
        
        // Mostrar resultados
        setTimeout(() => {
            showResults(result, response.ok);
            progressSection.style.display = 'none';
        }, 1000);
        
    } catch (error) {
        addLog(`❌ Error durante el procesamiento: ${error.message}`, 'error');
        updateStatus('Error en el procesamiento');
        progressSection.style.display = 'none';
        
        showResults({
            success: false,
            message: error.message,
            uploaded_files: 0,
            total_files: selectedFiles.length,
            errors: [{ filename: 'Error general', error: error.message }]
        }, false);
        
    } finally {
        // Restaurar botón de proceso
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-cogs"></i> Procesar y Subir Documentos';
        updateProcessButton();
    }
}

function updateProgress(percentage, text) {
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = text;
}

function showResults(result, success) {
    resultsSection.style.display = 'block';
    
    let content = '';
    
    if (success && result.success) {
        content += `<div class="result-success">
            <h4><i class="fas fa-check-circle"></i> Procesamiento Exitoso</h4>
            <p>${result.message}</p>
        </div>`;
        
        addLog(`✅ ${result.message}`, 'success');
        updateStatus('Procesamiento completado exitosamente');
    } else {
        content += `<div class="result-error">
            <h4><i class="fas fa-exclamation-circle"></i> Error en el Procesamiento</h4>
            <p>${result.message || 'Error desconocido'}</p>
        </div>`;
        
        addLog(`❌ ${result.message || 'Error desconocido'}`, 'error');
        updateStatus('Error en el procesamiento');
    }
    
    // Mostrar estadísticas
    if (result.uploaded_files !== undefined && result.total_files !== undefined) {
        content += `<div class="result-stats">
            <div class="stat-card">
                <div class="stat-number">${result.uploaded_files}</div>
                <div class="stat-label">Archivos Subidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${result.total_files}</div>
                <div class="stat-label">Total Archivos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${result.skipped_files || 0}</div>
                <div class="stat-label">Archivos Omitidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${result.errors ? result.errors.length : 0}</div>
                <div class="stat-label">Errores</div>
            </div>
        </div>`;
    }
    
    // Mostrar detalles de archivos exitosos
    if (result.success_details && result.success_details.length > 0) {
        content += `<h4>Archivos subidos exitosamente:</h4><ul>`;
        result.success_details.forEach(detail => {
            content += `<li><strong>${detail.filename}</strong> - Usuario: ${detail.identifier} (${detail.pages} página(s))</li>`;
            addLog(`✅ Subido: ${detail.filename} → ${detail.identifier}`, 'success');
        });
        content += `</ul>`;
    }
    
    // Mostrar errores si los hay
    if (result.errors && result.errors.length > 0) {
        content += `<h4>Errores encontrados:</h4><ul>`;
        result.errors.forEach(error => {
            content += `<li><strong>${error.filename}:</strong> ${error.error}</li>`;
            addLog(`❌ Error en ${error.filename}: ${error.error}`, 'error');
        });
        content += `</ul>`;
    }
    
    resultsContent.innerHTML = content;
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logArea.appendChild(logEntry);
    logArea.scrollTop = logArea.scrollHeight;
}

function clearLog() {
    logArea.innerHTML = '';
    addLog('Registro limpiado', 'info');
}

function downloadLog() {
    const logContent = Array.from(logArea.children)
        .map(entry => entry.textContent)
        .join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dylo_log_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    addLog('Registro descargado', 'info');
}

function updateStatus(status) {
    statusText.textContent = status;
}

function updateFolderStatus(count) {
    folderStatus.querySelector('span').textContent = `${count} carpetas`;
}

function updateUserStatus(count) {
    userStatus.querySelector('span').textContent = `${count} usuarios`;
}

function updateFileStatus(count) {
    fileStatus.querySelector('span').textContent = `${count} archivos`;
}

// Actualizar botón de proceso cuando cambien los radio buttons
document.querySelectorAll('input[name="signatureStatus"]').forEach(radio => {
    radio.addEventListener('change', updateProcessButton);
});
