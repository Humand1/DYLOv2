from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import tempfile
import os
from typing import List, Optional
import json

from .models import (
    UploadRequest, UploadResponse, FolderInfo, SignatureStatus,
    SignatureData, APISignatureCoordinates, ProcessedFile
)
from .redash_client import RedashClient
from .pdf_processor import PDFProcessor
from .humand_client import HumandClient

app = FastAPI(title="DYLO Document Upload API", version="1.0.0")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos (frontend)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Instancias globales
redash_client = RedashClient()

@app.get("/")
async def read_root():
    """Endpoint raíz que sirve el frontend"""
    return {"message": "DYLO Document Upload API", "version": "1.0.0"}

@app.get("/api/folders", response_model=List[FolderInfo])
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

@app.post("/api/process-pdf")
async def process_pdf(
    file: UploadFile = File(...),
    prefix: Optional[str] = Form(None)
):
    """Procesa un PDF y lo separa por RFC"""
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    # Crear archivo temporal
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    
    try:
        # Guardar el archivo subido
        content = await file.read()
        temp_file.write(content)
        temp_file.close()
        
        # Obtener usuarios para el procesamiento
        usuarios_rfc = redash_client.get_usuarios()
        if not usuarios_rfc:
            raise HTTPException(status_code=500, detail="No se pudieron cargar los usuarios")
        
        # Procesar el PDF
        processor = PDFProcessor(usuarios_rfc)
        processed_files = processor.process_pdf(temp_file.name, prefix)
        
        return {
            "success": True,
            "message": f"PDF procesado exitosamente. {len(processed_files)} archivos generados.",
            "processed_files": [
                {
                    "filename": pf.filename,
                    "username": pf.username,
                    "pages": pf.pages,
                    "file_path": pf.file_path
                } for pf in processed_files
            ],
            "total_files": len(processed_files),
            "valid_usernames": len(set(pf.username for pf in processed_files)),
            "pending_files": 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar PDF: {str(e)}")
    
    finally:
        # Limpiar archivo temporal original
        try:
            os.unlink(temp_file.name)
        except:
            pass

# API Key hardcodeada
HARDCODED_API_KEY = 'NTQxMDcyMzpkMjJNc3RyNEh1VEtQSEl3NTJTSldlR1liaHI2R0dCVQ=='

@app.post("/api/upload-documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    folder_id: str = Form(...),
    signature_status: str = Form("SIGNATURE_NOT_NEEDED"),
    prefix: Optional[str] = Form(None),
    signature_coordinates: Optional[str] = Form(None)
):
    """Procesa y sube múltiples archivos PDF a Humand"""
    
    # Validar archivos PDF
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail=f"El archivo {file.filename} no es un PDF")
    
    try:
        # Obtener usuarios para el procesamiento
        usuarios_rfc = redash_client.get_usuarios()
        if not usuarios_rfc:
            raise HTTPException(status_code=500, detail="No se pudieron cargar los usuarios")
        
        # Procesar configuraciones de firma
        signature_configs = {}
        if signature_coordinates:
            try:
                signature_configs = json.loads(signature_coordinates)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Configuraciones de firma inválidas")
        
        # Procesar archivos
        processor = PDFProcessor(usuarios_rfc)
        humand_client = HumandClient(HARDCODED_API_KEY)
        
        all_processed_files = []
        uploaded_files = 0
        errors = []
        success_details = []
        
        for file in files:
            try:
                # Crear archivo temporal
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                content = await file.read()
                temp_file.write(content)
                temp_file.close()
                
                # Obtener configuración de firma para este archivo
                file_signature_config = signature_configs.get(file.filename, {})
                requires_signature = file_signature_config.get('requiresSignature', False)
                coords = file_signature_config.get('signatureCoords')
                
                # Procesar PDF
                processed_files = processor.process_pdf(temp_file.name, prefix)
                all_processed_files.extend(processed_files)
                
                # Subir cada archivo procesado
                for processed_file in processed_files:
                    try:
                        # Preparar datos de firma si es necesario
                        signature_coordinates_list = None
                        signature_status = SignatureStatus.SIGNATURE_NOT_NEEDED
                        
                        if requires_signature and coords:
                            signature_status = SignatureStatus.PENDING
                            signature_coordinates_list = [APISignatureCoordinates(
                                page=coords['page'],
                                x=coords['x1'],
                                y=coords['y1'],
                                width=coords['x2'] - coords['x1'],
                                height=coords['y2'] - coords['y1']
                            )]
                        
                        # Subir a Humand usando el método correcto
                        result = humand_client.upload_file(
                            processed_file=processed_file,
                            folder_id=folder_id,
                            signature_status=signature_status,
                            signature_coordinates=signature_coordinates_list
                        )
                        
                        if result.get('success'):
                            uploaded_files += 1
                            success_details.append({
                                'filename': processed_file.filename,
                                'identifier': processed_file.identifier,
                                'pages': processed_file.pages
                            })
                        else:
                            errors.append({
                                'filename': processed_file.filename,
                                'error': result.get('message', 'Error desconocido')
                            })
                    
                    except Exception as upload_error:
                        errors.append({
                            'filename': processed_file.filename,
                            'error': str(upload_error)
                        })
                
                # Limpiar archivo temporal original
                try:
                    os.unlink(temp_file.name)
                except:
                    pass
                    
            except Exception as file_error:
                errors.append({
                    'filename': file.filename,
                    'error': str(file_error)
                })
        
        # Limpiar archivos procesados
        processor.cleanup_temp_files(all_processed_files)
        
        return {
            "success": uploaded_files > 0,
            "message": f"Procesamiento completado. {uploaded_files} archivos subidos exitosamente.",
            "uploaded_files": uploaded_files,
            "total_files": len(all_processed_files),
            "skipped_files": len(all_processed_files) - uploaded_files,
            "errors": errors,
            "success_details": success_details
        }
        
    except Exception as e:
        # Limpiar archivos temporales en caso de error
        if 'all_processed_files' in locals():
            processor.cleanup_temp_files(all_processed_files)
        
        raise HTTPException(status_code=500, detail=f"Error en el proceso: {str(e)}")

@app.get("/health")
async def health_check():
    """Endpoint de verificación de salud"""
    return {"status": "healthy", "service": "DYLO Document Upload API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
