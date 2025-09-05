// Variables globales
let selectedFiles = [];
let folders = [];
let users = {};
let selectedFolder = null;
let currentStep = 1;
let fileConfigurations = {};
let currentPdfDoc = null;
let currentPageNum = 1;
let currentFileIndex = 0;
let signatureAreas = {};

// API Key hardcodeada
const HARDCODED_API_KEY = 'NTQxMDcyMzpkMjJNc3RyNEh1VEtQSEl3NTJTSldlR1liaHI2R0dCVQ==';

// Configurar PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Elementos del DOM
const loadFoldersBtn = document.getElementById('loadFolders');
const loadUsersBtn = document.getElementById('loadUsers');
const folderSearchInput = document.getElementById('folderSearch');
const folderSelect = document.getElementById('folderSelect');
const folderInfo = document.getElementById('folderInfo');
const selectedFolderName = document.getElementById('selectedFolderName');

// Elementos de subida
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const selectFilesBtn = document.getElementById('selectFiles');
const selectFolderBtn = document.getElementById('selectFolder');
const uploadArea = document.getElementById('uploadArea');
const uploadFolderArea = document.getElementById('uploadFolderArea');
const fileList = document.getElementById('fileList');
const selectedFilesDiv = document.getElementById('selectedFiles');

// Elementos de navegación
const nextToConfigBtn = document.getElementById('nextToConfig');
const backToUploadBtn = document.getElementById('backToUpload');
const nextToPreviewBtn = document.getElementById('nextToPreview');
const backToConfigBtn = document.getElementById('backToConfig');
const nextToProcessBtn = document.getElementById('nextToProcess');
const backToPreviewBtn = document.getElementById('backToPreview');
const startOverBtn = document.getElementById('startOver');

// Elementos de configuración
const prefixInput = document.getElementById('prefix');
const prefixPreview = document.getElementById('prefixPreview');
const sendNotificationCheckbox = document.getElementById('sendNotification');
const fileConfigList = document.getElementById('fileConfigList');

// Elementos de vista previa PDF
const signatureFileSelect = document.getElementById('signatureFileSelect');
const pdfPreviewContainer = document.getElementById('pdfPreviewContainer');
const currentFileName = document.getElementById('currentFileName');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const pdfCanvas = document.getElementById('pdfCanvas');
const signatureSelector = document.getElementById('signatureSelector');
const selectSignatureAreaBtn = document.getElementById('selectSignatureArea');
const clearSignatureAreaBtn = document.getElementById('clearSignatureArea');
const signatureCoords = document.getElementById('signatureCoords');
const coordsText = document.getElementById('coordsText');

// Elementos de procesamiento
const processSummary = document.getElementById('processSummary');
const processBtn = document.getElementById('processBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');

// Elementos de log y estado
const logArea = document.getElementById('logArea');
const clearLogBtn = document.getElementById('clearLog');
const downloadLogBtn = document.getElementById('downloadLog');
const statusText = document.getElementById('statusText');
const folderStatus = document.getElementById('folderStatus');
const userStatus = document.getElementById('userStatus');
const fileStatus = document.getElementById('fileStatus');

// Modal
const confirmModal = document.getElementById('confirmModal');
const confirmContent = document.getElementById('confirmContent');
const confirmYesBtn = document.getElementById('confirmYes');
const confirmNoBtn = document.getElementById('confirmNo');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Paso 1: Folder management
    loadFoldersBtn.addEventListener('click', loadFolders);
    loadUsersBtn.addEventListener('click', loadUsers);
    folderSearchInput.addEventListener('input', filterFolders);
    folderSelect.addEventListener('change', selectFolder);
    
    // Paso 2: File upload
    selectFilesBtn.addEventListener('click', () => fileInput.click());
    selectFolderBtn.addEventListener('click', () => folderInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    folderInput.addEventListener('change', handleFolderSelect);
    
    // Drag and drop (solo en el área, no en el botón)
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Navegación entre pasos
    nextToConfigBtn.addEventListener('click', () => goToStep(3));
    backToUploadBtn.addEventListener('click', () => goToStep(2));
    nextToPreviewBtn.addEventListener('click', () => goToStep(4));
    backToConfigBtn.addEventListener('click', () => goToStep(3));
    nextToProcessBtn.addEventListener('click', () => goToStep(5));
    backToPreviewBtn.addEventListener('click', () => goToStep(4));
    startOverBtn.addEventListener('click', () => goToStep(1));
    
    // Configuración
    prefixInput.addEventListener('input', updatePrefixPreview);
    
    // Vista previa PDF
    signatureFileSelect.addEventListener('change', loadSelectedPdf);
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));
    selectSignatureAreaBtn.addEventListener('click', enableSignatureSelection);
    clearSignatureAreaBtn.addEventListener('click', clearSignatureArea);
    
    // Procesamiento
    processBtn.addEventListener('click', showConfirmModal);
    
    // Log controls
    clearLogBtn.addEventListener('click', clearLog);
    downloadLogBtn.addEventListener('click', downloadLog);
    
    // Modal controls
    confirmYesBtn.addEventListener('click', processDocuments);
    confirmNoBtn.addEventListener('click', hideConfirmModal);
    
    // Initial setup
    addLog('Aplicación iniciada correctamente', 'info');
    updateStatus('Inicializando...');
    showStep(1);
    
    // Cargar automáticamente carpetas y usuarios
    addLog('Cargando datos automáticamente...', 'info');
    loadFoldersAndUsers();
}

