#!/usr/bin/env python3
"""
Script temporal para ejecutar el servidor localmente sin PyMuPDF
para poder ver los logs de signature_status en tiempo real
"""

import sys
import os
import tempfile
import json
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# Agregar el directorio actual al path para importar los módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Importar solo los módulos que no requieren PyMuPDF
try:
    from backend.models import (
        FolderInfo, SignatureStatus, APISignatureCoordinates, ProcessedFile
    )
    from backend.redash_client import RedashClient
    from backend.humand_client import HumandClient
except ImportError as e:
    print(f"Error importando módulos: {e}")
    print("Creando clases mock para testing...")
    
    # Crear clases mock para testing
    class SignatureStatus:
        PENDING = "PENDING"
        SIGNATURE_NOT_NEEDED = "SIGNATURE_NOT_NEEDED"
    
    class APISignatureCoordinates:
        def __init__(self, page, x, y, width, height):
            self.page = page
            self.x = x
            self.y = y
            self.width = width
            self.height = height
    
    class ProcessedFile:
        def __init__(self, filename, identifier, pages=1, file_path="", is_username=True):
            self.filename = filename
            self.identifier = identifier
            self.pages = pages
            self.file_path = file_path
            self.is_username = is_username
    
    class RedashClient:
        def get_carpetas(self):
            return [{"folder_id": "test", "folder_name": "Test Folder"}]
        
        def get_usuarios(self):
            return {"test@dylo.com": "test@dylo.com"}
    
    class HumandClient:
        def __init__(self, api_key):
            self.api_key = api_key
        
        def upload_file(self, processed_file, folder_id, signature_status, signature_coordinates=None, send_notification=True):
            print(f"[MOCK_HUMAND] Simulando upload de: {processed_file.filename}")
            print(f"[MOCK_HUMAND] signature_status: {signature_status}")
            print(f"[MOCK_HUMAND] signature_coordinates: {signature_coordinates is not None}")
            return {"success": True, "message": "Mock upload successful"}

