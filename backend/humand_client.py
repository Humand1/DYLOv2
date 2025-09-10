import requests
import json
import os
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
                   signature_coordinates: Optional[List[APISignatureCoordinates]] = None,
                   send_notification: bool = True) -> dict:
        """Sube un archivo procesado a la plataforma Humand"""
        
        # Solo subir archivos que tienen username válido
        if not processed_file.is_username:
            return {
                'success': False,
                'message': f'Archivo {processed_file.filename} saltado: {processed_file.identifier} no es un username válido',
                'status_code': 0
            }
        
        try:
            # Verificar que el archivo existe antes de intentar subirlo
            if not os.path.exists(processed_file.file_path):
                return {
                    'success': False,
                    'message': f'Archivo no encontrado: {processed_file.file_path}',
                    'status_code': 0
                }
            
            print(f"[HUMAND_CLIENT] Subiendo archivo: {processed_file.filename} desde {processed_file.file_path}")
            
            # Logging detallado del signature_status recibido
            print(f"[HUMAND_DEBUG] Parámetros recibidos:")
            print(f"[HUMAND_DEBUG]   signature_status: {signature_status}")
            print(f"[HUMAND_DEBUG]   signature_coordinates: {signature_coordinates is not None}")
            print(f"[HUMAND_DEBUG]   send_notification: {send_notification}")
            
            # Preparar los datos para la API
            payload = {
                'folderId': str(folder_id),
                'name': processed_file.filename,
                'sendNotification': 'true' if send_notification else 'false',
                'signatureStatus': signature_status.value,
                'allowDisagreement': 'false'
            }
            
            print(f"[HUMAND_DEBUG] Payload base creado:")
            print(f"[HUMAND_DEBUG]   signatureStatus: {payload['signatureStatus']}")
            
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
                print(f"[HUMAND_CLIENT] Coordenadas de firma añadidas: {len(coords_list)} coordenadas")
                print(f"[HUMAND_DEBUG] Coordenadas JSON: {payload['signatureCoordinates']}")
            else:
                print(f"[HUMAND_DEBUG] Sin coordenadas de firma (signature_coordinates={signature_coordinates is not None}, status={signature_status})")
            
            # Logging del payload final
            print(f"[HUMAND_DEBUG] Payload final a enviar:")
            for key, value in payload.items():
                if key == 'signatureCoordinates':
                    print(f"[HUMAND_DEBUG]   {key}: {value}")
                else:
                    print(f"[HUMAND_DEBUG]   {key}: {value}")
            
            # Preparar el archivo
            with open(processed_file.file_path, 'rb') as file:
                files = [
                    ('file', (processed_file.filename, file, 'application/pdf'))
                ]
                
                # URL de la API - El username es parte de la URL
                url = f"{self.base_url}/users/{processed_file.identifier}/documents/files"
                print(f"[HUMAND_DEBUG] URL de la API: {url}")
                
                # Realizar la solicitud a la API
                response = requests.post(
                    url,
                    headers=self.headers,
                    data=payload,
                    files=files
                )
                
                print(f"[HUMAND_DEBUG] Respuesta de la API:")
                print(f"[HUMAND_DEBUG]   Status Code: {response.status_code}")
                print(f"[HUMAND_DEBUG]   Response: {response.text[:200]}...")
                
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
                            signature_coordinates: Optional[List[APISignatureCoordinates]] = None,
                            send_notification: bool = True) -> dict:
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
                signature_coordinates=signature_coordinates,
                send_notification=send_notification
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
