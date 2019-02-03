import {Store} from "redux";
import React, {useContext} from "react";

interface ContextType {
    store?: Store;
}

const StoreContext = React.createContext<ContextType>({});

export function Provider(props: {store: Store; children: React.ReactNode}) {
    return (
        <StoreContext.Provider value={{store: props.store}}>
            {props.children}
        </StoreContext.Provider>
    );
}

export function useReduxState() {
    const context = useContext(StoreContext);

    if (!context.store) {
        throw new Error("No provider set?");
    }

    return context.store.getState();
}
