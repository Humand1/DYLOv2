import fitz  # PyMuPDF
import re
import os
import tempfile
from typing import List, Dict, Optional, Tuple
from .models import ProcessedFile, SignatureData, APISignatureCoordinates

class PDFProcessor:
    def __init__(self, usuarios_rfc: Dict[str, str]):
        self.usuarios_rfc = usuarios_rfc  # RFC -> username mapping
    
    def extract_rfc_from_page(self, doc: fitz.Document, page_num: int) -> Optional[str]:
        """Extrae el RFC de una página de PDF"""
        try:
            page = doc[page_num]
            text = page.get_text()
            
            # Patrón para RFC mexicano: 4 letras + 6 dígitos + 3 caracteres alfanuméricos
            rfc_pattern = r'\b[A-Z]{4}\d{6}[A-Z0-9]{3}\b'
            rfc_matches = re.findall(rfc_pattern, text)
            
            if rfc_matches:
                return rfc_matches[0].upper()
            
            # Patrón más flexible (con espacios o guiones)
            rfc_pattern_flexible = r'\b[A-Z]{4}[\s\-]?\d{6}[\s\-]?[A-Z0-9]{3}\b'
            rfc_matches_flexible = re.findall(rfc_pattern_flexible, text)
            
            if rfc_matches_flexible:
                rfc = rfc_matches_flexible[0].replace(" ", "").replace("-", "").upper()
                if len(rfc) == 13:
                    return rfc
            
            return None
        except Exception:
            return None
    
    def process_pdf(self, pdf_path: str, prefix: Optional[str] = None) -> List[ProcessedFile]:
        """Procesa un PDF y lo separa por RFC, agrupando páginas con el mismo RFC"""
        processed_files = []
        
        try:
            doc = fitz.open(pdf_path)
            
            # Diccionario para agrupar páginas por RFC/identificador
            paginas_por_identificador = {}
            
            # Procesar cada página
            for page_num in range(len(doc)):
                rfc = self.extract_rfc_from_page(doc, page_num)
                
                if not rfc:
                    # Si no se encuentra RFC, usar un identificador genérico
                    rfc = f"SIN_RFC_PAGINA_{page_num + 1}"
                
                # Buscar el username correspondiente al RFC
                username = self.usuarios_rfc.get(rfc.upper())
                if username:
                    identificador = username
                    is_username = True
                else:
                    identificador = rfc
                    is_username = False
                
                # Agrupar páginas por identificador
                if identificador not in paginas_por_identificador:
                    paginas_por_identificador[identificador] = {
                        'pages': [],
                        'rfc': rfc,
                        'is_username': is_username
                    }
                
                paginas_por_identificador[identificador]['pages'].append(page_num)
            
            # Crear archivos separados para cada identificador
            for identificador, info in paginas_por_identificador.items():
                # Crear un nuevo documento
                new_doc = fitz.open()
                
                # Insertar todas las páginas correspondientes a este identificador
                for page_num in info['pages']:
                    new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                
                # Generar nombre de archivo
                if prefix:
                    filename = f"{prefix}_{identificador}.pdf"
                else:
                    filename = f"{identificador}.pdf"
                
                # Crear archivo temporal
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
                new_doc.save(temp_file.name)
                new_doc.close()
                
                # Crear objeto ProcessedFile
                processed_file = ProcessedFile(
                    filename=filename,
                    identifier=identificador,
                    pages=len(info['pages']),
                    file_path=temp_file.name,
                    is_username=info['is_username']
                )
                
                processed_files.append(processed_file)
            
            doc.close()
            return processed_files
            
        except Exception as e:
            raise Exception(f"Error al procesar PDF: {str(e)}")
    
    def convert_signature_coordinates(self, signature_data: SignatureData) -> Optional[APISignatureCoordinates]:
        """Convierte las coordenadas de firma del formato JSON al formato esperado por la API"""
        try:
            coords = signature_data.normalized_coordinates
            
            # Validar que las coordenadas estén en el rango válido (0-1)
            coords_list = [coords.x1, coords.y1, coords.x2, coords.y2]
            if not all(0 <= coord <= 1 for coord in coords_list):
                return None
            
            # Calcular x, y, width, height para la API
            x = min(coords.x1, coords.x2)
            y = min(coords.y1, coords.y2)
            width = abs(coords.x2 - coords.x1)
            height = abs(coords.y2 - coords.y1)
            
            # Asegurar que width y height sean al menos 0.01 (1% del documento)
            width = max(width, 0.01)
            height = max(height, 0.01)
            
            return APISignatureCoordinates(
                page=signature_data.page,
                x=x,
                y=y,
                width=width,
                height=height
            )
            
        except Exception:
            return None
    
    def cleanup_temp_files(self, processed_files: List[ProcessedFile]):
        """Limpia los archivos temporales creados durante el procesamiento"""
        for file in processed_files:
            try:
                if os.path.exists(file.file_path):
                    os.unlink(file.file_path)
            except Exception:
                pass  # Ignorar errores al limpiar archivos temporales
