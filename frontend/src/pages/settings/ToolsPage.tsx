import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import toast from 'react-hot-toast';

function roundValue(value: number, mode: string, precision: number) {
  const p = Math.max(0, precision || 2);
  const factor = Math.pow(10, p);
  if (mode === 'UP') return Math.ceil(value * factor) / factor;
  if (mode === 'DOWN') return Math.floor(value * factor) / factor;
  if (mode === 'BANKERS') {
    const n = value * factor;
    const f = Math.floor(n);
    const r = n - f;
    if (r > 0.5) return (f + 1) / factor;
    if (r < 0.5) return f / factor;
    return (f % 2 === 0 ? f : f + 1) / factor;
  }
  return Math.round(value * factor) / factor;
}

export default function ToolsPage() {
  const { data: taxCodes } = useQuery({ queryKey: ['tax-codes'], queryFn: () => get('/settings/tax-codes') });
  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => get('/settings/currencies') });
  const [amount, setAmount] = useState<number>(0);
  const [selectedTax, setSelectedTax] = useState<string>('');
  const [taxResult, setTaxResult] = useState<{ base: number; tax: number; total: number } | null>(null);
  const [convAmount, setConvAmount] = useState<number>(1);
  const [fromCur, setFromCur] = useState<string>('');
  const [toCur, setToCur] = useState<string>('');
  const [convResult, setConvResult] = useState<number | null>(null);
  const [whtAmount, setWhtAmount] = useState<number>(0);
  const [whtRate, setWhtRate] = useState<number>(10);
  const [whtResult, setWhtResult] = useState<{ withheld: number; net: number } | null>(null);

  useEffect(() => {
    const list = Array.isArray(taxCodes) ? taxCodes : [];
    if (!selectedTax && list.length > 0) setSelectedTax(list[0].code);
  }, [taxCodes, selectedTax]);

  useEffect(() => {
    const list = Array.isArray(currencies) ? currencies : [];
    if (!fromCur && list.length > 0) setFromCur(list[0].code);
    if (!toCur && list.length > 1) setToCur(list[1].code);
  }, [currencies, fromCur, toCur]);

  const selectedTaxCode = useMemo(() => {
    const list = Array.isArray(taxCodes) ? taxCodes : [];
    return list.find((t: any) => t.code === selectedTax);
  }, [taxCodes, selectedTax]);

  const handleTaxCalc = () => {
    try {
      const t = selectedTaxCode || {};
      const rate = Number(t.rate || 0);
      const method = (t.calcMethod || 'EXCLUSIVE') as string;
      const roundingMode = (t.roundingMode || 'NEAREST') as string;
      const precision = Number(t.roundingPrecision ?? 2);
      if (rate <= 0) {
        setTaxResult({ base: amount, tax: 0, total: amount });
        return;
      }
      if (method === 'INCLUSIVE') {
        const tax = roundValue((amount * rate) / (100 + rate), roundingMode, precision);
        const base = roundValue(amount - tax, roundingMode, precision);
        setTaxResult({ base, tax, total: amount });
      } else {
        const tax = roundValue((amount * rate) / 100, roundingMode, precision);
        const total = roundValue(amount + tax, roundingMode, precision);
        setTaxResult({ base: amount, tax, total });
      }
    } catch (e: any) {
      toast.error('Tax calculation failed');
    }
  };

  const handleConvert = () => {
    try {
      const list = Array.isArray(currencies) ? currencies : [];
      const base = list.find((c: any) => c.code === fromCur);
      const target = list.find((c: any) => c.code === toCur);
      if (!base || !target) return;
      const rFrom = Number(base.exchangeRate || 1);
      const rTo = Number(target.exchangeRate || 1);
      const val = (convAmount / rFrom) * rTo;
      setConvResult(roundValue(val, 'NEAREST', target.decimalPlaces ?? 2));
    } catch (e: any) {
      toast.error('Conversion failed');
    }
  };

  const handleWht = () => {
    const withheld = roundValue((whtAmount * whtRate) / 100, 'NEAREST', 2);
    const net = roundValue(whtAmount - withheld, 'NEAREST', 2);
    setWhtResult({ withheld, net });
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold mb-4">Tax Calculator</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Amount</label>
            <input type="number" className="input w-full" value={amount} onChange={e => setAmount(parseFloat(e.target.value || '0'))} />
          </div>
          <div>
            <label className="label">Tax Code</label>
            <select className="input w-full" value={selectedTax} onChange={e => setSelectedTax(e.target.value)}>
              {(Array.isArray(taxCodes) ? taxCodes : []).map((t: any) => (
                <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary" onClick={handleTaxCalc}>Calculate</button>
          </div>
        </div>
        {taxResult && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded bg-gray-50 dark:bg-slate-800">Base: {taxResult.base.toFixed(2)}</div>
            <div className="p-3 rounded bg-gray-50 dark:bg-slate-800">Tax: {taxResult.tax.toFixed(2)}</div>
            <div className="p-3 rounded bg-gray-50 dark:bg-slate-800">Total: {taxResult.total.toFixed(2)}</div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Currency Converter</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="label">Amount</label>
            <input type="number" className="input w-full" value={convAmount} onChange={e => setConvAmount(parseFloat(e.target.value || '0'))} />
          </div>
          <div>
            <label className="label">From</label>
            <select className="input w-full" value={fromCur} onChange={e => setFromCur(e.target.value)}>
              {(Array.isArray(currencies) ? currencies : []).map((c: any) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">To</label>
            <select className="input w-full" value={toCur} onChange={e => setToCur(e.target.value)}>
              {(Array.isArray(currencies) ? currencies : []).map((c: any) => (
                <option key={c.code} value={c.code}>{c.code}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary" onClick={handleConvert}>Convert</button>
          </div>
        </div>
        {convResult !== null && (
          <div className="mt-4 p-3 rounded bg-gray-50 dark:bg-slate-800">
            Result: {convResult.toFixed(2)} {toCur}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Withholding Tax Calculator</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Amount</label>
            <input type="number" className="input w-full" value={whtAmount} onChange={e => setWhtAmount(parseFloat(e.target.value || '0'))} />
          </div>
          <div>
            <label className="label">WHT Rate %</label>
            <input type="number" className="input w-full" value={whtRate} onChange={e => setWhtRate(parseFloat(e.target.value || '0'))} />
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary" onClick={handleWht}>Compute</button>
          </div>
        </div>
        {whtResult && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded bg-gray-50 dark:bg-slate-800">Withheld: {whtResult.withheld.toFixed(2)}</div>
            <div className="p-3 rounded bg-gray-50 dark:bg-slate-800">Net Payable: {whtResult.net.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