// Función para mostrar/ocultar pasos
function showStep(stepNumber) {
    // Ocultar todos los pasos
    for (let i = 1; i <= 5; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) step.style.display = 'none';
    }
    
    // Mostrar el paso actual
    const currentStepElement = document.getElementById(`step${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
        currentStep = stepNumber;
    }
    
    // Ocultar resultados si no estamos en procesamiento
    if (stepNumber < 5) {
        resultsSection.style.display = 'none';
    }
}

function goToStep(stepNumber) {
    if (validateStepTransition(currentStep, stepNumber)) {
        showStep(stepNumber);
        
        // Acciones específicas al entrar a cada paso
        switch (stepNumber) {
            case 3:
                generateFileConfigList();
                break;
            case 4:
                populateSignatureFileSelect();
                break;
            case 5:
                generateProcessSummary();
                break;
        }
    }
}

function validateStepTransition(fromStep, toStep) {
    switch (toStep) {
        case 2:
            return true; // Siempre se puede volver a subida
        case 3:
            if (selectedFiles.length === 0) {
                addLog('⚠️ Debe seleccionar archivos antes de continuar', 'warning');
                return false;
            }
            return true;
        case 4:
            return true; // La configuración es opcional
        case 5:
            return true; // La vista previa es opcional
        default:
            return true;
    }
}

// Función para cargar carpetas y usuarios automáticamente
async function loadFoldersAndUsers() {
    try {
        await Promise.all([loadFolders(), loadUsers()]);
        updateStatus('Listo - Datos cargados automáticamente');
        addLog('✅ Carga automática completada exitosamente', 'success');
    } catch (error) {
        addLog('⚠️ Error en la carga automática, puedes cargar manualmente', 'warning');
        updateStatus('Listo - Carga manual disponible');
    }
}

async function loadFolders() {
    try {
        updateStatus('Cargando carpetas...');
        addLog('Cargando carpetas disponibles desde Redash...', 'info');
        
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
        
        const originalText = loadUsersBtn.innerHTML;
        loadUsersBtn.innerHTML = '<span class="loading"></span> Cargando...';
        loadUsersBtn.disabled = true;
        
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (response.ok) {
            users = data;
            updateUserStatus(data.total_users);
            addLog(`✅ Se cargaron ${data.total_users} usuarios con RFC válido`, 'success');
            
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
        return;
    }
    
    selectedFolder = folders.find(f => f.folder_id === folderId);
    
    if (selectedFolder) {
        selectedFolderName.textContent = selectedFolder.folder_name;
        folderInfo.style.display = 'block';
        addLog(`Carpeta seleccionada: ${selectedFolder.folder_name}`, 'info');
        
        // Habilitar paso 2 si hay carpeta seleccionada
        showStep(2);
    }
}

// Manejo de archivos
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFiles(files);
}

function handleFolderSelect(event) {
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
    const pdfFiles = files.filter(file => 
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length === 0) {
        addLog('⚠️ No se seleccionaron archivos PDF válidos', 'warning');
        return;
    }
    
    selectedFiles = pdfFiles;
    
    // Inicializar configuraciones por defecto
    fileConfigurations = {};
    pdfFiles.forEach((file, index) => {
        fileConfigurations[index] = {
            file: file,
            requiresSignature: false,
            signatureCoords: null
        };
    });
    
    updateFileList();
    updateFileStatus(selectedFiles.length);
    nextToConfigBtn.disabled = false;
    
    addLog(`📁 Se seleccionaron ${selectedFiles.length} archivo(s) PDF`, 'info');
    selectedFiles.forEach(file => {
        addLog(`  - ${file.name} (${formatFileSize(file.size)})`, 'info');
    });
}

// Variables para paginación
let currentPage = 1;
let filesPerPage = 10;
let fileSearchTerm = '';

function updateFileList() {
    if (selectedFiles.length === 0) {
        fileList.style.display = 'none';
        return;
    }
    
    fileList.style.display = 'block';
    selectedFilesDiv.innerHTML = '';
    
    // Crear header con resumen y controles
    const headerDiv = document.createElement('div');
    headerDiv.className = 'file-list-header';
    headerDiv.innerHTML = `
        <div class="file-summary">
            <h3>Archivos cargados: <span class="file-count">${selectedFiles.length}</span></h3>
            <div class="file-controls">
                <input type="text" id="fileSearch" placeholder="Buscar archivos..." class="file-search">
                <button type="button" id="clearFiles" class="btn-secondary">
                    <i class="fas fa-trash"></i> Limpiar selección
                </button>
            </div>
        </div>
    `;
    selectedFilesDiv.appendChild(headerDiv);
    
    // Filtrar archivos según búsqueda
    const filteredFiles = selectedFiles.filter(file => 
        file.name.toLowerCase().includes(fileSearchTerm.toLowerCase())
    );
    
    // Calcular paginación
    const totalPages = Math.ceil(filteredFiles.length / filesPerPage);
    const startIndex = (currentPage - 1) * filesPerPage;
    const endIndex = startIndex + filesPerPage;
    const filesToShow = filteredFiles.slice(startIndex, endIndex);
    
    // Crear contenedor de archivos
    const filesContainer = document.createElement('div');
    filesContainer.className = 'files-container';
    
    if (filesToShow.length === 0) {
        filesContainer.innerHTML = '<p class="no-files">No se encontraron archivos que coincidan con la búsqueda.</p>';
    } else {
        filesToShow.forEach((file, displayIndex) => {
            const actualIndex = selectedFiles.indexOf(file);
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fas fa-file-pdf"></i>
                    <span class="file-name" title="${file.name}">${truncateFileName(file.name, 50)}</span>
                    <small class="file-size">(${formatFileSize(file.size)})</small>
                </div>
                <button type="button" class="btn-remove-file" data-index="${actualIndex}" title="Eliminar archivo">
                    <i class="fas fa-times"></i>
                </button>
            `;
            filesContainer.appendChild(fileItem);
        });
    }
    
    selectedFilesDiv.appendChild(filesContainer);
    
    // Crear controles de paginación si es necesario
    if (totalPages > 1) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'file-pagination';
        
        let paginationHTML = '<div class="pagination-controls">';
        
        // Botón anterior
        paginationHTML += `<button type="button" class="btn-pagination" id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Anterior
        </button>`;
        
        // Información de página
        paginationHTML += `<span class="page-info">Página ${currentPage} de ${totalPages}</span>`;
        
        // Botón siguiente
        paginationHTML += `<button type="button" class="btn-pagination" id="nextPage" ${currentPage === totalPages ? 'disabled' : ''}>
            Siguiente <i class="fas fa-chevron-right"></i>
        </button>`;
        
        paginationHTML += '</div>';
        
        // Selector de archivos por página
        paginationHTML += `
            <div class="pagination-options">
                <label for="filesPerPageSelect">Mostrar:</label>
                <select id="filesPerPageSelect" class="files-per-page-select">
                    <option value="10" ${filesPerPage === 10 ? 'selected' : ''}>10 por página</option>
                    <option value="25" ${filesPerPage === 25 ? 'selected' : ''}>25 por página</option>
                    <option value="50" ${filesPerPage === 50 ? 'selected' : ''}>50 por página</option>
                    <option value="100" ${filesPerPage === 100 ? 'selected' : ''}>100 por página</option>
                </select>
            </div>
        `;
        
        paginationDiv.innerHTML = paginationHTML;
        selectedFilesDiv.appendChild(paginationDiv);
        
        // Event listeners para paginación
        const prevBtn = paginationDiv.querySelector('#prevPage');
        const nextBtn = paginationDiv.querySelector('#nextPage');
        const filesPerPageSelect = paginationDiv.querySelector('#filesPerPageSelect');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    updateFileList();
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    updateFileList();
                }
            });
        }
        
        if (filesPerPageSelect) {
            filesPerPageSelect.addEventListener('change', (e) => {
                filesPerPage = parseInt(e.target.value);
                currentPage = 1; // Reset to first page
                updateFileList();
            });
        }
    }
    
    // Event listeners para controles
    const fileSearch = selectedFilesDiv.querySelector('#fileSearch');
    const clearFiles = selectedFilesDiv.querySelector('#clearFiles');
    const removeButtons = selectedFilesDiv.querySelectorAll('.btn-remove-file');
    
    if (fileSearch) {
        fileSearch.value = fileSearchTerm;
        fileSearch.addEventListener('input', (e) => {
            fileSearchTerm = e.target.value;
            currentPage = 1; // Reset to first page when searching
            updateFileList();
        });
    }
    
    if (clearFiles) {
        clearFiles.addEventListener('click', () => {
            selectedFiles = [];
            fileConfigurations = {};
            currentPage = 1;
            fileSearchTerm = '';
            updateFileList();
            updateFileStatus(0);
            nextToConfigBtn.disabled = true;
            addLog('Selección de archivos limpiada', 'info');
        });
    }
    
    removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.btn-remove-file').dataset.index);
            removeFile(index);
        });
    });
}

