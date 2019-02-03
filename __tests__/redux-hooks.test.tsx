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
