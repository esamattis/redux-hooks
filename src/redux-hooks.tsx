import {Store, bindActionCreators} from "redux";
import ReactDOM from "react-dom";
import React, {useContext, useState, useEffect, useRef, useMemo} from "react";
import {shallowEqual} from "./shallow-equal";

declare const process: any;

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

interface MapState<T, D extends any[]> {
    (state: any, ...args: D): T;
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
export function useDispatch() {
    const {store} = useContext(StoreContext);

    if (!store) {
        throw new NoProviderError();
    }

    return store.dispatch;
}

export function useReduxDispatch() {
    if (process.env.NODE_ENV !== "production") {
        console.warn(
            "@epeli/redux-hooks: useReduxDispatch() has been renamed to useDispatch()",
        );
    }
    return useDispatch();
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

export function useReduxState<T, D extends Array<any>>(
    mapState?: MapState<T, D>,
): T {
    if (process.env.NODE_ENV !== "production") {
        console.warn(
            "@epeli/redux-hooks: useReduxState() has been renamed to useMapState()",
        );
    }
    return useMapState(mapState);
}

function useDidDepsChange(deps: any[] | undefined) {
    if (!deps) {
        return false;
    }

    const memoDeps = useMemo(() => deps, deps);

    // changed when useMemo returns the same deps reference
    return memoDeps == deps;
}

/**
 * Use part of the redux state
 */
export function useMapState<D extends any[], T = any>(
    mapState?: MapState<T, D>,
    deps?: D,
): T {
    const {store, updaters} = useContext(StoreContext);

    /**
     * Reference to the previously mapped state
     */
    const prevRef = useRef<T | Nil>(nil);

    /**
     * When this is set can bailout state mapping and just return this
     */
    const bailoutRef = useRef<T | Nil>(nil);

    /**
     * Trigger render from store updates
     */
    const triggerRender = useForceRender();

    /**
     * Detect deps change when using the deps array
     */
    const depsChanged = useDidDepsChange(deps);

    if (!store) {
        throw new NoProviderError();
    }

    /**
     * Get mapped value from the state
     */
    const getMappedValue = (): T => {
        const state = store.getState();

        if (!mapState) {
            return state;
        }

        if (deps) {
            return mapState(state, ...deps);
        }

        return (mapState as Function)(state);
    };

    // Set initial mapped states for the first render
    if (prevRef.current === nil) {
        prevRef.current = bailoutRef.current = getMappedValue();
    }

    useEffect(() => {
        // handle updates from the store
        const update = () => {
            const next = getMappedValue();

            if (!shallowEqual(prevRef.current, next)) {
                bailoutRef.current = next;
                prevRef.current = next;
                triggerRender();
            }
        };

        // Mutate the updaters map so the subscription in the provider can
        // update this hook
        const id = ++SEQ;
        updaters.set(id, update);

        return () => {
            // Remove the updater on unmount or store change
            updaters.delete(id);

            // clear cached on store change
            prevRef.current = nil;
            bailoutRef.current = nil;
        };
    }, [store]);

    // Bailout with the previously mapped state if we have deps and they did not
    // change
    if (deps && !depsChanged && bailoutRef.current === nil) {
        bailoutRef.current = prevRef.current;
    }

    // Use the bailout if we have one
    if (bailoutRef.current !== nil) {
        const ret = bailoutRef.current;
        bailoutRef.current = nil;
        return ret;
    }

    // Normal render. Must map the state because the mapping function might
    // have changed
    return (prevRef.current = getMappedValue());
}
