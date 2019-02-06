# ⚓ @epeli/redux-hooks

React Hooks implementation for Redux that does not suffer from the tearing /
"zombie child component" problems.

It also implements basic performance optimizations eg. does not render when the
map state function does not produce new value (shallow equal test).

## 📦 Install

    npm install @epeli/redux-hooks

## 📖 Usage

```ts
import {useMapState, useActionCreators} from "@epeli/redux-hooks";

const ActionCreators = {
    inc() {
        return {type: "INCREMENT"};
    },
};

function Counter() {
    const count = useMapState(state => state.count);
    const actions = useActionCreators(ActionCreators);

    return <button onClick={actions.inc}>{count}</button>;
}
```

Your components must be wrapped with the `HooksProvider`

```ts
import {HooksProvider} from "@epeli/redux-hooks";

ReactDOM.render(
    <HooksProvider store={store}>
        <Counter />
    </HooksProvider>,
    document.getElementById("app"),
);
```

## 📚 Examples

Codesandbox: https://codesandbox.io/s/github/epeli/typescript-redux-todoapp/tree/hooks

Github: https://github.com/epeli/typescript-redux-todoapp/tree/hooks

## 🤔 Why Yet Another Redux Hooks implementation?

All the others I checked had the zombie child bug.

This also an experiment for the future of the react-redux:

https://github.com/reduxjs/react-redux/issues/1177#issuecomment-460097106
