
import React, { useState, memo, useRef } from 'react';
import type { Character, ImageFile } from '../types';
import { ImageUploader } from './ImageUploader';

interface EditableElementListProps {
  title: string;
  elements: Character[];
  onAdd?: () => void;
  onFilesAdd?: (files: File[]) => void;
  onRemove: (id: number) => void;
  onImageUpload: (id: number, image: ImageFile | null, fileName?: string) => void;
  onReorder?: (startIndex: number, endIndex: number) => void;
  noun: string; // e.g., "Character", "Object"
}

/** Child component for a single item. */
const EditableItem: React.FC<{
  elem: Character;
  index: number;
  noun: string;
  onRemove: (id: number) => void;
  onImageUpload: (id: number, image: ImageFile | null, fileName?: string) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: number, index: number) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>, id: number) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => void;
  onDragEnd?: () => void;
}> = memo(({
  elem,
  index,
  noun,
  onRemove,
  onImageUpload,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  return (
    <div
      key={elem.id}
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart && onDragStart(e, elem.id, index)}
      onDragOver={(e) => onDragOver && onDragOver(e)}
      onDragEnter={(e) => onDragEnter && onDragEnter(e, elem.id)}
      onDragLeave={(e) => onDragLeave && onDragLeave(e)}
      onDrop={(e) => onDrop && onDrop(e, index)}
      onDragEnd={() => onDragEnd && onDragEnd()}
      className={`relative group transition-all duration-200`}
      style={{ cursor: onDragStart ? 'grab' : 'default' }}
    >
      <ImageUploader
        id={`${noun.toLowerCase()}-${elem.id}`}
        label={elem.name || `${noun} ${elem.id}`}
        image={elem.image}
        onImageUpload={(img, fileName) => onImageUpload(elem.id, img, fileName)}
      />

      <button
        onClick={() => onRemove(elem.id)}
        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500"
        aria-label={`Remove ${elem.name}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});

export const EditableElementList: React.FC<EditableElementListProps> = ({
  title,
  elements,
  onAdd,
  onFilesAdd,
  onRemove,
  onImageUpload,
  onReorder,
  noun,
}) => {
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: number, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, id: number) => {
    e.preventDefault();
    if (draggedItemId !== id) {
      setDragOverItemId(id);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (onReorder) {
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (dragIndex !== dropIndex) {
        onReorder(dragIndex, dropIndex);
      }
    }
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  // Handlers for file dropzone
  const handleFileDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };
  const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (onFilesAdd && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdd(Array.from(e.dataTransfer.files));
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onFilesAdd && e.target.files && e.target.files.length > 0) {
      onFilesAdd(Array.from(e.target.files));
    }
    // Reset input value to allow re-uploading the same file
    if (e.target) {
      e.target.value = '';
    }
  };
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onFilesAdd) return;
    // Prevent triggering file dialog when interacting with an item itself
    if ((e.target as HTMLElement).closest('.group')) return;
    fileInputRef.current?.click();
  };

  const isDropzone = !!onFilesAdd;

  const listContent = (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {elements.map((elem, index) => (
          <div
            key={elem.id}
            className={`relative group transition-all duration-200 
              ${draggedItemId === elem.id ? 'opacity-40 scale-95' : 'opacity-100'}
              ${dragOverItemId === elem.id ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900 rounded-lg' : ''}
            `}
            style={{ cursor: onReorder ? 'grab' : 'default' }}
          >
            <EditableItem
              elem={elem}
              index={index}
              noun={noun}
              onRemove={onRemove}
              onImageUpload={onImageUpload}
              onDragStart={onReorder ? handleDragStart : undefined}
              onDragOver={onReorder ? handleDragOver : undefined}
              onDragEnter={onReorder ? handleDragEnter : undefined}
              onDragLeave={onReorder ? handleDragLeave : undefined}
              onDrop={onReorder ? handleDrop : undefined}
              onDragEnd={onReorder ? handleDragEnd : undefined}
            />
          </div>
        ))}
        {isDropzone && elements.length === 0 && (
          <div className="col-span-full text-center py-8 text-gray-500 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 font-semibold">Drag & drop images here</p>
            <p className="text-sm">or click to select files</p>
          </div>
        )}
      </div>
  );

  return (
    <section>
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
        <h2 className="text-xl font-bold text-cyan-300 tracking-wider">{title}</h2>
        {onAdd && (
            <button
            onClick={onAdd}
            className="text-sm border-2 border-cyan-500/50 text-cyan-400 font-bold py-1 px-3 rounded-md hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-colors duration-200"
            aria-label={`Add new ${noun.toLowerCase()}`}
            >
            + Add
            </button>
        )}
      </div>

      {isDropzone ? (
        <>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          <div
            onClick={handleContainerClick}
            onDragOver={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
            className={`min-h-[120px] rounded-lg border-2 border-dashed cursor-pointer transition-all ${
              isDraggingFile ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/30 hover:border-cyan-500/70'
            } ${elements.length > 0 ? 'p-4' : 'flex items-center justify-center'}`}
          >
            {listContent}
          </div>
        </>
      ) : (
        listContent
      )}
    </section>
  );
};
