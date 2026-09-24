from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, auth, schemas
from app.database import get_db

router = APIRouter(tags=["Usuarios y Admin"])

# --- RUTAS DE USUARIO Y CRÉDITOS ---
@router.get("/admin/users")
def get_all_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")
    
    users = db.query(models.User).all()
    return [
        {
            "id": u.id, 
            "email": u.email, 
            "name" : u.name,
            "credits": u.credits, 
            "total_generated": u.total_generated, 
            "is_admin": u.is_admin
        } for u in users
    ]
@router.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # 1. Verificar que sea admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # 2. Medida de seguridad: evitar que el admin se borre a sí mismo por error
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de administrador.")
    
    # 3. Buscar y eliminar al usuario
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(target_user)
    db.commit()
    return {"message": "Usuario eliminado exitosamente"}

@router.get("/me")
def get_profile(current_user: models.User = Depends(auth.get_current_user)):
    return {"email": current_user.email, "name": current_user.name, "credits": current_user.credits, "is_admin": current_user.is_admin}

@router.post("/comprar-creditos")
def buy_credits(cantidad: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Aquí integrarías Stripe/PayPal. Por ahora, solo sumamos.
    current_user.credits += cantidad
    db.commit()
    return {"message": f"{cantidad} créditos agregados.", "total_credits": current_user.credits}

@router.patch("/admin/users/{user_id}/credits")
def update_user_credits(user_id: int, payload: schemas.CreditUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    target_user.credits = payload.credits
    db.commit()
    return {"message": "Créditos actualizados correctamente", "new_credits": target_user.credits}