# 🚀 Optimizing rendering and mapping

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
renders. When the store state updates the map state function is executed
regardless of the deps array.

## Memoizing with useSelect hook

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
creating new references which can cause [useless rendering downstream][pure].

If no produce function is passed it defaults to simple `s => s` function
making it a shallow equal version of the `useMapState()`.

[reselect]: https://github.com/reduxjs/reselect
[pure]: https://medium.com/@esamatti/react-js-pure-render-performance-anti-pattern-fb88c101332f

## Passive state mapping

There is a `usePassiveMapState` hook which is passive version of
`useMapState` that does not subscribe to store updates at all. It must be
used in conjunction to an active hook `useMapState` or `useSelect`. It
executes only when the dependencies passed to it change.

This is for really advanced scenarios where you know exactly when some part
of the state updates based on the another.

```ts
import {usePassiveMapState} from "@epeli/redux-hooks";

const shop = useMapState(state => state.shops[shopId]);

// Shop products is updated only when the shop itself
// has been updated. So this generates the productNames
// array only when the shop has updated.
const productNames = usePassiveMapState(
    state => state.shop[shopId].products.map(p => p.name),
    [shop],
);
```

## Using Reselect

If these are not enough you can just use the real reselect library with the
useMemo hook

```ts
const selectUser = useMemo(
    () =>
        createSelector(
            state => state.users[props.userId],
            user => somethingExpensive(user),
        ),
    [props.userId],
);

const modifiedUser = useMapState(selectUser);
```
