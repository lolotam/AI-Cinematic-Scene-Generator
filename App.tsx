

import React, { useState, useEffect, useCallback } from 'react';
import type { Character, ImageFile, HistoryItem } from './types';
import { ASPECT_RATIOS, LIGHTING_STYLES, CAMERA_PERSPECTIVES, NUMBER_OF_IMAGES } from './constants';
import { ImageUploader, parseDataUrl } from './components/ImageUploader';
import { SelectInput } from './components/SelectInput';
import { GeneratedImageDisplay } from './components/GeneratedImageDisplay';
import { generateStoryImage, enhancePrompt } from './services/geminiService';
import { Modal } from './components/Modal';
import { EditableElementList } from './components/EditableElementList';
import { HistoryPanel } from './components/HistoryPanel';

// --- Helper Components (Moved Outside App) ---

const getNameFromFilename = (fileName: string): string => {
    if (!fileName) return '';
    const nameParts = fileName.split('.');
    if (nameParts.length > 1) {
        nameParts.pop(); // remove extension
    }
    return nameParts.join('.').replace(/_/g, ' ').replace(/-/g, ' ');
};

const TabButton: React.FC<{
    tabName: 'generate' | 'edit';
    label: string;
    activeTab: 'generate' | 'edit';
    onClick: (tabName: 'generate' | 'edit') => void;
}> = ({ tabName, label, activeTab, onClick }) => (
     <button
        onClick={() => onClick(tabName)}
        className={`px-6 py-3 text-lg font-semibold transition-all duration-300 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-t-lg
            ${activeTab === tabName 
            ? 'text-cyan-300' 
            : 'text-gray-500 hover:text-cyan-400'
        }`}
    >
        {label}
        {activeTab === tabName && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
        )}
    </button>
);

const MainPanel: React.FC<{children: React.ReactNode; className?: string}> = ({children, className}) => (
    <div className={`bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-6 ${className}`}>
        {children}
    </div>
);

const SectionHeader: React.FC<{children: React.ReactNode}> = ({children}) => (
    <h2 className="text-xl font-bold text-cyan-300 tracking-wider mb-4 border-b border-white/10 pb-3">{children}</h2>
);


// --- Main App Component ---

