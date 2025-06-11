import React, { createContext, useContext, useReducer } from "react"

import type { Mode } from "@/types/canvas"

interface CanvasSettingsState {
    mode: Mode
    zoom: number
    size: number
    color: string,
    fontSize: number
    fontFamily: string
}

type CanvasAction =
    | { type: "SET_MODE"; payload: Mode }
    | { type: "SET_ZOOM"; payload: number }
    | { type: "SET_SIZE"; payload: number }
    | { type: "SET_COLOR"; payload: string }
    | { type: "SET_FONT_SIZE"; payload: number }
    | { type: "SET_FONT_FAMILY"; payload: string }

const initialState: CanvasSettingsState = {
    mode: "select",
    zoom: 100,
    size: 33,
    color: "#000000",
    fontSize: 16,
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
}

function canvasReducer(state: CanvasSettingsState, action: CanvasAction): CanvasSettingsState {
    switch (action.type) {
        case "SET_MODE":
            return { ...state, mode: action.payload }
        case "SET_ZOOM":
            return { ...state, zoom: action.payload }
        case "SET_SIZE":
            return { ...state, size: action.payload }
        case "SET_COLOR":
            return { ...state, color: action.payload }
        case "SET_FONT_SIZE":
            return { ...state, fontSize: action.payload }
        case "SET_FONT_FAMILY":
            return { ...state, fontFamily: action.payload }
    }
}

const CanvasSettingsContext = createContext<{
    state: CanvasSettingsState
    dispatch: React.Dispatch<CanvasAction>
}>({
    state: initialState,
    dispatch: () => { },
})

export const CanvasSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(canvasReducer, initialState)
    return (
        <CanvasSettingsContext.Provider value={{ state, dispatch }}>
            {children}
        </CanvasSettingsContext.Provider>
    )
}

export const useCanvasSettings = () => useContext(CanvasSettingsContext)
