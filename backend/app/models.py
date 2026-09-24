import uuid
from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base


class User(Base):
    __tablename__ = "users"

    # ID interno de la BD
    id = Column(Integer, primary_key=True, index=True)

    # ID público para la API
    public_id = Column(
        String(36),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: str(uuid.uuid4())
    )
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    credits = Column(Integer, default=3)
    is_admin = Column(Boolean, default=False)
    total_generated = Column(Integer, default=0)
    reset_token = Column(String, nullable=True)
