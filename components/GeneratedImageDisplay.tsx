
import React from 'react';

interface GeneratedImageDisplayProps {
  images: string[];
  isLoading: boolean;
  error: string | null;
  onView: (image: string) => void;
  onDownload: (image: string) => void;
}

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400"></div>
    <p className="mt-4 text-lg font-semibold text-gray-300">Generating your cinematic scene(s)...</p>
    <p className="mt-2 text-sm text-gray-500">This can take a moment. The AI is crafting your vision.</p>
  </div>
);

const ImageWithControls: React.FC<{image: string; onView: () => void; onDownload: () => void;}> = ({ image, onView, onDownload }) => {
    return (
        <div className="relative group bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-white/10">
            <img src={image} alt="Generated story scene" className="w-full transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all flex flex-col items-center justify-center p-2">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center flex flex-col gap-2 w-full max-w-[120px]">
                    <button onClick={onView} className="text-sm flex items-center justify-center gap-2 bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-cyan-500 hover:border-cyan-500 hover:text-black rounded-md px-3 py-1.5 w-full transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" /></svg>
                        View
                    </button>
                    <button onClick={onDownload} className="text-sm flex items-center justify-center gap-2 bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-green-500 hover:border-green-500 hover:text-black rounded-md px-3 py-1.5 w-full transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download
                    </button>
                </div>
            </div>
        </div>
    );
};


export const GeneratedImageDisplay: React.FC<GeneratedImageDisplayProps> = ({ images, isLoading, error, onView, onDownload }) => {
  const gridClass = images.length > 1 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="w-full h-full flex items-center justify-center p-2 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(to_bottom,white_5%,transparent_95%)]"></div>
       <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && <LoadingSpinner />}
        {!isLoading && error && (
          <div className="text-center text-red-400 p-8 bg-red-900/20 rounded-lg border border-red-500/30">
            <h3 className="text-xl font-bold">Generation Failed</h3>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}
        {!isLoading && !error && images.length > 0 && (
            <div className={`w-full h-full overflow-y-auto p-2 grid ${gridClass} gap-4`}>
                {images.map((image, index) => (
                    <ImageWithControls 
                        key={index} 
                        image={image} 
                        onView={() => onView(image)} 
                        onDownload={() => onDownload(image)}
                    />
                ))}
            </div>
        )}
        {!isLoading && !error && images.length === 0 && (
          <div className="text-center text-gray-400 p-8">
            <h2 className="text-3xl font-bold text-cyan-300/80 tracking-wider" style={{textShadow: '0 0 10px rgba(6, 182, 212, 0.4)'}}>Your Masterpiece Awaits</h2>
            <p className="mt-4 text-gray-500">Configure your scene and click "Generate Scene" to bring your story to life.</p>
          </div>
        )}
      </div>
    </div>
  );
};
