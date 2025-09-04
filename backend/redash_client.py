import requests
import json
from typing import List, Dict, Optional
from .models import FolderInfo, UserInfo

class RedashClient:
    def __init__(self):
        # Configuración de Redash para carpetas
        self.carpetas_base_url = "https://redash.humand.co/api/queries/16070"
        self.carpetas_query_api_key = "H56dhNvZMjStBDZbJ0sE4RcjWmcLl0KbxC1wj8IH"
        
        # Configuración de Redash para usuarios
        self.usuarios_base_url = "https://redash.humand.co/api/queries/16135"
        self.usuarios_query_api_key = "eTV0C6ViXb7kd4AMpr82h3XMX9kNyW8dSipciNAl"
        
        # API key de cuenta de Redash para headers de autorización
        self.redash_account_api_key = "Dk7JbOfKh7cBBDqFPu8TMMbwPLLsfAFgk29gSxy2"
        self.headers = {"Authorization": f"Key {self.redash_account_api_key}"}
    
    def refresh_carpetas_query(self) -> bool:
        """Fuerza la actualización de la query de carpetas en Redash"""
        try:
            refresh_url = f"{self.carpetas_base_url}/refresh"
            response = requests.post(refresh_url, headers=self.headers)
            return response.status_code == 200
        except Exception:
            return False
    
    def refresh_usuarios_query(self) -> bool:
        """Fuerza la actualización de la query de usuarios en Redash"""
        try:
            refresh_url = f"{self.usuarios_base_url}/refresh"
            response = requests.post(refresh_url, headers=self.headers)
            return response.status_code == 200
        except Exception:
            return False
    
    def get_carpetas(self) -> List[FolderInfo]:
        """Obtiene las carpetas disponibles desde Redash"""
        try:
            # Hacer refresh para obtener datos frescos
            self.refresh_carpetas_query()
            
            # Obtener los resultados
            results_url = f"{self.carpetas_base_url}/results.json"
            params = {
                "api_key": self.carpetas_query_api_key,
                "max_age": 0
            }
            
            response = requests.get(results_url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                carpetas = []
                
                if ('query_result' in data and 
                    'data' in data['query_result'] and 
                    'rows' in data['query_result']['data']):
                    
                    for carpeta in data['query_result']['data']['rows']:
                        carpetas.append(FolderInfo(
                            folder_id=str(carpeta.get('folder_id', '')),
                            folder_name=carpeta.get('folder_name', 'Sin nombre')
                        ))
                
                return carpetas
            else:
                return []
        except Exception:
            return []
    
    def get_usuarios(self) -> Dict[str, str]:
        """Obtiene los usuarios con RFC desde Redash y retorna un diccionario RFC -> username"""
        try:
            # Hacer refresh para obtener datos frescos
            self.refresh_usuarios_query()
            
            # Obtener los resultados
            results_url = f"{self.usuarios_base_url}/results.json"
            params = {
                "api_key": self.usuarios_query_api_key,
                "max_age": 0
            }
            
            response = requests.get(results_url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                usuarios_rfc = {}
                
                if ('query_result' in data and 
                    'data' in data['query_result'] and 
                    'rows' in data['query_result']['data']):
                    
                    for usuario in data['query_result']['data']['rows']:
                        username = usuario.get('username')
                        rfc = usuario.get('RFC')
                        
                        if username and rfc:
                            # Normalizar RFC (quitar espacios y convertir a mayúsculas)
                            rfc_normalizado = rfc.strip().upper()
                            if len(rfc_normalizado) >= 10:  # RFC válido debe tener al menos 10 caracteres
                                usuarios_rfc[rfc_normalizado] = username
                
                return usuarios_rfc
            else:
                return {}
        except Exception:
            return {}
