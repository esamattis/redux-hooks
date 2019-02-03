import {createStore} from "redux";
import {render, fireEvent, cleanup} from "react-testing-library";
import {Provider, useReduxState} from "../src/redux-hooks";
import React from "react";

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