const MAX_HISTORY_ITEMS = 20;

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');

    // === COMMON STATE ===
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    // === GENERATE TAB STATE ===
    const [characters, setCharacters] = useState<Character[]>([
        { id: 1, name: "Character 1", image: null },
    ]);
    const [additionalElements, setAdditionalElements] = useState<Character[]>([]);
    const [sceneDescription, setSceneDescription] = useState<string>('');
    const [sceneLocationImage, setSceneLocationImage] = useState<ImageFile | null>(null);
    const [styleImage, setStyleImage] = useState<ImageFile | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);
    const [lightingStyle, setLightingStyle] = useState<string>(LIGHTING_STYLES[0].value);
    const [cameraPerspective, setCameraPerspective] = useState<string>(CAMERA_PERSPECTIVES[0].value);
    const [numberOfImages, setNumberOfImages] = useState<number>(1);
    const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const [genLoading, setGenLoading] = useState<boolean>(false);
    const [genError, setGenError] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState<boolean>(false);


    // === EDIT TAB STATE ===
    const [editBaseImage, setEditBaseImage] = useState<ImageFile | null>(null);
    const [editBaseImageName, setEditBaseImageName] = useState<string | null>(null);
    const [editAddChars, setEditAddChars] = useState<Character[]>([]);
    const [editAddObjs, setEditAddObjs] = useState<Character[]>([]);
    const [standaloneEditPrompt, setStandaloneEditPrompt] = useState<string>('');
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState<boolean>(false);
    const [editError, setEditError] = useState<string | null>(null);
    
    // === DERIVED STATE ===
    const hasSceneDescription = sceneDescription.trim() !== '';
    const hasCharacterImage = characters.some(c => c.image !== null);
    const hasElementImage = additionalElements.some(e => e.image !== null);
    const hasLocationImage = sceneLocationImage !== null;
    const isGenerationDisabled = !(hasSceneDescription || hasCharacterImage || hasElementImage || hasLocationImage) || genLoading;
    const isEditDisabled = !editBaseImage || standaloneEditPrompt.trim() === '' || editLoading;

    // === EFFECTS ===
    
    // Load history from local storage on mount
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('generationHistory');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory).slice(0, MAX_HISTORY_ITEMS));
            }
        } catch (error) {
            console.error("Failed to load history from local storage:", error);
            localStorage.removeItem('generationHistory');
        }
    }, []);

    // Save history to local storage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('generationHistory', JSON.stringify(history));
        } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                 console.error("Failed to save history to local storage: Quota exceeded. History is now capped to prevent this.");
            } else {
                 console.error("Failed to save history to local storage:", error);
            }
        }
    }, [history]);

    // Prompt generator for the "Generate" tab
    useEffect(() => {
        if (activeTab !== 'generate') return;
        
        const characterNames = characters
            .filter(c => c.image !== null && c.name.trim() !== '')
            .map(c => `(${c.name.trim()})`)
            .join(', ');

        const elementNames = additionalElements
            .filter(e => e.image !== null && e.name.trim() !== '')
            .map(e => `(${e.name.trim()})`)
            .join(', ');

        const promptParts = [
            sceneDescription 
                ? `A cinematic scene with a strict aspect ratio of ${aspectRatio}: ${sceneDescription}.`
                : `A cinematic scene with a strict aspect ratio of ${aspectRatio}.`,
            characterNames ? `Featuring characters: ${characterNames}.` : '',
            elementNames ? `The scene also includes these key objects/props: ${elementNames}.` : '',
            sceneLocationImage ? 'Use the provided "Scene Location" image as the background for the scene.' : '',
            `The lighting should be ${lightingStyle}.`,
            `Use a ${cameraPerspective}.`,
            (characterNames || elementNames || styleImage || sceneLocationImage) ? `Use the provided images for character, object, location, and style consistency.` : '',
        ];
        
        const newPrompt = promptParts.filter(p => p).join(' ');
        setGeneratedPrompt(newPrompt);

    }, [characters, additionalElements, sceneDescription, aspectRatio, lightingStyle, cameraPerspective, styleImage, sceneLocationImage, activeTab]);

    // === HANDLERS ===
    
    const handleAddToHistory = useCallback((image: string, prompt: string, type: 'gen' | 'edit') => {
        try {
            const newHistoryItem: HistoryItem = {
                id: `${type}-${Date.now()}`,
                image: parseDataUrl(image),
                prompt: prompt,
                createdAt: new Date().toISOString(),
            };
            setHistory(prev => [newHistoryItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
        } catch (error) {
            console.error("Failed to parse image for history:", error);
        }
    }, []);

    const handleReorder = <T,>(
        list: T[],
        setList: React.Dispatch<React.SetStateAction<T[]>>,
        startIndex: number,
        endIndex: number
      ) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        setList(result);
    };
    
    const handleCharacterImageUpload = (id: number, image: ImageFile | null, fileName?: string) => {
        setCharacters(prev => prev.map(c => {
            if (c.id === id) {
                const newName = image && fileName ? getNameFromFilename(fileName) : c.name || `Character ${prev.findIndex(char => char.id === id) + 1}`;
                return { ...c, image, name: newName };
            }
            return c;
        }));
    };

    const handleElementImageUpload = (id: number, image: ImageFile | null, fileName?: string) => {
        setAdditionalElements(prev => prev.map(c => {
            if (c.id === id) {
                const newName = image && fileName ? getNameFromFilename(fileName) : c.name || `Object ${prev.findIndex(el => el.id === id) + 1}`;
                return { ...c, image, name: newName };
            }
            return c;
        }));
    };

    const handleAdditionalElementsFilesAdd = (files: File[]) => {
        const filePromises = files
            .filter(file => file.type.startsWith('image/'))
            .map(file => {
                return new Promise<{ name: string, image: ImageFile }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (typeof reader.result !== 'string') {
                            return reject(new Error('Failed to read file.'));
                        }
                        try {
                            const parsedImage = parseDataUrl(reader.result);
                            const name = getNameFromFilename(file.name);
                            resolve({ name, image: parsedImage });
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

        Promise.all(filePromises)
            .then(newElementsData => {
                const newCharacters: Character[] = newElementsData.map((data, index) => ({
                    id: Date.now() + index,
                    name: data.name,
                    image: data.image,
                }));
                setAdditionalElements(prev => [...prev, ...newCharacters]);
            })
            .catch(error => {
                console.error("Error processing dropped files:", error);
                setGenError("One or more images could not be processed. Please try again.");
            });
    };
    
    const handleEditBaseImageUpload = (image: ImageFile | null, fileName?: string) => {
        setEditBaseImage(image);
        setEditBaseImageName(image && fileName ? fileName : null);
    };

    const handleEditCharImageUpload = (id: number, image: ImageFile | null, fileName?: string) => {
        setEditAddChars(prev => prev.map(c => {
            if (c.id === id) {
                const newName = image && fileName ? getNameFromFilename(fileName) : `Character ${prev.findIndex(char => char.id === id) + 1}`;
                return { ...c, image, name: newName };
            }
            return c;
        }));
    };

    const handleEditObjImageUpload = (id: number, image: ImageFile | null, fileName?: string) => {
        setEditAddObjs(prev => prev.map(c => {
            if (c.id === id) {
                const newName = image && fileName ? getNameFromFilename(fileName) : `Object ${prev.findIndex(el => el.id === id) + 1}`;
                return { ...c, image, name: newName };
            }
            return c;
        }));
    };

    // Handlers for GENERATE tab
    const handleGenerateClick = useCallback(async () => {
        if (isGenerationDisabled) return;

        setGenLoading(true);
        setGenError(null);
        setGeneratedImages([]);

        const characterImages = characters.map(c => c.image).filter((img): img is ImageFile => img !== null);
        const elementImages = additionalElements.map(e => e.image).filter((img): img is ImageFile => img !== null);
        const locationImage = sceneLocationImage ? [sceneLocationImage] : [];
        
        try {
            const allGeneratedImages: string[] = [];
            for (let i = 0; i < numberOfImages; i++) {
                const resultImage = await generateStoryImage({
                    prompt: generatedPrompt,
                    characterImages: [...locationImage, ...characterImages, ...elementImages],
                    styleImage,
                });
                allGeneratedImages.push(resultImage);
                setGeneratedImages([...allGeneratedImages]); // Update UI progressively
                handleAddToHistory(resultImage, generatedPrompt, 'gen');
            }
        } catch (err: unknown) {
            setGenError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setGenLoading(false);
        }
    }, [generatedPrompt, characters, additionalElements, styleImage, sceneLocationImage, isGenerationDisabled, numberOfImages, handleAddToHistory]);

    const handleEnhancePrompt = async () => {
        if (!sceneDescription.trim() || isEnhancing) return;

        setIsEnhancing(true);
        setGenError(null); // Clear previous errors
        try {
            const enhanced = await enhancePrompt(sceneDescription);
            setSceneDescription(enhanced);
        } catch (err: unknown) {
            setGenError(err instanceof Error ? `Enhancement failed: ${err.message}` : 'An unknown error occurred during enhancement.');
        } finally {
            setIsEnhancing(false);
        }
    };
    
    // Handlers for EDIT tab
     const handleApplyStandaloneEdit = useCallback(async () => {
        if (isEditDisabled) return;

        setEditLoading(true);
        setEditError(null);
        setEditedImage(null);

        const characterImages = editAddChars.map(c => c.image).filter((img): img is ImageFile => img !== null);
        const elementImages = editAddObjs.map(o => o.image).filter((img): img is ImageFile => img !== null);
        const charNames = editAddChars.filter(c => c.image).map(c => `(${c.name})`).join(', ');
        const objNames = editAddObjs.filter(o => o.image).map(o => `(${o.name})`).join(', ');

        let prompt = `Apply this edit to the base image: ${standaloneEditPrompt}.`;
        if(charNames) prompt += ` Use the provided reference images for these characters: ${charNames}.`;
        if(objNames) prompt += ` Use the provided reference images for these objects: ${objNames}.`;

        try {
            const resultImage = await generateStoryImage({
                prompt: prompt,
                characterImages: [...characterImages, ...elementImages],
                styleImage: null,
                baseImage: editBaseImage,
            });
            setEditedImage(resultImage);
            handleAddToHistory(resultImage, prompt, 'edit');
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setEditLoading(false);
        }
    }, [editBaseImage, standaloneEditPrompt, editAddChars, editAddObjs, isEditDisabled, handleAddToHistory]);

    // Handlers for HISTORY
    const handleViewHistoryItem = (item: HistoryItem) => {
        const imageUrl = `data:${item.image.mimeType};base64,${item.image.base64}`;
        setViewingImage(imageUrl);
    };

    const handleUseForEdit = (item: HistoryItem) => {
        setEditBaseImage(item.image);
        setEditBaseImageName(`history-${item.id}.png`);
        setActiveTab('edit');
        setIsHistoryPanelOpen(false);
    };

    const handleDeleteFromHistory = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
    };

    const handleClearHistory = () => {
        if (window.confirm('Are you sure you want to clear the entire generation history? This action cannot be undone.')) {
            setHistory([]);
        }
    };
    
    const handleDownloadImage = (image: string | null, name: string) => {
        if (!image) return;
        const link = document.createElement('a');
        link.href = image;
        link.download = `${name}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-transparent font-sans text-gray-200">
            <header className="bg-transparent sticky top-0 z-20">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center border-b border-white/10">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-wide">
                            AI Cinematic Scene Generator
                        </h1>
                         <a href="https://www.youtube.com/@TechTricksArabic" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-lg text-gray-400 hover:text-cyan-400 transition-colors duration-200 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                            </svg>
                            <span>Made by تريكات | Tech Tricks</span>
                        </a>
                    </div>
                     <button
                        onClick={() => setIsHistoryPanelOpen(true)}
                        className="flex items-center gap-2 border-2 border-cyan-500/50 text-cyan-400 font-bold py-2 px-5 rounded-lg hover:bg-cyan-500 hover:text-black hover:border-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all duration-300 text-sm"
                        aria-label="Open generation history"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>History</span>
                    </button>
                </div>
            </header>

             <div className="container mx-auto px-6 pt-6">
                <div className="flex border-b border-white/10">
                    <TabButton tabName="generate" label="Generate Scene" activeTab={activeTab} onClick={setActiveTab} />
                    <TabButton tabName="edit" label="Edit Scene" activeTab={activeTab} onClick={setActiveTab} />
                </div>
            </div>
            
            <main key={activeTab} className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start fade-in">
                {activeTab === 'generate' ? (
                    <>
                        {/* Left Panel: Inputs */}
                        <MainPanel className="lg:col-span-3 space-y-8">
                            <EditableElementList
                                title="Main Characters" elements={characters}
                                onAdd={() => setCharacters(prev => [...prev, { id: Date.now(), name: `Character ${prev.length + 1}`, image: null }])}
                                onRemove={id => setCharacters(prev => prev.filter(c => c.id !== id))}
                                onImageUpload={handleCharacterImageUpload}
                                onReorder={(startIndex, endIndex) => handleReorder(characters, setCharacters, startIndex, endIndex)}
                                noun="Character"
                            />
                            <EditableElementList
                                title="Key Objects & Props" elements={additionalElements}
                                onFilesAdd={handleAdditionalElementsFilesAdd}
                                onRemove={id => setAdditionalElements(prev => prev.filter(c => c.id !== id))}
                                onImageUpload={handleElementImageUpload}
                                onReorder={(startIndex, endIndex) => handleReorder(additionalElements, setAdditionalElements, startIndex, endIndex)}
                                noun="Object"
                            />
                            <section>
                                <SectionHeader>Scene & Style</SectionHeader>
                                <div className="space-y-6">
                                    <div>
                                        <label htmlFor="scene-description" className="block text-sm font-medium text-gray-400 mb-2">Scene Description</label>
                                        <div className="relative">
                                            <textarea
                                                id="scene-description" value={sceneDescription} onChange={(e) => setSceneDescription(e.target.value)}
                                                rows={4} className="w-full bg-black/30 border border-white/20 text-gray-200 rounded-lg shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-500 resize-y transition-all pr-12"
                                                placeholder="e.g., The living room with broken glass on the floor..."/>
                                             <button
                                                onClick={handleEnhancePrompt}
                                                disabled={!sceneDescription.trim() || isEnhancing}
                                                className="absolute top-2 right-2 flex items-center justify-center h-8 w-8 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 disabled:bg-gray-500/20 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                aria-label="Enhance prompt with AI"
                                                title="Enhance with AI"
                                            >
                                                {isEnhancing ? (
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <ImageUploader id="scene-location" label="Scene Location" image={sceneLocationImage} onImageUpload={setSceneLocationImage} />
                                        <ImageUploader id="style" label="Style Reference" image={styleImage} onImageUpload={setStyleImage} />
                                    </div>
                                </div>
                            </section>
                            <section>
                                <SectionHeader>Cinematic Controls</SectionHeader>
                                <div className="space-y-4">
                                    <SelectInput id="aspectRatio" label="Aspect Ratio" value={aspectRatio} options={ASPECT_RATIOS} onChange={(e) => setAspectRatio(e.target.value)} />
                                    <SelectInput id="lighting" label="Lighting Style" value={lightingStyle} options={LIGHTING_STYLES} onChange={(e) => setLightingStyle(e.target.value)} />
                                    <SelectInput id="perspective" label="Camera Perspective" value={cameraPerspective} options={CAMERA_PERSPECTIVES} onChange={(e) => setCameraPerspective(e.target.value)} />
                                    <SelectInput id="numberOfImages" label="Number of Images" value={String(numberOfImages)} options={NUMBER_OF_IMAGES} onChange={(e) => setNumberOfImages(parseInt(e.target.value, 10))} />
                                </div>
                            </section>
                        </MainPanel>

                        {/* Right Panel: Prompt and Output */}
                        <div className="lg:col-span-9 flex flex-col gap-6">
                            <MainPanel>
                                <h2 className="text-xl font-bold text-cyan-300 tracking-wider mb-3">Generated Cinematic Prompt</h2>
                                <textarea value={generatedPrompt} readOnly rows={4} className="w-full bg-black/40 border border-cyan-500/50 rounded-lg p-3 text-cyan-200/80 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y shadow-[inset_0_0_10px_rgba(6,182,212,0.2),0_0_15px_rgba(6,182,212,0.3)] font-mono" placeholder="Prompt will be generated here..." />
                            </MainPanel>
                            <button onClick={handleGenerateClick} disabled={isGenerationDisabled} className="w-full py-4 px-6 text-xl font-bold text-black bg-cyan-400 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:bg-cyan-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transition-all duration-300 transform hover:scale-105 disabled:transform-none">
                                {genLoading ? 'Generating...' : 'Generate Scene'}
                            </button>
                            <MainPanel className="flex-grow flex flex-col min-h-0 lg:min-h-[80vh]">
                                <div className="flex-grow p-2 min-h-0">
                                    <GeneratedImageDisplay images={generatedImages} isLoading={genLoading} error={genError} onView={setViewingImage} onDownload={(image) => handleDownloadImage(image, 'generated-image')} />
                                </div>
                            </MainPanel>
                        </div>
                    </>
                ) : (
                     <>
                        {/* Left Panel: Edit Inputs */}
                        <MainPanel className="lg:col-span-3 space-y-8">
                            <section>
                                <SectionHeader>Image to Edit</SectionHeader>
                                <ImageUploader id="edit-base" label={editBaseImageName || "Click to upload base image"} image={editBaseImage} onImageUpload={handleEditBaseImageUpload} />
                            </section>
                            <EditableElementList
                                title="Characters to Add" elements={editAddChars}
                                onAdd={() => setEditAddChars(prev => [...prev, { id: Date.now(), name: `Character ${prev.length + 1}`, image: null }])}
                                onRemove={id => setEditAddChars(prev => prev.filter(c => c.id !== id))}
                                onImageUpload={handleEditCharImageUpload}
                                noun="Character"
                            />
                            <EditableElementList
                                title="Objects to Add" elements={editAddObjs}
                                onAdd={() => setEditAddObjs(prev => [...prev, { id: Date.now(), name: `Object ${prev.length + 1}`, image: null }])}
                                onRemove={id => setEditAddObjs(prev => prev.filter(c => c.id !== id))}
                                onImageUpload={handleEditObjImageUpload}
                                noun="Object"
                            />
                            <section>
                                <SectionHeader>Edit Instruction</SectionHeader>
                                <textarea
                                    value={standaloneEditPrompt} onChange={(e) => setStandaloneEditPrompt(e.target.value)}
                                    rows={4} className="w-full bg-black/30 border border-white/20 text-gray-200 rounded-lg shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-500 resize-y transition-all"
                                    placeholder="e.g., Add the character to the scene, standing by the window."/>
                            </section>
                        </MainPanel>

                        {/* Right Panel: Edit Output */}
                        <div className="lg:col-span-9 flex flex-col gap-6">
                            <button onClick={handleApplyStandaloneEdit} disabled={isEditDisabled} className="w-full py-4 px-6 text-xl font-bold text-black bg-fuchsia-500 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.6)] hover:bg-fuchsia-400 hover:shadow-[0_0_25px_rgba(217,70,239,0.8)] disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-4 focus:ring-fuchsia-500/50 transition-all duration-300 transform hover:scale-105 disabled:transform-none">
                                {editLoading ? 'Applying Edit...' : 'Apply Edit'}
                            </button>
                             <MainPanel className="flex-grow flex flex-col min-h-0 lg:min-h-[80vh]">
                                <div className="flex-grow p-2 min-h-0">
                                    <GeneratedImageDisplay 
                                        images={editedImage ? [editedImage] : []} 
                                        isLoading={editLoading} 
                                        error={editError}
                                        onView={setViewingImage}
                                        onDownload={(image) => handleDownloadImage(image, 'edited-image')}
                                    />
                                </div>
                            </MainPanel>
                        </div>
                    </>
                )}
            </main>

            <HistoryPanel isOpen={isHistoryPanelOpen} onClose={() => setIsHistoryPanelOpen(false)} history={history} onView={handleViewHistoryItem} onUseForEdit={handleUseForEdit} onDelete={handleDeleteFromHistory} onClear={handleClearHistory} />
            <Modal isOpen={viewingImage !== null} onClose={() => setViewingImage(null)}>
                {viewingImage && (
                    <img src={viewingImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-lg"/>
                )}
            </Modal>
        </div>
    );
};

export default App;