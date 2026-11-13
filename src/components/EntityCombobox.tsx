import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { EntityType, MasterEntity } from '../shared/types';

interface EntityComboboxProps {
  entityType: EntityType;
  entities: MasterEntity[];
  value: string;
  submittedEntityIds: Set<string>;
  onChange: (entityId: string) => void;
}

export function EntityCombobox({
  entityType,
  entities,
  value,
  submittedEntityIds,
  onChange,
}: EntityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === value) ?? null,
    [entities, value]
  );

  // Sync display query when value changes externally (reset/edit)
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedEntity ? selectedEntity.name : '');
    }
  }, [selectedEntity, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery(selectedEntity ? selectedEntity.name : '');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [selectedEntity]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // If input exactly matches currently selected name while open on initial click, show all
    if (!q || (selectedEntity && q === selectedEntity.name.toLowerCase())) {
      return entities;
    }
    return entities.filter(
      (ent) =>
        ent.name.toLowerCase().includes(q) ||
        ent.province.toLowerCase().includes(q) ||
        ent.code.toLowerCase().includes(q)
    );
  }, [entities, query, selectedEntity]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered.length, isOpen]);

  const selectEntity = (ent: MasterEntity) => {
    onChange(ent.id);
    setQuery(ent.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, filtered.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[highlightedIndex];
      if (target) selectEntity(target);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery(selectedEntity ? selectedEntity.name : '');
    }
  };

  const typeLabel =
    entityType === 'DPW'
      ? 'Dewan Pimpinan Wilayah (Provinsi)'
      : 'Dewan Pimpinan Daerah (Kab/Kota)';

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="entity-combobox" className="block text-xs font-semibold text-slate-700 mb-2">
        Wilayah {typeLabel}
      </label>

      <div className="relative">
        <Search className="w-4 h-4 text-[#0C7A89] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          id="entity-combobox"
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="entity-combobox-listbox"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (!e.target.value.trim()) {
              onChange('');
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Ketik nama ${entityType} atau provinsi (${entities.length} tersedia)...`}
          autoComplete="off"
          className="w-full rounded-xl bg-white/95 border border-slate-200 pl-10 pr-16 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C7A89]/30 focus:border-[#0C7A89] transition"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {(query || value) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Hapus pilihan wilayah"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#07525E] hover:bg-slate-100 transition"
            aria-label="Buka daftar wilayah"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          id="entity-combobox-listbox"
          role="listbox"
          className="absolute z-30 mt-1.5 w-full rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl overflow-hidden"
        >
          <div className="px-3.5 py-2 border-b border-slate-100 bg-gradient-to-r from-[#0C7A89]/[0.05] to-[#D88B15]/[0.04] flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Menampilkan <strong className="text-[#07525E]">{filtered.length}</strong> dari{' '}
              {entities.length} {entityType}
            </span>
            <span>Ketik untuk mencari cepat</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                Tidak ditemukan {entityType} yang cocok dengan kata kunci &ldquo;{query}&rdquo;.
              </div>
            ) : (
              filtered.map((ent, idx) => {
                const isSelected = ent.id === value;
                const isHighlighted = idx === highlightedIndex;
                const hasSubmitted = submittedEntityIds.has(ent.id);

                return (
                  <button
                    key={ent.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => selectEntity(ent)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0C7A89]/12 to-[#07525E]/5'
                        : isHighlighted
                          ? 'bg-slate-50'
                          : 'bg-transparent'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 break-words">
                        {ent.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[#0C7A89]">{ent.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ent.province}</span>
                        {hasSubmitted && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-[#D88B15]">Sudah Terdaftar</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#0C7A89] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
