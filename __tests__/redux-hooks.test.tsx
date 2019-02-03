import {createStore} from "redux";
import {render, fireEvent, cleanup} from "react-testing-library";
import {Provider, useReduxState} from "../src/redux-hooks";
import React from "react";

afterEach(cleanup);

test("can use the state", () => {
    const initialState = {
        foo: "bar",
    };

    function reducer() {
        return initialState;
    }

    const store = createStore(reducer);

    function Thing() {
        const state = useReduxState();

        return <div data-testid="content">{state.foo}</div>;
    }

    function App() {
        return (
            <Provider store={store}>
                <Thing />
            </Provider>
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
        const foo = useReduxState((s: State) => s.foo);

        return <div data-testid="content">{foo}</div>;
    }

    function App() {
        return (
            <Provider store={store}>
                <Thing />
            </Provider>
        );
    }

    const rtl = render(<App />);

    const el = rtl.getByTestId("content");

    expect(el.innerHTML).toBe("bar");
});

function nextTick() {
    return new Promise(r => setTimeout(r, 0));
}

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
        const foo = useReduxState((s: State) => s.foo);

        return <div data-testid="content">{foo}</div>;
    }

    function App() {
        return (
            <Provider store={store as any /* wtf */}>
                <Thing />
            </Provider>
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
        const thing = useReduxState((s: State) => s.things[props.index]);

        return <div data-testid="thing">{thing.foo}</div>;
    }

    function Things() {
        const thingIndices = useReduxState((s: State) =>
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
            <Provider store={store as any /* wtf */}>
                <Things />
            </Provider>
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
        const foo = useReduxState((s: State) => s.foo);
        renderSpy();

        return <div data-testid="content">{foo}</div>;
    }

    function App() {
        return (
            <Provider store={store as any /* wtf */}>
                <Thing />
            </Provider>
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
        const bar = useReduxState((s: State) => s.bar);
        renderSpy();

        return <div data-testid="content">{bar}</div>;
    }

    function App() {
        return (
            <Provider store={store as any /* wtf */}>
                <Thing />
            </Provider>
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
