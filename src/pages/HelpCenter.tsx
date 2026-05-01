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
            const baseBottom = 32; // default bottom offset in px
            if (!footer) {
                setScrollBtnBottom(baseBottom);
                return;
            }

            const rect = footer.getBoundingClientRect();
            const overlap = Math.max(0, window.innerHeight - rect.top);
            const padding = 16; // extra padding above footer
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
            className="mx-auto w-full max-w-[1380px] px-5 py-8 text-[#50300d] sm:px-6 lg:px-8"
            aria-labelledby="help-title"
        >
            <div
                className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)]"
                style={{ backgroundImage: `linear-gradient(rgb(255 234 212 / 0.9), rgb(255 234 212 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
            >
                <div
                    className="bg-[#5a392b]/95 px-6 py-7 text-[#ffead4] sm:px-9"
                    style={{ backgroundImage: `linear-gradient(rgb(90 57 43 / 0.9), rgb(90 57 43 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
                >
                    <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">TripJournal support</p>
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 id="help-title" className="font-[Adamina] text-[clamp(2rem,5vw,3.5rem)] leading-tight text-[#fff4e7]">
                                Help Center
                            </h1>
                            <p className="mt-3 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f6d7b5]">
                                Answers for the map, saved countries, gallery, and the little browser-side details that keep your journal feeling personal.
                            </p>
                        </div>
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#f6d7b5]/70 bg-[#cf8d45] font-[Adamina] text-[1.9rem] text-[#fff4e7] shadow-[inset_0_0_18px_rgb(80_48_13_/_18%)]" aria-hidden="true">
                            ?
                        </div>
                    </div>
                </div>

                <div className="grid gap-7 px-4 py-7 sm:px-9 lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <div>
                        {/* Full-width search bar */}
                        <div className="mb-6">
                            <p className="mb-3 font-[Adamina] text-[0.72rem] uppercase tracking-[0.2em] text-[#7a3f00]">Search questions</p>
                            <input
                                type="text"
                                placeholder="Type keywords..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-full border border-[#cf8d45]/55 bg-[#fff7ee] px-5 py-3 font-[Cormorant_Garamond] text-[1rem] text-[#50300d] outline-none placeholder:text-[#7a3f00]/60 focus:border-[#cf8d45] focus:ring-2 focus:ring-[#cf8d45]/35"
                                aria-label="Search FAQ questions"
                            />
                        </div>

                        {/* Categories with horizontal scroll */}
                        <div>
                            <p className="mb-3 font-[Adamina] text-[0.72rem] uppercase tracking-[0.2em] text-[#7a3f00]">Frequently asked questions</p>
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
                                        </section>
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                {/* Section description */}
                                <div className="mt-5 rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#fff4e7]/55 px-5 py-4">
                                    <h2 className="font-[Adamina] text-[1.25rem] text-[#50300d]">{activeSection?.title}</h2>
                                    <p className="mt-1 font-[Cormorant_Garamond] text-[1.12rem] leading-[1.35] text-[#5a392b]">{activeSection?.description}</p>
                                </div>

                                {filteredFaqs.length === 0 ? (
                                    <div className="mt-5 rounded-[0.9rem] border border-[#cf8d45]/45 bg-[#fff4e7]/72 px-5 py-8 text-center">
                                        <p className="font-[Cormorant_Garamond] text-[1.05rem] text-[#5a392b]">
                                            No questions match "<span className="font-bold">{searchTerm}</span>". Try different keywords or browse other sections.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-5 grid gap-3">
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
                        <div className="sticky top-24 w-max max-w-[28rem] h-100% max-h-[calc(100vh-10rem)] rounded-[0.9rem] border border-[#7a3f00]/12 bg-[#5c3722] p-4 text-[#ffead4] shadow-[inset_0_0_18px_rgb(0_0_0_/_10%)]">
                            <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.22em] text-[#f6d7b5]">Need more help?</p>
                            <h2 className="mt-2 font-[Adamina] text-[1.55rem] leading-tight text-[#fff4e7]">Contact support</h2>
                            <p className="mt-3 font-[Cormorant_Garamond] text-[1.1rem] leading-[1.35] text-[#f7dfca]">
                                Send the team a note with what happened, where you saw it, and which browser you are using.
                            </p>

                            {contactSubmitted && (
                                <div className="mt-4 rounded-[0.7rem] border border-[#eab681]/60 bg-[#eab681]/25 px-4 py-3">
                                    <p className="font-[Cormorant_Garamond] text-[0.95rem] text-[#fff4e7]">
                                        ✓ Message sent! Our team will get back to you soon.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleContactSubmit} className="mt-4 space-y-3 w-full">
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Email</span>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="you@example.com"
                                        value={contactForm.email}
                                        onChange={handleContactChange}
                                        required
                                        className="w-full rounded-[0.6rem] border border-[#eab681]/60 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d] outline-none focus:border-[#f6d7b5] focus:ring-2 focus:ring-[#eab681]/45"
                                        aria-label="Contact email"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Message</span>
                                    <textarea
                                        name="message"
                                        rows={5}
                                        placeholder="Tell us what you need help with"
                                        value={contactForm.message}
                                        onChange={handleContactChange}
                                        required
                                        className="w-full resize-y rounded-[0.6rem] border border-[#eab681]/60 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d] outline-none focus:border-[#f6d7b5] focus:ring-2 focus:ring-[#eab681]/45"
                                        aria-label="Contact message"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    className="w-full rounded-full border border-[#eab681] bg-[#cf8d45] px-4 py-2.5 font-[Adamina] text-[0.95rem] text-[#fff4e7] shadow-[0_8px_18px_rgb(0_0_0_/_16%)] transition hover:-translate-y-px hover:bg-[#b97731] active:translate-y-px"
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
                    className="fixed right-8 flex h-12 w-12 items-center justify-center rounded-full border border-[#cf8d45] bg-[#5a392b] text-[#ffead4] shadow-[0_8px_24px_rgb(122_63_0_/_30%)] transition hover:bg-[#7a3f00] hover:-translate-y-1"
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
