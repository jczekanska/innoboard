import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface OverlayAudioProps {
    src: string;
    filename: string;
    width: number;
    height: number;
    isInteractable: boolean;
}

export const OverlayAudio = ({ src, filename, width, height, isInteractable }: OverlayAudioProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            setProgress(audio.currentTime);
        };

        const setMeta = () => {
            setDuration(audio.duration);
        };

        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("loadedmetadata", setMeta);

        return () => {
            audio.removeEventListener("timeupdate", updateProgress);
            audio.removeEventListener("loadedmetadata", setMeta);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setProgress(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="flex flex-col justify-center bg-gradient-to-br from-blue-400 to-blue-500 p-3 rounded-2xl text-white shadow-lg"
            style={{ width, height }}
        >
            <audio ref={audioRef} src={src} className="hidden" />

            <div className="text-xs font-medium mb-2 truncate text-center">
                {filename}
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-2">
                <button
                    onClick={isInteractable ? togglePlay : undefined}
                    className={`flex items-center justify-center min-w-8 min-h-8 bg-white/20 rounded-full transition-colors ${
                        isInteractable ? 'hover:bg-white/30 cursor-pointer' : 'cursor-default opacity-50'
                    }`}
                    disabled={!isInteractable}
                >
                    {isPlaying ? (
                        <Pause className="w-4 h-4 text-white" />
                    ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" />
                    )}
                </button>
                {/* Progress Bar */}
                <div className="w-full">
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        value={progress}
                        onChange={isInteractable ? handleSeek : undefined}
                        disabled={!isInteractable}
                        className={`w-full h-1 bg-white/20 rounded-lg appearance-none mb-1 ${
                            isInteractable ? 'cursor-pointer' : 'cursor-default opacity-50'
                        }`}
                    />
                    {/* Time Display */}
                    <div className="flex justify-between text-xs">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
