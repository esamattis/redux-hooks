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

## 🚀 Optimizing

You can optimize state mapping by passing a dependency array which works like
`useMemo()`.

```ts
function User(props) {
    const user = useMapState(
        state => state.users[props.userId],
        [props.userId], // deps
    );

    return <div>{user.name}</div>;
}
```

Without the dependencies array the state is mapped always when the component
renders. Unlike `useMemo()` the depencencies array is spread to the mapping
function so you can share selectors with multiple components easily.

```ts
function selectUser(state, userId) {
    return state.users[userId];
}

function User(props) {
    const user = useMapState(selectUser, [props.userId]);
    return <div>{user.name}</div>;
}
```

## 🔧 Custom selector hooks

But instead of sharing selectors I think it's better just create custom hooks

```ts
function useUser(userId) {
    return useMapState(
        state => state.users[props.userId],
        [props.userId], // deps
    );
}
```

## 📚 Examples

Codesandbox: https://codesandbox.io/s/github/epeli/typescript-redux-todoapp/tree/hooks

Github: https://github.com/epeli/typescript-redux-todoapp/tree/hooks

## 🤔 Why Yet Another Redux Hooks implementation?

All the others I checked had the zombie child bug.

This also an experiment for the future of the react-redux:

https://github.com/reduxjs/react-redux/issues/1177#issuecomment-460097106
