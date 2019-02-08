import {
    useMapState,
    createUseMapState,
    createUsePassiveMapState,
} from "../src/redux-hooks";

test("useMapState args inference", () => {
    function Foo() {
        useMapState(
            (state, a, b) => {
                a; // $ExpectType number
                b; // $ExpectType string
            },
            [1, ""],
        );
    }
});

test("custom useMapState args inference", () => {
    const useMyState = createUseMapState<{ding: number}>();
    function Foo() {
        useMyState(
            (state, a, b) => {
                a; // $ExpectType number
                b; // $ExpectType string
            },
            [1, ""],
        );
    }
});

test("custom usePassiveMapState args inference", () => {
    const usePassiveMyState = createUsePassiveMapState<{ding: number}>();
    function Foo() {
        usePassiveMyState(
            (state, a) => {
                a; // $ExpectType number
            },
            [1],
        );
    }
});