function removeFile(index) {
    const fileName = selectedFiles[index].name;
    selectedFiles.splice(index, 1);
    
    // Reindexar configuraciones
    const newConfigurations = {};
    Object.keys(fileConfigurations).forEach(key => {
        const oldIndex = parseInt(key);
        if (oldIndex < index) {
            newConfigurations[oldIndex] = fileConfigurations[oldIndex];
        } else if (oldIndex > index) {
            newConfigurations[oldIndex - 1] = fileConfigurations[oldIndex];
        }
    });
    fileConfigurations = newConfigurations;
    
    // Ajustar página actual si es necesario
    const totalPages = Math.ceil(selectedFiles.length / filesPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    
    updateFileList();
    updateFileStatus(selectedFiles.length);
    
    if (selectedFiles.length === 0) {
        nextToConfigBtn.disabled = true;
    }
    
    addLog(`Archivo eliminado: ${fileName}`, 'info');
}

function truncateFileName(fileName, maxLength) {
    if (fileName.length <= maxLength) {
        return fileName;
    }
    
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 4) + '...';
    
    return truncatedName + '.' + extension;
}

function generateFileConfigList() {
    fileConfigList.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const configItem = document.createElement('div');
        configItem.className = 'file-config-item';
        configItem.innerHTML = `
            <div class="file-header">
                <i class="fas fa-file-pdf"></i>
                <span class="file-name">${file.name}</span>
            </div>
            <div class="config-options">
                <label class="checkbox-label">
                    <input type="checkbox" id="signature_${index}" ${fileConfigurations[index].requiresSignature ? 'checked' : ''}>
                    <span>Requiere firma digital</span>
                </label>
            </div>
        `;
        
        const checkbox = configItem.querySelector(`#signature_${index}`);
        checkbox.addEventListener('change', (e) => {
            fileConfigurations[index].requiresSignature = e.target.checked;
            addLog(`${file.name}: ${e.target.checked ? 'Requiere' : 'No requiere'} firma`, 'info');
        });
        
        fileConfigList.appendChild(configItem);
    });
}

