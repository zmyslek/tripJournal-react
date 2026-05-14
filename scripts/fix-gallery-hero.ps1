$path = 'src/pages/Gallery.tsx'
$text = Get-Content -Raw $path
$pattern = '(?s)<div className="relative flex flex-wrap items-start justify-between gap-6">\s*<div>\s*<p className="m-0 font-\[Adamina\] text-\[0\.7rem\] uppercase tracking-\[0\.24em\] text-\[#f6d7b5\]">Travel moments</p>\s*<h1 id="gallery-title" className="mt-3 font-\[Adamina\] text-\[clamp\(2\.2rem,5vw,3\.8rem\)\] leading-none text-\[#fff4e7\]">\s*Gallery\s*</h1>\s*<p className="mt-4 max-w-\[42rem\] font-\[Cormorant_Garamond\] text-\[1\.25rem\] leading-\[1\.35\] text-\[#f7dfca\]">\s*Explore your travel photographs and moments from around the world\.\s*</p>\s*</div>\s*<div className="flex flex-col gap-3">\s*<PhotoUploadButton\s*onUpload=\{handleFileUpload\}\s*isLoading=\{isUploading\}\s*inputRef=\{fileInputRef\}\s*/>\s*\{uploadError && \(\s*<p className="text-sm text-red-600">\{uploadError\}</p>\s*\)\}\s*</div>\s*</div>'
$new = @'
                        <div className="relative flex flex-wrap items-start justify-between gap-6">
                            <div className="max-w-[46rem]">
                                <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Travel moments</p>
                                <h1 id="gallery-title" className="mt-3 font-[Adamina] text-[clamp(2.2rem,5vw,3.8rem)] leading-none text-[#fff4e7]">
                                    Gallery
                                </h1>
                                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ffead4]/70 bg-[#fff4e7]/10 px-2 py-1 shadow-[0_0_0_1px_rgb(255_234_212_/_14%)]">
                                    <span className="pl-2 font-[Adamina] text-[0.66rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Mode</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className={["min-w-16 rounded-full px-4 py-2 font-[Adamina] text-[0.74rem] uppercase tracking-[0.08em] transition", !isEditing ? "bg-[#ffead4] text-[#5a392b] shadow-sm" : "text-[#ffead4] hover:bg-[#ffead4]/18"].join(' ')}
                                        aria-pressed={!isEditing}
                                    >
                                        View
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className={["min-w-16 rounded-full px-4 py-2 font-[Adamina] text-[0.74rem] uppercase tracking-[0.08em] transition", isEditing ? "bg-[#ffead4] text-[#5a392b] shadow-sm" : "text-[#ffead4] hover:bg-[#ffead4]/18"].join(' ')}
                                        aria-pressed={isEditing}
                                    >
                                        Edit
                                    </button>
                                </div>
                                <p className="mt-4 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                                    Explore your travel photographs and moments from around the world.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <PhotoUploadButton
                                    onUpload={handleFileUpload}
                                    isLoading={isUploading}
                                    inputRef={fileInputRef}
                                />
                                {uploadError && (
                                    <p className="text-sm text-red-600">{uploadError}</p>
                                )}
                            </div>
                        </div>
'@
$replacement = @'
                        <div className="relative flex flex-wrap items-start justify-between gap-6">
                            <div className="max-w-[46rem]">
                                <p className="m-0 font-[Adamina] text-[0.7rem] uppercase tracking-[0.24em] text-[#f6d7b5]">Travel moments</p>
                                <h1 id="gallery-title" className="mt-3 font-[Adamina] text-[clamp(2.2rem,5vw,3.8rem)] leading-none text-[#fff4e7]">
                                    Gallery
                                </h1>
                                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ffead4]/70 bg-[#fff4e7]/10 px-2 py-1 shadow-[0_0_0_1px_rgb(255_234_212_/_14%)]">
                                    <span className="pl-2 font-[Adamina] text-[0.66rem] uppercase tracking-[0.18em] text-[#f6d7b5]">Mode</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className={["min-w-16 rounded-full px-4 py-2 font-[Adamina] text-[0.74rem] uppercase tracking-[0.08em] transition", !isEditing ? "bg-[#ffead4] text-[#5a392b] shadow-sm" : "text-[#ffead4] hover:bg-[#ffead4]/18"].join(' ')}
                                        aria-pressed={!isEditing}
                                    >
                                        View
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className={["min-w-16 rounded-full px-4 py-2 font-[Adamina] text-[0.74rem] uppercase tracking-[0.08em] transition", isEditing ? "bg-[#ffead4] text-[#5a392b] shadow-sm" : "text-[#ffead4] hover:bg-[#ffead4]/18"].join(' ')}
                                        aria-pressed={isEditing}
                                    >
                                        Edit
                                    </button>
                                </div>
                                <p className="mt-4 max-w-[42rem] font-[Cormorant_Garamond] text-[1.25rem] leading-[1.35] text-[#f7dfca]">
                                    Explore your travel photographs and moments from around the world.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <PhotoUploadButton
                                    onUpload={handleFileUpload}
                                    isLoading={isUploading}
                                    inputRef={fileInputRef}
                                />
                                {uploadError && (
                                    <p className="text-sm text-red-600">{uploadError}</p>
                                )}
                            </div>
                        </div>
'@
$text = [regex]::Replace($text, $pattern, $replacement, 1)
Set-Content -Path $path -Value $text -NoNewline
Write-Host 'updated'
