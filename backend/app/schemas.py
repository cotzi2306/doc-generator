from pydantic import BaseModel, EmailStr, model_validator
from typing import Dict, List, Any

# --- ESQUEMAS PYDANTIC ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str

    @model_validator(mode='after')
    def verify_passwords_match(self) -> 'UserCreate':
        if self.password != self.confirm_password:
            raise ValueError('Las contraseñas no coinciden')
        return self

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class CreditUpdate(BaseModel):
    credits: int

class DocumentRequest(BaseModel):
    datos: Dict[str, Any]
    plantillas_seleccionadas: List[str]