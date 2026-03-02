import { useState, useRef, useCallback, useEffect, DragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  MinusIcon,
  Square2StackIcon,
  QrCodeIcon,
  Bars3Icon,
  TableCellsIcon,
  EyeIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { get, post, put } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface DesignElement {
  id: string;
  type: 'text' | 'field' | 'image' | 'line' | 'rect' | 'barcode' | 'qrcode' | 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  section: 'header' | 'body' | 'footer';
  properties: Record<string, any>;
}

interface TemplateDesign {
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  margins: { top: number; bottom: number; left: number; right: number };
  elements: DesignElement[];
  headerHeight: number;
  footerHeight: number;
}

interface PaletteItem {
  type: DesignElement['type'];
  label: string;
  icon: typeof DocumentTextIcon;
  category: 'basic' | 'fields' | 'tables';
  defaultProps?: Record<string, any>;
}

// ============================================================================
// Constants
// ============================================================================

const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
};

const ZOOM_LEVELS = [50, 75, 100, 125, 150];

const GRID_SIZE = 5; // mm for snap

// Invoice fields
const INVOICE_FIELDS = [
  { field: 'invoiceNo', label: 'Invoice No' },
  { field: 'invoiceDate', label: 'Invoice Date', format: 'date' },
  { field: 'dueDate', label: 'Due Date', format: 'date' },
  { field: 'customerName', label: 'Customer Name' },
  { field: 'customerAddress', label: 'Customer Address' },
  { field: 'customerPhone', label: 'Customer Phone' },
  { field: 'customerEmail', label: 'Customer Email' },
  { field: 'subtotal', label: 'Subtotal', format: 'currency' },
  { field: 'taxAmount', label: 'Tax Amount', format: 'currency' },
  { field: 'discount', label: 'Discount', format: 'currency' },
  { field: 'total', label: 'Total', format: 'currency' },
  { field: 'amountPaid', label: 'Amount Paid', format: 'currency' },
  { field: 'balanceDue', label: 'Balance Due', format: 'currency' },
  { field: 'notes', label: 'Notes' },
  { field: 'terms', label: 'Terms' },
  { field: 'companyName', label: 'Company Name' },
  { field: 'companyAddress', label: 'Company Address' },
  { field: 'companyPhone', label: 'Company Phone' },
  { field: 'companyEmail', label: 'Company Email' },
];

const BASIC_ELEMENTS: PaletteItem[] = [
  { type: 'text', label: 'Text', icon: DocumentTextIcon, category: 'basic', defaultProps: { text: 'New Text', fontSize: 12, fontWeight: 'normal', color: '#000000', align: 'left' } },
  { type: 'image', label: 'Image', icon: PhotoIcon, category: 'basic', defaultProps: { src: '', fit: 'contain' } },
  { type: 'line', label: 'Line', icon: MinusIcon, category: 'basic', defaultProps: { strokeWidth: 1, strokeColor: '#000000' } },
  { type: 'rect', label: 'Rectangle', icon: Square2StackIcon, category: 'basic', defaultProps: { fillColor: 'transparent', strokeColor: '#000000', strokeWidth: 1, borderRadius: 0 } },
  { type: 'barcode', label: 'Barcode', icon: Bars3Icon, category: 'basic', defaultProps: { value: '{{invoiceNo}}', format: 'CODE128' } },
  { type: 'qrcode', label: 'QR Code', icon: QrCodeIcon, category: 'basic', defaultProps: { value: '{{invoiceNo}}' } },
];

const TABLE_ELEMENTS: PaletteItem[] = [
  { type: 'table', label: 'Item Table', icon: TableCellsIcon, category: 'tables', defaultProps: { 
    dataSource: 'items',
    columns: [
      { field: 'description', header: 'Description', width: 50 },
      { field: 'quantity', header: 'Qty', width: 15, align: 'right' },
      { field: 'unitPrice', header: 'Price', width: 15, align: 'right', format: 'currency' },
      { field: 'amount', header: 'Amount', width: 20, align: 'right', format: 'currency' },
    ],
    showHeader: true,
    headerBg: '#f3f4f6',
    borderColor: '#e5e7eb',
  }},
];

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function mmToPx(mm: number, zoom: number): number {
  // 1mm ≈ 3.78px at 96dpi, scaled by zoom
  return mm * 3.78 * (zoom / 100);
}

