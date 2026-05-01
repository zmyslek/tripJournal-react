import { useMemo, useState } from "react";
import { helpFaqSections } from "../data/helpFaq";
import paperBackground from "../assets/wrinkled-paper.png";

function HelpCenter() {
    const [activeSectionId, setActiveSectionId] = useState(helpFaqSections[0]?.id ?? "");
    const activeSection = useMemo(() => {
        return helpFaqSections.find((section) => section.id === activeSectionId) ?? helpFaqSections[0];
    }, [activeSectionId]);

    return (
        <section className="mx-auto w-full max-w-[1380px] px-5 py-8 text-[#50300d] sm:px-6 lg:px-8" aria-labelledby="help-title">
            <div
                className="overflow-hidden rounded-[1.35rem] border border-[#8f5a20]/35 bg-[#ffead4]/95 shadow-[0_18px_42px_rgb(80_48_13_/_20%),inset_0_0_0_1px_rgb(255_244_231_/_55%)]"
                style={{ backgroundImage: `linear-gradient(rgb(255 234 212 / 0.9), rgb(255 234 212 / 0.9)), url(${paperBackground})`, backgroundSize: "cover" }}
            >
                <div
                    className="rounded-b-[2.4rem] bg-[#5a392b]/95 px-6 py-7 text-[#ffead4] sm:px-9"
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

                <div className="grid gap-7 px-6 py-7 sm:px-9 lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <div>
                        <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.2em] text-[#7a3f00]">Frequently asked questions</p>
                        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="FAQ sections">
                            {helpFaqSections.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={section.id === activeSectionId}
                                    className={`rounded-full border px-4 py-2 font-[Adamina] text-[0.82rem] transition ${
                                        section.id === activeSectionId
                                            ? "border-[#7a3f00] bg-[#5a392b] text-[#ffead4]"
                                            : "border-[#cf8d45]/55 bg-[#fff7ee]/75 text-[#50300d] hover:bg-[#f6dfc1]"
                                    }`}
                                    onClick={() => setActiveSectionId(section.id)}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </div>
                        <div className="mt-5 rounded-[0.9rem] border border-[#cf8d45]/35 bg-[#fff4e7]/55 px-5 py-4">
                            <h2 className="font-[Adamina] text-[1.25rem] text-[#50300d]">{activeSection?.title}</h2>
                            <p className="mt-1 font-[Cormorant_Garamond] text-[1.12rem] leading-[1.35] text-[#5a392b]">{activeSection?.description}</p>
                        </div>
                        <div className="mt-5 grid gap-3">
                            {activeSection?.faqs.map((faq) => (
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
                    </div>

                    <aside className="rounded-[1rem] border border-[#7a3f00]/15 bg-[#5c3722] p-5 text-[#ffead4] shadow-[inset_0_0_22px_rgb(0_0_0_/_12%)]">
                        <p className="font-[Adamina] text-[0.72rem] uppercase tracking-[0.22em] text-[#f6d7b5]">Need more help?</p>
                        <h2 className="mt-2 font-[Adamina] text-[1.55rem] leading-tight text-[#fff4e7]">Contact support</h2>
                        <p className="mt-3 font-[Cormorant_Garamond] text-[1.1rem] leading-[1.35] text-[#f7dfca]">
                            Send the team a note with what happened, where you saw it, and which browser you are using.
                        </p>

                        <form className="mt-5 space-y-3">
                            <label className="block">
                                <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Email</span>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full rounded-[0.6rem] border border-[#eab681]/60 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d] outline-none focus:border-[#f6d7b5] focus:ring-2 focus:ring-[#eab681]/45"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1.5 block font-[Adamina] text-[0.72rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Message</span>
                                <textarea
                                    rows={5}
                                    placeholder="Tell us what you need help with"
                                    className="w-full resize-y rounded-[0.6rem] border border-[#eab681]/60 bg-[#fff7ee] px-3 py-2 font-[Cormorant_Garamond] text-[1rem] text-[#50300d] outline-none focus:border-[#f6d7b5] focus:ring-2 focus:ring-[#eab681]/45"
                                />
                            </label>
                            <button
                                type="button"
                                className="w-full rounded-full border border-[#eab681] bg-[#cf8d45] px-4 py-2.5 font-[Adamina] text-[0.95rem] text-[#fff4e7] shadow-[0_8px_18px_rgb(0_0_0_/_16%)] transition hover:-translate-y-px hover:bg-[#b97731]"
                            >
                                Send message
                            </button>
                        </form>
                    </aside>
                </div>
            </div>
        </section>
    );
}

export default HelpCenter;
