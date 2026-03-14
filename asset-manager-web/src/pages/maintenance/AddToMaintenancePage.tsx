import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/shared/Icon';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import {
  ItemSelectorForMaintenance,
  IssueTypeSelector,
} from '../../components/maintenance';
import { addToMaintenanceThunk } from '../../store/thunks/maintenanceThunks';
import { selectUserId, selectUserDisplayName } from '../../store/selectors/authSelectors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  isWeightBasedItem,
  kgToPieces,
  tonToKg,
  getConversionErrorMessage,
  piecesToKg,
  formatWeight,
} from '../../utils/weightConversionUtils';
import type { Item } from '../../types/inventory';
import type { IssueType, AddToMaintenanceData } from '../../types/maintenance';

const MAX_PHOTOS = 5;

interface FormErrors {
  item?: string;
  quantity?: string;
  issueType?: string;
}

export function AddToMaintenancePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const userName = useAppSelector(selectUserDisplayName);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false);
  const isSteelItem = selectedItem ? isWeightBasedItem(selectedItem) : false;
  const hasFullWeightConfig =
    isSteelItem &&
    selectedItem?.weightPerMeter != null &&
    selectedItem?.lengthPerPiece != null;

  const [entryMode, setEntryMode] = useState<'pieces' | 'kg' | 'ton'>('pieces');
  const [amountStr, setAmountStr] = useState('1');
  const [quantity, setQuantity] = useState(1);

  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!selectedItem) newErrors.item = 'Please select an item';

    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      newErrors.quantity = 'Please enter a valid positive amount';
    } else {
      const isDiscreteUnit = (u: string) =>
        ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(u);
      if (entryMode === 'pieces' || !hasFullWeightConfig) {
        if (
          entryMode === 'pieces' &&
          hasFullWeightConfig &&
          !Number.isInteger(num)
        ) {
          newErrors.quantity = 'Pieces must be a whole number';
        } else if (
          !hasFullWeightConfig &&
          isDiscreteUnit(selectedItem?.unit || '') &&
          !Number.isInteger(num)
        ) {
          newErrors.quantity = `Quantity in ${selectedItem?.unit} must be a whole number`;
        } else if (num > (selectedItem?.centralStoreQuantity || 0)) {
          newErrors.quantity = `Cannot exceed available quantity (${selectedItem?.centralStoreQuantity})`;
        }
      } else {
        const kg = entryMode === 'ton' ? tonToKg(num) : num;
        const res = kgToPieces(
          kg,
          selectedItem!.weightPerMeter!,
          selectedItem!.lengthPerPiece!
        );
        if (!res.isExact) {
          newErrors.quantity = getConversionErrorMessage(
            kg,
            selectedItem!.weightPerMeter!,
            selectedItem!.lengthPerPiece!
          );
        } else if (res.pieces > (selectedItem?.centralStoreQuantity || 0)) {
          newErrors.quantity = `Cannot exceed available quantity (${selectedItem?.centralStoreQuantity} pieces)`;
        }
      }
    }
    if (!issueType) newErrors.issueType = 'Please select issue type';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleModeChange = useCallback(
    (m: 'pieces' | 'kg' | 'ton') => {
      setEntryMode(m);
      setErrors((prev) => ({ ...prev, quantity: undefined }));
      if (quantity > 0 && hasFullWeightConfig && selectedItem) {
        if (m === 'pieces') setAmountStr(String(quantity));
        else if (m === 'kg') {
          setAmountStr(
            String(
              piecesToKg(
                quantity,
                selectedItem.weightPerMeter!,
                selectedItem.lengthPerPiece!
              )
            )
          );
        } else {
          setAmountStr(
            String(
              piecesToKg(
                quantity,
                selectedItem.weightPerMeter!,
                selectedItem.lengthPerPiece!
              ) / 1000
            )
          );
        }
      } else if (quantity > 0) setAmountStr(String(quantity));
      else setAmountStr('');
    },
    [quantity, hasFullWeightConfig, selectedItem]
  );

  const handleAmountChange = (text: string) => {
    setAmountStr(text);
    if (!text.trim()) {
      setQuantity(0);
      setErrors((prev) => ({ ...prev, quantity: undefined }));
      return;
    }
    const num = parseFloat(text);
    if (isNaN(num) || num < 0) {
      setErrors((prev) => ({ ...prev, quantity: 'Invalid amount' }));
      return;
    }
    const isDiscreteUnit = (u: string) =>
      ['Pieces', 'Bags', 'Sets', 'Boxes', 'Rolls'].includes(u);
    if (entryMode === 'pieces' || !hasFullWeightConfig) {
      if (
        entryMode === 'pieces' &&
        hasFullWeightConfig &&
        selectedItem &&
        !Number.isInteger(num)
      ) {
        setErrors((prev) => ({ ...prev, quantity: 'Pieces must be a whole number' }));
        return;
      }
      if (
        !hasFullWeightConfig &&
        selectedItem &&
        isDiscreteUnit(selectedItem.unit || '') &&
        !Number.isInteger(num)
      ) {
        setErrors((prev) => ({
          ...prev,
          quantity: `Quantity in ${selectedItem.unit} must be a whole number`,
        }));
        return;
      }
      setErrors((prev) => ({ ...prev, quantity: undefined }));
      setQuantity(num);
    } else if (selectedItem) {
      const kg = entryMode === 'ton' ? tonToKg(num) : num;
      const res = kgToPieces(
        kg,
        selectedItem.weightPerMeter!,
        selectedItem.lengthPerPiece!
      );
      if (!res.isExact) {
        setErrors((prev) => ({
          ...prev,
          quantity: getConversionErrorMessage(
            kg,
            selectedItem.weightPerMeter!,
            selectedItem.lengthPerPiece!
          ),
        }));
      } else {
        setErrors((prev) => ({ ...prev, quantity: undefined }));
        setQuantity(res.pieces);
      }
    }
  };

  const handleDecrement = () => {
    if (entryMode !== 'pieces' && hasFullWeightConfig) return;
    if (quantity > 1) {
      const newQty = quantity - 1;
      setAmountStr(String(newQty));
      setQuantity(newQty);
      setErrors((prev) => ({ ...prev, quantity: undefined }));
    }
  };

  const handleIncrement = () => {
    if (entryMode !== 'pieces' && hasFullWeightConfig) return;
    const maxQty = selectedItem?.centralStoreQuantity || 0;
    if (quantity < maxQty) {
      const newQty = quantity + 1;
      setAmountStr(String(newQty));
      setQuantity(newQty);
      setErrors((prev) => ({ ...prev, quantity: undefined }));
    }
  };

  const handleImagePick = () => {
    if (photoFiles.length >= MAX_PHOTOS) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => f.type.startsWith('image/'));
    setPhotoFiles((prev) =>
      prev.length + valid.length <= MAX_PHOTOS
        ? [...prev, ...valid]
        : prev.concat(valid.slice(0, MAX_PHOTOS - prev.length))
    );
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedItem || !issueType || !userId || !userName) return;

    setIsSubmitting(true);
    const data: AddToMaintenanceData = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      itemSku: selectedItem.sku,
      unit: selectedItem.unit,
      quantity,
      issueType,
      issueDescription: description.trim() || '',
      reportedBy: reportedBy.trim() || undefined,
      reportedByName: reportedBy.trim() || undefined,
      photos: [],
    };

    const photoUris: string[] = photoFiles.map((f) => URL.createObjectURL(f));

    try {
      await dispatch(
        addToMaintenanceThunk({ data, userId, userName, photoUris })
      ).unwrap();
      photoUris.forEach((url) => URL.revokeObjectURL(url));
      navigate('/maintenance');
    } catch (err: unknown) {
      photoUris.forEach((url) => URL.revokeObjectURL(url));
      const msg = err instanceof Error ? err.message : 'Failed to add item to maintenance';
      setErrors((prev) => ({ ...prev, item: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
          aria-label="Go back"
        >
          <Icon name="arrow-left" className="h-5 w-5 text-slate-700" />
        </button>
        <h1 className="text-[22px] font-semibold text-slate-900">Add to Maintenance</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[15px] text-slate-900">
            Item <span className="text-red-600">*</span>
          </label>
          <button
            type="button"
            onClick={() => setItemSelectorOpen(true)}
            className="mt-1.5 flex h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4"
          >
            <span className={selectedItem ? 'text-slate-900' : 'text-slate-400'}>
              {selectedItem ? selectedItem.name : 'Select Item'}
            </span>
            <Icon name="chevron-right" className="h-5 w-5 text-slate-500" />
          </button>
          {selectedItem && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[13px] text-slate-500">SKU: {selectedItem.sku}</p>
              <p className="text-[13px] text-slate-500">
                Available: {selectedItem.centralStoreQuantity || 0} {selectedItem.unit}
              </p>
            </div>
          )}
          {errors.item && <p className="mt-1 text-[13px] text-red-600">{errors.item}</p>}
        </div>

        <div>
          <label className="text-[15px] text-slate-900">
            Quantity <span className="text-red-600">*</span>
          </label>
          {hasFullWeightConfig && (
            <div className="mt-2 flex gap-3">
              {(['pieces', 'kg', 'ton'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeChange(m)}
                  disabled={isSubmitting}
                  className={`flex-1 rounded-lg border py-2.5 text-center text-[13px] font-semibold ${
                    entryMode === m
                      ? 'border-blue-800 bg-blue-800 text-white'
                      : 'border-slate-200 bg-white text-slate-900'
                  }`}
                >
                  {m === 'pieces' ? 'Pcs' : m === 'kg' ? 'Kg' : 'Ton'}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-3">
            {(!hasFullWeightConfig || entryMode === 'pieces') && (
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1 || isSubmitting}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white disabled:opacity-50"
              >
                <Icon name="minus" className="h-5 w-5 text-blue-800" />
              </button>
            )}
            <input
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => handleAmountChange(e.target.value)}
              disabled={isSubmitting}
              className={`h-12 flex-1 rounded-lg border bg-white px-4 text-center text-xl font-bold text-slate-900 ${
                errors.quantity ? 'border-red-600' : 'border-slate-200'
              }`}
            />
            {(!hasFullWeightConfig || entryMode === 'pieces') && (
              <button
                type="button"
                onClick={handleIncrement}
                disabled={
                  !selectedItem ||
                  quantity >= (selectedItem.centralStoreQuantity || 0) ||
                  isSubmitting
                }
                className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-800 bg-blue-800 disabled:opacity-50"
              >
                <Icon name="plus" className="h-5 w-5 text-white" />
              </button>
            )}
          </div>
          {hasFullWeightConfig &&
            !errors.quantity &&
            quantity > 0 &&
            selectedItem &&
            entryMode !== 'pieces' && (
              <p className="mt-1 text-[13px] font-medium text-green-600">= {quantity} pieces</p>
            )}
          {hasFullWeightConfig &&
            !errors.quantity &&
            quantity > 0 &&
            selectedItem &&
            entryMode === 'pieces' && (
              <p className="mt-1 text-[13px] text-slate-500">
                ≈{' '}
                {formatWeight(
                  piecesToKg(
                    quantity,
                    selectedItem.weightPerMeter!,
                    selectedItem.lengthPerPiece!
                  ),
                  'Kg'
                )}
              </p>
            )}
          {errors.quantity && <p className="mt-1 text-[13px] text-red-600">{errors.quantity}</p>}
        </div>

        <div>
          <label className="text-[15px] text-slate-900">
            Issue Type <span className="text-red-600">*</span>
          </label>
          <div className="mt-1.5">
            <IssueTypeSelector
              value={issueType}
              onSelect={setIssueType}
              error={errors.issueType}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="text-[15px] text-slate-900">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            placeholder="Describe the issue in detail (optional)"
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
            maxLength={500}
          />
          <p className="ml-auto mt-1 text-[13px] text-slate-500">
            {description.length}/500
          </p>
        </div>

        <div>
          <label className="text-[15px] text-slate-900">Reported By</label>
          <input
            type="text"
            value={reportedBy}
            onChange={(e) => setReportedBy(e.target.value)}
            disabled={isSubmitting}
            placeholder="Name of person reporting the issue (optional)"
            className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-[15px] text-slate-900 placeholder-slate-400 focus:border-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-800"
          />
        </div>

        <div>
          <label className="text-[15px] text-slate-900">Photos (Optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {photoFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative h-20 w-20 overflow-hidden rounded-lg bg-slate-100"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(i)}
                  disabled={isSubmitting}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white"
                >
                  <Icon name="x-mark" className="h-4 w-4" />
                </button>
              </div>
            ))}
            {photoFiles.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={handleImagePick}
                disabled={isSubmitting}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50"
              >
                <Icon name="camera" className="h-7 w-7 text-blue-800" />
                <span className="mt-1 text-[11px] text-slate-500">Add</span>
              </button>
            )}
          </div>
          {photoFiles.length > 0 && (
            <p className="mt-1 text-[12px] text-slate-500">
              {photoFiles.length}/{MAX_PHOTOS} photos
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex h-[50px] w-full items-center justify-center rounded-[10px] bg-blue-800 text-[15px] font-semibold text-white transition-colors hover:bg-blue-900 disabled:opacity-50"
        >
          {isSubmitting ? (
            <LoadingSpinner className="h-6 w-6 text-white" />
          ) : (
            'Add to Maintenance'
          )}
        </button>
      </div>

      <ItemSelectorForMaintenance
        isOpen={itemSelectorOpen}
        onClose={() => setItemSelectorOpen(false)}
        onSelect={(item) => {
          setSelectedItem(item);
          setAmountStr('1');
          setQuantity(1);
          setEntryMode('pieces');
          setErrors((prev) => (prev.item ? { ...prev, item: undefined } : prev));
        }}
        selectedItemId={selectedItem?.id}
      />
    </div>
  );
}
