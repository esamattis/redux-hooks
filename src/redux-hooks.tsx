import {Store} from "redux";
import ReactDOM from "react-dom";
import React, {useContext, useState, useEffect, useRef} from "react";
import {shallowEqual} from "./shallow-equal";

interface ContextType {
    store?: Store;
    updaters: Function[];
}

const StoreContext = React.createContext<ContextType>({
    updaters: [],
});

export function Provider(props: {store: Store; children: React.ReactNode}) {
    // Mutable updaters list of all useReduxState() users
    const updaters: Function[] = [];

    useEffect(() => {
        // Setup only one listener for the provider
        return props.store.subscribe(() => {
            // so we can batch update all hook users
            ReactDOM.unstable_batchedUpdates(() => {
                for (const update of updaters) {
                    update();
                }
            });
        });
    }, [props.store]);

    // Context values never update. We put the store directly and the updates
    // list into it
    return (
        <StoreContext.Provider value={{store: props.store, updaters: updaters}}>
            {props.children}
        </StoreContext.Provider>
    );
}

interface MapState<T> {
    (state: any): T;
}

class NoProviderError extends Error {
    constructor() {
        super("<Provider> wrapping missing for useRedux*()?");
    }
}

export function useReduxDispatch() {
    const {store} = useContext(StoreContext);

    if (!store) {
        throw new NoProviderError();
    }

    return store.dispatch;
}

export function useReduxState<T = any>(mapState?: MapState<T>): T {
    const {store, updaters} = useContext(StoreContext);

    if (!store) {
        throw new NoProviderError();
    }

    /**
     * Get mapped value from the state
     */
    const getMappedValue = () => {
        const state = store.getState();
        if (mapState) {
            return mapState(state);
        }
        return state;
    };

    // Use ref to avoid useless state mapping
    const initialSliceContainer = useRef<T | null>(null);
    if (!initialSliceContainer.current) {
        initialSliceContainer.current = getMappedValue();
    }

    const [stateSlice, setState] = useState(initialSliceContainer.current!);

    useEffect(() => {
        let prev: T | null = initialSliceContainer.current;

        const update = () => {
            const next = getMappedValue();

            if (!shallowEqual(prev, next)) {
                setState(next);
                prev = next;
            }
        };

        // Mutate the updaters list so the subscription in provider can update
        // this hook
        updaters.push(update);

        return () => {
            // Remove the updater on unmount
            const index = updaters.indexOf(update);
            updaters.splice(index, 1);
        };
    }, [store]);

    return stateSlice;
}
