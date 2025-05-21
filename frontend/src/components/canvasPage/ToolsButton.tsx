import { LucideIcon } from "lucide-react"

type ToolsButtonProps = {
    icon: LucideIcon
    onClick?: () => void
    active?: boolean
}

const ToolsButton: React.FC<ToolsButtonProps> = ({ icon: Icon, onClick, active }) => {
    return (
        <button
            className={`flex w-8 h-8 rounded-xl ${active ? "bg-gray-100" : "bg-white hover:scale-110 hover:bg-gray-100"}  duration-150`}
            onClick={onClick}
        >
            <Icon className="m-auto w-5 text-gray-900" />
        </button>
    )
}

export default ToolsButton