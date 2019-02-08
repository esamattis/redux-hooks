# ⚓ @epeli/redux-hooks

React Hooks implementation for Redux that does not suffer from the tearing /
"zombie child component" problems. [Read more](#-why-yet-another-redux-hooks-implementation).

It also implements performance optimizations eg. does not render when the map
state function does not produce new value and allows advanced
optimizations with memoizing and dependency arrays.

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

Custom provider is required for now because the official react-redux bindings
do not use subscriptions and it's impossible to implement Redux hooks without
efficiently. Read more about it
[here](https://github.com/reduxjs/react-redux/issues/1177).

## 🚀 Optimizing rendering

The above API is enough for most use cases but if you want to get everything out off
your hooks please read the [optimizations docs](docs/optimizing.md).

## 📚 Examples

Codesandbox: https://codesandbox.io/s/github/epeli/typescript-redux-todoapp/tree/hooks

Github: https://github.com/epeli/typescript-redux-todoapp/tree/hooks

## 🤔 Why yet another Redux Hooks implementation?

All the others I checked had the zombie child bug, poor performance or were missing TypeScript types.

Even the `facebookincubator/redux-react-hook` one has the zombie bug which is stated in their [FAQ](https://github.com/facebookincubator/redux-react-hook/blob/da74ab765c200133f86b629869ba1fdbf46afa97/README.md#how-does-this-compare-to-react-redux). This one guarantees  data flows top down like the official react-redux does.

This also an experiment for the future of the react-redux:

https://github.com/reduxjs/react-redux/issues/1177#issuecomment-460097106
