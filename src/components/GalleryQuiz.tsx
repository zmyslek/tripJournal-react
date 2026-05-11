import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import type { GalleryItem } from '../pages/Gallery';

export interface GalleryQuizProps {
    isOpen: boolean;
    onClose: () => void;
    galleryItems: GalleryItem[];
}

interface QuizState {
    currentPhotoIndex: number;
    hints: { continent: string | null; country: string | null; city: string | null };
    hintsRevealed: number;
    score: number;
    answered: boolean;
    highScore: number;
}

const CONTINENTS: Record<string, string[]> = {
    Europe: [
        'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Czechia',
        'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland',
        'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands',
        'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
        'United Kingdom', 'UK', 'England', 'Scotland', 'Wales', 'Northern Ireland', 'Norway', 'Serbia'
    ],
    Asia: [
        'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei',
        'Cambodia', 'China', 'Georgia', 'Hong Kong', 'India', 'Indonesia', 'Iran', 'Iraq',
        'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon',
        'Macao', 'Malaysia', 'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea',
        'Oman', 'Pakistan', 'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea',
        'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand', 'Timor-Leste', 'Turkey',
        'Turkmenistan', 'United Arab Emirates', 'UAE', 'Uzbekistan', 'Vietnam', 'West Bank',
        'Yemen'
    ],
    Africa: [
        'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
        'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', 'Congo', 'Democratic Republic of the Congo',
        'Côte d\'Ivoire', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini',
        'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho',
        'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius',
        'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'Sao Tome and Principe',
        'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan',
        'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
    ],
    'North America': [
        'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada', 'Costa Rica',
        'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador', 'Grenada', 'Guatemala',
        'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Saint Kitts and Nevis',
        'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago', 'United States', 'USA'
    ],
    'South America': [
        'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay',
        'Peru', 'Suriname', 'Uruguay', 'Venezuela'
    ],
    Oceania: [
        'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru',
        'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga',
        'Tuvalu', 'Vanuatu'
    ]
};

function getContinent(location: string): string | null {
    for (const [continent, countries] of Object.entries(CONTINENTS)) {
        if (countries.some(country => location.includes(country))) {
            return continent;
        }
    }
    return null;
}

function extractLocationParts(locationText: string): { continent: string | null; country: string | null; city: string | null } {
    const parts = locationText.split('/').map(p => p.trim()).filter(Boolean);
    const country = parts[0] || null;
    const city = parts[1] || null;
    const continent = country ? getContinent(country) : null;

    return { continent, country, city };
}

function getHighScore(): number {
    try {
        const data = localStorage.getItem('tripjournal:quiz:highscore:v1');
        return data ? parseInt(data, 10) : 0;
    } catch {
        return 0;
    }
}

function saveHighScore(score: number): void {
    try {
        const currentHigh = getHighScore();
        if (score > currentHigh) {
            localStorage.setItem('tripjournal:quiz:highscore:v1', score.toString());
        }
    } catch (err) {
        console.error('[Quiz] Failed to save high score:', err);
    }
}

