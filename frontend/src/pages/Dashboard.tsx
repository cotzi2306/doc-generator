import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { token, fetchProfile } = useContext(AuthContext);
  interface Archivo {
    tipo: "archivo";
    nombre: string;
    ruta: string;
  }

  interface Carpeta {
    tipo: "carpeta";
    nombre: string;
    archivos: Archivo[];
  }

type Plantilla = Archivo | Carpeta;

  
  const [modo, setModo] = useState<'formulario' | 'texto'>('formulario');
  const [camposFormulario, setCamposFormulario] = useState<Array<{ clave: string; valor: string }>>([
    { clave: 'Nombre Alumno', valor: 'Carlos Martinez' },
    { clave: 'Nombre Proyecto', valor: 'Sistema Integral 2026' }
  ]);
  const [textoLibre, setTextoLibre] = useState<string>('"Nombre Alumno": "Carlos Martinez",\n"Nombre Proyecto": "Sistema Integral 2026"');
  
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [carpetasAbiertas, setCarpetasAbiertas] = useState<string[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    fetch("http://localhost:8000/plantillas-disponibles", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Error al obtener las plantillas");
        }

        return res.json();
      })
      .then((data) => {
        setPlantillas(data.plantillas || []);
      })
      .catch((error) => {
        console.error("Error cargando plantillas:", error);
      });

  }, [token]);

  const toggleCarpeta = (nombre: string) => {
    setCarpetasAbiertas((actuales) => {
      if (actuales.includes(nombre)) {
        return actuales.filter(
          (carpeta) => carpeta !== nombre
        );
      }

      return [...actuales, nombre];
    });
  };

  const toggleArchivo = (ruta: string) => {
    setSeleccionadas((actuales) => {
      if (actuales.includes(ruta)) {
        return actuales.filter(
          (archivo) => archivo !== ruta
        );
      }

      return [...actuales, ruta];
    });
  };

  const parsearDatos = (): Record<string, any> => {
    if (modo === 'formulario') {
      const datos: Record<string, any> = {};
      camposFormulario.forEach(item => {
        if (item.clave.trim()) datos[item.clave.trim()] = item.valor;
      });
      return datos;
    } else {
      try {
        const jsonIntent = textoLibre.trim().startsWith('{') ? textoLibre : `{${textoLibre}}`;
        return JSON.parse(jsonIntent);
      } catch {
        const resultado: Record<string, any> = {};
        textoLibre.split('\n').forEach(linea => {
          const separador = linea.indexOf(':');
          if (separador !== -1) {
            let k = linea.slice(0, separador).trim().replace(/^["']|["']$/g, '');
            let v = linea.slice(separador + 1).trim().replace(/^["']|["',]$/g, '');
            if (k) resultado[k] = v;
          }
        });
        return resultado;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (seleccionadas.length === 0) {
      setError('Debes seleccionar al menos un archivo.');
      return;
    }

    let payloadDatos = parsearDatos();

    const payload = {
      datos: payloadDatos,
      plantillas_seleccionadas: seleccionadas,
    };

    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/generar-documentos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });


      if (!res.ok) {
        if (res.status === 402) throw new Error('Créditos insuficientes. Recarga tu cuenta.');
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Error al procesar los documentos.');
      }

        const contextoBase64 = res.headers.get('X-Contexto');

        if (contextoBase64) {
          const bytes = Uint8Array.from(
            atob(contextoBase64),
            c => c.charCodeAt(0)
          );
        
          const contexto = JSON.parse(
            new TextDecoder().decode(bytes)
          );
        
          console.log('CONTEXTO RECIBIDO DEL BACKEND:');
          console.log(contexto);
        }

      // Si todo sale bien, actualizamos los créditos visualmente
      fetchProfile();

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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Generar Documentos
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border-l-4 border-red-500">
          {error}
        </div>
      )}

      <div className="flex border-b mb-6">
        <button
          type="button"
          onClick={() => setModo("formulario")}
          className={`py-2 px-4 font-semibold ${modo === "formulario" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
        >
          Formulario
        </button>
        <button
          type="button"
          onClick={() => setModo("texto")}
          className={`py-2 px-4 font-semibold ${modo === "texto" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
        >
          Texto Libre o JSON
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {modo === "formulario" ? (
          <div className="space-y-2">
            {camposFormulario.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={c.clave}
                  onChange={(e) => {
                    const n = [...camposFormulario];
                    n[i].clave = e.target.value;
                    setCamposFormulario(n);
                  }}
                  className="w-1/2 p-2 border rounded"
                  placeholder="Campo"
                />
                <input
                  type="text"
                  value={c.valor}
                  onChange={(e) => {
                    const n = [...camposFormulario];
                    n[i].valor = e.target.value;
                    setCamposFormulario(n);
                  }}
                  className="w-1/2 p-2 border rounded"
                  placeholder="Valor"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setCamposFormulario([
                  ...camposFormulario,
                  { clave: "", valor: "" },
                ])
              }
              className="text-blue-600 text-sm font-bold"
            >
              + Agregar campo
            </button>
          </div>
        ) : (
          <textarea
            rows={5}
            value={textoLibre}
            onChange={(e) => setTextoLibre(e.target.value)}
            className="w-full p-2 border rounded text-sm font-mono"
          />
        )}

        <div>
          {plantillas.map((item) => {
            // ARCHIVO DIRECTO
            if (item.tipo === "archivo") {
              const seleccionado = seleccionadas.includes(item.ruta);

              return (
                <div key={item.ruta}>
                  <label>
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => toggleArchivo(item.ruta)}
                    />
                    📄 {item.nombre}
                  </label>
                </div>
              );
            }

            // CARPETA

            const abierta = carpetasAbiertas.includes(item.nombre);
            return (
              <div key={item.nombre}>
                <div
                  onClick={() => toggleCarpeta(item.nombre)}
                  style={{
                    cursor: "pointer",
                    fontWeight: "bold",
                    marginTop: "8px",
                  }}
                >
                  {abierta ? "📂" : "📁"} {item.nombre}
                </div>

                {abierta && (
                  <div style={{ marginLeft: "25px" }}>
                    {item.archivos.map((archivo) => {
                      const seleccionado = seleccionadas.includes(archivo.ruta);

                      return (
                        <div key={archivo.ruta}>
                          <label>
                            <input
                              type="checkbox"
                              checked={seleccionado}
                              onChange={() => toggleArchivo(archivo.ruta)}
                            />
                            📄 {archivo.nombre}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? "Procesando (1 crédito)..."
            : "Generar Documentos (-1 crédito)"}
        </button>
      </form>
    </div>
  );
};
export default Dashboard;