function populateSignatureFileSelect() {
    signatureFileSelect.innerHTML = '';
    
    const filesRequiringSignature = selectedFiles.filter((file, index) => 
        fileConfigurations[index].requiresSignature
    );
    
    if (filesRequiringSignature.length === 0) {
        signatureFileSelect.innerHTML = '<option value="">No hay archivos que requieran firma</option>';
        pdfPreviewContainer.style.display = 'none';
        return;
    }
    
    filesRequiringSignature.forEach((file, originalIndex) => {
        const index = selectedFiles.indexOf(file);
        const option = document.createElement('option');
        option.value = index;
        option.textContent = file.name;
        signatureFileSelect.appendChild(option);
    });
    
    // Cargar el primer archivo automáticamente
    if (filesRequiringSignature.length > 0) {
        signatureFileSelect.selectedIndex = 0;
        loadSelectedPdf();
    }
}

async function loadSelectedPdf() {
    const fileIndex = parseInt(signatureFileSelect.value);
    if (isNaN(fileIndex)) return;
    
    const file = selectedFiles[fileIndex];
    currentFileIndex = fileIndex;
    currentFileName.textContent = file.name;
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        currentPdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
        currentPageNum = 1;
        
        pdfPreviewContainer.style.display = 'block';
        renderPage();
        
        addLog(`Vista previa cargada: ${file.name}`, 'info');
    } catch (error) {
        addLog(`❌ Error al cargar PDF: ${error.message}`, 'error');
    }
}

