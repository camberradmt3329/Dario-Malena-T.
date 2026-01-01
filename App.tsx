
import React, { useState, useMemo } from 'react';
import { ExtractionResult } from './types';
import { 
  MAX_MW_PER_UNIT, 
  DEFAULT_RPF_PERCENT, 
  DEFAULT_RSF_PERCENT, 
  DEFAULT_PROGRAMMED_MW,
  INITIAL_UNITS 
} from './constants';
import { extractDataFromImage } from './services/geminiService';

// Utilidad para redondear números
const round = (num: number, decimals: number = 3) => {
  return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const App: React.FC = () => {
  const [loadPercentages, setLoadPercentages] = useState<Record<string, number>>({
    g1: 100, g2: 92, g3: 95, g4: 90, g5: 100
  });
  const [rpfEnabled, setRpfEnabled] = useState<Record<string, boolean>>({
    g1: true, g2: true, g3: true, g4: true, g5: true
  });
  const [rsfEnabled, setRsfEnabled] = useState<Record<string, boolean>>({
    g1: true, g2: true, g3: true, g4: true, g5: true
  });
  
  const [globalRPF, setGlobalRPF] = useState(DEFAULT_RPF_PERCENT);
  const [globalRSF, setGlobalRSF] = useState(DEFAULT_RSF_PERCENT);
  const [programmedMW, setProgrammedMW] = useState(DEFAULT_PROGRAMMED_MW);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cálculos principales
  const calculatedUnits = useMemo(() => {
    return INITIAL_UNITS.map(u => {
      const load = loadPercentages[u.id] || 0;
      const realDisp = round((load / 100) * MAX_MW_PER_UNIT);
      const rpf = rpfEnabled[u.id] ? round(realDisp * (globalRPF / 100)) : 0;
      const rsf = rsfEnabled[u.id] ? round(realDisp * (globalRSF / 100)) : 0;
      
      return {
        id: u.id,
        name: u.name,
        loadPercent: load,
        realDispMW: realDisp,
        inRPF: rpfEnabled[u.id],
        rpfMarginMW: rpf,
        inRSF: rsfEnabled[u.id],
        rsfMarginMW: rsf,
        totalMarginMW: round(rpf + rsf)
      };
    });
  }, [loadPercentages, rpfEnabled, rsfEnabled, globalRPF, globalRSF]);

  const totals = useMemo(() => {
    const grossPower = round(calculatedUnits.reduce((acc, curr) => acc + curr.realDispMW, 0), 2);
    const totalRPF = round(calculatedUnits.reduce((acc, curr) => acc + curr.rpfMarginMW, 0), 3);
    const totalRSF = round(calculatedUnits.reduce((acc, curr) => acc + curr.rsfMarginMW, 0), 3);
    const totalMargin = round(totalRPF + totalRSF, 3);
    const deviation = round(((grossPower - programmedMW) / programmedMW) * 100, 2);
    const inRange = Math.abs(deviation) <= 10;

    return { grossPower, totalRPF, totalRSF, totalMargin, deviation, inRange };
  }, [calculatedUnits, programmedMW]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const result = await extractDataFromImage(base64);
      if (result) {
        applyExtractionResult(result);
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const applyExtractionResult = (data: ExtractionResult) => {
    const newLoads: Record<string, number> = {};
    data.units.forEach(u => {
      const found = INITIAL_UNITS.find(iu => iu.name.toLowerCase() === u.name.toLowerCase());
      if (found) newLoads[found.id] = u.loadPercent;
    });
    setLoadPercentages(prev => ({ ...prev, ...newLoads }));
    setGlobalRPF(data.globalRPF);
    setGlobalRSF(data.globalRSF);
    setProgrammedMW(data.programmedMW);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Regulación de Frecuencia</h1>
          <p className="text-slate-500 font-medium">Panel de Monitoreo y Disponibilidad de Unidades</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>Subir Imagen de Hoja</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </label>
          {isProcessing && (
            <div className="flex items-center gap-2 text-blue-600 animate-pulse">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <span className="text-sm font-semibold">Procesando...</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Tabla de Unidades */}
        <section className="xl:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-700">Estado de Unidades (G1 - G5)</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-6 py-3 border-b">Unidad</th>
                  <th className="px-6 py-3 border-b">% Carga</th>
                  <th className="px-6 py-3 border-b text-right">Disp. Real (MW)</th>
                  <th className="px-6 py-3 border-b text-center">En RPF</th>
                  <th className="px-6 py-3 border-b text-right">RPF ({globalRPF}%)</th>
                  <th className="px-6 py-3 border-b text-center">En RSF</th>
                  <th className="px-6 py-3 border-b text-right">RSF ({globalRSF}%)</th>
                  <th className="px-6 py-3 border-b text-right bg-slate-100">Total Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculatedUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{unit.name}</td>
                    <td className="px-6 py-4">
                      <input 
                        type="number" 
                        value={unit.loadPercent}
                        onChange={(e) => setLoadPercentages(prev => ({ ...prev, [unit.id]: parseFloat(e.target.value) || 0 }))}
                        className="w-20 border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900 bg-blue-50/30">{unit.realDispMW.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={unit.inRPF} 
                        onChange={(e) => setRpfEnabled(prev => ({ ...prev, [unit.id]: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-mono">{unit.rpfMarginMW.toFixed(3)}</td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={unit.inRSF} 
                        onChange={(e) => setRsfEnabled(prev => ({ ...prev, [unit.id]: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-right text-teal-600 font-mono">{unit.rsfMarginMW.toFixed(3)}</td>
                    <td className="px-6 py-4 text-right bg-slate-50 font-bold text-slate-800">{unit.totalMarginMW.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <tr>
                  <td className="px-6 py-4 uppercase text-xs" colSpan={2}>
                    <div className="flex flex-col">
                      <span className={totals.inRange ? 'text-emerald-700' : 'text-red-700'}>Totales de Control</span>
                      <span className="text-[10px] text-slate-400 font-normal">Suma de las 5 unidades</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right text-lg border-t-2 ${totals.inRange ? 'text-emerald-700 border-emerald-200' : 'text-red-700 border-red-200'}`}>
                    <div className="flex flex-col items-end">
                      <span>{totals.grossPower.toFixed(2)}</span>
                      <span className={`text-[10px] uppercase font-normal tracking-tighter ${totals.inRange ? 'text-emerald-500' : 'text-red-500'}`}>Potencia Bruta (MW)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right text-emerald-700 font-mono">
                    <div className="flex flex-col items-end">
                      <span>{totals.totalRPF.toFixed(3)}</span>
                      <span className="text-[9px] uppercase font-bold tracking-tighter text-emerald-600 whitespace-nowrap">Potencia Reg. Primaria</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-right text-teal-700 font-mono">
                    <div className="flex flex-col items-end">
                      <span>{totals.totalRSF.toFixed(3)}</span>
                      <span className="text-[9px] uppercase font-bold tracking-tighter text-teal-600 whitespace-nowrap">Potencia Reg. Secundaria</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-amber-800 bg-amber-50">
                    <div className="flex flex-col items-end">
                      <span>{totals.totalMargin.toFixed(3)}</span>
                      <span className="text-[9px] uppercase font-bold tracking-tighter text-amber-700 whitespace-nowrap">Suma RPF + RSF</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Panel Lateral */}
        <aside className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Configuración Global
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Potencia Programada (MW)</label>
                <input 
                  type="number" 
                  value={programmedMW}
                  onChange={(e) => setProgrammedMW(parseFloat(e.target.value) || 0)}
                  className="w-full border rounded-lg px-3 py-2 text-lg font-bold text-slate-800 bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Reg. Primaria (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={globalRPF}
                    onChange={(e) => setGlobalRPF(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2 text-emerald-700 font-bold bg-emerald-50 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Reg. Secundaria (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={globalRSF}
                    onChange={(e) => setGlobalRSF(parseFloat(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2 text-teal-700 font-bold bg-teal-50 focus:bg-white transition"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 leading-relaxed italic">
                Nota: El 100% de carga por unidad equivale a un máximo de <strong>{MAX_MW_PER_UNIT} MW</strong>.
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Análisis de Desviación</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500 font-medium">Potencia Bruta Real</span>
                  <span className={`font-bold ${totals.inRange ? 'text-emerald-600' : 'text-red-600'}`}>{totals.grossPower.toFixed(2)} MW</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${totals.inRange ? 'bg-emerald-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.min((totals.grossPower / programmedMW) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border-2 transition-all ${totals.inRange ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs uppercase font-bold tracking-widest ${totals.inRange ? 'text-emerald-700' : 'text-red-700'}`}>
                    {totals.inRange ? 'Dentro de Rango ±10%' : 'Fuera de Rango'}
                  </span>
                  <div className={`p-1 rounded-full ${totals.inRange ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {totals.inRange ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className={`text-3xl font-black ${totals.inRange ? 'text-emerald-700' : 'text-red-700'}`}>
                  {totals.grossPower.toFixed(3)} <span className={`text-sm font-normal uppercase ${totals.inRange ? 'text-emerald-500' : 'text-red-500'}`}>MW</span>
                </div>
                <div className={`text-sm font-bold mt-1 ${totals.deviation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ({totals.deviation >= 0 ? '+' : ''}{totals.deviation} % Desv)
                </div>

                {/* Nota de disponibilidad solicitada */}
                {totals.inRange && (
                  <div className="mt-4 p-3 bg-white/60 rounded-lg border border-emerald-200">
                    <div className="flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-tight">Nota de Disponibilidad</p>
                        <p className="text-xs text-emerald-700 leading-snug">
                          Disponibilidad de potencia conforme a programación. Operación dentro de parámetros operativos seguros.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 pb-8 flex justify-center opacity-50 text-xs font-mono uppercase tracking-widest text-slate-600">
        &copy; 2024 Sistema de Regulación de Frecuencia v2.5
      </footer>
    </div>
  );
};

export default App;
