import { ArrowLeft, Eraser, FileAudio, Image, LucideIcon, MapPin, MousePointer, PencilLine, Share2, Type } from "lucide-react"

const CanvasPage: React.FC = () => {
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
            <div className="flex flex-col w-14 bg-white items-center gap-3 pt-16 border-e-1">
                <ToolsButton icon={MousePointer} />
                <ToolsButton icon={PencilLine} />
                <ToolsButton icon={Type} />
                <ToolsButton icon={Eraser} />
                <ToolsButton icon={Image} />
                <ToolsButton icon={FileAudio} />
                <ToolsButton icon={MapPin} />
            </div>
            {/* Canvas Area */}
            <div className="w-full bg-red-100 pt-23 ps-10 overflow-auto grid place-items-center">
                {/* Canvas itself */}
                <div className="h-50 w-50 mb-10 me-10 bg-white scale-100"></div>
            </div>
            {/* Additional Tools */}
            <div className="flex flex-col w-80 bg-white items-center gap-3 pt-3 border-s-1">

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