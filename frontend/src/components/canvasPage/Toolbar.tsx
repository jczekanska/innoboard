import React from "react"
import type { Mode } from "@/types/canvas"
import {
  Eraser,
  PencilLine,
  MousePointer,
  Scaling,
  RotateCw,
  Trash2,
  MoveIcon,
  Type,
  Image,
  FileAudio,
  MapPin,
  Plus,
  Minus,
  Save,
  Share2,
  Home,
} from "lucide-react"
import ToolsButton from "./ToolsButton"
import { useCanvasSettings } from "@/context/CanvasSettingsContext"
import { DialogTrigger } from "@/components/ui/dialog"

export type ToolbarProps = {
  onSave: () => void
  onShare: () => void
  onDashboard: () => void
}

const MODE_ICONS: Record<Mode, React.FC> = {
  draw: PencilLine,
  erase: Eraser,
  select: MousePointer,
  move: MoveIcon,
  resize: Scaling,
  rotate: RotateCw,
  delete: Trash2,
  text: Type,
  image: Image,
  audio: FileAudio,
  location: MapPin,
}

const Toolbar: React.FC<ToolbarProps> = ({
  onSave,
  onShare,
  onDashboard,
}) => {
  const { state, dispatch } = useCanvasSettings()
  const { mode, zoom } = state

  return (
    <aside className="flex flex-col w-16 bg-white pt-4 pb-4 border-e z-10">
      {/* Mode tools */}
      <section className="flex flex-col items-center gap-3">
        {(Object.entries(MODE_ICONS) as [Mode, React.FC][]).map(
          ([m, Icon]) => (
            <ToolsButton
              key={m}
              icon={Icon}
              active={mode === m}
              onClick={() => dispatch({ type: "SET_MODE", payload: m })}
            />
          )
        )}
      </section>

      {/* Zoom */}
      <section className="flex flex-col items-center gap-2 mt-auto mb-4">
        <ToolsButton
          icon={Plus}
          onClick={() =>
            dispatch({ type: "SET_ZOOM", payload: zoom < 350 ? zoom + 25 : zoom })
          }
        />
        <span className="text-xs font-medium">{zoom}%</span>
        <ToolsButton
          icon={Minus}
          onClick={() =>
            dispatch({ type: "SET_ZOOM", payload: zoom > 25 ? zoom - 25 : zoom })
          }
        />
      </section>

      {/* Save / Share / Dashboard */}
      <div className="border-t pt-3 space-y-3 flex flex-col items-center">
        <ToolsButton icon={Save} onClick={onSave} />
        <DialogTrigger asChild>
          <ToolsButton icon={Share2} />
        </DialogTrigger>
        <ToolsButton icon={Home} onClick={onDashboard} />
      </div>
    </aside>
  )
}

export default Toolbar