app = FastAPI(title="DYLO Local Test Server", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos (frontend)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Instancias globales
redash_client = RedashClient()

# API Key hardcodeada
HARDCODED_API_KEY = 'NTQxMDcyMzpkMjJNc3RyNEh1VEtQSEl3NTJTSldlR1liaHI2R0dCVQ=='

@app.get("/")
async def read_root():
    """Endpoint raíz que sirve el frontend"""
    return {"message": "DYLO Local Test Server", "version": "1.0.0"}

@app.get("/api/folders")
async def get_folders():
    """Obtiene las carpetas disponibles desde Redash"""
    try:
        folders = redash_client.get_carpetas()
        return folders
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener carpetas: {str(e)}")

@app.get("/api/users")
async def get_users():
    """Obtiene los usuarios con RFC desde Redash"""
    try:
        usuarios = redash_client.get_usuarios()
        return {
            "total_users": len(usuarios),
            "users_sample": dict(list(usuarios.items())[:5]) if usuarios else {}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener usuarios: {str(e)}")

@app.post("/api/upload-documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    folder_id: str = Form(...),
    signature_status: str = Form("SIGNATURE_NOT_NEEDED"),
    prefix: Optional[str] = Form(None),
    signature_coordinates: Optional[str] = Form(None),
    send_notification: str = Form("true")
):
    """Procesa y sube múltiples archivos PDF a Humand - VERSION LOCAL PARA TESTING"""
    
    print(f"\n{'='*60}")
    print(f"[LOCAL_SERVER] INICIANDO PROCESAMIENTO DE DOCUMENTOS")
    print(f"{'='*60}")
    
    try:
        # Log del inicio del procesamiento
        print(f"[UPLOAD] Iniciando procesamiento de {len(files)} archivos")
        
        # Validar archivos PDF
        for file in files:
            if not file.filename.lower().endswith('.pdf'):
                raise HTTPException(status_code=400, detail=f"El archivo {file.filename} no es un PDF")
        
        # Obtener usuarios para el procesamiento
        usuarios_rfc = redash_client.get_usuarios()
        if not usuarios_rfc:
            raise HTTPException(status_code=500, detail="No se pudieron cargar los usuarios")
        
        print(f"[UPLOAD] Usuarios cargados: {len(usuarios_rfc)}")
        
        # Procesar configuraciones de firma
        signature_configs = {}
        if signature_coordinates:
            try:
                signature_configs = json.loads(signature_coordinates)
                print(f"[UPLOAD] Configuraciones de firma procesadas: {len(signature_configs)}")
                
                # Logging detallado de configuraciones de firma
                print(f"[SIGNATURE_DEBUG] Configuraciones de firma recibidas del frontend:")
                for filename, config in signature_configs.items():
                    requires_sig = config.get('requiresSignature', False)
                    has_coords = config.get('signatureCoords') is not None
                    print(f"[SIGNATURE_DEBUG]   {filename}: requiresSignature={requires_sig}, hasCoords={has_coords}")
                    if has_coords:
                        coords = config.get('signatureCoords')
                        print(f"[SIGNATURE_DEBUG]     Coords: page={coords.get('page')}, x={coords.get('x'):.4f}, y={coords.get('y'):.4f}")
                        
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Configuraciones de firma inválidas")
        
        # Convertir string a boolean
        send_notification_bool = send_notification.lower() == 'true'
        
        # Crear cliente de Humand
        humand_client = HumandClient(HARDCODED_API_KEY)
        
        uploaded_files = 0
        errors = []
        success_details = []
        
        for file_idx, file in enumerate(files):
            try:
                print(f"\n[UPLOAD] Procesando archivo {file_idx + 1}/{len(files)}: {file.filename}")
                
                # Obtener configuración de firma para este archivo
                file_signature_config = signature_configs.get(file.filename, {})
                requires_signature = file_signature_config.get('requiresSignature', False)
                coords = file_signature_config.get('signatureCoords')
                
                print(f"[UPLOAD] Configuración de firma - Requiere: {requires_signature}, Coords: {coords is not None}")
                
                # Simular archivos procesados (normalmente vendría del PDFProcessor)
                # Extraer RFC del nombre del archivo para simular
                filename_parts = file.filename.replace('.pdf', '').split('-')
                mock_rfc = filename_parts[1] if len(filename_parts) > 1 else "TESTUSER"
                mock_username = f"{mock_rfc.lower()}@dylo.com"
                
                # Crear archivo procesado simulado
                processed_file = ProcessedFile(
                    filename=f"{mock_username}.pdf",
                    identifier=mock_username,
                    pages=1,
                    file_path="/tmp/mock_file.pdf",
                    is_username=True
                )
                
                # Preparar datos de firma si es necesario
                signature_coordinates_list = None
                
                # Logging detallado del estado de firma para cada archivo
                print(f"[SIGNATURE_DEBUG] Procesando archivo: {processed_file.filename}")
                print(f"[SIGNATURE_DEBUG]   requires_signature: {requires_signature}")
                
                if requires_signature:
                    current_signature_status = SignatureStatus.PENDING
                    print(f"[SIGNATURE_DEBUG]   current_signature_status: {current_signature_status}")
                    print(f"[UPLOAD] Archivo marcado para firma digital: {processed_file.filename}")
                    
                    # Solo agregar coordenadas si existen
                    if coords:
                        signature_coordinates_list = [APISignatureCoordinates(
                            page=coords['page'],
                            x=coords['x'],
                            y=coords['y'],
                            width=coords['width'],
                            height=coords['height']
                        )]
                        print(f"[SIGNATURE_DEBUG]   signature_coordinates_list: Creada con {len(signature_coordinates_list)} coordenada(s)")
                        print(f"[UPLOAD] Coordenadas de firma aplicadas: página {coords['page']}")
                    else:
                        print(f"[SIGNATURE_DEBUG]   signature_coordinates_list: None (sin coordenadas)")
                        print(f"[UPLOAD] Firma requerida pero sin coordenadas específicas")
                else:
                    current_signature_status = SignatureStatus.SIGNATURE_NOT_NEEDED
                    print(f"[SIGNATURE_DEBUG]   current_signature_status: {current_signature_status}")
                    print(f"[SIGNATURE_DEBUG]   signature_coordinates_list: None (no requiere firma)")
                    print(f"[UPLOAD] Archivo sin requerimiento de firma: {processed_file.filename}")
                
                # Logging antes del upload
                print(f"[SIGNATURE_DEBUG] Enviando a Humand:")
                print(f"[SIGNATURE_DEBUG]   archivo: {processed_file.filename}")
                print(f"[SIGNATURE_DEBUG]   signature_status: {current_signature_status}")
                print(f"[SIGNATURE_DEBUG]   tiene_coordenadas: {signature_coordinates_list is not None}")
                
                # Subir a Humand usando el método correcto
                result = humand_client.upload_file(
                    processed_file=processed_file,
                    folder_id=folder_id,
                    signature_status=current_signature_status,
                    signature_coordinates=signature_coordinates_list,
                    send_notification=send_notification_bool
                )
                
                if result.get('success'):
                    uploaded_files += 1
                    success_details.append({
                        'filename': processed_file.filename,
                        'identifier': processed_file.identifier,
                        'pages': processed_file.pages
                    })
                    print(f"[UPLOAD] ✅ Subido exitosamente: {processed_file.filename}")
                else:
                    error_msg = result.get('message', 'Error desconocido')
                    errors.append({
                        'filename': processed_file.filename,
                        'error': error_msg
                    })
                    print(f"[UPLOAD] ❌ Error al subir: {processed_file.filename} - {error_msg}")
                
            except Exception as upload_error:
                error_msg = str(upload_error)
                errors.append({
                    'filename': file.filename,
                    'error': error_msg
                })
                print(f"[UPLOAD] ❌ Excepción al subir: {file.filename} - {error_msg}")
        
        print(f"\n[UPLOAD] Procesamiento completado - Subidos: {uploaded_files}, Errores: {len(errors)}")
        print(f"{'='*60}")
        
        return {
            "success": uploaded_files > 0,
            "message": f"Procesamiento completado. {uploaded_files} archivos subidos exitosamente.",
            "uploaded_files": uploaded_files,
            "total_files": len(files),
            "skipped_files": len(files) - uploaded_files,
            "errors": errors,
            "success_details": success_details
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"[UPLOAD] ❌ Error general en el proceso: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error en el proceso: {error_msg}")

@app.get("/health")
async def health_check():
    """Endpoint de verificación de salud"""
    return {"status": "healthy", "service": "DYLO Local Test Server"}

if __name__ == "__main__":
    print("🚀 Iniciando servidor local DYLO para testing de signature_status...")
    print("📍 Servidor disponible en: http://localhost:8000")
    print("📍 Frontend disponible en: http://localhost:8000/static/index.html")
    print("📋 Los logs aparecerán en esta consola en tiempo real")
    print("-" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
