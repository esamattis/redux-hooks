// tslint:disable:react-hooks-nesting
import {createHooks, useSelect} from "../src/redux-hooks";
import {assert, IsExact} from "conditional-type-checks";

test("createHooks: useMapState type", () => {
    const MyHooks = createHooks<{foo: string}>();

    const ret = MyHooks.useMapState(state => {
        assert<IsExact<typeof state.foo, string>>(true);
        return state.foo;
    });

    assert<IsExact<typeof ret, string>>(true);
});

test("useSelect ret type", () => {
    const ret = useSelect(state => {
        return 2;
    });

    assert<IsExact<typeof ret, number>>(true);
});

test("useSelect ret type with produce", () => {
    const ret = useSelect(
        state => {
            return 2;
        },
        () => /re/,
    );

    assert<IsExact<typeof ret, RegExp>>(true);
});

test("createHooks: useSelect return type", () => {
    const MyHooks = createHooks<{foo: string}>();

    const ret = MyHooks.useSelect(state => {
        assert<IsExact<typeof state.foo, string>>(true);
        return state.foo;
    });

    assert<IsExact<typeof ret, string>>(true);
});
