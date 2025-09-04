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
# from .pdf_processor import PDFProcessor  # Comentado temporalmente por problemas con PyMuPDF
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
        
        # Procesar el PDF - Comentado temporalmente
        # processor = PDFProcessor(usuarios_rfc)
        # processed_files = processor.process_pdf(temp_file.name, prefix)
        
        # Respuesta temporal para testing
        return {
            "success": False,
            "message": "Procesamiento de PDF temporalmente deshabilitado - PyMuPDF no instalado",
            "processed_files": [],
            "total_files": 0,
            "valid_usernames": 0,
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
        
        # Respuesta temporal para testing - PDF processing deshabilitado
        return {
            "success": False,
            "message": "Procesamiento y subida de documentos temporalmente deshabilitado - PyMuPDF no instalado",
            "uploaded_files": 0,
            "total_files": len(files),
            "skipped_files": len(files),
            "errors": [{"filename": f.filename, "error": "PyMuPDF no disponible"} for f in files],
            "success_details": []
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
