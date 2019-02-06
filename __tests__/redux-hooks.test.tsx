import {createStore} from "redux";
import {act, render, fireEvent, cleanup} from "react-testing-library";
import {
    HooksProvider,
    useMapState,
    useActionCreators,
} from "../src/redux-hooks";
import React, {useState, useCallback} from "react";

afterEach(cleanup);

function nextTick() {
    return new Promise(r => setTimeout(r, 0));
}

test("can use the state", () => {
    const initialState = {
        foo: "bar",
    };

    function reducer() {
        return initialState;
    }

    const store = createStore(reducer);

    function Thing() {
        const state = useMapState();

        return <div data-testid="content">{state.foo}</div>;
    }

    function App() {
        return (
            <HooksProvider store={store}>
                <Thing />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    const el = rtl.getByTestId("content");

    expect(el.innerHTML).toBe("bar");
});

test("can map state", () => {
    interface State {
        foo: string;
    }

    const initialState: State = {
        foo: "bar",
    };

    function reducer() {
        return initialState;
    }

    const store = createStore(reducer);

    function Thing() {
        const foo = useMapState((s: State) => s.foo);

        return <div data-testid="content">{foo}</div>;
    }

    function App() {
        return (
            <HooksProvider store={store}>
                <Thing />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    const el = rtl.getByTestId("content");

    expect(el.innerHTML).toBe("bar");
});

test("listens dispatches", async () => {
    interface State {
        foo: string;
    }

    const initialState: State = {
        foo: "foo",
    };

    const fooAction = {type: "NEW_FOO", foo: "newfoo"};

    function reducer(
        state: State | undefined,
        action: typeof fooAction,
    ): State {
        state = state || initialState;

        if (action.type === "NEW_FOO") {
            return {...state, foo: action.foo};
        }

        return state;
    }

    const store = createStore(reducer);

    function Thing() {
        const foo = useMapState((s: State) => s.foo);

        return <div data-testid="content">{foo}</div>;
    }

    function App() {
        return (
            <HooksProvider store={store as any /* wtf */}>
                <Thing />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    await nextTick(); // wtf effect is not executed otherwise

    store.dispatch(fooAction);

    const el = rtl.getByTestId("content");
    expect(el.innerHTML).toBe("newfoo");
});

test("does not cause tearing", async () => {
    interface State {
        things: {foo: string}[];
    }

    const initialState: State = {
        things: [{foo: "first"}, {foo: "second"}, {foo: "third"}],
    };

    const removeLast = {type: "REMOVE"};

    function reducer(
        state: State | undefined,
        action: typeof removeLast,
    ): State {
        state = state || initialState;

        if (action.type === "REMOVE") {
            return {
                ...state,
                things: state.things.slice(0, -1),
            };
        }

        return state;
    }

    const store = createStore(reducer);

    function Thing(props: {index: number}) {
        const thing = useMapState((s: State) => s.things[props.index]);

        return <div data-testid="thing">{thing.foo}</div>;
    }

    function Things() {
        const thingIndices = useMapState((s: State) =>
            s.things.map((_, index) => index),
        );

        return (
            <div data-testid="content">
                {thingIndices.map(index => (
                    <Thing key={index} index={index} />
                ))}
            </div>
        );
    }

    function App() {
        return (
            <HooksProvider store={store as any /* wtf */}>
                <Things />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    await nextTick(); // wtf effect is not executed otherwise

    store.dispatch(removeLast);

    // Just asserting no exceptions
    // Might throw "TypeError: Cannot read property 'foo' of undefined"
});

test("does not render if map state does not return new value", async () => {
    const renderSpy = jest.fn();

    interface State {
        foo: string;
    }

    const initialState: State = {
        foo: "foo",
    };

    const fooAction = {type: "NEW_FOO", foo: "newfoo"};

    function reducer(
        state: State | undefined,
        action: typeof fooAction,
    ): State {
        state = state || initialState;

        if (action.type === "NEW_FOO") {
            return {...state, foo: action.foo};
        }

        return state;
    }

    const store = createStore(reducer);

    function Thing() {
        const foo = useMapState((s: State) => s.foo);
        renderSpy();

        return <div data-testid="content">{foo}</div>;
    }

    function App() {
        return (
            <HooksProvider store={store as any /* wtf */}>
                <Thing />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    await nextTick(); // wtf effect is not executed otherwise

    store.dispatch(fooAction);
    store.dispatch(fooAction);

    const el = rtl.getByTestId("content");
    expect(el.innerHTML).toBe("newfoo");

    expect(renderSpy).toHaveBeenCalledTimes(2);
});

test("unrelated state change does not cause render", async () => {
    const renderSpy = jest.fn();

    interface State {
        foo: string;
        bar: string;
    }

    const initialState: State = {
        foo: "foo",
        bar: "just bar",
    };

    const fooAction = {type: "NEW_FOO", foo: "newfoo"};

    function reducer(
        state: State | undefined,
        action: typeof fooAction,
    ): State {
        state = state || initialState;

        if (action.type === "NEW_FOO") {
            return {...state, foo: action.foo};
        }

        return state;
    }

    const store = createStore(reducer);

    function Thing() {
        const bar = useMapState((s: State) => s.bar);
        renderSpy();

        return <div data-testid="content">{bar}</div>;
    }

    function App() {
        return (
            <HooksProvider store={store as any /* wtf */}>
                <Thing />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    await nextTick(); // wtf effect is not executed otherwise

    store.dispatch(fooAction);
    store.dispatch(fooAction);

    const el = rtl.getByTestId("content");
    expect(el.innerHTML).toBe("just bar");

    expect(renderSpy).toHaveBeenCalledTimes(1);
});

test("map state is optimized", async () => {
    const mapStateSpy = jest.fn();

    interface State {
        foo: string;
    }

    const initialState: State = {
        foo: "foo",
    };

    const fooAction = {type: "NEW_FOO", foo: "newfoo"};

    function reducer(
        state: State | undefined,
        action: typeof fooAction,
    ): State {
        state = state || initialState;

        if (action.type === "NEW_FOO") {
            return {...state, foo: action.foo};
        }

        return state;
    }

    const store = createStore(reducer);

    function Thing() {
        const foo = useMapState((s: State) => {
            mapStateSpy();
            return s.foo;
        });

        return <div data-testid="content">{foo}</div>;
    }

    function App() {
        return (
            <HooksProvider store={store as any /* wtf */}>
                <Thing />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    await nextTick(); // wtf effect is not executed otherwise

    store.dispatch(fooAction);

    const el = rtl.getByTestId("content");
    expect(el.innerHTML).toBe("newfoo");

    // Once for the initial mount and once for the dispatch
    expect(mapStateSpy).toHaveBeenCalledTimes(2);
});

test("render re-executes map state", () => {
    type State = {[id: string]: {name: string}};

    const initialState: State = {
        a: {name: "user A"},
        b: {name: "user B"},
        c: {name: "user C"},
    };

    const selectors = {
        getAllUsers: (state: State) => Object.keys(state),
        getUserById: (state: State, id: string) => state[id],
    };

    const reducer = () => initialState;
    const store = createStore(reducer);

    const User = ({userId}: {userId: string}) => {
        const name = useMapState(
            state => selectors.getUserById(state, userId).name,
        );
        return (
            <div data-testid="user">
                Hi, my name is {name} ({userId})
            </div>
        );
    };

    const Users = () => {
        const allUsers = useMapState(state => selectors.getAllUsers(state));
        const [currentIndex, setCurrentIndex] = useState(0);

        const increment = () => {
            setCurrentIndex(1);
        };

        return (
            <div>
                <User userId={allUsers[currentIndex]} />
                <button data-testid="next-button" onClick={increment}>
                    NEXT USER
                </button>
            </div>
        );
    };

    const App = () => (
        <HooksProvider store={store}>
            <Users />
        </HooksProvider>
    );

    const rtl = render(<App />);

    fireEvent.click(rtl.getByTestId("next-button"));

    const user = rtl.getByTestId("user");

    expect(user.innerHTML).toEqual("Hi, my name is user B (b)");
});

test("useActionCreators", async () => {
    interface State {
        foo: string;
    }

    const initialState: State = {
        foo: "foo",
    };

    const ActionCreators = {
        setFoo(foo: string) {
            return {type: "NEW_FOO", foo};
        },
    };

    function reducer(state: State | undefined, action: any): State {
        state = state || initialState;

        if (action.type === "NEW_FOO") {
            return {...state, foo: action.foo};
        }

        return state;
    }

    const store = createStore(reducer);

    const actionsRefs: any[] = [];

    function Thing() {
        const foo = useMapState((s: State) => s.foo);
        const actions = useActionCreators(ActionCreators);

        actionsRefs.push(actions);

        return (
            <button
                data-testid="button"
                onClick={() => {
                    actions.setFoo("newfoo");
                }}
            >
                {foo}
            </button>
        );
    }

    function App() {
        return (
            <HooksProvider store={store as any /* wtf */}>
                <Thing />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    await nextTick(); // wtf effect is not executed otherwise

    fireEvent.click(rtl.getByTestId("button"));

    expect(rtl.getByTestId("button").innerHTML).toEqual("newfoo");

    expect(actionsRefs.length).toEqual(2);
    expect(actionsRefs[0]).toBe(actionsRefs[1]);
});

test("can use deps", () => {
    const mapSpy = jest.fn();

    interface State {
        foo: string;
    }
    const initialState: State = {
        foo: "foo",
    };

    function reducer() {
        return initialState;
    }

    const store = createStore(reducer);

    function selector(state: State, arg: string, num: number) {
        mapSpy();
        return state.foo + arg.toLocaleLowerCase();
    }

    function Thing(props: {s: string}) {
        const foo = useMapState(selector, [props.s, 2]);

        return <div data-testid="content">{foo}</div>;
    }

    let setState = (state: {value: string}) => {};

    function App() {
        const [state, _setState] = useState({value: "bar"});
        setState = _setState;

        return (
            <HooksProvider store={store}>
                <Thing s={state.value} />
            </HooksProvider>
        );
    }

    const rtl = render(<App />);

    expect(mapSpy).toHaveBeenCalledTimes(1);
    expect(rtl.getByTestId("content").innerHTML).toBe("foobar");

    act(() => {
        setState({value: "baz"});
    });
    expect(mapSpy).toHaveBeenCalledTimes(2);
    expect(rtl.getByTestId("content").innerHTML).toBe("foobaz");

    act(() => {
        setState({value: "BAR"});
    });
    expect(mapSpy).toHaveBeenCalledTimes(3);
    expect(rtl.getByTestId("content").innerHTML).toBe("foobar");

    act(() => {
        setState({value: "BAR"});
    });
    expect(mapSpy).toHaveBeenCalledTimes(3);
    expect(rtl.getByTestId("content").innerHTML).toBe("foobar");
});
