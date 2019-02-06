import {Store, bindActionCreators} from "redux";
import ReactDOM from "react-dom";
import React, {useContext, useState, useEffect, useRef, useMemo} from "react";
import {shallowEqual} from "./shallow-equal";

/** id sequence */
let SEQ = 0;

// Custom "null" because mapState can return the js null we must be able to
// differentiate from it
const nil = {} as "nil"; // cross browser Symbol hack :)
type Nil = "nil";

/**
 * Subset of Map we use
 */
interface UpdatersMap {
    set(id: number, updater: Function): unknown;
    delete(id: number): unknown;
    forEach(cb: (updater: Function) => void): unknown;
}

interface ContextType {
    store?: Store;
    updaters: UpdatersMap;
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
 * Create ponyfill Map if native is not available
 */
function createMap(): UpdatersMap {
    if (typeof Map !== "undefined") {
        return new Map<number, Function>();
    }

    const poorMap: Record<number, Function> = {};

    // ponyfill for Map
    return {
        set(id: number, updater: Function) {
            poorMap[id] = updater;
        },
        delete(id: number) {
            delete poorMap[id];
        },
        forEach(cb: (updater: Function) => void) {
            for (const id in poorMap) {
                cb(poorMap[id]);
            }
        },
    };
}

const StoreContext = React.createContext<ContextType>({
    updaters: createMap(),
});

export function HooksProvider(props: {
    store: Store;
    children: React.ReactNode;
}) {
    // Mutable updaters list of all useReduxState() users
    const updaters = useRef<UpdatersMap>(createMap());

    useEffect(() => {
        // Setup only one listener for the provider
        return props.store.subscribe(() => {
            // so we can batch update all hook users without causing tearing
            ReactDOM.unstable_batchedUpdates(() => {
                updaters.current.forEach(updater => updater());
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

type PickFunctions<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any
        ? (...args: Parameters<T[K]>) => void
        : never
};

/**
 * Bound actions creators object to Redux dispatch. Memoized.
 */
export function useActionCreators<T>(actionCreators: T): PickFunctions<T> {
    const dispatch = useReduxDispatch();

    return useMemo(() => bindActionCreators(actionCreators as any, dispatch), [
        actionCreators,
    ]);
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

        // Mutate the updaters map so the subscription in provider can update
        // this hook
        const id = ++SEQ;
        updaters.set(id, update);

        return () => {
            // Remove the updater on unmount or store change
            updaters.delete(id);

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
