import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchCategories,
  createCategory,
  deleteCategory,
  clearError,
} from '../../store/slices/inventorySlice';
import {
  selectAllCategories,
  selectAllItems,
  selectItemsLoading,
} from '../../store/selectors/inventorySelectors';
import { useInventoryError } from '../../hooks/useInventoryError';
import { subscribeCategories, checkItemsUsingCategory } from '../../services/firebase/categoryService';
import { setCategories } from '../../store/slices/inventorySlice';
import type { Category, Item } from '../../types/inventory';
import { Icon } from '../../components/shared/Icon';

export function CategoryManagementPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useAppSelector(selectAllCategories);
  const allItems = useAppSelector(selectAllItems);
  const isLoading = useAppSelector(selectItemsLoading);
  const error = useInventoryError();

  const itemsByCategory = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const item of allItems) {
      const key = item.categoryId ?? 'uncategorized';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [allItems]);

  useEffect(() => {
    dispatch(fetchCategories());
    const unsub = subscribeCategories((updated: Category[]) => dispatch(setCategories(updated)));
    return () => unsub();
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchCategories()).finally(() => setRefreshing(false));
  }, [dispatch]);

  const handleCancel = useCallback(() => {
    dispatch(clearError());
    navigate(-1);
  }, [dispatch, navigate]);

  const handleDelete = useCallback(
    async (category: Category) => {
      try {
        const itemCount = await checkItemsUsingCategory(category.id);
        if (itemCount > 0) {
          window.alert(
            `This category has ${itemCount} item${itemCount > 1 ? 's' : ''} associated with it. Please reassign these items to another category before deleting.`
          );
          return;
        }
        if (
          !window.confirm(
            `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
          )
        )
          return;
        await dispatch(deleteCategory(category.id)).unwrap();
      } catch (err) {
        window.alert(
          err instanceof Error ? err.message : 'Failed to delete category'
        );
      }
    },
    [dispatch]
  );

  const handleCreateCategory = useCallback(async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      window.alert('Please enter a category name');
      return;
    }
    if (trimmed.length > 50) {
      window.alert('Category name must be 50 characters or less');
      return;
    }
    try {
      setIsCreating(true);
      await dispatch(createCategory(trimmed)).unwrap();
      setNewCategoryName('');
      setShowAddModal(false);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsCreating(false);
    }
  }, [dispatch, newCategoryName]);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const filteredCategories = safeCategories.filter((c) =>
    (c?.name ?? '').toLowerCase().includes((searchQuery ?? '').toLowerCase().trim())
  );

  const getItemCount = (categoryId: string) => itemsByCategory[categoryId]?.length ?? 0;

  if (isLoading && safeCategories.length === 0 && !refreshing) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
          <button type="button" onClick={handleCancel} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Cancel">
            <Icon name="x-mark" className="w-6 h-6" />
          </button>
          <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Category Management</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[15px] text-slate-500 mt-4">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-slate-200 px-4 flex items-center h-14">
        <button type="button" onClick={handleCancel} className="w-12 h-12 -ml-2 flex items-center justify-center" aria-label="Cancel">
          <Icon name="x-mark" className="w-6 h-6" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900 flex-1">Category Management</h1>
      </header>

      {error && (
        <div className="p-3 mx-4 mt-3 rounded-lg bg-red-600/10 border border-red-600 flex items-start gap-2">
          <Icon name="exclamation-triangle" className="w-6 h-6 text-red-600 flex-shrink-0" />
          <p className="text-[14px] text-red-600 flex-1">{error}</p>
          <button type="button" onClick={() => dispatch(clearError())}>
            <Icon name="x-mark" className="w-5 h-5 text-red-600" />
          </button>
        </div>
      )}

      <div className="px-4 pt-3 pb-2">
        <div className="bg-slate-100 rounded-full h-12 px-4 flex items-center gap-3">
          <Icon name="magnifying-glass" className="w-5 h-5 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="Search categories"
          />
          {searchQuery.length > 0 && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <Icon name="x-mark" className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Icon name="swatch" className="w-20 h-20 text-slate-400" />
            <h2 className="text-[22px] font-semibold text-slate-900 text-center mt-4 mb-2">
              {searchQuery ? 'No categories found' : 'No categories yet'}
            </h2>
            <p className="text-[15px] text-slate-500 text-center mb-6">
              {searchQuery ? 'Try adjusting your search.' : 'Create your first category to organize your inventory items.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="bg-blue-800 rounded-[10px] h-[50px] px-6 flex items-center justify-center text-[15px] font-semibold text-white"
              >
                Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-[10px] p-4 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <p className="text-[15px] font-semibold text-slate-900">{cat.name}</p>
                  <p className="text-[13px] text-slate-500">
                    {getItemCount(cat.id)} item{getItemCount(cat.id) !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg border border-slate-200 text-red-600"
                  aria-label={`Delete ${cat.name}`}
                >
                  <Icon name="trash" className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-blue-800 flex items-center justify-center shadow-lg"
        aria-label="Add new category"
      >
        <Icon name="plus-circle" className="w-7 h-7 text-white" />
      </button>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-[10px] w-full max-w-md">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold text-slate-900">Add Category</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                }}
                disabled={isCreating}
                className="w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                <Icon name="x-mark" className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="block text-[15px] text-slate-900 mb-1.5">
                  Category Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg h-12 px-4 bg-white"
                  placeholder="Enter category name"
                  maxLength={50}
                  disabled={isCreating}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCategoryName('');
                  }}
                  disabled={isCreating}
                  className="flex-1 border border-slate-200 rounded-[10px] h-[50px] font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={isCreating || !newCategoryName.trim()}
                  className="flex-1 bg-blue-800 rounded-[10px] h-[50px] font-semibold text-white disabled:opacity-70"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
