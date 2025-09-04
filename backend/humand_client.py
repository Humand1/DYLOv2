import requests
import json
from typing import List, Optional
from .models import ProcessedFile, APISignatureCoordinates, SignatureStatus

class HumandClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api-prod.humand.co/public/api/v1"
        self.headers = {
            'Accept': 'application/json',
            'Authorization': f"Basic {self.api_key}"
        }
    
    def upload_file(self, 
                   processed_file: ProcessedFile,
                   folder_id: str,
                   signature_status: SignatureStatus = SignatureStatus.SIGNATURE_NOT_NEEDED,
                   signature_coordinates: Optional[List[APISignatureCoordinates]] = None) -> dict:
        """Sube un archivo procesado a la plataforma Humand"""
        
        # Solo subir archivos que tienen username válido
        if not processed_file.is_username:
            return {
                'success': False,
                'message': f'Archivo {processed_file.filename} saltado: {processed_file.identifier} no es un username válido',
                'status_code': 0
            }
        
        try:
            # Preparar los datos para la API
            payload = {
                'folderId': str(folder_id),
                'name': processed_file.filename,
                'sendNotification': 'false',
                'signatureStatus': signature_status.value,
                'allowDisagreement': 'false'
            }
            
            # Si hay coordenadas de firma, añadirlas
            if signature_coordinates and signature_status == SignatureStatus.PENDING:
                coords_list = []
                for coord in signature_coordinates:
                    coords_list.append({
                        'page': coord.page,
                        'x': coord.x,
                        'y': coord.y,
                        'width': coord.width,
                        'height': coord.height
                    })
                payload['signatureCoordinates'] = json.dumps(coords_list)
            
            # Preparar el archivo
            with open(processed_file.file_path, 'rb') as file:
                files = [
                    ('file', (processed_file.filename, file, 'application/pdf'))
                ]
                
                # URL de la API - El username es parte de la URL
                url = f"{self.base_url}/users/{processed_file.identifier}/documents/files"
                
                # Realizar la solicitud a la API
                response = requests.post(
                    url,
                    headers=self.headers,
                    data=payload,
                    files=files
                )
                
                return {
                    'success': response.status_code in [200, 201],
                    'message': response.text,
                    'status_code': response.status_code,
                    'url': url,
                    'payload': payload
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'Error al subir archivo: {str(e)}',
                'status_code': 0
            }
    
    def upload_multiple_files(self,
                            processed_files: List[ProcessedFile],
                            folder_id: str,
                            signature_status: SignatureStatus = SignatureStatus.SIGNATURE_NOT_NEEDED,
                            signature_coordinates: Optional[List[APISignatureCoordinates]] = None) -> dict:
        """Sube múltiples archivos procesados a la plataforma Humand"""
        
        results = {
            'uploaded_files': 0,
            'total_files': len(processed_files),
            'errors': [],
            'success_details': [],
            'skipped_files': 0
        }
        
        for processed_file in processed_files:
            result = self.upload_file(
                processed_file=processed_file,
                folder_id=folder_id,
                signature_status=signature_status,
                signature_coordinates=signature_coordinates
            )
            
            if result['success']:
                results['uploaded_files'] += 1
                results['success_details'].append({
                    'filename': processed_file.filename,
                    'identifier': processed_file.identifier,
                    'pages': processed_file.pages
                })
            else:
                if 'no es un username válido' in result['message']:
                    results['skipped_files'] += 1
                else:
                    results['errors'].append({
                        'filename': processed_file.filename,
                        'error': result['message'],
                        'status_code': result.get('status_code', 0)
                    })
        
        return results
