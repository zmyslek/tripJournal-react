import { supabase } from "../../lib/supabase/client";
import type { ItineraryItem, ItineraryStatus } from "../../utils/itineraryStorage";

interface TripRow {
    id: string;
    title: string;
    status: "draft" | "planned" | "active" | "completed" | "archived";
    start_date: string | null;
    end_date: string | null;
    metadata: Record<string, unknown> | null;
}

function toTripStatus(status: ItineraryStatus): TripRow["status"] {
    if (status === "done") return "completed";
    if (status === "in-progress") return "active";
    return "planned";
}

function toItineraryStatus(status: TripRow["status"]): ItineraryStatus {
    if (status === "completed") return "done";
    if (status === "active") return "in-progress";
    return "planned";
}

function rowToItinerary(row: TripRow): ItineraryItem | null {
    const item = row.metadata?.itinerary;
    if (!item || typeof item !== "object") return null;

    const candidate = item as Partial<ItineraryItem>;
    if (typeof candidate.id !== "string" || typeof candidate.description !== "string") return null;

    return {
        ...candidate,
        id: row.id,
        title: row.title,
        status: toItineraryStatus(row.status),
        startDate: row.start_date ?? "",
        endDate: row.end_date ?? "",
        createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
        updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString()
    } as ItineraryItem;
}

export async function loadCloudItineraries(countryName: string): Promise<ItineraryItem[] | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) return null;

    const { data, error } = await supabase
        .from("trips")
        .select("id, title, status, start_date, end_date, metadata")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: true });
    if (error) throw error;

    const normalizedCountry = countryName.trim().toLowerCase();
    return ((data ?? []) as TripRow[])
        .filter(row => String(row.metadata?.countryName ?? "").toLowerCase() === normalizedCountry)
        .map(rowToItinerary)
        .filter((item): item is ItineraryItem => item !== null);
}

export async function saveCloudItinerary(countryName: string, itinerary: ItineraryItem): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) return;

    const { error } = await supabase
        .from("trips")
        .upsert({
            id: itinerary.id,
            user_id: authData.user.id,
            title: itinerary.title,
            status: toTripStatus(itinerary.status),
            start_date: itinerary.startDate || null,
            end_date: itinerary.endDate || null,
            metadata: { countryName: countryName.trim(), itinerary }
        });
    if (error) throw error;
}

export async function deleteCloudItinerary(itineraryId: string): Promise<void> {
    const { error } = await supabase.from("trips").delete().eq("id", itineraryId);
    if (error) throw error;
}