import io, os, zipfile, re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from docxtpl import DocxTemplate
from app import models, auth, schemas
from app.database import get_db
from jinja2 import Environment, ChainableUndefined

router = APIRouter(tags=["Documentos"])

def a_camel_case(texto: str) -> str:
    """Convierte cualquier texto o clave a camelCase sin acentos ni caracteres raros."""
    texto_sin_acentos = ''.join(
        c for c in schemas.unicodedata.normalize('NFD', str(texto)) 
        if schemas.unicodedata.category(c) != 'Mn'
    )
    palabras = re.sub(r'[^a-zA-Z0-9]', ' ', texto_sin_acentos).split()
    if not palabras:
        return ""
    return palabras[0].lower() + ''.join(p.capitalize() for p in palabras[1:])

# --- RUTAS DE GENERACIÓN (Protegidas) ---
@router.get("/plantillas-disponibles")
async def listar_plantillas(
    current_user: models.User = Depends(auth.get_current_user)
):
    carpeta = "app/plantillas"

    # Crear la carpeta si todavía no existe
    os.makedirs(carpeta, exist_ok=True)

    plantillas = []

    # Recorrer el contenido de app/plantillas
    for nombre in os.listdir(carpeta):

        ruta = os.path.join(carpeta, nombre)

        # --------------------------------------------------
        # ARCHIVO DIRECTAMENTE DENTRO DE /plantillas
        # --------------------------------------------------
        if os.path.isfile(ruta):

            if (
                nombre.lower().endswith(".docx")
                and not nombre.startswith("~$")
            ):
                plantillas.append({
                    "tipo": "archivo",
                    "nombre": nombre,
                    "ruta": nombre
                })

        # --------------------------------------------------
        # CARPETA DENTRO DE /plantillas
        # --------------------------------------------------
        elif os.path.isdir(ruta):

            archivos = []

            # Buscar archivos dentro de la carpeta
            for archivo in os.listdir(ruta):

                ruta_archivo = os.path.join(ruta, archivo)

                if (
                    os.path.isfile(ruta_archivo)
                    and archivo.lower().endswith(".docx")
                    and not archivo.startswith("~$")
                ):
                    archivos.append({
                        "tipo": "archivo",
                        "nombre": archivo,
                        "ruta": os.path.join(nombre, archivo)
                    })

            plantillas.append({
                "tipo": "carpeta",
                "nombre": nombre,
                "archivos": archivos
            })

    return {
        "plantillas": plantillas
    }


@router.post("/generar-documentos")
async def generar_documentos(
    payload: schemas.DocumentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    costo_creditos = 1
    
    # 1. Comprobar créditos
    if current_user.credits < costo_creditos:
        raise HTTPException(
            status_code=402,
            detail="Créditos insuficientes. Por favor recarga tu cuenta."
        )

    # 2. Comprobar que haya plantillas
    if not payload.plantillas_seleccionadas:
        raise HTTPException(
            status_code=400,
            detail="Debes seleccionar al menos una plantilla."
        )

    # 3. Crear contexto
    contexto = {
        a_camel_case(k): v
        for k, v in payload.datos.items()
        if a_camel_case(k)
    }

    carpeta = "app/plantillas"
    archivos_generados = []

    # Entorno Jinja tolerante con variables inexistentes
    jinja_env = Environment(
        undefined=ChainableUndefined
    )

    # 4. Generar cada documento
    for nombre_plantilla in payload.plantillas_seleccionadas:

        ruta = os.path.join(carpeta, nombre_plantilla)

        if not os.path.exists(ruta):
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró la plantilla: {nombre_plantilla}"
            )

        print(f"Generando plantilla: {nombre_plantilla}")
        print(f"Contexto: {contexto}")

        doc = DocxTemplate(ruta)

        # Renderizar
        doc.render(
            contexto,
            jinja_env=jinja_env
        )

        # Guardar en memoria
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)

        archivos_generados.append(
            (
                f"Generado_{nombre_plantilla}",
                buffer.getvalue()
            )
        )

    # 5. Descontar crédito
    current_user.credits -= costo_creditos
    db.commit()

    # 6. Si solo hay un documento
    if len(archivos_generados) == 1:

        nombre_salida, contenido = archivos_generados[0]

        return StreamingResponse(
            io.BytesIO(contenido),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition":
                f'attachment; filename="{nombre_salida}"'
            }
        )

    # 7. Si hay varios documentos → ZIP
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(
        zip_buffer,
        "w",
        zipfile.ZIP_DEFLATED
    ) as zip_file:

        for nombre_salida, contenido in archivos_generados:
            zip_file.writestr(
                nombre_salida,
                contenido
            )

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition":
            'attachment; filename="Documentos_Generados.zip"'
        }
    )

    # Restar el crédito
    #current_user.credits -= costo_creditos
    #current_user.total_generated += 1
    #db.commit()

    # Retornar StreamingResponse (ZIP o Docx)
    # return StreamingResponse(...)