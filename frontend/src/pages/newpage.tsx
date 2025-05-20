import { ArrowLeft, Eraser, FileAudio, Image, LucideIcon, MapPin, Minus, MousePointer, PencilLine, Plus, Share2, Type } from "lucide-react"
import { useState } from "react"

const CanvasPage: React.FC = () => {

    const [zoom, setZoom] = useState(100)

    return <div className="flex bg-gray-300 w-screen h-screen flex-col">
        {/* Top Bar */}
        <div className="flex absolute items-center w-screen h-13 bg-white px-3 border-b-1">
            {/* Canvas Name */}
            <div className="flex items-center w-full gap-6">
                {/* Back Button */}
                <ArrowLeft className="hover:-translate-x-1 duration-150 cursor-pointer ms-0.5" />
                {/* Canvas Name */}
                <h1 className="text-lg font-medium truncate">
                    New Canvas {new Date().toISOString()}
                </h1>
            </div>
            {/* Canvas Options */}
            <div className="flex items-center w-full justify-end">
                {/* Share Button */}
                <button className="flex items-center border py-1 px-3 gap-1.5 rounded-xl bg-white hover:scale-105 duration-150">
                    <Share2 className="w-4" />
                    <span>
                        Share
                    </span>
                </button>
            </div>
        </div>
        <div className="flex h-screen">
            {/* Toolbar */}
            <div className="flex flex-col w-15 bg-white pt-16 pb-3 border-e-1">
                <div className="flex flex-col items-center gap-3">
                    <ToolsButton icon={MousePointer} />
                    <ToolsButton icon={PencilLine} />
                    <ToolsButton icon={Type} />
                    <ToolsButton icon={Eraser} />
                    <ToolsButton icon={Image} />
                    <ToolsButton icon={FileAudio} />
                    <ToolsButton icon={MapPin} />
                </div>
                {/* Zoom Functionality (might cause problems: in this case, remove it) */}
                <div className="flex flex-col items-center gap-3 h-full justify-end">
                    <ToolsButton icon={Minus} onClick={() => setZoom(zoom > 25 ? zoom - 25 : zoom)} />
                    <span className="text-xs">{zoom}%</span>
                    <ToolsButton icon={Plus} onClick={() => setZoom(zoom < 350 ? zoom + 25 : zoom)} />
                </div>
            </div>
            {/* Canvas Area */}
            <div className="w-full bg-red-100 pt-23 ps-10 overflow-auto grid place-items-center">
                {/* Canvas itself */}
                <div

                    style={{ scale: zoom + "%" }}
                    className="h-50 w-50 mb-10 me-10 bg-white duration-100"></div>
            </div>
            {/* Additional Tools */}
            <div className="flex flex-col w-80 bg-white items-center gap-3 pt-3 border-s-1">
                {/* Text */}

                {/* Colors */}

                {/* Users */}

            </div>
        </div>
    </div>
}

type ToolsButtonProps = {
    icon: LucideIcon
    onClick?: () => void
}

const ToolsButton: React.FC<ToolsButtonProps> = ({ icon: Icon, onClick }) => {
    return (
        <button
            className="flex w-8 h-8 rounded-xl bg-white hover:scale-110 hover:bg-gray-100 duration-150"
            onClick={onClick}
        >
            <Icon className="m-auto w-5 text-gray-900" />
        </button>
    )
}

export default CanvasPage