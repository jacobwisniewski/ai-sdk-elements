import { createContext, useContext, type ReactNode, type FunctionComponent } from "react";
import type { UIMessage } from "ai";

type ElementPartsContextValue = {
  readonly parts: UIMessage["parts"];
};

const ElementPartsContext = createContext<ElementPartsContextValue | null>(null);

export const useElementParts = (): ElementPartsContextValue => {
  const ctx = useContext(ElementPartsContext);
  if (!ctx) {
    throw new Error("useElementParts must be used within ElementPartsProvider");
  }
  return ctx;
};

type ElementPartsProviderProps = {
  readonly parts: UIMessage["parts"];
  readonly children: ReactNode;
};

export const ElementPartsProvider: FunctionComponent<ElementPartsProviderProps> = ({
  parts,
  children,
}) => <ElementPartsContext.Provider value={{ parts }}>{children}</ElementPartsContext.Provider>;
