import type { Mode } from "@/types/canvas"
import { Eraser, FileAudio, MapPin, Minus, MousePointer, PencilLine, Plus, Type, LucideIcon, Image } from "lucide-react"
import ToolsButton from "./ToolsButton"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"

const TOOLS: Record<Mode, LucideIcon> = {
    select: MousePointer,
    draw: PencilLine,
    text: Type,
    erase: Eraser,
    image: Image,
    audio: FileAudio,
    location: MapPin
}

const Toolbar = () => {
    const { state, dispatch } = useCanvasSettings()
    const { mode, zoom } = state

    return (
        <aside className="flex flex-col w-15 bg-white pt-16 pb-3 border-e-1">
            <section className="flex flex-col items-center gap-3">
                {(Object.entries(TOOLS) as [Mode, LucideIcon][]).map(([toolMode, Icon]) => (
                    <ToolsButton
                        key={toolMode}
                        icon={Icon}
                        active={mode === toolMode}
                        onClick={() => dispatch({ type: "SET_MODE", payload: toolMode })} />
                ))}
            </section>
            {/* Zoom Functionality (might cause problems: in this case, remove it) */}
            <section className="flex flex-col items-center gap-3 h-full justify-end">
                <ToolsButton
                    icon={Minus}
                    onClick={() =>
                        dispatch({ type: "SET_ZOOM", payload: zoom > 25 ? zoom - 25 : zoom })
                    }
                />
                <span className="text-xs">{zoom}%</span>
                <ToolsButton
                    icon={Plus}
                    onClick={() =>
                        dispatch({ type: "SET_ZOOM", payload: zoom < 350 ? zoom + 25 : zoom })
                    }
                />
            </section>
        </aside>
    )
}

export default Toolbar