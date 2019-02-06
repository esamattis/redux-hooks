import {Store} from "redux";
import ReactDOM from "react-dom";
import React, {useContext, useState, useEffect, useRef} from "react";
import {shallowEqual} from "./shallow-equal";

interface ContextType {
    store?: Store;
    updaters: Function[];
}

// Custom "null" because mapState can return the js null we must be able to
// differentiate from it
const nil = Symbol("NIL");
type Nil = typeof nil;

const StoreContext = React.createContext<ContextType>({
    updaters: [],
});

export function HooksProvider(props: {
    store: Store;
    children: React.ReactNode;
}) {
    // Mutable updaters list of all useReduxState() users
    const updaters = useRef<Function[]>([]);

    useEffect(() => {
        // Setup only one listener for the provider
        return props.store.subscribe(() => {
            // so we can batch update all hook users without causing tearing
            ReactDOM.unstable_batchedUpdates(() => {
                for (const update of updaters.current) {
                    update();
                }
            });
        });
    }, [props.store]);

    // Context values never update. We put the store directly and the updates
    // list into it
    return (
        <StoreContext.Provider
            value={{store: props.store, updaters: updaters.current}}
        >
            {props.children}
        </StoreContext.Provider>
    );
}

interface MapState<T> {
    (state: any): T;
}

class NoProviderError extends Error {
    constructor() {
        super("<HooksProvider> wrapping missing for useRedux*()?");
    }
}

/**
 * Use Redux dispatch
 */
export function useReduxDispatch() {
    const {store} = useContext(StoreContext);

    if (!store) {
        throw new NoProviderError();
    }

    return store.dispatch;
}

function useForceRender() {
    const [_, setUpdateCount] = useState(0);

    return function trigger() {
        setUpdateCount(count => count + 1);
    };
}

/**
 * Use part of the redux state
 */
export function useReduxState<T = any>(mapState?: MapState<T>): T {
    const {store, updaters} = useContext(StoreContext);

    if (!store) {
        throw new NoProviderError();
    }

    const triggerRender = useForceRender();

    /**
     * Get mapped value from the state
     */
    const getMappedValue = (): T => {
        const state = store.getState();
        if (mapState) {
            return mapState(state);
        }
        return state;
    };

    const prev = useRef<T | Nil>(nil);
    const cache = useRef<T | Nil>(nil);

    // Set initial mapped state for the first render
    if (prev.current === nil) {
        prev.current = cache.current = getMappedValue();
    }

    useEffect(() => {
        // handle updates from the store
        const update = () => {
            const next = getMappedValue();

            if (!shallowEqual(prev.current, next)) {
                cache.current = next;
                prev.current = next;
                triggerRender();
            }
        };

        // Mutate the updaters list so the subscription in provider can update
        // this hook
        updaters.push(update);

        return () => {
            // Remove the updater on unmount or store change
            const index = updaters.indexOf(update);
            updaters.splice(index, 1);

            // clear cached on store change
            prev.current = nil;
            cache.current = nil;
        };
    }, [store]);

    if (cache.current !== nil) {
        // First render or store triggered the update. Already computed during
        // the shallow equal check.
        const ret = cache.current;
        cache.current = nil;
        return ret;
    }

    // Normal render. Must map the state because the mapping function might
    // have changed
    return (prev.current = getMappedValue());
}