function pxToMm(px: number, zoom: number): number {
  return px / (3.78 * (zoom / 100));
}

// ============================================================================
// Component: Element Palette
// ============================================================================

interface ElementPaletteProps {
  onDragStart: (item: PaletteItem) => void;
}

function ElementPalette({ onDragStart }: ElementPaletteProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('basic');

  const handleDragStart = (e: DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(item);
  };

  const renderCategory = (title: string, key: string, items: PaletteItem[]) => (
    <div key={key} className="mb-4">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
        onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
      >
        {title}
        <span className="text-xs text-gray-400">{expandedCategory === key ? '−' : '+'}</span>
      </button>
      {expandedCategory === key && (
        <div className="mt-2 grid grid-cols-2 gap-2 px-2">
          {items.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 cursor-grab hover:border-primary-400 hover:shadow-md transition-all"
            >
              <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFieldsCategory = () => (
    <div className="mb-4">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
        onClick={() => setExpandedCategory(expandedCategory === 'fields' ? null : 'fields')}
      >
        Invoice Fields
        <span className="text-xs text-gray-400">{expandedCategory === 'fields' ? '−' : '+'}</span>
      </button>
      {expandedCategory === 'fields' && (
        <div className="mt-2 space-y-1 px-2 max-h-64 overflow-y-auto">
          {INVOICE_FIELDS.map((field) => {
            const item: PaletteItem = {
              type: 'field',
              label: field.label,
              icon: DocumentTextIcon,
              category: 'fields',
              defaultProps: { 
                field: field.field, 
                label: field.label, 
                format: field.format || 'text',
                fontSize: 12,
                fontWeight: 'normal',
                color: '#000000',
              },
            };
            return (
              <div
                key={field.field}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 cursor-grab hover:border-primary-400 hover:shadow-md transition-all"
              >
                <span className="text-xs font-mono text-primary-600 dark:text-primary-400">{'{{ }}'}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{field.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Elements</h3>
      {renderCategory('Basic', 'basic', BASIC_ELEMENTS)}
      {renderFieldsCategory()}
      {renderCategory('Tables', 'tables', TABLE_ELEMENTS)}
    </div>
  );
}

// ============================================================================
// Component: Properties Panel
// ============================================================================

interface PropertiesPanelProps {
  element: DesignElement | null;
  onUpdate: (updates: Partial<DesignElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function PropertiesPanel({ element, onUpdate, onDelete, onDuplicate }: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Select an element to edit its properties
        </p>
      </div>
    );
  }

  const updateProperty = (key: string, value: any) => {
    onUpdate({
      properties: { ...element.properties, [key]: value },
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Properties</h3>
        <div className="flex gap-1">
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400"
            title="Duplicate"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Position & Size */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">X (mm)</label>
              <input
                type="number"
                value={element.x}
                onChange={(e) => onUpdate({ x: parseFloat(e.target.value) || 0 })}
                className="input text-sm py-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Y (mm)</label>
              <input
                type="number"
                value={element.y}
                onChange={(e) => onUpdate({ y: parseFloat(e.target.value) || 0 })}
                className="input text-sm py-1"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Width (mm)</label>
              <input
                type="number"
                value={element.width}
                onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 10 })}
                className="input text-sm py-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Height (mm)</label>
              <input
                type="number"
                value={element.height}
                onChange={(e) => onUpdate({ height: parseFloat(e.target.value) || 10 })}
                className="input text-sm py-1"
              />
            </div>
          </div>
        </div>

        {/* Section */}
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section</label>
          <select
            value={element.section}
            onChange={(e) => onUpdate({ section: e.target.value as DesignElement['section'] })}
            className="input text-sm py-1 mt-1"
          >
            <option value="header">Header</option>
            <option value="body">Body</option>
            <option value="footer">Footer</option>
          </select>
        </div>

        {/* Type-specific properties */}
        {(element.type === 'text' || element.type === 'field') && (
          <>
            {element.type === 'text' && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Text</label>
                <textarea
                  value={element.properties.text || ''}
                  onChange={(e) => updateProperty('text', e.target.value)}
                  className="input text-sm py-1 mt-1"
                  rows={3}
                />
              </div>
            )}

            {element.type === 'field' && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Field</label>
                <select
                  value={element.properties.field || ''}
                  onChange={(e) => {
                    const fieldDef = INVOICE_FIELDS.find(f => f.field === e.target.value);
                    updateProperty('field', e.target.value);
                    if (fieldDef) {
                      updateProperty('label', fieldDef.label);
                      updateProperty('format', fieldDef.format || 'text');
                    }
                  }}
                  className="input text-sm py-1 mt-1"
                >
                  {INVOICE_FIELDS.map(f => (
                    <option key={f.field} value={f.field}>{f.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Font Size</label>
                <input
                  type="number"
                  value={element.properties.fontSize || 12}
                  onChange={(e) => updateProperty('fontSize', parseInt(e.target.value) || 12)}
                  className="input text-sm py-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Weight</label>
                <select
                  value={element.properties.fontWeight || 'normal'}
                  onChange={(e) => updateProperty('fontWeight', e.target.value)}
                  className="input text-sm py-1"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Color</label>
                <input
                  type="color"
                  value={element.properties.color || '#000000'}
                  onChange={(e) => updateProperty('color', e.target.value)}
                  className="w-full h-8 rounded border border-gray-300 dark:border-slate-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Align</label>
                <select
                  value={element.properties.align || 'left'}
                  onChange={(e) => updateProperty('align', e.target.value)}
                  className="input text-sm py-1"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            {element.type === 'field' && (
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Format</label>
                <select
                  value={element.properties.format || 'text'}
                  onChange={(e) => updateProperty('format', e.target.value)}
                  className="input text-sm py-1"
                >
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                </select>
              </div>
            )}
          </>
        )}

        {element.type === 'image' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image Source</label>
              <input
                type="text"
                value={element.properties.src || ''}
                onChange={(e) => updateProperty('src', e.target.value)}
                placeholder="URL or {{field}}"
                className="input text-sm py-1 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Fit Mode</label>
              <select
                value={element.properties.fit || 'contain'}
                onChange={(e) => updateProperty('fit', e.target.value)}
                className="input text-sm py-1"
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="fill">Fill</option>
              </select>
            </div>
          </>
        )}

        {element.type === 'line' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Stroke Width</label>
                <input
                  type="number"
                  value={element.properties.strokeWidth || 1}
                  onChange={(e) => updateProperty('strokeWidth', parseFloat(e.target.value) || 1)}
                  className="input text-sm py-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Color</label>
                <input
                  type="color"
                  value={element.properties.strokeColor || '#000000'}
                  onChange={(e) => updateProperty('strokeColor', e.target.value)}
                  className="w-full h-8 rounded border border-gray-300 dark:border-slate-600 cursor-pointer"
                />
              </div>
            </div>
          </>
        )}

        {element.type === 'rect' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Fill</label>
                <input
                  type="color"
                  value={element.properties.fillColor || '#ffffff'}
                  onChange={(e) => updateProperty('fillColor', e.target.value)}
                  className="w-full h-8 rounded border border-gray-300 dark:border-slate-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Border</label>
                <input
                  type="color"
                  value={element.properties.strokeColor || '#000000'}
                  onChange={(e) => updateProperty('strokeColor', e.target.value)}
                  className="w-full h-8 rounded border border-gray-300 dark:border-slate-600 cursor-pointer"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Border Width</label>
                <input
                  type="number"
                  value={element.properties.strokeWidth || 1}
                  onChange={(e) => updateProperty('strokeWidth', parseFloat(e.target.value) || 1)}
                  className="input text-sm py-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">Radius</label>
                <input
                  type="number"
                  value={element.properties.borderRadius || 0}
                  onChange={(e) => updateProperty('borderRadius', parseFloat(e.target.value) || 0)}
                  className="input text-sm py-1"
                />
              </div>
            </div>
          </>
        )}

        {(element.type === 'barcode' || element.type === 'qrcode') && (
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</label>
            <input
              type="text"
              value={element.properties.value || ''}
              onChange={(e) => updateProperty('value', e.target.value)}
              placeholder="{{invoiceNo}}"
              className="input text-sm py-1 mt-1"
            />
            {element.type === 'barcode' && (
              <div className="mt-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Format</label>
                <select
                  value={element.properties.format || 'CODE128'}
                  onChange={(e) => updateProperty('format', e.target.value)}
                  className="input text-sm py-1"
                >
                  <option value="CODE128">CODE128</option>
                  <option value="CODE39">CODE39</option>
                  <option value="EAN13">EAN13</option>
                  <option value="EAN8">EAN8</option>
                  <option value="UPC">UPC</option>
                </select>
              </div>
            )}
          </div>
        )}

        {element.type === 'table' && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data Source</label>
              <select
                value={element.properties.dataSource || 'items'}
                onChange={(e) => updateProperty('dataSource', e.target.value)}
                className="input text-sm py-1 mt-1"
              >
                <option value="items">Line Items</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.properties.showHeader !== false}
                onChange={(e) => updateProperty('showHeader', e.target.checked)}
                className="rounded border-gray-300"
              />
              <label className="text-xs text-gray-600 dark:text-gray-400">Show Header</label>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Header Background</label>
              <input
                type="color"
                value={element.properties.headerBg || '#f3f4f6'}
                onChange={(e) => updateProperty('headerBg', e.target.value)}
                className="w-full h-8 rounded border border-gray-300 dark:border-slate-600 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Border Color</label>
              <input
                type="color"
                value={element.properties.borderColor || '#e5e7eb'}
                onChange={(e) => updateProperty('borderColor', e.target.value)}
                className="w-full h-8 rounded border border-gray-300 dark:border-slate-600 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Columns</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Edit columns in advanced mode (coming soon)
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Component: Canvas Element Renderer
// ============================================================================

interface CanvasElementProps {
  element: DesignElement;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
}

function CanvasElement({ element, zoom, isSelected, onSelect, onMove, onResize }: CanvasElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, elemX: 0, elemY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect();
    
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      elemX: element.x,
      elemY: element.y,
    };
  };

  const handleResizeMouseDown = (e: ReactMouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (isDragging) {
        const dx = pxToMm(e.clientX - dragStart.current.x, zoom);
        const dy = pxToMm(e.clientY - dragStart.current.y, zoom);
        onMove(
          snapToGrid(dragStart.current.elemX + dx),
          snapToGrid(dragStart.current.elemY + dy)
        );
      }
      if (isResizing) {
        const dx = pxToMm(e.clientX - resizeStart.current.x, zoom);
        const dy = pxToMm(e.clientY - resizeStart.current.y, zoom);
        onResize(
          Math.max(10, snapToGrid(resizeStart.current.width + dx)),
          Math.max(5, snapToGrid(resizeStart.current.height + dy))
        );
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, zoom, onMove, onResize]);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: mmToPx(element.x, zoom),
    top: mmToPx(element.y, zoom),
    width: mmToPx(element.width, zoom),
    height: mmToPx(element.height, zoom),
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const renderContent = () => {
    const fontSize = (element.properties.fontSize || 12) * (zoom / 100);
    const fontWeight = element.properties.fontWeight || 'normal';
    const color = element.properties.color || '#000000';
    const align = element.properties.align || 'left';

    switch (element.type) {
      case 'text':
        return (
          <div
            style={{ fontSize, fontWeight, color, textAlign: align as any }}
            className="w-full h-full flex items-center overflow-hidden"
          >
            {element.properties.text || 'Text'}
          </div>
        );

      case 'field':
        return (
          <div
            style={{ fontSize, fontWeight, color, textAlign: align as any }}
            className="w-full h-full flex items-center overflow-hidden"
          >
            <span className="text-primary-600 dark:text-primary-400 opacity-70">
              {`{{${element.properties.field || 'field'}}}`}
            </span>
          </div>
        );

      case 'image':
        return (
          <div className="w-full h-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center rounded">
            <PhotoIcon className="w-8 h-8 text-gray-400" />
          </div>
        );

      case 'line':
        return (
          <div
            className="w-full absolute top-1/2 left-0"
            style={{
              height: element.properties.strokeWidth || 1,
              backgroundColor: element.properties.strokeColor || '#000000',
              transform: 'translateY(-50%)',
            }}
          />
        );

      case 'rect':
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: element.properties.fillColor || 'transparent',
              borderWidth: element.properties.strokeWidth || 1,
              borderColor: element.properties.strokeColor || '#000000',
              borderStyle: 'solid',
              borderRadius: element.properties.borderRadius || 0,
            }}
          />
        );

      case 'barcode':
        return (
          <div className="w-full h-full bg-white flex items-center justify-center border border-gray-300 rounded">
            <Bars3Icon className="w-full h-4 text-gray-800" />
          </div>
        );

      case 'qrcode':
        return (
          <div className="w-full h-full bg-white flex items-center justify-center border border-gray-300 rounded p-1">
            <QrCodeIcon className="w-full h-full text-gray-800" />
          </div>
        );

      case 'table':
        const cols = element.properties.columns || [];
        return (
          <div className="w-full h-full border overflow-hidden text-xs" style={{ borderColor: element.properties.borderColor || '#e5e7eb' }}>
            {element.properties.showHeader !== false && (
              <div className="flex" style={{ backgroundColor: element.properties.headerBg || '#f3f4f6' }}>
                {cols.map((col: any, i: number) => (
                  <div
                    key={i}
                    className="px-1 py-0.5 border-r truncate font-medium"
                    style={{ width: `${col.width}%`, borderColor: element.properties.borderColor || '#e5e7eb' }}
                  >
                    {col.header}
                  </div>
                ))}
              </div>
            )}
            <div className="flex border-t" style={{ borderColor: element.properties.borderColor || '#e5e7eb' }}>
              {cols.map((col: any, i: number) => (
                <div
                  key={i}
                  className="px-1 py-0.5 border-r text-gray-400 truncate"
                  style={{ width: `${col.width}%`, borderColor: element.properties.borderColor || '#e5e7eb' }}
                >
                  ...
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={ref}
      style={style}
      onMouseDown={handleMouseDown}
      className={clsx(
        'absolute select-none',
        isSelected && 'ring-2 ring-primary-500 ring-offset-1'
      )}
    >
      {renderContent()}
      {isSelected && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-3 h-3 bg-primary-500 cursor-se-resize rounded-tl"
        />
      )}
    </div>
  );
}

// ============================================================================
// Component: Design Canvas
// ============================================================================

interface DesignCanvasProps {
  design: TemplateDesign;
  zoom: number;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<DesignElement>) => void;
  onAddElement: (element: DesignElement) => void;
}

function DesignCanvas({
  design,
  zoom,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onAddElement,
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const paperDimensions = PAPER_SIZES[design.paperSize] || PAPER_SIZES.A4;
  const isLandscape = design.orientation === 'landscape';
  const paperWidth = isLandscape ? paperDimensions.height : paperDimensions.width;
  const paperHeight = isLandscape ? paperDimensions.width : paperDimensions.height;

  const canvasWidth = mmToPx(paperWidth, zoom);
  const canvasHeight = mmToPx(paperHeight, zoom);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const item: PaletteItem = JSON.parse(data);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = snapToGrid(pxToMm(e.clientX - rect.left, zoom));
      const y = snapToGrid(pxToMm(e.clientY - rect.top, zoom));

      const newElement: DesignElement = {
        id: generateId(),
        type: item.type,
        x: Math.max(design.margins.left, Math.min(x, paperWidth - design.margins.right - 40)),
        y: Math.max(design.margins.top, Math.min(y, paperHeight - design.margins.bottom - 10)),
        width: item.type === 'table' ? paperWidth - design.margins.left - design.margins.right : 40,
        height: item.type === 'table' ? 30 : 10,
        section: 'body',
        properties: item.defaultProps || {},
      };

      onAddElement(newElement);
    } catch (err) {
      console.error('Failed to parse drop data', err);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasClick = () => {
    onSelectElement(null);
  };

  // Section dividers
  const headerHeight = mmToPx(design.headerHeight, zoom);
  const footerTop = canvasHeight - mmToPx(design.footerHeight, zoom);

  return (
    <div
      ref={canvasRef}
      className="relative bg-white shadow-2xl mx-auto"
      style={{ width: canvasWidth, height: canvasHeight }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleCanvasClick}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #9ca3af 1px, transparent 1px),
            linear-gradient(to bottom, #9ca3af 1px, transparent 1px)
          `,
          backgroundSize: `${mmToPx(GRID_SIZE, zoom)}px ${mmToPx(GRID_SIZE, zoom)}px`,
        }}
      />

      {/* Section indicators */}
      <div
        className="absolute left-0 right-0 border-b border-dashed border-blue-300 pointer-events-none"
        style={{ top: headerHeight }}
      >
        <span className="absolute left-1 -top-4 text-[10px] text-blue-400 bg-white px-1">HEADER</span>
      </div>
      <div
        className="absolute left-0 right-0 border-t border-dashed border-blue-300 pointer-events-none"
        style={{ top: footerTop }}
      >
        <span className="absolute left-1 top-1 text-[10px] text-blue-400 bg-white px-1">FOOTER</span>
      </div>

      {/* Margins visualization */}
      <div
        className="absolute border border-dashed border-gray-200 pointer-events-none"
        style={{
          left: mmToPx(design.margins.left, zoom),
          top: mmToPx(design.margins.top, zoom),
          right: mmToPx(design.margins.right, zoom),
          bottom: mmToPx(design.margins.bottom, zoom),
        }}
      />

      {/* Elements */}
      {design.elements.map((el) => (
        <CanvasElement
          key={el.id}
          element={el}
          zoom={zoom}
          isSelected={selectedElementId === el.id}
          onSelect={() => onSelectElement(el.id)}
          onMove={(x, y) => onUpdateElement(el.id, { x, y })}
          onResize={(width, height) => onUpdateElement(el.id, { width, height })}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Main Component: ReportDesignEditorPage
// ============================================================================

export default function ReportDesignEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Template state
  const [templateName, setTemplateName] = useState('Invoice Template');
  const [design, setDesign] = useState<TemplateDesign>({
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, bottom: 15, left: 15, right: 15 },
    elements: [],
    headerHeight: 50,
    footerHeight: 30,
  });

  // Editor state
  const [zoom, setZoom] = useState(100);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drag state for palette
  const [, setDraggedItem] = useState<PaletteItem | null>(null);

  const selectedElement = design.elements.find((el) => el.id === selectedElementId) || null;

  // Load template data
  useEffect(() => {
    const load = async () => {
      if (id && id !== 'new') {
        try {
          const tpl: any = await get(`/report-templates/${id}`);
          setTemplateName(tpl.name || 'Untitled Template');
          setDesign({
            paperSize: tpl.paperSize || 'A4',
            orientation: tpl.orientation || 'portrait',
            margins: tpl.margins || { top: 15, bottom: 15, left: 15, right: 15 },
            headerHeight: (tpl.design?.header?.height as number) || 50,
            footerHeight: (tpl.design?.footer?.height as number) || 30,
            elements: Array.isArray(tpl.design?.body?.elements)
              ? tpl.design.body.elements.map((e: any, idx: number) => ({
                  id: e.id || `el_${idx + 1}`,
                  type: e.type || 'text',
                  x: e.x ?? 10,
                  y: e.y ?? 10,
                  width: e.width ?? 50,
                  height: e.height ?? 10,
                  section: e.section || 'body',
                  properties: e.properties || {},
                }))
              : [],
          });
        } catch (err: any) {
          toast.error(err.response?.data?.error?.message || 'Failed to load template');
        }
      }
    };
    load();
  }, [id]);

  const handleAddElement = useCallback((element: DesignElement) => {
    setDesign((prev) => ({
      ...prev,
      elements: [...prev.elements, element],
    }));
    setSelectedElementId(element.id);
  }, []);

  const handleUpdateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setDesign((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  }, []);

  const handleDeleteElement = useCallback(() => {
    if (!selectedElementId) return;
    setDesign((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== selectedElementId),
    }));
    setSelectedElementId(null);
  }, [selectedElementId]);

  const handleDuplicateElement = useCallback(() => {
    if (!selectedElement) return;
    const newElement: DesignElement = {
      ...selectedElement,
      id: generateId(),
      x: selectedElement.x + 5,
      y: selectedElement.y + 5,
    };
    setDesign((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementId(newElement.id);
  }, [selectedElement]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payloadDesign = {
        version: '1.0',
        format: 'kira-report',
        header: { height: design.headerHeight, elements: [] as any[] },
        footer: { height: design.footerHeight, elements: [] as any[] },
        body: {
          elements: design.elements.map((el) => ({
            id: el.id,
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            section: el.section,
            properties: el.properties,
          })),
        },
      };

      if (!id || id === 'new') {
        const code = `TPL-${Date.now()}`;
        const created: any = await post('/report-templates', {
          code,
          name: templateName || 'Untitled Template',
          type: 'CUSTOM',
          category: 'CUSTOM',
          paperSize: design.paperSize,
          orientation: design.orientation,
          margins: design.margins,
          design: payloadDesign,
        });
        toast.success('Template created');
        navigate(`/tools/report-designer/${created.id}`);
      } else {
        await put(`/report-templates/${id}`, {
          name: templateName,
          paperSize: design.paperSize,
          orientation: design.orientation,
          margins: design.margins,
          design: payloadDesign,
        });
        toast.success('Template saved successfully');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!id || id === 'new') {
      toast('Save the template before previewing');
      return;
    }
    try {
      const result: any = await post(`/report-templates/${id}/preview`, {});
      if (result?.template) {
        toast.success('Preview data ready (PDF generation pending)');
      } else {
        toast('Preview unavailable');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to generate preview');
    }
  };

  const handleZoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[idx + 1]);
    }
  };

  const handleZoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom);
    if (idx > 0) {
      setZoom(ZOOM_LEVELS[idx - 1]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleDeleteElement();
        }
      }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        if (selectedElement) {
          e.preventDefault();
          handleDuplicateElement();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, selectedElement, handleDeleteElement, handleDuplicateElement]);

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Paper Size */}
          <select
            value={design.paperSize}
            onChange={(e) => setDesign((prev) => ({ ...prev, paperSize: e.target.value }))}
            className="input py-1.5 text-sm w-24"
          >
            {Object.keys(PAPER_SIZES).map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>

          {/* Orientation */}
          <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
            <button
              onClick={() => setDesign((prev) => ({ ...prev, orientation: 'portrait' }))}
              className={clsx(
                'px-3 py-1.5 text-sm',
                design.orientation === 'portrait'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
              )}
            >
              Portrait
            </button>
            <button
              onClick={() => setDesign((prev) => ({ ...prev, orientation: 'landscape' }))}
              className={clsx(
                'px-3 py-1.5 text-sm',
                design.orientation === 'landscape'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
              )}
            >
              Landscape
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomOut}
              disabled={zoom === ZOOM_LEVELS[0]}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <MagnifyingGlassMinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300 w-12 text-center">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <MagnifyingGlassPlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-slate-600" />

          {/* Preview & Save */}
          <button onClick={handlePreview} className="btn btn-secondary py-1.5">
            <EyeIcon className="w-4 h-4" />
            Preview
          </button>
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary py-1.5">
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Elements Palette */}
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex-shrink-0">
          <ElementPalette onDragStart={setDraggedItem} />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
          <DesignCanvas
            design={design}
            zoom={zoom}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onUpdateElement={handleUpdateElement}
            onAddElement={handleAddElement}
          />
        </div>

        {/* Right Panel - Properties */}
        <div className="w-72 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex-shrink-0">
          <PropertiesPanel
            element={selectedElement}
            onUpdate={(updates) => selectedElementId && handleUpdateElement(selectedElementId, updates)}
            onDelete={handleDeleteElement}
            onDuplicate={handleDuplicateElement}
          />
        </div>
      </div>
    </div>
  );
}
