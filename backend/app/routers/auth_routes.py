import secrets
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app import models, auth, schemas
from app.database import get_db

router = APIRouter(tags=["Autenticación"])

# --- RUTAS DE AUTENTICACIÓN ---
@router.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    hashed_pwd = auth.get_password_hash(user.password)
    
    # RESTRICCIÓN ESTRICTA DE ADMIN: Únicamente tu correo exacto será Administrador
    ADMIN_EMAIL = "admin@admin.com" # Cambia esto por tu correo real si lo deseas
    es_admin = (user.email.lower() == ADMIN_EMAIL.lower())
    
    new_user = models.User(
        name=user.name,
        email=user.email, 
        hashed_password=hashed_pwd, 
        credits=3, 
        is_admin=es_admin
    )
    db.add(new_user)
    db.commit()
    return {"message": "Usuario creado exitosamente"}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Correo o contraseña incorrectos")
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        # Por seguridad, no revelamos si el correo existe o no
        return {"message": "Si el correo está registrado, recibirás instrucciones."}
    
    # Generar token único de recuperación
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    db.commit()
    
    # SIMULACIÓN DE ENVÍO DE CORREO: En producción conectarías smtplib o SendGrid.
    # Para desarrollo, imprimimos el enlace directamente en la consola de Docker/Terminal.
    reset_link = f"http://localhost/reset-password?token={token}"
    print(f"\n[CORREO SIMULADO] Enlace de recuperación para {user.email}: {reset_link}\n")
    
    return {"message": "Se ha enviado un enlace de recuperación a tu correo (revisa la consola del servidor en desarrollo)."}

@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == payload.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    
    user.hashed_password = auth.get_password_hash(payload.new_password)
    user.reset_token = None # Invalidar token tras su uso
    db.commit()
    return {"message": "Contraseña actualizada exitosamente"}