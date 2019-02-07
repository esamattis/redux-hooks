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

Custom provider is required for now because the official react-redux bindings
do not use subscriptions and it's impossible to implement Redux hooks without
efficiently. Read more about it
[here](https://github.com/reduxjs/react-redux/issues/1177).

## 🚀 Optimizing

You can optimize state mapping by passing a dependency array which works like
in the `useMemo()` hook.

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
renders.

Unlike in the useMemo hook the depencencies array is spread to the mapping
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

But instead of sharing selectors I think it's better to just create custom hooks

```ts
function useUser(userId) {
    return useMapState(state => state.users[props.userId], [userId]);
}
```

## Memoizing

### useSelect hook

A memoizing `useSelect(select, produce)` hook is provided which is inspired
by the excellent [reselect][] library but provides much simpler api.

```ts
import {useSelect} from "@epeli/redux-hooks";

function User(props) {
    const userWithComments = useSelect(
        state => ({
            user: state.users[props.userId],
            comments: state.commentsByUserId[props.userId],
        }),
        selection => ({
            ...selection.user,
            comments: selection.comments,
        }),
        [props.userId], // deps array is supported here too (optional)
    );

    return <div>...</div>;
}
```

The latter produce function is executed only when the former select function
returns a new value (shallow equal).

For TypeScript users `createUseSelect` is provided for creating `useSelect`
with custom state types:

```ts
import {createUseSelect} from "@epeli/redux-hooks";
const useAppSelect = createUseSelect<AppState>();
```

[reselect]: https://github.com/reduxjs/reselect

### Using Reselect

If the useSelect is not enough you can just use the real reselect library
with the useMemo hook

```ts
const selector = useMemo(
    () =>
        createSelector(
            state => state.users[props.userId],
            user => somethingExpensive(user),
        ),
    [props.userId],
);

const user = useMapState(selector);
```

## 📚 Examples

Codesandbox: https://codesandbox.io/s/github/epeli/typescript-redux-todoapp/tree/hooks

Github: https://github.com/epeli/typescript-redux-todoapp/tree/hooks

## 🤔 Why Yet Another Redux Hooks implementation?

All the others I checked had the zombie child bug.

This also an experiment for the future of the react-redux:

https://github.com/reduxjs/react-redux/issues/1177#issuecomment-460097106
