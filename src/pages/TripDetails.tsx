import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import SpotifyPlaylistGenerator from '../components/SpotifyPlaylistGenerator';
import paperBackground from "../assets/wrinkled-paper.png";
import { useScrollToTop } from "../hooks/useScrollToTop";

interface TripData {
    id: string;
    title: string;
    spotify_playlist_id: string | null;
}

export default function TripDetailsPage() {
    const { tripId } = useParams<{ tripId: string }>();
    const [trip, setTrip] = useState<TripData | null>(null);
    const [countryCode, setCountryCode] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const { showScrollTop, scrollToTop } = useScrollToTop();

    useEffect(() => {
        async function fetchTripDetails() {
            if (!tripId) return;
            try {
                // 1. Fetch trip metadata
                const { data: tripData, error: tripErr } = await supabase
                    .from('trips')
                    .select('id, title, spotify_playlist_id')
                    .eq('id', tripId)
                    .single();

                if (tripErr) throw tripErr;
                setTrip(tripData);

                // 2. Fetch first destination country code
                const { data: destData, error: destErr } = await supabase
                    .from('trip_destinations')
                    .select('country_code')
                    .eq('trip_id', tripId)
                    .order('order', { ascending: true })
                    .limit(1);

                if (destErr) throw destErr;
                if (destData && destData.length > 0) {
                    setCountryCode(destData[0].country_code);
                }
            } catch (error) {
                console.error('Error fetching trip specs:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchTripDetails();
    }, [tripId]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fff4e7]">
                <p className="animate-pulse font-[Adamina] text-[#7a3f00]">Loading Adventure Details...</p>
            </div>
        );
    }

    if (!trip) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-[#fff4e7] p-6 text-center">
                <h2 className="font-[Adamina] text-2xl text-[#8d3324]">Trip not found</h2>
                <Link to="/countries" className="mt-4 font-[Cormorant_Garamond] text-[#7a3f00] underline">Back to Map</Link>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[min(96vw,1280px)] px-[max(1rem,4%)] pb-[max(3.5rem,10vh)] pt-[max(1.5rem,4vh)] text-[#50300d]">
            <section className="overflow-hidden rounded-[1.1rem] border border-[#8f5a20]/30 bg-[#fff4e7] shadow-[0_18px_42px_rgb(80_48_13_/_16%)]">
                <div
                    className="bg-[#5a392b] p-6 text-[#fff4e7] sm:p-8"
                    style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.95), rgb(90 57 43 / 0.98)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Adventure Dashboard</p>
                    <h1 className="mt-3 font-[Adamina] text-[clamp(2rem,5vw,3.5rem)] leading-tight">{trip.title}</h1>
                </div>

                <div className="grid gap-8 bg-[#ffead4]/90 p-5 sm:p-8 md:grid-cols-3">
                    <div className="md:col-span-2 space-y-6">
                        <div className="rounded-[1rem] border border-[#8f5a20]/15 bg-[#fffaf4] p-6 shadow-sm">
                            <h2 className="font-[Adamina] text-[1.25rem] text-[#50300d]">Itinerary Overview</h2>
                            <p className="mt-3 font-[Cormorant_Garamond] text-[1.1rem] leading-relaxed text-[#6a4630]">
                                Your content workspace for activities, destination updates, and travel logging. 
                                Use this area to track your daily route through {countryCode || 'your destinations'}.
                            </p>
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <SpotifyPlaylistGenerator 
                            tripId={trip.id} 
                            currentPlaylistId={trip.spotify_playlist_id} 
                            countryCode={countryCode || 'Globetrotting'} 
                        />
                    </aside>
                </div>
            </section>

            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 flex h-12 w-12 items-center justify-center rounded-full border border-[#cf8d45] bg-[#5a392b] text-[#ffead4] shadow-lg transition hover:bg-[#7a3f00]"
                >
                    ↑
                </button>
            )}
        </div>
    );
}