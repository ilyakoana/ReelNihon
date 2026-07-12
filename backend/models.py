"""
models.py
Modelos SQLAlchemy: contents, exercises, daily_reviews.
"""

import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date,
    ForeignKey, Text, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()


def gen_uuid():
    return str(uuid.uuid4())


class Content(Base):
    """
    Cada Reel/carrusel que se envía desde Telegram.
    """
    __tablename__ = "contents"

    id = Column(String, primary_key=True, default=gen_uuid)
    source_url = Column(String, nullable=False)
    folder_path = Column(String, nullable=False)  # /data/media/<id>/

    title = Column(String, nullable=True)
    summary = Column(Text, nullable=True)        # темарий generado por Gemini (markdown)
    natural_warning = Column(Text, nullable=True)  # avisos de japonés "de manual"

    status = Column(String, default="processing")  # processing | ready | error
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    exercises = relationship("Exercise", back_populates="content", cascade="all, delete-orphan")
    daily_reviews = relationship("DailyReview", back_populates="content", cascade="all, delete-orphan")


class Exercise(Base):
    """
    Ejercicio individual generado por Gemini para un content.
    """
    __tablename__ = "exercises"

    id = Column(String, primary_key=True, default=gen_uuid)
    content_id = Column(String, ForeignKey("contents.id"), nullable=False)

    type = Column(String, nullable=False)  # multiple_choice | fill_blank | roleplay | natural_or_not | translate
    question = Column(Text, nullable=False)
    options = Column(Text, nullable=True)   # JSON string con opciones, si aplica
    answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)  # por qué esa es la respuesta correcta

    difficulty = Column(Integer, default=1)  # 1-5, usado para priorizar en dailies

    created_at = Column(DateTime, default=datetime.utcnow)

    content = relationship("Content", back_populates="exercises")


class DailyReview(Base):
    """
    Registro de qué contents se han repasado en el modo Dailies.
    """
    __tablename__ = "daily_reviews"

    id = Column(String, primary_key=True, default=gen_uuid)
    content_id = Column(String, ForeignKey("contents.id"), nullable=False)

    review_date = Column(Date, default=date.today)
    completed = Column(Boolean, default=False)

    content = relationship("Content", back_populates="daily_reviews")


# --- Configuración del engine ---

DB_PATH = "/data/db/reelnihon.db"
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
