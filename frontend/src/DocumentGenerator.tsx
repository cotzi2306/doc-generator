import React, { useState, useEffect } from 'react';

const DocumentGenerator: React.FC = () => {
  const [modo, setModo] = useState<'formulario' | 'texto'>('formulario');

  // Modo Formulario: campos dinámicos
  const [camposFormulario, setCamposFormulario] = useState<Array<{ clave: string; valor: string }>>([
    { clave: 'Nombre Alumno', valor: 'Carlos Martinez' },
    { clave: 'Nombre Proyecto', valor: 'Implementación del Sistema Integral de Gestión Documental 2026' },
    { clave: 'Área solicitante', valor: 'Departamento de Gestión Documental' },
    { clave: 'Profesor interino', valor: 'Profesor Jirafales' },
  ]);

  // Modo Texto Libre: acepta JSON o formato clave: valor
  const [textoLibre, setTextoLibre] = useState<string>(
`"Nombre Alumno": "Carlos Martinez",
"Nombre Proyecto": "Implementación del Sistema Integral de Gestión Documental 2026",
"Área solicitante": "Departamento de Gestión Documental",
"Profesor interino": "Profesor Jirafales"`
  );

  // Lista de plantillas disponibles y seleccionadas
  const [plantillas, setPlantillas] = useState<string[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Consultar plantillas del backend al cargar
  useEffect(() => {
    fetch('http://localhost:8000/plantillas-disponibles')
      .then(res => res.json())
      .then(data => {
        setPlantillas(data.plantillas || []);
        if (data.plantillas && data.plantillas.length > 0) {
          setSeleccionadas([data.plantillas[0]]);
        }
      })
      .catch(() => {
        // Fallback en caso de que el backend no responda de inmediato
        const fallback = ['plantilla_carta.docx', 'plantilla_reporte.docx'];
        setPlantillas(fallback);
        setSeleccionadas([fallback[0]]);
      });
  }, []);

  const handleCheckbox = (nombre: string) => {
    setSeleccionadas(prev =>
      prev.includes(nombre) ? prev.filter(p => p !== nombre) : [...prev, nombre]
    );
  };

  const handleCampoChange = (index: number, field: 'clave' | 'valor', value: string) => {
    const nuevos = [...camposFormulario];
    nuevos[index][field] = value;
    setCamposFormulario(nuevos);
  };

  const agregarCampo = () => {
    setCamposFormulario([...camposFormulario, { clave: '', valor: '' }]);
  };

  const eliminarCampo = (index: number) => {
    setCamposFormulario(camposFormulario.filter((_, i) => i !== index));
  };

  const parsearDatos = (): Record<string, any> => {
    if (modo === 'formulario') {
      const datos: Record<string, any> = {};
      camposFormulario.forEach(item => {
        if (item.clave.trim()) {
          datos[item.clave.trim()] = item.valor;
        }
      });
      return datos;
    } else {
      // Intentar parsear como JSON directo
      const textoLimpio = textoLibre.trim();
      try {
        const jsonIntent = textoLimpio.startsWith('{') ? textoLimpio : `{${textoLimpio}}`;
        return JSON.parse(jsonIntent);
      } catch {
        // Fallback: procesar línea por línea separando por ':'
        const resultado: Record<string, any> = {};
        const lineas = textoLimpio.split('\n');
        for (const linea of lineas) {
          const separador = linea.indexOf(':');
          if (separador !== -1) {
            let k = linea.slice(0, separador).trim();
            let v = linea.slice(separador + 1).trim();
            k = k.replace(/^["']|["']$/g, '');
            v = v.replace(/^["']|["',]$/g, '');
            if (k) resultado[k] = v;
          }
        }
        return resultado;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (seleccionadas.length === 0) {
      setError('Debes seleccionar al menos un archivo para rellenar.');
      return;
    }

    let payloadDatos: Record<string, any>;
    try {
      payloadDatos = parsearDatos();
      if (Object.keys(payloadDatos).length === 0) {
        throw new Error('No se detectaron datos válidos para reemplazar.');
      }
    } catch (err: any) {
      setError(`Error al leer los datos: ${err.message}`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/generar-documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datos: payloadDatos,
          plantillas_seleccionadas: seleccionadas,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Ocurrió un error al procesar los documentos.');
      }

      // Descargar archivo generado
      const blob = await res.blob();
      const esZip = seleccionadas.length > 1;
      const nombreDescarga = esZip ? 'Documentos_Generados.zip' : `Generado_${seleccionadas[0]}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreDescarga;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Generador Documental Dinámico</h2>
      <p className="text-sm text-gray-500 mb-6">
        Rellena plantillas de Word automáticamente a partir de datos estructurados o texto sin formato.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Selector de Entrada: Formulario vs Texto */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setModo('formulario')}
          className={`py-2 px-4 text-sm font-semibold border-b-2 transition ${
            modo === 'formulario'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Modo Formulario
        </button>
        <button
          type="button"
          onClick={() => setModo('texto')}
          className={`py-2 px-4 text-sm font-semibold border-b-2 transition ${
            modo === 'texto'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Modo Texto / JSON
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contenido según el modo */}
        {modo === 'formulario' ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Campos y valores:</label>
            {camposFormulario.map((campo, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Nombre de campo (ej. Profesor interino)"
                  value={campo.clave}
                  onChange={(e) => handleCampoChange(index, 'clave', e.target.value)}
                  className="w-1/2 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Valor"
                  value={campo.valor}
                  onChange={(e) => handleCampoChange(index, 'valor', e.target.value)}
                  className="w-1/2 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                {camposFormulario.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarCampo(index)}
                    className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
                    title="Eliminar fila"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={agregarCampo}
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold inline-block pt-1"
            >
              + Agregar otro campo
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pega aquí el bloque de texto o JSON:
            </label>
            <textarea
              rows={6}
              value={textoLibre}
              onChange={(e) => setTextoLibre(e.target.value)}
              placeholder={`"Nombre Alumno": "Carlos Martinez",\n"Nombre Proyecto": "Sistema 2026"`}
              className="w-full p-3 font-mono text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Las claves se normalizarán automáticamente a variables en formato camelCase (ej: <code>Profesor interino</code> → <code>{"{{ profesorInterino }}"}</code>).
            </p>
          </div>
        )}

        {/* Selección Múltiple de Plantillas */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Selecciona los archivos a generar:
          </label>
          {plantillas.length === 0 ? (
            <p className="text-xs text-gray-500">
              No se encontraron archivos en la carpeta <code>plantillas/</code>. Agrega archivos <code>.docx</code> en el backend.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plantillas.map(nombre => (
                <label key={nombre} className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(nombre)}
                    onChange={() => handleCheckbox(nombre)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>{nombre}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition duration-150 disabled:bg-blue-300"
        >
          {loading
            ? 'Generando documentos...'
            : seleccionadas.length > 1
            ? `Generar ${seleccionadas.length} documentos (Descargar .ZIP)`
            : 'Generar y Descargar Word'}
        </button>
      </form>
    </div>
  );
};

export default DocumentGenerator;