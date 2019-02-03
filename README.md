# @epeli/redux-hooks

React Hooks implementation for Redux that does not suffer from the tearing /
"zombie child component" problems.

It also implements basic performance optimizations eg. does not render when the
map state function does not produce new value (shallow equal test).

## 📦 Install

    npm install @epeli/redux-hooks

## 📖 Usage

```ts
import {useReduxState, useReduxDispatch} from "@epeli/redux-hooks";

function useIncrement() {
    const dispatch = useReduxDispatch();

    return () => dispatch({type: "INCREMENT"});
}

function Counter() {
    const count = useReduxState(state => state.count);
    const inc = useIncrement();

    return <button onClick={inc}>{count}</button>;
}
```

Your components must be wrapped with the `HooksProvider`

```ts
import {HooksProvider} from "@epeli/redux-hooks";

ReactDOM.render(
    document.getElementById("app"),
    <HooksProvider store={store}>
        <Counter />
    </HooksProvider>,
);
```


## Why Yet Another Redux Hooks implementation? 🤔

All the others I checked had the zombie child bug.

This also an experiment for the future of the react-redux:

https://github.com/reduxjs/react-redux/issues/1177#issuecomment-460097106
