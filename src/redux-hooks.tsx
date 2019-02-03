import {Store} from "redux";
import ReactDOM from "react-dom";
import React, {useContext, useState, useEffect} from "react";
import {shallowEqual} from "./shallow-equal";

interface ContextType {
    store?: Store;
    updaters: Function[];
}

const StoreContext = React.createContext<ContextType>({
    updaters: [],
});

export function Provider(props: {store: Store; children: React.ReactNode}) {
    const updaters: Function[] = [];

    useEffect(() => {
        return props.store.subscribe(() => {
            ReactDOM.unstable_batchedUpdates(() => {
                for (const update of updaters) {
                    update();
                }
            });
        });
    }, [props.store]);

    return (
        <StoreContext.Provider value={{store: props.store, updaters: updaters}}>
            {props.children}
        </StoreContext.Provider>
    );
}

interface MapState<T> {
    (state: any): T;
}

export function useReduxState<T = any>(mapState?: MapState<T>): T {
    const {store, updaters} = useContext(StoreContext);

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

    const [stateSlice, setState] = useState(map());

    useEffect(() => {
        let prev: any = map();

        const update = () => {
            const next = map();

            if (!shallowEqual(prev, next)) {
                setState(next);
                prev = next;
            }
        };

        updaters.push(update);
        return () => {
            const index = updaters.indexOf(update);
            updaters.splice(index, 1);
        };
    }, [store]);

    return stateSlice;
}
