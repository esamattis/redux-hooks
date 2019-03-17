import {render, cleanup, act} from "react-testing-library";
import React, {useState} from "react";
import {
    HooksProvider,
    createUseSelect,
    createUsePassiveMapState,
    createUseMapState,
} from "../src/redux-hooks";
import {createStore, Store} from "redux";
// tslint:disable:react-hooks-nesting

beforeEach(() => {
    process.env.NODE_ENV = "production";
});

afterEach(cleanup);

afterEach(() => jest.restoreAllMocks());

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
    array: number[];
}

function createTestStore() {
    const initialState: State = {
        foo: "foo",
        bar: "bar",
        array: [1, 2],
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

const useMapState = createUseMapState<State>();
const useSelect = createUseSelect<State>();
const usePassive = createUsePassiveMapState<State>();

test("useMapState: renders new value when identity changes", () => {
    const spy = jest.fn();
    const store = createTestStore();

    withProvider(store, () => {
        useMapState(s => ({
            foo: s.foo,
        }));
        spy(3);
    });

    store.dispatch(
        updateStore(s => {
            return {...s, bar: "change"};
        }),
    );

    store.dispatch(
        updateStore(s => {
            return {...s, bar: "change2"};
        }),
    );

    expect(spy).toBeCalledTimes(3);
});

test("useMapState: warns when useMapState returns always new indentities", () => {
    process.env.NODE_ENV = "test";

    const spy = jest.spyOn(console, "warn");
    const store = createTestStore();

    withProvider(store, () => {
        useMapState(s => ({
            foo: s.foo,
        }));
    });

    expect(spy).toHaveBeenCalledTimes(1);
});

test("useSelect: provides the context default value", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();

        res = useSelect(
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

test("useSelect: defaults to an indentity function", () => {
    let res: any;
    const store = createTestStore();

    withProvider(store, () => {
        res = useSelect(s => ({
            a: s.foo,
            b: s.bar,
        }));
    });

    expect(res).toEqual({a: "foo", b: "bar"});
});

test("useSelect: dependencies can prevent update", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();

        res = useSelect(
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

test("useSelect: dependencies can be used correctly", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();

        res = useSelect(
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

test("useSelect: shallow equal checks arrays", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    withProvider(store, () => {
        spy();
        res = useSelect(s => s.array.concat(3));
    });

    store.dispatch(
        updateStore(s => {
            return {...s, foo: "change"};
        }),
    );

    expect(spy).toBeCalledTimes(1);
    expect(res).toEqual([1, 2, 3]);
});

test("useSelect: store update can produce new mapped state", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    withProvider(store, () => {
        res = useSelect(
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

test("useSelect: map is not executed if selector dont produce new value from RENDER update", () => {
    let res: any;
    const spy = jest.fn();
    const renderSpy = jest.fn();
    const store = createTestStore();

    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();
        renderSpy();

        res = useSelect(
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

test("useSelect: map is not executed if selector dont produce new value from STORE update", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    withProvider(store, () => {
        res = useSelect(
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

test("usePassiveMapState: does not map on store update", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    withProvider(store, () => {
        res = usePassive(
            s => {
                spy();
                return s.foo;
            },
            [], // empty array prevent update
        );
    });

    expect(res).toEqual("foo");
    expect(spy).toBeCalledTimes(1);

    store.dispatch(
        updateStore(s => {
            return {...s, foo: "change"};
        }),
    );

    expect(res).toEqual("foo");
    expect(spy).toBeCalledTimes(1);
});

test("usePassiveMapState: does not map on render", () => {
    let res: any;
    const spy = jest.fn();
    const renderSpy = jest.fn();
    const store = createTestStore();
    const [setState, useTestState] = createLazyUseState(0);

    withProvider(store, () => {
        const count = useTestState();
        renderSpy();
        res = usePassive(
            s => {
                spy();
                return s.foo;
            },
            [], // empty array prevent update
        );
    });

    expect(res).toEqual("foo");
    expect(spy).toBeCalledTimes(1);

    setState(2);

    expect(res).toEqual("foo");
    expect(spy).toBeCalledTimes(1);
});

test("usePassiveMapState: maps on deps change", () => {
    let res: any;
    const spy = jest.fn();
    const store = createTestStore();

    withProvider(store, () => {
        const bar = useMapState(s => s.bar);

        res = usePassive(
            s => {
                spy();
                return s.foo;
            },
            [bar], // empty array prevent update
        );
    });

    expect(res).toEqual("foo");
    expect(spy).toBeCalledTimes(1);

    store.dispatch(
        updateStore(s => {
            return {...s, bar: "change"};
        }),
    );

    expect(res).toEqual("foo");
    expect(spy).toBeCalledTimes(2);
});
