from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class SignatureStatus(str, Enum):
    PENDING = "PENDING"
    SIGNATURE_NOT_NEEDED = "SIGNATURE_NOT_NEEDED"

class NormalizedCoordinates(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class SignatureData(BaseModel):
    page: int
    normalized_coordinates: NormalizedCoordinates
    original_coordinates: Optional[Dict[str, Any]] = None

class APISignatureCoordinates(BaseModel):
    page: int
    x: float
    y: float
    width: float
    height: float

class UploadRequest(BaseModel):
    folder_id: str
    signature_status: SignatureStatus = SignatureStatus.SIGNATURE_NOT_NEEDED
    prefix: Optional[str] = None
    signature_coordinates: Optional[List[APISignatureCoordinates]] = None

class ProcessedFile(BaseModel):
    filename: str
    identifier: str
    pages: int
    file_path: str
    is_username: bool

class UploadResponse(BaseModel):
    success: bool
    message: str
    uploaded_files: int
    total_files: int
    errors: List[str] = []

class FolderInfo(BaseModel):
    folder_id: str
    folder_name: str

class UserInfo(BaseModel):
    username: str
    rfc: str
