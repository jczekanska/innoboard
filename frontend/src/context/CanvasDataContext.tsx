import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import type { CanvasObject, Stroke, CanvasContent } from "@/types/canvas";

type Action =
  | { type: "init_content"; content: CanvasContent }
  | { type: "add_stroke"; stroke: Stroke }
  | { type: "add_object"; object: CanvasObject }
  | { type: "update_object"; object: CanvasObject }
  | { type: "delete_object"; objectId: string };

function canvasReducer(state: CanvasContent, action: Action): CanvasContent {
  switch (action.type) {
    case "init_content":
      return {
        objects: action.content.objects || [],
        strokes: action.content.strokes || [],
      };
    case "add_stroke":
      return {
        ...state,
        strokes: [...state.strokes, action.stroke],
      };
    case "add_object":
      return {
        ...state,
        objects: [...state.objects, action.object],
      };
    case "update_object":
      return {
        ...state,
        objects: state.objects.map((o) =>
          o.id === action.object.id ? action.object : o
        ),
      };
    case "delete_object":
      return {
        ...state,
        objects: state.objects.filter((o) => o.id !== action.objectId),
      };
    default:
      return state;
  }
}

interface CanvasDataContextValue {
  content: CanvasContent;
  dispatchContent: React.Dispatch<Action>;
  addStroke: (stroke: Stroke) => void;
  createObject: (object: CanvasObject) => void;
  updateObject: (object: CanvasObject) => void;
  deleteObject: (objectId: string) => void;
}

const CanvasDataContext = createContext<CanvasDataContextValue | null>(null);

export const CanvasDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token } = useContext(AuthContext);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const initialContent: CanvasContent = { objects: [], strokes: [] };
  const [content, dispatchContent] = useReducer(
    canvasReducer,
    initialContent
  );

  const saveTimeoutRef = useRef<number | null>(null);
  const latestContentRef = useRef<CanvasContent>(initialContent);
  latestContentRef.current = content;

  useEffect(() => {
    if (!token || !id) return;
    dispatchContent({ type: "init_content", content: { objects: [], strokes: [] } });
    fetch(`/api/canvases/${id}/data`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data: { content: CanvasContent }) => {
        const c = data.content || {};
        c.objects = Array.isArray(c.objects) ? c.objects : [];
        c.strokes = Array.isArray(c.strokes) ? c.strokes : [];
        dispatchContent({ type: "init_content", content: c });
      })
      .catch((err) => {
        console.error("Failed to load canvas content", err);
        navigate("/dashboard");
      });
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [id, token]);

  useEffect(() => {
    if (!token || !id) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      const payload = { content: latestContentRef.current };
      fetch(`/api/canvases/${id}/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
        .then((r) => {
          if (!r.ok) {
            console.error("Failed to save canvas content");
          }
          return r.json().catch(() => null);
        })
        .catch((err) => {
          console.error("Error saving canvas content", err);
        });
    }, 1500);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, id, token]);

  const addStroke = (stroke: Stroke) => {
    dispatchContent({ type: "add_stroke", stroke });
  };
  const createObject = (object: CanvasObject) => {
    dispatchContent({ type: "add_object", object });
  };
  const updateObject = (object: CanvasObject) => {
    dispatchContent({ type: "update_object", object });
  };
  const deleteObject = (objectId: string) => {
    dispatchContent({ type: "delete_object", objectId });
  };

  return (
    <CanvasDataContext.Provider
      value={{
        content,
        dispatchContent,
        addStroke,
        createObject,
        updateObject,
        deleteObject,
      }}
    >
      {children}
    </CanvasDataContext.Provider>
  );
};

export const useCanvasData = () => {
  const ctx = useContext(CanvasDataContext);
  if (!ctx) {
    throw new Error(
      "useCanvasData must be used within CanvasDataProvider"
    );
  }
  return ctx;
};