export function GalleryQuiz({ isOpen, onClose, galleryItems }: GalleryQuizProps) {
    const imageItems = useMemo(() => galleryItems.filter(item => item.kind === 'image' && item.text), [galleryItems]);

    const [quizState, setQuizState] = useState<QuizState>(() => ({
        currentPhotoIndex: 0,
        hints: { continent: null, country: null, city: null },
        hintsRevealed: 0,
        score: 0,
        answered: false,
        highScore: getHighScore()
    }));

    const currentPhoto = imageItems[quizState.currentPhotoIndex];
    const currentPhotoUrl = currentPhoto?.src ?? '';
    const correctAnswer = currentPhoto ? extractLocationParts(currentPhoto.text) : { continent: null, country: null, city: null };

    const handleRevealHint = () => {
        if (quizState.hintsRevealed < 3 && !quizState.answered) {
            const newHintsRevealed = quizState.hintsRevealed + 1;
            const hintContent = { ...quizState.hints };

            if (newHintsRevealed === 1 && correctAnswer.continent) {
                hintContent.continent = correctAnswer.continent;
            } else if (newHintsRevealed === 2 && correctAnswer.country) {
                hintContent.country = correctAnswer.country;
            } else if (newHintsRevealed === 3 && correctAnswer.city) {
                hintContent.city = correctAnswer.city;
            }

            setQuizState(prev => ({
                ...prev,
                hintsRevealed: newHintsRevealed,
                hints: hintContent
            }));
        }
    };

    const handleSkip = () => {
        if (quizState.currentPhotoIndex + 1 < imageItems.length) {
            setQuizState(prev => ({
                ...prev,
                currentPhotoIndex: prev.currentPhotoIndex + 1,
                hintsRevealed: 0,
                hints: { continent: null, country: null, city: null },
                answered: false
            }));
        } else {
            handleEndQuiz();
        }
    };

    const handleEndQuiz = () => {
        saveHighScore(quizState.score);
        onClose();
    };

    const handleCorrectAnswer = () => {
        const pointsPerPhoto = 10;
        const hintPenalty = quizState.hintsRevealed * 2;
        const points = Math.max(1, pointsPerPhoto - hintPenalty);

        if (quizState.currentPhotoIndex + 1 < imageItems.length) {
            setQuizState(prev => ({
                ...prev,
                score: prev.score + points,
                answered: true
            }));
        } else {
            setQuizState(prev => ({
                ...prev,
                score: prev.score + points
            }));
            setTimeout(() => {
                saveHighScore(quizState.score + points);
                onClose();
            }, 1000);
        }
    };

    const handleNextPhoto = () => {
        setQuizState(prev => ({
            ...prev,
            currentPhotoIndex: prev.currentPhotoIndex + 1,
            hintsRevealed: 0,
            hints: { continent: null, country: null, city: null },
            answered: false
        }));
    };

    if (!isOpen || imageItems.length === 0) {
        return null;
    }

    const photosRemaining = imageItems.length - quizState.currentPhotoIndex;
    const hintButtonsActive = quizState.hintsRevealed < 3 && !quizState.answered;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl rounded-2xl bg-[#FFEAD4] shadow-2xl">
                {/* Close button */}
                <button
                    onClick={handleEndQuiz}
                    className="absolute right-4 top-4 text-[#7A3F00] hover:text-[#5A392B] transition"
                    aria-label="Close quiz"
                >
                    <X size={24} />
                </button>

                <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="font-adamina text-2xl sm:text-3xl font-bold text-[#7A3F00] mb-2">
                            Where Was This Taken?
                        </h2>
                        <div className="flex justify-between text-sm text-[#7A3F00]/70">
                            <span>Photo {quizState.currentPhotoIndex + 1} of {imageItems.length}</span>
                            <span>Score: {quizState.score}</span>
                        </div>
                    </div>

                    {/* Photo display */}
                    <div className="mb-6 rounded-lg overflow-hidden bg-[#5A392B] flex items-center justify-center min-h-[300px] max-h-[400px]">
                        <img
                            src={currentPhotoUrl}
                            alt="Quiz photo"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Hints section */}
                    <div className="mb-6 p-4 bg-[#EAB681]/20 rounded-lg">
                        <h3 className="font-cormorant text-sm font-semibold text-[#7A3F00] mb-3 uppercase tracking-wide">
                            Hints Available
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            {/* Continent hint */}
                            <button
                                onClick={handleRevealHint}
                                disabled={!hintButtonsActive || quizState.hintsRevealed > 0}
                                className={`p-3 rounded text-sm font-cormorant transition ${
                                    quizState.hints.continent
                                        ? 'bg-[#7A3F00] text-[#FFEAD4] font-semibold'
                                        : hintButtonsActive && quizState.hintsRevealed === 0
                                        ? 'bg-[#CF8D45] text-[#FFEAD4] hover:bg-[#7A3F00] cursor-pointer'
                                        : 'bg-[#7A3F00]/30 text-[#7A3F00]/50 cursor-not-allowed'
                                }`}
                            >
                                {quizState.hints.continent ? quizState.hints.continent : 'Continent'}
                            </button>

                            {/* Country hint */}
                            <button
                                onClick={handleRevealHint}
                                disabled={!hintButtonsActive || quizState.hintsRevealed < 1}
                                className={`p-3 rounded text-sm font-cormorant transition ${
                                    quizState.hints.country
                                        ? 'bg-[#7A3F00] text-[#FFEAD4] font-semibold'
                                        : hintButtonsActive && quizState.hintsRevealed === 1
                                        ? 'bg-[#CF8D45] text-[#FFEAD4] hover:bg-[#7A3F00] cursor-pointer'
                                        : 'bg-[#7A3F00]/30 text-[#7A3F00]/50 cursor-not-allowed'
                                }`}
                            >
                                {quizState.hints.country ? quizState.hints.country : 'Country'}
                            </button>

                            {/* City hint */}
                            <button
                                onClick={handleRevealHint}
                                disabled={!hintButtonsActive || quizState.hintsRevealed < 2}
                                className={`p-3 rounded text-sm font-cormorant transition ${
                                    quizState.hints.city
                                        ? 'bg-[#7A3F00] text-[#FFEAD4] font-semibold'
                                        : hintButtonsActive && quizState.hintsRevealed === 2
                                        ? 'bg-[#CF8D45] text-[#FFEAD4] hover:bg-[#7A3F00] cursor-pointer'
                                        : 'bg-[#7A3F00]/30 text-[#7A3F00]/50 cursor-not-allowed'
                                }`}
                            >
                                {quizState.hints.city ? quizState.hints.city : 'City'}
                            </button>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 sm:gap-4">
                        {!quizState.answered ? (
                            <>
                                <button
                                    onClick={handleSkip}
                                    className="flex-1 px-4 py-3 rounded-lg border-2 border-[#7A3F00] text-[#7A3F00] font-cormorant font-semibold hover:bg-[#7A3F00]/10 transition"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleCorrectAnswer}
                                    className="flex-1 px-4 py-3 rounded-lg bg-[#7A3F00] text-[#FFEAD4] font-cormorant font-semibold hover:bg-[#5A392B] transition"
                                >
                                    I Know This!
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleEndQuiz}
                                    className="flex-1 px-4 py-3 rounded-lg border-2 border-[#7A3F00] text-[#7A3F00] font-cormorant font-semibold hover:bg-[#7A3F00]/10 transition"
                                >
                                    Finish Quiz
                                </button>
                                {photosRemaining > 1 && (
                                    <button
                                        onClick={handleNextPhoto}
                                        className="flex-1 px-4 py-3 rounded-lg bg-[#7A3F00] text-[#FFEAD4] font-cormorant font-semibold hover:bg-[#5A392B] transition"
                                    >
                                        Next Photo
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* High score display */}
                    <div className="mt-4 text-center text-sm text-[#7A3F00]/60">
                        High Score: <span className="font-bold text-[#7A3F00]">{quizState.highScore}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GalleryQuiz;
