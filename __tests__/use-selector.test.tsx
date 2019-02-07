import {render, cleanup, testHook, act} from "react-testing-library";
import React, {useState} from "react";
import {
    HooksProvider,
    useMapState,
    createUseSelector,
} from "../src/redux-hooks";
import {createStore, Store} from "redux";
// tslint:disable:react-hooks-nesting

afterEach(cleanup);

// This helper component allows us to call the hook in a component context as
// per the Rules of Hooks (https://reactjs.org/docs/hooks-rules.html). We're
// just testing the custom hook, so this doesn't need to return anything.
function TestHook(props: {callback: Function}) {
    props.callback();
    return null;
}
// This function works the same way as `testHook()`, except now the hook will
// run in a child of the Provider.
function withProvider(store: Store, callback: Function) {
    render(
        <HooksProvider store={store}>
            <TestHook callback={callback} />
        </HooksProvider>,
    );
}

interface State {
    foo: string;
    bar: string;
}

function createTestStore() {
    const initialState: State = {
        foo: "foo",
        bar: "bar",
    };

    function reducer(state: State | undefined, action: any) {
        if (action.type === "UPDATE") {
            return action.update(state);
        }

        return initialState;
    }

    return createStore(reducer);
}

function updateStore(update: (state: State) => State) {
    return {
        type: "UPDATE",
        update,
    };
}

function createLazyUseState<T>(initialState: T): [(s: T) => void, () => T] {
    let realSetState: any;

    return [
        function lazySetState(state: T) {
            act(() => {
                realSetState(state);
            });
        },

        function useStateLazy(): T {
            const [state, setState] = useState(initialState);
            realSetState = setState;
            return state;
        },
    ];
}

const useSelector = createUseSelector<State>();

test("provides the context default value", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();

        res = useSelector(
            s => ({
                a: s.foo,
                b: s.bar,
                c: count,
            }),
            selection => {
                spy();
                return selection.a + selection.b + selection.c;
            },
        );
    });

    expect(res).toEqual("foobar0");

    setState(2);

    expect(res).toEqual("foobar2");
    expect(spy).toBeCalledTimes(2);

    store.dispatch(
        updateStore(s => {
            return {...s, foo: "change"};
        }),
    );

    expect(spy).toBeCalledTimes(3);
});

test("dependencies can prevent update", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();

        res = useSelector(
            s => ({
                a: s.foo,
                b: s.bar,
                c: count,
            }),
            selection => {
                spy();
                return selection.a + selection.b + selection.c;
            },
            [], // empty array prevent update
        );
    });

    expect(res).toEqual("foobar0");

    setState(2);

    expect(spy).toBeCalledTimes(1);
    expect(res).toEqual("foobar0");
});

test("dependencies can be used correctly", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();

        res = useSelector(
            s => ({
                a: s.foo,
                b: s.bar,
                c: count,
            }),
            selection => {
                spy();
                return selection.a + selection.b + selection.c;
            },
            // count is declared as dependency so is executed when count changes
            [count],
        );
    });

    expect(res).toEqual("foobar0");

    setState(2);

    expect(spy).toBeCalledTimes(2);
    expect(res).toEqual("foobar2");
});

test("store update can produce new mapped state", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    withProvider(store, () => {
        res = useSelector(
            s => ({
                a: s.foo,
                b: s.bar,
            }),
            selection => {
                spy();
                return selection.a + selection.b;
            },
            [1],
        );
    });

    expect(res).toEqual("foobar");

    store.dispatch(
        updateStore(s => {
            return {...s, foo: "change"};
        }),
    );

    store.dispatch(
        updateStore(s => {
            return {...s, foo: "change2"};
        }),
    );

    expect(spy).toBeCalledTimes(3);
    expect(res).toEqual("change2bar");
});

test("map is not executed if selectors dont produce new value from RENDER update", () => {
    let res: any;
    const spy = jest.fn();
    const renderSpy = jest.fn();
    const store = createTestStore();

    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();
        renderSpy();

        res = useSelector(
            s => ({
                a: s.foo,
                b: s.foo,
            }),
            selection => {
                spy();
                return selection.a + selection.b;
            },
            [], // empty array prevent update
        );
    });

    expect(res).toEqual("foofoo");
    expect(spy).toBeCalledTimes(1);

    setState(2);

    expect(res).toEqual("foofoo");
    expect(spy).toBeCalledTimes(1);
    expect(renderSpy).toBeCalledTimes(2);
});

test("map is not executed if selectors dont produce new value from STORE update", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    withProvider(store, () => {
        res = useSelector(
            s => ({
                a: s.foo,
                b: s.foo,
            }),
            selection => {
                spy();
                return selection.a + selection.b;
            },
            [], // empty array prevent update
        );
    });

    expect(res).toEqual("foofoo");
    expect(spy).toBeCalledTimes(1);

    store.dispatch(
        updateStore(s => {
            return {...s, bar: "change"};
        }),
    );

    expect(res).toEqual("foofoo");
    expect(spy).toBeCalledTimes(1);
});
