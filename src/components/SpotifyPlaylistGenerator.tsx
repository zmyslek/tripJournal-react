import { useState } from 'react';
import { Music, RefreshCw, Sparkles } from 'lucide-react';

interface SpotifyPlaylistGeneratorProps {
    tripId: string;
    currentPlaylistId: string | null;
    countryCode?: string;
    countryName?: string;
}

export default function SpotifyPlaylistGenerator({ 
    tripId, 
    currentPlaylistId, 
    countryCode, 
    countryName = 'local' 
}: SpotifyPlaylistGeneratorProps) {
    const [loading, setLoading] = useState(false);
    const [playlistId, setPlaylistId] = useState(currentPlaylistId);

    const generatePlaylist = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/spotify/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tripId }),
            });
            
            if (!response.ok) throw new Error('Failed to generate playlist');
            
            const data = await response.json();
            if (data.success) {
                setPlaylistId(data.playlistId);
            }
        } catch (err) {
            console.error('Spotify generation error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-[1rem] border-2 border-[#cf8d45]/60 bg-[#fff4e7] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#7a3f00] rounded-full text-[#ffead4]">
                    <Music size={20} />
                </div>
                <div>
                    <h3 className="font-[Adamina] text-[1.1rem] text-[#50300d]">Trip Soundtrack</h3>
                    <p className="font-[Cormorant_Garamond] text-[0.95rem] text-[#6a4630]">
                        Matching your taste with {countryName} vibes {countryCode ? `(${countryCode})` : ''}
                    </p>
                </div>
            </div>

            {playlistId ? (
                <div className="space-y-4">
                    <div className="overflow-hidden rounded-lg border border-[#cf8d45]/30 shadow-inner bg-black/5">
                        <iframe
                            src={`https://open.spotify.com/embed/playlist/${playlistId}`}
                            width="100%"
                            height="152"
                            frameBorder="0"
                            allow="encrypted-media"
                            title="Spotify Embed"
                            className="rounded-lg"
                        ></iframe>
                    </div>
                    <button 
                        onClick={generatePlaylist} 
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 font-[Adamina] text-[0.75rem] uppercase tracking-[0.08em] text-[#8f5a20] hover:text-[#5a392b] transition disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Regenerate Personalized Mix
                    </button>
                </div>
            ) : (
                <button
                    onClick={generatePlaylist}
                    disabled={loading}
                    className="w-full rounded-full border border-[#cf8d45] bg-[#cf8d45] px-4 py-2.5 font-[Adamina] text-[0.82rem] uppercase tracking-[0.08em] text-[#5a392b] transition hover:bg-[#eab681] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <RefreshCw size={16} className="animate-spin" />
                            Analyzing Vibe...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Soundtrack
                        </>
                    )}
                </button>
            )}
        </div>
    );
}