async function renderPage() {
    if (!currentPdfDoc) return;
    
    const page = await currentPdfDoc.getPage(currentPageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    
    const renderContext = {
        canvasContext: pdfCanvas.getContext('2d'),
        viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    pageInfo.textContent = `Página ${currentPageNum} de ${currentPdfDoc.numPages}`;
    prevPageBtn.disabled = currentPageNum <= 1;
    nextPageBtn.disabled = currentPageNum >= currentPdfDoc.numPages;
    
    // Mostrar área de firma existente si la hay
    showExistingSignatureArea();
}

function changePage(delta) {
    const newPageNum = currentPageNum + delta;
    if (newPageNum >= 1 && newPageNum <= currentPdfDoc.numPages) {
        currentPageNum = newPageNum;
        renderPage();
    }
}

// Variables para el manejo avanzado de área de firma
let signatureMode = 'none'; // 'none', 'selecting', 'moving', 'resizing'
let dragStartX, dragStartY;
let resizeHandle = null;
let originalRect = null;

function enableSignatureSelection() {
    signatureMode = 'selecting';
    pdfCanvas.style.cursor = 'crosshair';
    
    // Crear handles de redimensionamiento si no existen
    createResizeHandles();
    
    addLog('Modo selección activado - Haga clic y arrastre para seleccionar el área de firma', 'info');
    addLog('💡 Tip: Una vez creada, puede mover el rectángulo o usar las esquinas para redimensionar', 'info');
}

function createResizeHandles() {
    // Eliminar handles existentes
    document.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
    
    // Crear 8 handles (4 esquinas + 4 lados)
    const handlePositions = [
        { class: 'nw-resize', position: 'top-left' },
        { class: 'n-resize', position: 'top-center' },
        { class: 'ne-resize', position: 'top-right' },
        { class: 'e-resize', position: 'middle-right' },
        { class: 'se-resize', position: 'bottom-right' },
        { class: 's-resize', position: 'bottom-center' },
        { class: 'sw-resize', position: 'bottom-left' },
        { class: 'w-resize', position: 'middle-left' }
    ];
    
    handlePositions.forEach(({ class: cursorClass, position }) => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${position}`;
        handle.style.cssText = `
            position: absolute;
            width: 8px;
            height: 8px;
            background: #007bff;
            border: 1px solid white;
            cursor: ${cursorClass};
            display: none;
            z-index: 1000;
        `;
        handle.dataset.position = position;
        pdfPreviewContainer.appendChild(handle);
    });
}

// Event listeners mejorados para el canvas
pdfCanvas.addEventListener('mousedown', handleCanvasMouseDown);
pdfCanvas.addEventListener('mousemove', handleCanvasMouseMove);
pdfCanvas.addEventListener('mouseup', handleCanvasMouseUp);
document.addEventListener('mousemove', handleDocumentMouseMove);
document.addEventListener('mouseup', handleDocumentMouseUp);

function handleCanvasMouseDown(e) {
    e.preventDefault();
    const rect = pdfCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Verificar si hay un área de firma existente
    const existingCoords = fileConfigurations[currentFileIndex]?.signatureCoords;
    
    if (existingCoords && existingCoords.page === currentPageNum) {
        const canvasWidth = pdfCanvas.width;
        const canvasHeight = pdfCanvas.height;
        
        const left = (existingCoords.x1 / canvasWidth) * rect.width;
        const top = (existingCoords.y1 / canvasHeight) * rect.height;
        const width = ((existingCoords.x2 - existingCoords.x1) / canvasWidth) * rect.width;
        const height = ((existingCoords.y2 - existingCoords.y1) / canvasHeight) * rect.height;
        
        // Verificar si el clic está dentro del rectángulo existente
        if (mouseX >= left && mouseX <= left + width && 
            mouseY >= top && mouseY <= top + height) {
            
            // Verificar si está en un handle de redimensionamiento
            const handleSize = 8;
            const handles = [
                { x: left, y: top, cursor: 'nw-resize', type: 'nw' },
                { x: left + width/2, y: top, cursor: 'n-resize', type: 'n' },
                { x: left + width, y: top, cursor: 'ne-resize', type: 'ne' },
                { x: left + width, y: top + height/2, cursor: 'e-resize', type: 'e' },
                { x: left + width, y: top + height, cursor: 'se-resize', type: 'se' },
                { x: left + width/2, y: top + height, cursor: 's-resize', type: 's' },
                { x: left, y: top + height, cursor: 'sw-resize', type: 'sw' },
                { x: left, y: top + height/2, cursor: 'w-resize', type: 'w' }
            ];
            
            for (let handle of handles) {
                if (Math.abs(mouseX - handle.x) <= handleSize && 
                    Math.abs(mouseY - handle.y) <= handleSize) {
                    signatureMode = 'resizing';
                    resizeHandle = handle.type;
                    dragStartX = mouseX;
                    dragStartY = mouseY;
                    originalRect = { left, top, width, height };
                    pdfCanvas.style.cursor = handle.cursor;
                    return;
                }
            }
            
            // Si no está en un handle, iniciar movimiento
            signatureMode = 'moving';
            dragStartX = mouseX;
            dragStartY = mouseY;
            originalRect = { left, top, width, height };
            pdfCanvas.style.cursor = 'move';
            return;
        }
    }
    
    // Si no hay rectángulo existente o el clic está fuera, crear nuevo
    if (signatureMode === 'selecting') {
        signatureMode = 'creating';
        dragStartX = mouseX;
        dragStartY = mouseY;
        
        // Inicializar el selector
        signatureSelector.style.display = 'block';
        signatureSelector.style.left = mouseX + 'px';
        signatureSelector.style.top = mouseY + 'px';
        signatureSelector.style.width = '0px';
        signatureSelector.style.height = '0px';
        signatureSelector.style.border = '2px dashed #007bff';
        signatureSelector.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
    }
}

function handleCanvasMouseMove(e) {
    if (signatureMode === 'none') return;
    
    const rect = pdfCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Actualizar cursor basado en la posición
    updateCursorForPosition(mouseX, mouseY);
}

function handleDocumentMouseMove(e) {
    if (signatureMode === 'creating') {
        const rect = pdfCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        // Calcular dimensiones del rectángulo
        const width = Math.abs(currentX - dragStartX);
        const height = Math.abs(currentY - dragStartY);
        const left = Math.min(dragStartX, currentX);
        const top = Math.min(dragStartY, currentY);
        
        // Actualizar el selector visual
        signatureSelector.style.left = left + 'px';
        signatureSelector.style.top = top + 'px';
        signatureSelector.style.width = width + 'px';
        signatureSelector.style.height = height + 'px';
        
    } else if (signatureMode === 'moving') {
        const rect = pdfCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const deltaX = currentX - dragStartX;
        const deltaY = currentY - dragStartY;
        
        const newLeft = Math.max(0, Math.min(rect.width - originalRect.width, originalRect.left + deltaX));
        const newTop = Math.max(0, Math.min(rect.height - originalRect.height, originalRect.top + deltaY));
        
        // Actualizar posición visual
        signatureSelector.style.left = newLeft + 'px';
        signatureSelector.style.top = newTop + 'px';
        
    } else if (signatureMode === 'resizing') {
        const rect = pdfCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const deltaX = currentX - dragStartX;
        const deltaY = currentY - dragStartY;
        
        let newLeft = originalRect.left;
        let newTop = originalRect.top;
        let newWidth = originalRect.width;
        let newHeight = originalRect.height;
        
        // Aplicar cambios según el handle
        switch (resizeHandle) {
            case 'nw':
                newLeft = Math.min(originalRect.left + deltaX, originalRect.left + originalRect.width - 10);
                newTop = Math.min(originalRect.top + deltaY, originalRect.top + originalRect.height - 10);
                newWidth = originalRect.width - (newLeft - originalRect.left);
                newHeight = originalRect.height - (newTop - originalRect.top);
                break;
            case 'n':
                newTop = Math.min(originalRect.top + deltaY, originalRect.top + originalRect.height - 10);
                newHeight = originalRect.height - (newTop - originalRect.top);
                break;
            case 'ne':
                newTop = Math.min(originalRect.top + deltaY, originalRect.top + originalRect.height - 10);
                newWidth = Math.max(10, originalRect.width + deltaX);
                newHeight = originalRect.height - (newTop - originalRect.top);
                break;
            case 'e':
                newWidth = Math.max(10, originalRect.width + deltaX);
                break;
            case 'se':
                newWidth = Math.max(10, originalRect.width + deltaX);
                newHeight = Math.max(10, originalRect.height + deltaY);
                break;
            case 's':
                newHeight = Math.max(10, originalRect.height + deltaY);
                break;
            case 'sw':
                newLeft = Math.min(originalRect.left + deltaX, originalRect.left + originalRect.width - 10);
                newWidth = originalRect.width - (newLeft - originalRect.left);
                newHeight = Math.max(10, originalRect.height + deltaY);
                break;
            case 'w':
                newLeft = Math.min(originalRect.left + deltaX, originalRect.left + originalRect.width - 10);
                newWidth = originalRect.width - (newLeft - originalRect.left);
                break;
        }
        
        // Aplicar límites del canvas
        newLeft = Math.max(0, Math.min(rect.width - newWidth, newLeft));
        newTop = Math.max(0, Math.min(rect.height - newHeight, newTop));
        
        // Actualizar posición visual
        signatureSelector.style.left = newLeft + 'px';
        signatureSelector.style.top = newTop + 'px';
        signatureSelector.style.width = newWidth + 'px';
        signatureSelector.style.height = newHeight + 'px';
    }
}

function handleDocumentMouseUp(e) {
    if (signatureMode === 'creating') {
        const rect = pdfCanvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        
        // Calcular coordenadas finales
        const canvasWidth = pdfCanvas.width;
        const canvasHeight = pdfCanvas.height;
        
        const x1 = Math.min(dragStartX, endX) / rect.width * canvasWidth;
        const y1 = Math.min(dragStartY, endY) / rect.height * canvasHeight;
        const x2 = Math.max(dragStartX, endX) / rect.width * canvasWidth;
        const y2 = Math.max(dragStartY, endY) / rect.height * canvasHeight;
        
        // Validar que el área tenga un tamaño mínimo
        if (Math.abs(x2 - x1) > 10 && Math.abs(y2 - y1) > 10) {
            saveSignatureCoords(x1, y1, x2, y2);
            addLog(`✅ Área de firma creada para ${selectedFiles[currentFileIndex].name}`, 'success');
        } else {
            signatureSelector.style.display = 'none';
            addLog('⚠️ El área seleccionada es muy pequeña. Intente nuevamente.', 'warning');
        }
        
        signatureMode = 'none';
        pdfCanvas.style.cursor = 'default';
        
    } else if (signatureMode === 'moving' || signatureMode === 'resizing') {
        // Guardar nueva posición/tamaño
        const rect = pdfCanvas.getBoundingClientRect();
        const canvasWidth = pdfCanvas.width;
        const canvasHeight = pdfCanvas.height;
        
        const selectorRect = signatureSelector.getBoundingClientRect();
        const canvasRect = pdfCanvas.getBoundingClientRect();
        
        const x1 = (selectorRect.left - canvasRect.left) / rect.width * canvasWidth;
        const y1 = (selectorRect.top - canvasRect.top) / rect.height * canvasHeight;
        const x2 = x1 + (selectorRect.width / rect.width * canvasWidth);
        const y2 = y1 + (selectorRect.height / rect.height * canvasHeight);
        
        saveSignatureCoords(x1, y1, x2, y2);
        
        const action = signatureMode === 'moving' ? 'movida' : 'redimensionada';
        addLog(`✅ Área de firma ${action} para ${selectedFiles[currentFileIndex].name}`, 'success');
        
        signatureMode = 'none';
        pdfCanvas.style.cursor = 'default';
        resizeHandle = null;
        originalRect = null;
    }
}

function handleCanvasMouseUp(e) {
    // Este método se mantiene para compatibilidad pero la lógica principal está en handleDocumentMouseUp
}

function updateCursorForPosition(mouseX, mouseY) {
    if (signatureMode !== 'none') return;
    
    const existingCoords = fileConfigurations[currentFileIndex]?.signatureCoords;
    if (!existingCoords || existingCoords.page !== currentPageNum) {
        pdfCanvas.style.cursor = 'default';
        return;
    }
    
    const rect = pdfCanvas.getBoundingClientRect();
    const canvasWidth = pdfCanvas.width;
    const canvasHeight = pdfCanvas.height;
    
    const left = (existingCoords.x1 / canvasWidth) * rect.width;
    const top = (existingCoords.y1 / canvasHeight) * rect.height;
    const width = ((existingCoords.x2 - existingCoords.x1) / canvasWidth) * rect.width;
    const height = ((existingCoords.y2 - existingCoords.y1) / canvasHeight) * rect.height;
    
    // Verificar handles de redimensionamiento
    const handleSize = 8;
    const handles = [
        { x: left, y: top, cursor: 'nw-resize' },
        { x: left + width/2, y: top, cursor: 'n-resize' },
        { x: left + width, y: top, cursor: 'ne-resize' },
        { x: left + width, y: top + height/2, cursor: 'e-resize' },
        { x: left + width, y: top + height, cursor: 'se-resize' },
        { x: left + width/2, y: top + height, cursor: 's-resize' },
        { x: left, y: top + height, cursor: 'sw-resize' },
        { x: left, y: top + height/2, cursor: 'w-resize' }
    ];
    
    for (let handle of handles) {
        if (Math.abs(mouseX - handle.x) <= handleSize && 
            Math.abs(mouseY - handle.y) <= handleSize) {
            pdfCanvas.style.cursor = handle.cursor;
            return;
        }
    }
    
    // Verificar si está dentro del rectángulo
    if (mouseX >= left && mouseX <= left + width && 
        mouseY >= top && mouseY <= top + height) {
        pdfCanvas.style.cursor = 'move';
    } else {
        pdfCanvas.style.cursor = 'default';
    }
}

function saveSignatureCoords(x1, y1, x2, y2) {
    // Validar que las coordenadas sean válidas
    if (x1 < 0 || y1 < 0 || x2 < 0 || y2 < 0) {
        addLog('⚠️ Error: Las coordenadas no pueden ser negativas', 'warning');
        return;
    }
    
    // Validar que las coordenadas estén dentro del canvas
    const canvasWidth = pdfCanvas.width;
    const canvasHeight = pdfCanvas.height;
    
    if (x1 >= canvasWidth || x2 >= canvasWidth || y1 >= canvasHeight || y2 >= canvasHeight) {
        addLog('⚠️ Error: Las coordenadas están fuera del documento', 'warning');
        return;
    }
    
    // Asegurar que x1,y1 sea la esquina superior izquierda y x2,y2 la inferior derecha
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    
    const coords = { 
        x1: Math.max(0, minX), 
        y1: Math.max(0, minY), 
        x2: Math.min(canvasWidth, maxX), 
        y2: Math.min(canvasHeight, maxY), 
        page: currentPageNum 
    };
    
    fileConfigurations[currentFileIndex].signatureCoords = coords;
    
    // Mostrar coordenadas
    signatureCoords.style.display = 'block';
    coordsText.textContent = `Página ${currentPageNum}: (${Math.round(coords.x1)}, ${Math.round(coords.y1)}) - (${Math.round(coords.x2)}, ${Math.round(coords.y2)})`;
    
    // Actualizar estilo del selector para mostrar que está guardado
    signatureSelector.style.border = '2px solid #28a745';
    signatureSelector.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
    
    addLog(`✅ Coordenadas de firma validadas y guardadas: (${Math.round(coords.x1)}, ${Math.round(coords.y1)}) - (${Math.round(coords.x2)}, ${Math.round(coords.y2)})`, 'success');
}

function clearSignatureArea() {
    signatureSelector.style.display = 'none';
    signatureCoords.style.display = 'none';
    
    if (fileConfigurations[currentFileIndex]) {
        fileConfigurations[currentFileIndex].signatureCoords = null;
    }
    
    addLog(`Área de firma eliminada para ${selectedFiles[currentFileIndex].name}`, 'info');
}

function showExistingSignatureArea() {
    const coords = fileConfigurations[currentFileIndex]?.signatureCoords;
    
    if (coords && coords.page === currentPageNum) {
        const rect = pdfCanvas.getBoundingClientRect();
        const canvasWidth = pdfCanvas.width;
        const canvasHeight = pdfCanvas.height;
        
        const left = (coords.x1 / canvasWidth) * rect.width;
        const top = (coords.y1 / canvasHeight) * rect.height;
        const width = ((coords.x2 - coords.x1) / canvasWidth) * rect.width;
        const height = ((coords.y2 - coords.y1) / canvasHeight) * rect.height;
        
        signatureSelector.style.display = 'block';
        signatureSelector.style.left = left + 'px';
        signatureSelector.style.top = top + 'px';
        signatureSelector.style.width = width + 'px';
        signatureSelector.style.height = height + 'px';
        signatureSelector.style.border = '2px solid #28a745';
        signatureSelector.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        
        signatureCoords.style.display = 'block';
        coordsText.textContent = `Página ${coords.page}: (${Math.round(coords.x1)}, ${Math.round(coords.y1)}) - (${Math.round(coords.x2)}, ${Math.round(coords.y2)})`;
    } else {
        signatureSelector.style.display = 'none';
        signatureCoords.style.display = 'none';
    }
}

function generateProcessSummary() {
    const filesWithSignature = selectedFiles.filter((file, index) => 
        fileConfigurations[index].requiresSignature
    ).length;
    
    const filesWithoutSignature = selectedFiles.length - filesWithSignature;
    
    let summary = `
        <div class="summary-section">
            <h3><i class="fas fa-folder"></i> Carpeta Destino</h3>
            <p>${selectedFolder.folder_name}</p>
        </div>
        
        <div class="summary-section">
            <h3><i class="fas fa-file-pdf"></i> Archivos a Procesar</h3>
            <p>Total: ${selectedFiles.length} archivos</p>
            <p>Con firma: ${filesWithSignature} archivos</p>
            <p>Sin firma: ${filesWithoutSignature} archivos</p>
        </div>
        
        <div class="summary-section">
            <h3><i class="fas fa-cog"></i> Configuración</h3>
            <p>Prefijo: ${prefixInput.value.trim() || 'Ninguno'}</p>
            <p>Usuarios cargados: ${users.total_users}</p>
        </div>
    `;
    
    if (filesWithSignature > 0) {
        summary += `
            <div class="summary-section">
                <h3><i class="fas fa-signature"></i> Archivos con Firma</h3>
                <ul>
        `;
        
        selectedFiles.forEach((file, index) => {
            if (fileConfigurations[index].requiresSignature) {
                const hasCoords = fileConfigurations[index].signatureCoords !== null;
                summary += `
                    <li>
                        ${file.name} 
                        ${hasCoords ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-exclamation-triangle text-warning"></i>'}
                        ${hasCoords ? 'Área definida' : 'Sin área definida'}
                    </li>
                `;
            }
        });
        
        summary += `
                </ul>
            </div>
        `;
    }
    
    processSummary.innerHTML = summary;
}

function updatePrefixPreview() {
    const prefix = prefixInput.value.trim();
    prefixPreview.textContent = prefix ? `${prefix}_[USERNAME].pdf` : '[USERNAME].pdf';
}

function showConfirmModal() {
    let content = `
        <p><strong>¿Está seguro de que desea procesar estos documentos?</strong></p>
        <p>Se procesarán ${selectedFiles.length} archivos y se subirán a la carpeta "${selectedFolder.folder_name}".</p>
    `;
    
    const filesWithSignature = selectedFiles.filter((file, index) => 
        fileConfigurations[index].requiresSignature
    );
    
    if (filesWithSignature.length > 0) {
        const filesWithoutCoords = filesWithSignature.filter((file, originalIndex) => {
            const index = selectedFiles.indexOf(file);
            return !fileConfigurations[index].signatureCoords;
        });
        
        if (filesWithoutCoords.length > 0) {
            content += `
                <div class="alert alert-warning">
                    <strong>Advertencia:</strong> ${filesWithoutCoords.length} archivo(s) requieren firma pero no tienen área definida.
                    Se subirán sin coordenadas específicas de firma.
                </div>
            `;
        }
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
        
        progressSection.style.display = 'block';
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="loading"></span> Procesando...';
        
        const formData = new FormData();
        
        // Agregar archivos
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        // Agregar configuraciones
        formData.append('folder_id', selectedFolder.folder_id);
        formData.append('api_key', HARDCODED_API_KEY);
        
        // Agregar configuraciones de firma por archivo
        const signatureConfigs = {};
        selectedFiles.forEach((file, index) => {
            if (fileConfigurations[index].requiresSignature) {
                signatureConfigs[file.name] = {
                    requiresSignature: true,
                    signatureCoords: fileConfigurations[index].signatureCoords
                };
            } else {
                signatureConfigs[file.name] = {
                    requiresSignature: false,
                    signatureCoords: null
                };
            }
        });
        
        formData.append('signature_coordinates', JSON.stringify(signatureConfigs));
        
        const prefix = prefixInput.value.trim();
        if (prefix) {
            formData.append('prefix', prefix);
        }
        
        // Agregar configuración de notificación
        const sendNotification = sendNotificationCheckbox.checked;
        formData.append('send_notification', sendNotification.toString());
        
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
            resultsSection.style.display = 'block';
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
    }
}

function updateProgress(percentage, text) {
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = text;
}

function showResults(result, success) {
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
}

// Funciones de utilidad
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
