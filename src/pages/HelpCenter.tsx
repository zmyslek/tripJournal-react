import { useMemo, useState, useRef, useEffect } from "react";
import { helpFaqSections } from "../data/helpFaq";
import { useScrollToTop } from "../hooks/useScrollToTop";
import paperBackground from "../assets/wrinkled-paper.png";

function HelpCenter() {
    const [activeSectionId, setActiveSectionId] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [contactForm, setContactForm] = useState({ email: "", message: "" });
    const [contactSubmitted, setContactSubmitted] = useState(false);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    const categoriesContainerRef = useRef<HTMLDivElement>(null);
    const { showScrollTop, scrollToTop } = useScrollToTop();
    const [scrollBtnBottom, setScrollBtnBottom] = useState(32);

    // Create virtual "all categories" section
    const allCategoriesSection = useMemo(() => {
        return {
            id: "all",
            title: "All Categories",
            description: "Browse all questions across every topic.",
            faqs: helpFaqSections.flatMap((section) => section.faqs)
        };
    }, []);

    const activeSection = useMemo(() => {
        if (activeSectionId === "all") {
            return allCategoriesSection;
        }
        return helpFaqSections.find((section) => section.id === activeSectionId) ?? allCategoriesSection;
    }, [activeSectionId, allCategoriesSection]);

    // Filter FAQs based on search term for single-section views; per-section filtering handled in render for "all"
    const filteredFaqs = useMemo(() => {
        if (!searchTerm.trim()) {
            return activeSection?.faqs ?? [];
        }
        const lowerSearch = searchTerm.toLowerCase();
        return (
            activeSection?.faqs.filter(
                (faq) => faq.question.toLowerCase().includes(lowerSearch) || faq.answer.toLowerCase().includes(lowerSearch)
            ) ?? []
        );
    }, [activeSection, searchTerm]);

    const lowerSearch = searchTerm.toLowerCase();

    // Check scroll position of categories for arrow visibility
    const checkCategoryScroll = () => {
        if (categoriesContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = categoriesContainerRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    // Scroll categories container
    const scrollCategories = (direction: "left" | "right") => {
        if (categoriesContainerRef.current) {
            const scrollAmount = 200;
            const newScrollLeft =
                direction === "left"
                    ? categoriesContainerRef.current.scrollLeft - scrollAmount
                    : categoriesContainerRef.current.scrollLeft + scrollAmount;

            categoriesContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: "smooth"
            });

            setTimeout(() => checkCategoryScroll(), 300);
        }
    };

    // Initialize arrow visibility on mount
    useEffect(() => {
        checkCategoryScroll();
        const container = categoriesContainerRef.current;
        if (container) {
            container.addEventListener("scroll", checkCategoryScroll);
            window.addEventListener("resize", checkCategoryScroll);
            return () => {
                container.removeEventListener("scroll", checkCategoryScroll);
                window.removeEventListener("resize", checkCategoryScroll);
            };
        }
    }, []);

    // Adjust scroll-to-top button so it doesn't overlap the footer
    useEffect(() => {
        function adjustScrollButton() {
            const footer = document.querySelector("footer");
            const baseBottom = window.innerHeight * 0.02; // 2% of viewport height
            if (!footer) {
                setScrollBtnBottom(baseBottom);
                return;
            }

            const rect = footer.getBoundingClientRect();
            const overlap = Math.max(0, window.innerHeight - rect.top);
            const padding = window.innerHeight * 0.01; // 1% of viewport height as padding
            if (overlap > 0) {
                setScrollBtnBottom(baseBottom + overlap + padding);
            } else {
                setScrollBtnBottom(baseBottom);
            }
        }

        adjustScrollButton();
        window.addEventListener("scroll", adjustScrollButton, { passive: true });
        window.addEventListener("resize", adjustScrollButton);
        return () => {
            window.removeEventListener("scroll", adjustScrollButton);
            window.removeEventListener("resize", adjustScrollButton);
        };
    }, []);

    // Contact form handlers
    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setContactForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!contactForm.email.trim() || !contactForm.message.trim()) {
            alert("Please fill in both email and message fields.");
            return;
        }

        try {
            // TODO: Replace with actual backend endpoint when available
            // For now, just show a success message and reset the form
            console.log("Contact form submission:", contactForm);

            // Simulated success
            setContactSubmitted(true);
            setContactForm({ email: "", message: "" });

            // Reset success message after 3 seconds
            setTimeout(() => setContactSubmitted(false), 3000);
        } catch (error) {
            console.error("Failed to submit contact form:", error);
            alert("Failed to send message. Please try again.");
        }
    };

    return (
        <section
            className="mx-auto w-full max-w-[min(95vw,1380px)] px-[max(1.25rem,5%)] py-[max(2rem,6vh)] text-[#50300d]"
            aria-labelledby="help-title"
        >
            <div
                className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)]"
                style={{ backgroundImage: `linear-gradient(rgb(255 234 212 / 0.9), rgb(255 234 212 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
            >
                <div
                    className="rounded-b-[2.4rem] bg-[#5a392b]/95 px-6 py-7 text-[#ffead4] sm:px-9"
                    style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.9), rgb(90 57 43 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <div className="relative flex flex-wrap items-start justify-between gap-6">
                        <div>
                            <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">TripJournal support</p>
                            <h1 id="help-title" className="mt-3 font-[Adamina] text-[clamp(2.2rem,5vw,3.8rem)] leading-none text-[#fff4e7]">
                                Help Center
                            </h1>
                            <p className="mt-4 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                                Answers for the map, saved countries, gallery, and the little browser-side details that keep your journal feeling personal.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-[max(1.75rem,5%)] px-[max(1.5rem,6%)] py-[max(1.75rem,5%)] lg:grid-cols-[minmax(0,1fr)_min(20rem,22%)]">
                    <div>
                        {/* Full-width search bar */}
                        <div className="mb-[max(1.5rem,4%)]">
                            <p className="mb-[max(0.75rem,2%)] font-[Adamina] text-[clamp(0.65rem,1.5vw,0.72rem)] uppercase tracking-[0.2em] text-[#7a3f00]">Search questions</p>
                            <input
                                type="text"
                                placeholder="Type keywords..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-full border border-[#cf8d45]/55 bg-[#fff7ee] px-[max(1.25rem,4%)] py-[max(0.75rem,2%)] font-[Cormorant_Garamond] text-[clamp(0.9rem,2vw,1rem)] text-[#50300d] outline-none placeholder:text-[#7a3f00]/60 focus:border-[#cf8d45] focus:ring-2 focus:ring-[#cf8d45]/35"
                                aria-label="Search FAQ questions"
                            />
                        </div>

                        {/* Categories with horizontal scroll */}
                        <div>
                            <p className="mb-[max(0.75rem,2%)] font-[Adamina] text-[clamp(0.65rem,1.5vw,0.72rem)] uppercase tracking-[0.2em] text-[#7a3f00]">Frequently asked questions</p>
                            <div className="relative flex items-center gap-2">
                                {/* Left arrow */}
                                {showLeftArrow && (
                                    <button
                                        type="button"
                                        onClick={() => scrollCategories("left")}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#5A392B] text-[2rem] font-semibold text-[#5A392B] shadow-[0_0.75rem_1.6rem_rgba(0,0,0,0.32)] transition-all hover:text-[#ffead4] hover:border-[#ffead4]/85 hover:bg-[#5a392b]"
                                        aria-label="Scroll categories left"
                                    >
                                        <span className="text-xl leading-none">‹</span>
                                    </button>
                                )}

                                {/* Categories container */}
                                <div
                                    ref={categoriesContainerRef}
                                    className="flex flex-1 gap-2 overflow-x-auto scroll-smooth scrollbar-hide"
                                    style={{ scrollBehavior: "smooth" }}
                                    role="tablist"
                                    aria-label="FAQ sections"
                                >
                                    {/* All Categories button */}
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={activeSectionId === "all"}
                                        className={`shrink-0 rounded-full border px-4 py-2 font-[Adamina] text-[0.82rem] transition ${
                                            activeSectionId === "all"
                                                ? "border-[#7a3f00] bg-[#5a392b] text-[#ffead4] shadow-[0_4px_12px_rgb(122_63_0_/_25%)]"
                                                : "border-[#cf8d45]/55 bg-[#fff7ee]/75 text-[#50300d] hover:bg-[#f6dfc1] hover:border-[#cf8d45]"
                                        }`}
                                        onClick={() => {
                                            setActiveSectionId("all");
                                            setSearchTerm("");
                                        }}
                                    >
                                        All
                                    </button>

                                    {helpFaqSections.map((section) => (
                                        <button
                                            key={section.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={section.id === activeSectionId}
                                            className={`shrink-0 rounded-full border px-4 py-2 font-[Adamina] text-[0.82rem] transition ${
                                                section.id === activeSectionId
                                                    ? "border-[#7a3f00] bg-[#5a392b] text-[#ffead4] shadow-[0_4px_12px_rgb(122_63_0_/_25%)]"
                                                    : "border-[#cf8d45]/55 bg-[#fff7ee]/75 text-[#50300d] hover:bg-[#f6dfc1] hover:border-[#cf8d45]"
                                            }`}
                                            onClick={() => {
                                                setActiveSectionId(section.id);
                                                setSearchTerm("");
                                            }}
                                        >
                                            {section.title}
                                        </button>
                                    ))}
                                </div>

                                {/* Right arrow */}
                                {showRightArrow && (
                                    <button
                                        type="button"
                                        onClick={() => scrollCategories("right")}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#5A392B] text-[2rem] font-semibold text-[#5A392B] shadow-[0_0.75rem_1.6rem_rgba(0,0,0,0.32)] transition-all hover:border-[#ffead4]/85 hover:text-[#ffead4]hover:bg-[#5a392b]"
                                        aria-label="Scroll categories right"
                                    >
                                        <span className="text-xl leading-none">›</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeSectionId === "all" ? (
                            <div className="mt-5 grid gap-6">
                                {helpFaqSections.map((section) => {
                                    const sectionFaqs = !searchTerm.trim()
                                        ? section.faqs
                                        : section.faqs.filter(
                                              (faq) =>
                                                  faq.question.toLowerCase().includes(lowerSearch) ||
                                                  faq.answer.toLowerCase().includes(lowerSearch)
                                          );

                                    if (sectionFaqs.length === 0) return null;

                                    return (
                                        <section key={section.id}>
                                            <div className="rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#7A3F00]/60 px-5 py-3 shadow-[0_6px_12px_rgba(90,57,43,0.06)] ring-1 ring-[#eab681]/20">
                                                <h3 className="font-[Adamina] text-[1.05rem] text-[#FFEAD4]">{section.title}</h3>
                                                {section.description && (
                                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1rem] leading-[1.3] text-[#5a392b]">
                                                        {section.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="mt-3 grid gap-3">
                                                {sectionFaqs.map((faq) => (
                                                    <details key={faq.id} className="group rounded-[0.9rem] border border-[#cf8d45]/45 bg-[#fff4e7]/72 px-5 py-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)] transition-all hover:shadow-[inset_0_0_16px_rgb(143_90_32_/_12%),0_4px_12px_rgb(122_63_0_/_20%)]">
                                                        <summary className="cursor-pointer list-none font-[Adamina] text-[1rem] text-[#50300d] marker:hidden">
                                                            <span className="flex items-center justify-between gap-4">
                                                                {faq.question}
                                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#cf8d45]/70 text-[#7a3f00] transition-transform group-open:rotate-45">
                                                                    +
                                                                </span>
                                                            </span>
                                                        </summary>
                                                        <p className="mt-3 max-w-[68ch] font-[Cormorant_Garamond] text-[1.13rem] leading-[1.42] text-[#5a392b]">
                                                            {faq.answer}
                                                        </p>
                                                    </details>
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                {/* Section description */}
                                <div className="rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#7A3F00]/60 px-5 py-3 shadow-[0_6px_12px_rgba(90,57,43,0.06)] ring-1 ring-[#eab681]/20">
                                    <h2 className="font-[Adamina] text-[1.05rem] text-[#FFEAD4]">{activeSection?.title}</h2>
                                    {activeSection?.description && (
                                        <p className="mt-1 font-[Cormorant_Garamond] text-[1rem] leading-[1.3] text-[#5a392b]">
                                            {activeSection?.description}
                                        </p>
                                    )}
                                </div>

                                {filteredFaqs.length === 0 ? (
                                    <div className="mt-3 rounded-[0.9rem] border border-[#cf8d45]/45 bg-[#fff4e7]/72 px-[5%] py-[8%] text-center">
                                        <p className="font-[Cormorant_Garamond] text-[1.05rem] text-[#5a392b]">
                                            No questions match "<span className="font-bold">{searchTerm}</span>". Try different keywords or browse other sections.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-3 grid gap-3">
                                        {filteredFaqs.map((faq) => (
                                            <details key={faq.id} className="group rounded-[0.9rem] border border-[#cf8d45]/45 bg-[#fff4e7]/72 px-5 py-4 shadow-[inset_0_0_16px_rgb(143_90_32_/_7%)]">
                                                <summary className="cursor-pointer list-none font-[Adamina] text-[1rem] text-[#50300d] marker:hidden">
                                                    <span className="flex items-center justify-between gap-4">
                                                        {faq.question}
                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#cf8d45]/70 text-[#7a3f00] transition group-open:rotate-45">
                                                            +
                                                        </span>
                                                    </span>
                                                </summary>
                                                <p className="mt-3 max-w-[68ch] font-[Cormorant_Garamond] text-[1.13rem] leading-[1.42] text-[#5a392b]">
                                                    {faq.answer}
                                                </p>
                                            </details>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <aside className="flex justify-center lg:justify-end">
                        <div className="sticky top-[max(6rem,15vh)] w-max max-w-[min(18rem,90vw)] rounded-[0.9rem] border border-[#7a3f00]/12 bg-[#5c3722] p-[max(1rem,3%)] text-[#ffead4] shadow-[inset_0_0_18px_rgb(0_0_0_/_10%)]">
                            <p className="font-[Adamina] text-[clamp(0.65rem,1.5vw,0.72rem)] uppercase tracking-[0.22em] text-[#f6d7b5]\">Need more help?</p>
                            <h2 className="mt-[max(0.5rem,1%)] font-[Adamina] text-[clamp(1rem,2.5vw,1.55rem)] leading-tight text-[#fff4e7]\">Contact support</h2>
                            <p className="mt-[max(0.75rem,2%)] font-[Cormorant_Garamond] text-[clamp(0.9rem,2vw,1.1rem)] leading-[1.35] text-[#f7dfca]\">
                                Send the team a note with what happened, where you saw it, and which browser you are using.
                            </p>

                            {contactSubmitted && (
                                <div className="mt-[max(1rem,3%)] rounded-[0.7rem] border border-[#eab681]/60 bg-[#eab681]/25 px-[max(1rem,3%)] py-[max(0.75rem,2%)]">
                                    <p className="font-[Cormorant_Garamond] text-[clamp(0.85rem,2vw,0.95rem)] text-[#fff4e7]">
                                        ✓ Message sent! Our team will get back to you soon.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleContactSubmit} className="mt-[max(1rem,3%)] space-y-[max(0.75rem,2%)] w-full" style={{ width: '100%' }}>
                                <label className="block">
                                    <span className="mb-[max(0.375rem,1%)] block font-[Adamina] text-[clamp(0.65rem,1.5vw,0.72rem)] uppercase tracking-[0.18em] text-[#f6d7b5]">Email</span>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="you@example.com"
                                        value={contactForm.email}
                                        onChange={handleContactChange}
                                        required
                                        className="w-full rounded-[0.6rem] border border-[#eab681]/60 bg-[#fff7ee] px-[max(0.75rem,2%)] py-[max(0.5rem,1%)] font-[Cormorant_Garamond] text-[clamp(0.9rem,2vw,1rem)] text-[#50300d] outline-none interactive-transition hover:border-[#eab681]/80 focus:border-[#f6d7b5] focus:ring-2 focus:ring-[#eab681]/45 focus:shadow-[0_0_12px_rgb(234_182_129_/_25%)]"
                                        aria-label="Contact email"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-[max(0.375rem,1%)] block font-[Adamina] text-[clamp(0.65rem,1.5vw,0.72rem)] uppercase tracking-[0.18em] text-[#f6d7b5]">Message</span>
                                    <textarea
                                        name="message"
                                        rows={5}
                                        placeholder="Tell us what you need help with"
                                        value={contactForm.message}
                                        onChange={handleContactChange}
                                        required
                                        className="w-full resize-y rounded-[0.6rem] border border-[#eab681]/60 bg-[#fff7ee] px-[max(0.75rem,2%)] py-[max(0.5rem,1%)] font-[Cormorant_Garamond] text-[clamp(0.9rem,2vw,1rem)] text-[#50300d] outline-none interactive-transition hover:border-[#eab681]/80 focus:border-[#f6d7b5] focus:ring-2 focus:ring-[#eab681]/45 focus:shadow-[0_0_12px_rgb(234_182_129_/_25%)]"
                                        aria-label="Contact message"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    className="w-full rounded-full border border-[#eab681] bg-[#cf8d45] px-[max(1rem,3%)] py-[max(0.625rem,1.5%)] font-[Adamina] text-[clamp(0.85rem,1.8vw,0.95rem)] text-[#fff4e7] shadow-[0_8px_18px_rgb(0_0_0_/_16%)] interactive-transition hover:-translate-y-px hover:bg-[#b97731] hover:shadow-[0_12px_24px_rgb(0_0_0_/_24%)] active:translate-y-px active:shadow-[0_2px_6px_rgb(0_0_0_/_12%)]"
                                >
                                    Send message
                                </button>
                            </form>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Scroll to top button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    style={{ bottom: `${scrollBtnBottom}px` }}
                    className="fixed right-[max(2rem,5%)] flex h-[clamp(2.5rem,8vw,3rem)] w-[clamp(2.5rem,8vw,3rem)] items-center justify-center rounded-full border border-[#cf8d45] bg-[#5a392b] text-[#ffead4] shadow-[0_8px_24px_rgb(122_63_0_/_30%)] transition hover:bg-[#7a3f00] hover:-translate-y-1"
                    aria-label="Scroll to top"
                    title="Back to top"
                >
                    <span className="text-xl">↑</span>
                </button>
            )}
        </section>
    );
}

export default HelpCenter;
