import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { get } from '../../services/api';
import { MagnifyingGlassIcon, XMarkIcon, PlusIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
  title: string;
  endpoint: string;
  displayFields: { key: string; label: string }[];
  valueField?: string;
  newPath?: string;
  placeholder?: string;
  createLabel?: string;
}

export default function SearchDialog({
  isOpen,
  onClose,
  onSelect,
  title,
  endpoint,
  displayFields,
  valueField = 'code',
  newPath,
  placeholder,
  createLabel,
}: SearchDialogProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setSearch('');
      setDebouncedSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Fetch data
  const { data, isLoading } = useQuery({
    queryKey: [endpoint, debouncedSearch],
    queryFn: () => get<any>(endpoint, { search: debouncedSearch, pageSize: 20 }),
    enabled: isOpen,
  });

  const items = data?.data || data || [];

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const handleSelect = (item: any) => {
    onSelect(item);
    onClose();
  };

  const handleNew = () => {
    onClose();
    if (newPath) {
      navigate(newPath);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length > 0 && selectedIndex >= 0) {
        handleSelect(items[selectedIndex]);
      } else if (items.length === 0 && newPath) {
        // If no results and Enter pressed, create new
        handleNew();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      // Ctrl+N or Cmd+N to create new
      e.preventDefault();
      if (newPath) {
        handleNew();
      }
    }
  };

  // Get nested property value (e.g., 'group.name')
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  if (!isOpen) return null;

  const entityName = createLabel || title.replace('Search ', '').replace('Select ', '');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="flex min-h-full items-start justify-center p-4 pt-20">
        <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <div className="flex items-center gap-2">
              {newPath && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  ⌘N {t('common.new')}
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder || t('common.search') + '...'}
                className="input pl-10 w-full"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 px-4">
                {search ? (
                  <>
                    <DocumentPlusIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      No results for "<span className="font-medium">{search}</span>"
                    </p>
                    {newPath && (
                      <>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                          Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> or click below to create new
                        </p>
                        <button
                          onClick={handleNew}
                          className="btn btn-primary"
                        >
                          <PlusIcon className="w-5 h-5 mr-2" />
                          {t('common.create')} {entityName}
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Type to search...
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {items.map((item: any, index: number) => (
                  <button
                    key={item.id || index}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary-50 dark:bg-primary-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`font-mono text-sm font-semibold min-w-[80px] ${
                        index === selectedIndex
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-primary-600 dark:text-primary-400'
                      }`}>
                        {item[valueField]}
                      </span>
                      <div className="flex-1 min-w-0">
                        {displayFields.map((field, idx) => (
                          <p
                            key={field.key}
                            className={idx === 0 
                              ? 'font-medium text-gray-900 dark:text-white truncate' 
                              : 'text-sm text-gray-500 dark:text-gray-400 truncate'
                            }
                          >
                            {getNestedValue(item, field.key)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with New button - always visible when newPath is provided */}
          {newPath && (
            <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl">
              <button
                onClick={handleNew}
                className="w-full btn btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span>{t('common.create')} {entityName}</span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hidden sm:inline">⌘N</kbd>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
