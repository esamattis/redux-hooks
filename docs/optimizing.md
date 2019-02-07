# 🚀 Optimizing rendering

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
function so you can share getters with multiple components easily.

```ts
function getUser(state, userId) {
    return state.users[userId];
}

function User(props) {
    const user = useMapState(getUser, [props.userId]);
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
by the excellent [reselect][] library but provides a much simpler api.

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
returns a new value (shallow equal). This is mostly useful for avoiding
creating new references which can cause useless rendering downstream.

For TypeScript users `createUseSelect` is provided for creating own
`useSelect` with custom state types:

```ts
import {createUseSelect} from "@epeli/redux-hooks";
const useAppSelect = createUseSelect<AppState>();
```

[reselect]: https://github.com/reduxjs/reselect

## Using Reselect

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
