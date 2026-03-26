import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCategories, setCategories, createCategory } from '../../store/slices/inventorySlice';
import { selectAllCategories, selectAllItems } from '../../store/selectors/inventorySelectors';
import { subscribeCategories } from '../../services/firebase/categoryService';
import type { Category, Item } from '../../types/inventory';
import { Icon } from '../shared/Icon';

export interface CategoryPickerProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategoryPicker({
  value,
  onChange,
  placeholder = 'Select category',
  disabled = false,
}: CategoryPickerProps) {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectAllCategories);
  const allItems = useAppSelector(selectAllItems);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /** True when the trigger was just pressed with pointer — focus follows mousedown, so we skip "open on focus" and let click toggle (avoids open-then-close on mouse click). */
  const suppressOpenFromPointerRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const listboxId = `${baseId}-listbox`;

  useEffect(() => {
    dispatch(fetchCategories());
    const unsub = subscribeCategories((updated: Category[]) => dispatch(setCategories(updated)));
    return () => unsub();
  }, [dispatch]);

  const itemsByCategory = useCallback(() => {
    const map: Record<string, Item[]> = {};
    for (const item of allItems) {
      const key = item.categoryId || 'uncategorized';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [allItems])();

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const hasUncategorized = (itemsByCategory['uncategorized']?.length ?? 0) > 0;
  const showUncategorized = hasUncategorized && 'uncategorized'.includes(searchQuery.trim().toLowerCase());

  const selectedLabel = value === null || value === ''
    ? 'Uncategorized'
    : categories.find((c) => c.id === value)?.name ?? placeholder;

  const handleSelect = (categoryId: string | null) => {
    onChange(categoryId);
    setIsOpen(false);
  };

  /** When opened via Tab, move focus into the search field so typing works without another click. */
  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCreateError('Category name is required');
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setCreateError('A category with this name already exists');
      return;
    }
    try {
      setIsCreating(true);
      setCreateError(null);
      const created = await dispatch(createCategory(trimmed)).unwrap();
      handleSelect(created?.id ?? '');
      setShowAddNew(false);
      setNewCategoryName('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  };

  if (showAddNew) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[15px] text-slate-900 mb-1.5">Category Name *</label>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => {
              setNewCategoryName(e.target.value);
              setCreateError(null);
            }}
            className={`w-full border rounded-lg h-12 px-4 bg-white text-[15px] ${createError ? 'border-red-600' : 'border-slate-200'}`}
            placeholder="Enter category name"
            autoFocus
          />
          {createError && <p className="text-[13px] text-red-600 mt-1">{createError}</p>}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowAddNew(false);
              setNewCategoryName('');
              setCreateError(null);
            }}
            disabled={isCreating}
            className="flex-1 border border-slate-200 rounded-[10px] h-[50px] font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !newCategoryName.trim()}
            className="flex-1 bg-blue-800 rounded-[10px] h-[50px] font-semibold text-white disabled:opacity-70"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        id={triggerId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        disabled={disabled}
        onPointerDown={() => {
          suppressOpenFromPointerRef.current = true;
        }}
        onFocus={() => {
          if (disabled) return;
          queueMicrotask(() => {
            if (!suppressOpenFromPointerRef.current) {
              setIsOpen(true);
            }
            suppressOpenFromPointerRef.current = false;
          });
        }}
        onClick={() => {
          if (disabled) return;
          setIsOpen((o) => !o);
        }}
        className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-white flex items-center justify-between text-left text-[15px] text-slate-900 disabled:opacity-50"
      >
        <span className={value ? '' : 'text-slate-400'}>{selectedLabel}</span>
        <Icon name="chevron-down" className="w-5 h-5 text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={triggerId}
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[10px] border border-slate-200 shadow-lg z-50 max-h-80 overflow-hidden flex flex-col"
          >
            <div className="p-2 border-b border-slate-200">
              <div className="bg-slate-100 rounded-full h-10 px-3 flex items-center gap-2">
                <Icon name="magnifying-glass" className="w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search categories..."
                  className="flex-1 bg-transparent text-[14px] focus:outline-none"
                  aria-label="Search categories"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {showUncategorized && (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 ${
                    value === null || value === '' ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-50'
                  }`}
                >
                  Uncategorized
                </button>
              )}
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg mb-1 ${
                    value === cat.id ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddNew(true)}
                className="w-full flex items-center justify-center gap-2 py-2 text-blue-800 font-semibold"
              >
                <Icon name="plus-circle" className="w-5 h-5" />
                Add New Category
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
