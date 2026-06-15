import { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import type { ToolType } from './components/Toolbar';
import { GlassPanel } from './components/GlassPanel';
import { FloorPlanEditor } from './components/FloorPlanEditor';
import { useEditorState } from './hooks/useEditorState';
import { saveProject, updateProject, getProjectsList, loadProject, deleteProject } from './services/storage';
import { Loader, Folder, Save, X, Trash2, Upload, Plus, FolderOpen, Check, Pencil, RotateCw, Copy, Download, FileJson } from 'lucide-react';
import './App.css';

function App() {
  const [activeTool, setActiveTool] = useState<ToolType>('move');
  const [showFurnitureModal, setShowFurnitureModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [editingFurnitureId, setEditingFurnitureId] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    image,
    pixelsPerMeter,
    setPixelsPerMeter,
    handleImageUpload,
    furnitures,
    addFurniture,
    updateFurniture,
    removeFurniture,
    duplicateFurniture,
    calibrationLines,
    setCalibrationLines,
    projectId,
    setProjectId,
    projectName,
    setProjectName,
    unit,
    setUnit,
    exportState,
    importState
  } = useEditorState();

  const fromMeters = (m: number) => unit === 'cm' ? m * 100 : unit === 'mm' ? m * 1000 : m;
  const toMeters = (v: number) => unit === 'cm' ? v / 100 : unit === 'mm' ? v / 1000 : v;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const state = exportState();
      
      if (projectId) {
        await updateProject(projectId, projectName, state);
        alert('Proyecto actualizado exitosamente.');
      } else {
        const name = prompt('Ingresa un nombre para tu proyecto:', 'Mi Plano');
        if (name) {
          const newId = await saveProject(name, state);
          setProjectId(newId);
          setProjectName(name);
          alert('Proyecto guardado exitosamente.');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Hubo un error al guardar el proyecto.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadProjectsList = async () => {
    const list = await getProjectsList();
    setProjectsList(list);
  };

  useEffect(() => {
    loadProjectsList();
  }, []);

  const handleExportFile = () => {
    const state = exportState();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", (projectName || "proyecto") + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const state = JSON.parse(event.target?.result as string);
          // Set null project ID so it's treated as a new local project
          const newName = file.name.replace('.json', '');
          importState(state, null, newName);
          setActiveTool('move');
          setShowProjectsModal(false);
        } catch (e) {
          alert('Error al leer el archivo. Asegúrate de que sea un archivo JSON válido exportado previamente.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  useEffect(() => {
    if (!projectId || !projectName || !image) return;

    const timeout = setTimeout(() => {
      const state = exportState();
      updateProject(projectId, projectName, state).then(() => {
        loadProjectsList(); // Refresh list to update "last modified"
      }).catch(console.error);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [projectId, projectName, image, furnitures, pixelsPerMeter, calibrationLines]);

  const onImageUpload = (file: File) => {
    handleImageUpload(file);
    setActiveTool('calibrate');
  };

  const handleToolSelect = (tool: ToolType) => {
    if (tool === 'furniture') {
      if (!pixelsPerMeter) {
        alert("Primero calibra la escala para poder colocar muebles con dimensiones reales.");
        return;
      }
      setShowFurnitureModal(true);
    } else if (tool === 'upload') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        if (e.target.files?.[0]) onImageUpload(e.target.files[0]);
      };
      input.click();
    } else {
      setActiveTool(tool);
    }
  };

  const handleAddCalibrationLine = (distancePx: number) => {
    if (calibrationLines.length >= 3) {
      alert("Ya tienes 3 medidas de calibración. Aplica la escala para continuar.");
      return;
    }
    const valStr = prompt(`¿Cuántos ${unit === 'm' ? 'metros' : unit} reales mide la línea que acabas de trazar? (ej. ${unit === 'cm' ? '100' : '1.5'})`);
    if (valStr && !isNaN(parseFloat(valStr))) {
      setCalibrationLines([...calibrationLines, {
        id: Date.now().toString(),
        distancePx,
        valueMeters: toMeters(parseFloat(valStr))
      }]);
    }
  };

  const handleApplyCalibration = () => {
    if (calibrationLines.length === 0) return;
    const sumPpm = calibrationLines.reduce((acc, line) => acc + (line.distancePx / line.valueMeters), 0);
    const avgPpm = sumPpm / calibrationLines.length;
    setPixelsPerMeter(avgPpm);
    setCalibrationLines([]);
    setActiveTool('move');
    alert(`¡Escala aplicada con éxito! Promedio: ${Math.round(avgPpm)} px/m.`);
  };

  return (
    <div className="app-container">
      {/* Top Header/Status Area */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '20px' }}>
        <GlassPanel style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '250px' }} className="pointer-events-auto header-info-panel">
          <h1>{projectName || 'Room Planner'}</h1>
          <p className="text-muted">
            {pixelsPerMeter ? `Escala: ${Math.round(pixelsPerMeter)} px/m` : 'Escala: No definida'}
          </p>
          <div className="unit-switcher" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid var(--glass-border)', marginTop: '4px' }}>
            {(['m', 'cm', 'mm'] as const).map(u => (
              <button 
                key={u}
                onClick={() => setUnit(u)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: unit === u ? 'var(--accent-color)' : 'transparent',
                  color: unit === u ? 'white' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {u}
              </button>
            ))}
          </div>
        </GlassPanel>

        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          {image && (
            <GlassPanel style={{ padding: '8px' }} className="pointer-events-auto">
              <button 
                onClick={handleSave} 
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={isSaving}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSaving ? <Loader size={18} strokeWidth={2} className="animate-spin" /> : <Save size={18} strokeWidth={2} />}
                  <span className="btn-label">{isSaving ? 'Guardando...' : 'Guardar'}</span>
                </div>
              </button>
            </GlassPanel>
          )}

          <GlassPanel style={{ padding: '8px', display: 'flex', gap: '8px' }} className="pointer-events-auto">
            {image && (
              <button 
                onClick={handleExportFile} 
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                title="Exportar a Archivo (.json)"
              >
                <Download size={18} strokeWidth={2} />
              </button>
            )}
            <button 
              onClick={handleImportFile} 
              className="btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              title="Importar Archivo (.json)"
            >
              <FileJson size={18} strokeWidth={2} />
            </button>
            <button 
              onClick={() => setShowProjectsModal(true)} 
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Folder size={18} strokeWidth={2} />
              <span className="btn-label">Mis Proyectos</span>
            </button>
          </GlassPanel>
        </div>
      </div>

      {/* Panel de Herramientas flotante */}
      <div className="floating-panel-wrapper" style={{ position: 'absolute', top: '100px', right: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
          
          {/* Panel de Calibración */}
          {activeTool === 'calibrate' && (
            <GlassPanel style={{ padding: '16px', width: '320px', border: '1px solid var(--accent-color)' }} className="pointer-events-auto">
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--accent-color)' }}>Modo Calibración</h3>
              <p className="text-muted mb-4">Traza entre 1 y 3 líneas en el plano que correspondan a medidas conocidas para promediar la escala.</p>
              
              {calibrationLines.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {calibrationLines.map((line, i) => (
                    <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '13px', flexShrink: 0 }}>Línea {i + 1}:</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input 
                          type="number" 
                          step={unit === 'm' ? "0.01" : "1"}
                          value={fromMeters(line.valueMeters)}
                          onChange={(e) => {
                            const newVal = toMeters(parseFloat(e.target.value) || 0);
                            setCalibrationLines(prev => prev.map(l => l.id === line.id ? { ...l, valueMeters: newVal } : l));
                          }}
                          className="glass-input"
                          style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }}
                        />
                        <span style={{ fontSize: '13px' }}>{unit}</span>
                        <button 
                          className="icon-btn" 
                          style={{ color: 'var(--danger-color)' }}
                          onClick={() => setCalibrationLines(prev => prev.filter(l => l.id !== line.id))}
                          title="Eliminar"
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button 
                onClick={handleApplyCalibration} 
                className="btn-primary" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={calibrationLines.length === 0}
              >
                <Check size={18} strokeWidth={2} />
                {calibrationLines.length > 0 ? `Aplicar Promedio (${calibrationLines.length}/3)` : 'Traza una línea primero'}
              </button>
            </GlassPanel>
          )}

          {/* Panel de Muebles Agregados */}
          {activeTool !== 'calibrate' && image && furnitures.length > 0 && (
            <GlassPanel style={{ padding: '16px', width: '320px', maxHeight: '50vh', overflowY: 'auto' }} className="pointer-events-auto">
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-color)' }}>Muebles Agregados</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {furnitures.map(f => (
                  <div key={f.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 12px', borderRadius: '6px' }}>
                    {editingFurnitureId === f.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <label className="input-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Nombre</label>
                          <input 
                            id={`edit-n-${f.id}`} 
                            type="text" 
                            defaultValue={f.label} 
                            className="glass-input" 
                            style={{ padding: '4px 8px', fontSize: '12px' }} 
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <label className="input-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Ancho ({unit})</label>
                            <input id={`edit-w-${f.id}`} type="number" step={unit === 'm' ? "0.1" : "1"} defaultValue={fromMeters(f.width)} className="glass-input" style={{ padding: '4px 8px', fontSize: '12px' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className="input-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Largo ({unit})</label>
                            <input id={`edit-h-${f.id}`} type="number" step={unit === 'm' ? "0.1" : "1"} defaultValue={fromMeters(f.height)} className="glass-input" style={{ padding: '4px 8px', fontSize: '12px' }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                          <button onClick={() => setEditingFurnitureId(null)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>Cancelar</button>
                          <button 
                            onClick={() => {
                              const n = (document.getElementById(`edit-n-${f.id}`) as HTMLInputElement).value;
                              const w = toMeters(parseFloat((document.getElementById(`edit-w-${f.id}`) as HTMLInputElement).value) || fromMeters(f.width));
                              const h = toMeters(parseFloat((document.getElementById(`edit-h-${f.id}`) as HTMLInputElement).value) || fromMeters(f.height));
                              updateFurniture(f.id, { label: n, width: w, height: h });
                              setEditingFurnitureId(null);
                            }} 
                            className="btn-primary" 
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>{f.label}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fromMeters(f.width).toFixed(unit === 'm' ? 2 : 0)}{unit} x {fromMeters(f.height).toFixed(unit === 'm' ? 2 : 0)}{unit}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            className="icon-btn" 
                            style={{ color: 'var(--primary-color)' }}
                            onClick={() => duplicateFurniture(f.id)}
                            title="Duplicar"
                          >
                            <Copy size={16} strokeWidth={1.5} />
                          </button>
                          <button 
                            className="icon-btn" 
                            style={{ color: 'var(--primary-color)' }}
                            onClick={() => updateFurniture(f.id, { width: f.height, height: f.width })}
                            title="Rotar (Invertir dimensiones)"
                          >
                            <RotateCw size={16} strokeWidth={1.5} />
                          </button>
                          <button 
                            className="icon-btn" 
                            style={{ color: 'var(--primary-color)' }}
                            onClick={() => setEditingFurnitureId(f.id)}
                            title="Modificar"
                          >
                            <Pencil size={16} strokeWidth={1.5} />
                          </button>
                          <button 
                            className="icon-btn" 
                            style={{ color: 'var(--danger-color)' }}
                            onClick={() => removeFurniture(f.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {/* Panel Principal Inicio */}
          {activeTool !== 'calibrate' && !image && (
            <GlassPanel style={{ padding: '20px', width: '350px' }} className="pointer-events-auto welcome-panel">
              <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>Bienvenido a PlanFixer</h2>
              <p className="text-muted mb-4">Para empezar un nuevo proyecto, sube el plano de tu casa.</p>
              <button onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  if (e.target.files?.[0]) onImageUpload(e.target.files[0]);
                };
                input.click();
              }} className="btn-primary" style={{ width: '100%', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Upload size={18} strokeWidth={2} />
                Subir Nuevo Plano
              </button>

              {projectsList.length > 0 && (
                <>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-color)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    Proyectos Recientes
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '30vh', overflowY: 'auto' }}>
                    {projectsList.map(proj => (
                      <div key={proj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 12px', borderRadius: '8px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{proj.name}</h4>
                          <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '11px' }}>
                            Actualizado: {new Date(proj.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={async () => {
                            const state = await loadProject(proj.id);
                            if (state) {
                              importState(state, proj.id, proj.name);
                              setActiveTool('move');
                            }
                          }}
                        >
                          <FolderOpen size={14} strokeWidth={2} />
                          Abrir
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </GlassPanel>
          )}
        </div>

      {/* Main Canvas Area */}
      <div className="canvas-container">
        <FloorPlanEditor
          activeTool={activeTool}
          image={image}
          pixelsPerMeter={pixelsPerMeter}
          furnitures={furnitures}
          updateFurniture={updateFurniture}
          onAddCalibrationLine={handleAddCalibrationLine}
          unit={unit}
        />
      </div>

      {/* Furniture Modal */}
      {showFurnitureModal && (
        <div className="modal-overlay">
          <GlassPanel className="modal-content pointer-events-auto">
            <h2 className="modal-title">Agregar Mueble</h2>
            <div className="flex-row">
              <div style={{ flex: 1 }}>
                <label className="input-label">Ancho ({unit})</label>
                <input id="f-w" type="number" step={unit === 'm' ? "0.1" : "1"} defaultValue={fromMeters(1)} className="glass-input" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="input-label">Largo ({unit})</label>
                <input id="f-h" type="number" step={unit === 'm' ? "0.1" : "1"} defaultValue={fromMeters(1)} className="glass-input" />
              </div>
            </div>
            <div>
              <label className="input-label">Nombre del Mueble</label>
              <input id="f-n" type="text" placeholder="Ej. Sofá Principal" className="glass-input" />
            </div>
            <div className="flex-end">
              <button onClick={() => setShowFurnitureModal(false)} className="btn-secondary">Cancelar</button>
              <button 
                onClick={() => {
                  const w = toMeters(parseFloat((document.getElementById('f-w') as HTMLInputElement).value) || fromMeters(1));
                  const h = toMeters(parseFloat((document.getElementById('f-h') as HTMLInputElement).value) || fromMeters(1));
                  const n = (document.getElementById('f-n') as HTMLInputElement).value || 'Mueble';
                  addFurniture(w, h, n);
                  setShowFurnitureModal(false);
                  setActiveTool('move');
                }} 
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} strokeWidth={2} />
                Agregar
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Projects Modal */}
      {showProjectsModal && (
        <div className="modal-overlay">
          <GlassPanel className="modal-content pointer-events-auto">
            <div className="modal-header">
              <h2>Mis Proyectos</h2>
              <button className="icon-btn" onClick={() => setShowProjectsModal(false)}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', marginTop: '16px' }}>
              {projectsList.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay proyectos guardados aún.</p>
              ) : (
                projectsList.map(proj => (
                  <div key={proj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>{proj.name}</h4>
                      <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                        Actualizado: {new Date(proj.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={async () => {
                          const state = await loadProject(proj.id);
                          if (state) {
                            importState(state, proj.id, proj.name);
                            setShowProjectsModal(false);
                            setActiveTool('move');
                          }
                        }}
                      >
                        <FolderOpen size={14} strokeWidth={2} />
                        Cargar
                      </button>
                      <button 
                        className="icon-btn" 
                        style={{ color: 'var(--danger-color)' }}
                        onClick={async () => {
                          if (confirm(`¿Eliminar el proyecto "${proj.name}"?`)) {
                            await deleteProject(proj.id);
                            loadProjectsList();
                            if (projectId === proj.id) {
                              setProjectId(null);
                              setProjectName('');
                            }
                          }
                        }}
                        title="Eliminar proyecto"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar activeTool={activeTool} onSelectTool={handleToolSelect} />
    </div>
  );
}

export default App;
