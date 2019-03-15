// tslint:disable:react-hooks-nesting
import {Store, bindActionCreators} from "redux";
import ReactDOM from "react-dom";
import React, {useContext, useState, useEffect, useRef, useMemo} from "react";
import {shallowEqual} from "./shallow-equal";

declare const process: any;

/**
 * Tuple constraint
 * https://github.com/Microsoft/TypeScript/issues/29780
 */
type Tuple<T = any> = [T] | T[];

/**
 * Pick only functions from an object and remove their return values
 */
type RemoveReturnTypes<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any
        ? (...args: Parameters<T[K]>) => void
        : never
};

/**
 * Flatten functions to their return types
 */
type FlattenToReturnTypes<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any
        ? ReturnType<T[K]>
        : never
};

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

/**
 * Require only parts of the store we need
 */
interface LooseStore {
    dispatch(action: any): any;
    getState(): any;
    subscribe(cb: Function): void;
}

interface ContextType {
    store?: LooseStore;
    updaters: UpdatersMap;
}

interface MapState<S, Result> {
    (state: S): Result;
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
    store: LooseStore;
    children: React.ReactNode;
}) {
    // Mutable updaters list of all useReduxState() users
    const updaters = useRef<UpdatersMap>(createMap());

    /**
     * Notify subscribers
     */
    const notify = () => {
        ReactDOM.unstable_batchedUpdates(() => {
            updaters.current.forEach(updater => updater());
        });
    };

    const preEffectState = useMemo(() => props.store.getState(), [props.store]);

    useEffect(() => {
        // Children might dispatch during effect exection. Check for that and
        // notify them
        if (preEffectState !== props.store.getState()) {
            notify();
        }

        // Setup only one listener for the provider so we can batch update all
        // hook users without causing tearing
        return props.store.subscribe(notify);
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

export function createUseSelect<State>() {
    return function useSelect<Selection, Result>(
        select: (state: State) => Selection,
        produce: (selection: Selection) => Result,
        deps?: any[],
    ): Result {
        const ref = useRef<{
            result: Result | Nil;
            prevSelection: Selection | Nil;
        }>({
            result: nil,
            prevSelection: nil,
        });

        return useMapState(
            (state: State) => {
                const selection = select(state);

                const selectionChanged = !shallowEqual(
                    selection,
                    ref.current.prevSelection,
                );

                if (selectionChanged) {
                    ref.current.prevSelection = selection;
                }

                if (!selectionChanged && ref.current.result !== nil) {
                    return ref.current.result;
                }

                const res = produce(selection);
                ref.current.result = res;
                return res as any;
            },
            deps as any,
        );
    };
}

/**
 * Bound actions creators object to Redux dispatch. Memoized.
 */
export function useActionCreators<T>(actionCreators: T): RemoveReturnTypes<T> {
    const dispatch = useDispatch();

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

function useDidDepsChange(deps: any[] | undefined) {
    if (!deps) {
        return false;
    }

    const memoDeps = useMemo(() => deps, deps);

    // changed when useMemo returns the same deps reference
    return memoDeps == deps;
}

export function createUseMapState<State>() {
    return function useMapState<Deps extends Tuple, Result = any>(
        mapState?: MapState<State, Result>,
        deps?: Deps,
    ): Result {
        const {store, updaters} = useContext(StoreContext);

        /**
         * Reference to the previously mapped state
         */
        const prevRef = useRef<Result | Nil>(nil);

        /**
         * When this is set can bailout state mapping and just return this
         */
        const bailoutRef = useRef<Result | Nil>(nil);

        /**
         * Trigger render from store updates
         */
        const triggerRender = useForceRender();

        /**
         * Detect deps change when using the deps array
         */
        const depsChanged = useDidDepsChange(deps);

        /**
         * Reference to the mapState function
         */
        const mapStateRef = useRef<MapState<State, Result>>();
        mapStateRef.current = mapState;

        if (!store) {
            throw new NoProviderError();
        }

        /**
         * Get mapped value from the state
         */
        const getMappedValue = (): Result => {
            const state = store.getState();

            if (!mapStateRef.current) {
                return state;
            }

            return mapStateRef.current(state);
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
    };
}

export function createUsePassiveMapState<State>() {
    return function usePassiveMapState<Deps extends Tuple<any>, Result = any>(
        mapState: MapState<State, Result>,
        deps: Deps,
    ): Result {
        const {store} = useContext(StoreContext);

        if (!store) {
            throw new NoProviderError();
        }

        if (deps) {
            return useMemo(() => {
                return mapState(store.getState());
            }, deps);
        }

        return mapState(store.getState());
    };
}

export const useMapState = createUseMapState<any>();
export const usePassiveMapState = createUsePassiveMapState<any>();
export const useSelect = createUseSelect<any>();
