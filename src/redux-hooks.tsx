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

interface MapState<T> {
    (state: any): T;
}

export function useReduxState<T = any>(mapState?: MapState<T>): T {
    const context = useContext(StoreContext);

    if (!context.store) {
        throw new Error("No provider set?");
    }

    const state = context.store.getState();

    if (mapState) {
        return mapState(state);
    }

    return state;
}
