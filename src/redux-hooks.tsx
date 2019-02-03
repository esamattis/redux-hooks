import {Store} from "redux";
import React, {useContext, useState, useEffect} from "react";

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
    const {store} = useContext(StoreContext);

    if (!store) {
        throw new Error("No provider set?");
    }

    const map = () => {
        const state = store.getState();
        if (mapState) {
            return mapState(state);
        }
        return state;
    };

    const [stateSlice, setState] = useState(map);

    useEffect(() => {
        return store.subscribe(() => {
            setState(map());
        });
    }, [store]);

    return stateSlice;
}
