import { useState, useEffect } from "react";

interface UseScrollToTopReturn {
    showScrollTop: boolean;
    scrollToTop: () => void;
}

/**
 * Hook to manage scroll-to-top button visibility and behavior.
 * Shows the button when user scrolls past the threshold (300px by default).
 */
export function useScrollToTop(threshold: number = 300): UseScrollToTopReturn {
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > threshold);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [threshold]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return { showScrollTop, scrollToTop };
}
